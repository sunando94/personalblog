import { db, initDb } from "../db";
import { getRedis } from "../redis";

const REFRESH_PREFIX = "mcp_refresh:";

export class TokenStore {
  /**
   * Save a refresh token - SQL + Cache (with TTL)
   */
  static async save(token: string, userId: string, scope: string, expiresAt: Date): Promise<void> {
    await initDb();
    
    // 1. Persistent SQL
    await db.query(
      "INSERT INTO refresh_tokens (token, user_id, scope, expires_at) VALUES ($1, $2, $3, $4)",
      [token, userId, scope, expiresAt]
    );

    // 2. Cache
    const redis = await getRedis();
    if (redis) {
      const ttl = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      await redis.set(`${REFRESH_PREFIX}${token}`, JSON.stringify({ userId, scope, expiresAt: expiresAt.toISOString() }), { EX: ttl });
    }
  }

  /**
   * Get a refresh token - Cache-Aside
   */
  static async get(token: string): Promise<any | null> {
    const redis = await getRedis();
    
    // 1. Try Cache
    if (redis) {
      const cached = await redis.get(`${REFRESH_PREFIX}${token}`);
      if (cached) return JSON.parse(cached);
    }

    // 2. Miss -> SQL
    await initDb();
    const res = await db.query(
      "SELECT * FROM refresh_tokens WHERE token = $1",
      [token]
    );
    const tokenData = res.rows[0];
    
    // 3. Populate Cache if found and not expired
    if (tokenData) {
      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt > new Date() && redis) {
        const ttl = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
        await redis.set(`${REFRESH_PREFIX}${token}`, JSON.stringify({ 
           userId: tokenData.user_id, 
           scope: tokenData.scope, 
           expiresAt: tokenData.expires_at 
        }), { EX: ttl });
      }
      return {
        user_id: tokenData.user_id,
        scope: tokenData.scope,
        expires_at: tokenData.expires_at
      };
    }

    return null;
  }

  /**
   * Delete a refresh token - SQL + Clear Cache
   */
  static async delete(token: string): Promise<void> {
    await initDb();
    await db.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
    
    const redis = await getRedis();
    if (redis) {
      await redis.del(`${REFRESH_PREFIX}${token}`);
    }
  }
}
