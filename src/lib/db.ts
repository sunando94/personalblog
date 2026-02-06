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
      max: 3, // Strict limit for Aiven hobby tiers
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: sslConfig
    });

    poolInstance.on('error', (err) => {
      console.error('💥 Unexpected error on dormant database client', err);
      process.exit(-1);
    });

    if (connectionConfig.host) {
      console.log(`🐘 Database Connected: ${connectionConfig.host} (DB: ${connectionConfig.database})`);
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

        await client.query('COMMIT');
        isInitialized = true;
        console.log("✅ Database schema is up to date.");
        
        // Start periodic background sync (every 15 minutes)
        SyncService.startBackgroundSync(15);
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
