import { Pool } from "pg";
import { parse } from "pg-connection-string";
import { SyncService } from "./sync";

/**
 * Singleton Database Connection Pool
 * Ensures that only one connection pool is shared across the entire application.
 */
const connectionString = process.env.POSTGRES_URL;
const ca = process.env.POSTGRES_CA?.replace(/\\n/g, '\n');

const rawConnectionString = connectionString?.trim().replace(/^["']|["']$/g, '');
const connectionConfig: any = rawConnectionString ? parse(rawConnectionString) : {};

// Suppress pg v9 / pg-connection-string v3 security warning by explicitly setting sslmode
if (connectionConfig.ssl && !rawConnectionString?.includes('sslmode=')) {
  connectionConfig.sslmode = 'verify-full';
}

let poolInstance: Pool | null = null;

export function getPool(): Pool {
  if (!poolInstance) {
    // Aiven/Neon require specific SSL settings
    // We explicitly override the SSL config to handle self-signed certs and CA
    const sslConfig = {
      rejectUnauthorized: false,
      ca: ca || undefined,
    };

    poolInstance = new Pool({
      ...connectionConfig,
      max: 2, // Allow a small buffer for concurrent queries in one invocation
      idleTimeoutMillis: 30000, // Keep connections alive for warm starts
      connectionTimeoutMillis: 5000, // Wait reasonably for a slot
      ssl: sslConfig
    });

    poolInstance.on('error', (err: any) => {
      console.error('� PostgreSQL Pool Error:', err.message);
      if (err.message.includes('SUPERUSER')) {
        console.error('🚨 CONNECTION LIMIT REACHED: Consider using a connection pooler (e.g. Neon Pooler or PgBouncer).');
      }
    });

    if (connectionConfig.host) {
      console.log(`🐘 Database Connected: ${connectionConfig.host}`);
    }
  }
  return poolInstance;
}

/**
 * Helper to run queries using the singleton pool
 */
export const db = {
  query: async (text: string, params?: any[]) => {
    // Ensure DB is initialized before first query
    if (!isInitialized) {
      await initDb();
    }
    const pool = getPool();
    return pool.query(text, params);
  }
};

/**
 * Database Initialization Singleton
 */
let isInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initDb() {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const client = await getPool().connect();
      console.log("🐘 Initializing PostgreSQL schema...");
      
      try {
        await client.query('BEGIN');
        
        // Users Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            picture TEXT,
            provider TEXT NOT NULL,
            role TEXT DEFAULT 'guest',
            pending_role TEXT,
            last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Refresh Tokens Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS refresh_tokens (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            scope TEXT NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Notifications Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            action_label TEXT,
            action_href TEXT,
            primary_action_label TEXT,
            primary_action_endpoint TEXT,
            primary_action_method TEXT,
            primary_action_body JSONB,
            primary_action_success_message TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Audit Logs Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type TEXT NOT NULL,
            user_id TEXT,
            data JSONB,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        // Vector Embeddings Table
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');
        await client.query(`
          CREATE TABLE IF NOT EXISTS post_embeddings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug TEXT UNIQUE NOT NULL,
            content_hash TEXT NOT NULL,
            embedding vector(768),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Page Analytics Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS page_analytics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            path TEXT NOT NULL,
            session_id TEXT,
            user_agent TEXT,
            referrer TEXT,
            dwell_time_seconds INTEGER DEFAULT 0,
            visitor_id TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS page_analytics_path_idx ON page_analytics(path);
          CREATE INDEX IF NOT EXISTS page_analytics_created_at_idx ON page_analytics(created_at);
        `);

        // Daily Analytics Summary (for storage optimization)
        await client.query(`
          CREATE TABLE IF NOT EXISTS analytics_daily_summary (
            date DATE NOT NULL,
            path TEXT NOT NULL,
            total_views INTEGER DEFAULT 0,
            unique_visitors INTEGER DEFAULT 0,
            avg_dwell_time NUMERIC(10, 2) DEFAULT 0,
            PRIMARY KEY (date, path)
          );
        `);

        // Document Chunks Table for Hybrid Search
        await client.query(`
          CREATE TABLE IF NOT EXISTS post_chunks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug TEXT NOT NULL REFERENCES post_embeddings(slug) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding vector(768),
            metadata JSONB,
            fts tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS post_chunks_slug_idx ON post_chunks(slug);
          CREATE INDEX IF NOT EXISTS post_chunks_fts_idx ON post_chunks USING GIN(fts);
        `);

        await client.query('COMMIT');
        isInitialized = true;
        console.log("✅ Database schema is up to date.");
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
      initPromise = null; // Reset to allow retry
      throw error;
    }
  })();

  return initPromise;
}
