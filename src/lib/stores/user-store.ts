import { db } from "../db";
import { ExternalProfile } from "../mcp-auth";
import { getRedis } from "../redis";

const USER_CACHE_PREFIX = "mcp_social_profiles";

export class UserStore {
  /**
   * Fetch a user by ID - Cache-Aside Pattern
   */
  static async getById(id: string): Promise<ExternalProfile | null> {
    const redis = await getRedis();
    
    // 1. Try Cache
    if (redis) {
      try {
        const cached = await redis.hGet(USER_CACHE_PREFIX, id);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (e) {
        console.warn("⚠️ Cache read failed:", e);
      }
    }

    // 2. Cache Miss -> Check SQL Store
    const res = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    const row = res.rows[0];
    if (!row) return null;

    const profile: ExternalProfile = {
      id: row.id,
      name: row.name,
      email: row.email,
      picture: row.picture,
      provider: row.provider as any,
      role: row.role as any,
      pendingRole: row.pending_role as any,
      lastLogin: row.last_login?.toISOString()
    };

    // 3. Populate Cache
    if (redis) {
      try {
        await redis.hSet(USER_CACHE_PREFIX, id, JSON.stringify(profile));
      } catch (e) {
        console.warn("⚠️ Cache write failed:", e);
      }
    }

    return profile;
  }

  /**
   * Save or update a user profile (Upsert) - Atomic SQL + Invalidate Cache
   */
  static async upsert(profile: ExternalProfile): Promise<void> {
    await db.query(`
      INSERT INTO users (id, name, email, picture, provider, role, pending_role, last_login)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        picture = EXCLUDED.picture,
        role = EXCLUDED.role,
        pending_role = EXCLUDED.pending_role,
        last_login = EXCLUDED.last_login
    `, [
      profile.id,
      profile.name,
      profile.email || null,
      profile.picture || null,
      profile.provider,
      profile.role || 'guest',
      profile.pendingRole || null,
      profile.lastLogin || new Date().toISOString()
    ]);

    // Update Cache
    const redis = await getRedis();
    if (redis) {
      await redis.hSet(USER_CACHE_PREFIX, profile.id, JSON.stringify(profile));
    }
  }

  /**
   * Get all users - Direct from SQL (usually admin path)
   */
  static async getAll(): Promise<ExternalProfile[]> {
    const res = await db.query("SELECT * FROM users ORDER BY last_login DESC NULLS LAST");
    return res.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      picture: row.picture,
      provider: row.provider as any,
      role: row.role as any,
      pendingRole: row.pending_role as any,
      lastLogin: row.last_login?.toISOString()
    }));
  }

  /**
   * Update a user's role - Update SQL + Sync Cache
   * Returns true if update was successful.
   * If requirePending is true, it strictly enforces that a pending request must exist (concurrency control).
   */
  static async updateRole(userId: string, role: string, clearPending: boolean = true, requirePending: boolean = false): Promise<boolean> {
    const query = (clearPending && requirePending)
      ? "UPDATE users SET role = $1, pending_role = NULL WHERE id = $2 AND pending_role IS NOT NULL"
      : "UPDATE users SET role = $1, pending_role = NULL WHERE id = $2";
    const res = await db.query(query, [role, userId]);
    
    if ((res.rowCount ?? 0) === 0) return false;

    // Sync Cache
    const user = await this.getById(userId);
    if (user) {
      user.role = role as any;
      if (clearPending) user.pendingRole = undefined;
      const redis = await getRedis();
      if (redis) {
        await redis.hSet(USER_CACHE_PREFIX, userId, JSON.stringify(user));
      }
    }
    return true;
  }

  /**
   * Set a pending role request - Update SQL + Sync Cache
   */
  static async setPendingRole(userId: string, requestedRole: string): Promise<void> {
    await db.query("UPDATE users SET pending_role = $1 WHERE id = $2", [requestedRole, userId]);
    
    // Sync Cache
    const user = await this.getById(userId);
    if (user) {
      user.pendingRole = requestedRole as any;
      const redis = await getRedis();
      if (redis) {
        await redis.hSet(USER_CACHE_PREFIX, userId, JSON.stringify(user));
      }
    }
  }

  /**
   * Clear a pending role request (Reject)
   * Returns true if clear was successful
   */
  static async clearPendingRole(userId: string): Promise<boolean> {
    const res = await db.query("UPDATE users SET pending_role = NULL WHERE id = $1 AND pending_role IS NOT NULL", [userId]);
    
    if ((res.rowCount ?? 0) === 0) return false;

    // Sync Cache
    const user = await this.getById(userId);
    if (user) {
      user.pendingRole = undefined;
      const redis = await getRedis();
      if (redis) {
        await redis.hSet(USER_CACHE_PREFIX, userId, JSON.stringify(user));
      }
    }
    return true;
  }

  /**
   * Delete a user - Atomic SQL + Purge Cache
   */
  static async delete(userId: string): Promise<void> {
    await db.query("DELETE FROM users WHERE id = $1", [userId]);
    
    const redis = await getRedis();
    if (redis) {
      await redis.hDel(USER_CACHE_PREFIX, userId);
    }
  }

  /**
   * Check if any admin exists
   */
  static async hasAdmin(): Promise<boolean> {
    const res = await db.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    return parseInt(res.rows[0].count) > 0;
  }
}
