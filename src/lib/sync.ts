import { UserStore } from "./stores/user-store";
import { getRedis } from "./redis";
import { AuditStore } from "./stores/audit-store";

/**
 * Sync Service
 * Handles periodic reconciliation between PostgreSQL (Source of Truth) and Redis (Performance Cache)
 */
export class SyncService {
  private static isSyncing = false;
  private static lastSyncTimestamp: number = 0;
  private static SYNC_COOLDOWN = 60 * 1000; // Min 1 minute between full syncs

  /**
   * Performs a full reconciliation of the cache from the database
   */
  static async reconcile(force: boolean = false): Promise<{ usersSynced: number; timestamp: string }> {
    if (this.isSyncing) throw new Error("Synchronization already in progress");
    
    // Rate limit check
    const now = Date.now();
    if (!force && (now - this.lastSyncTimestamp < this.SYNC_COOLDOWN)) {
      console.log("🕒 Sync skipped (already synced recently)");
      return { usersSynced: 0, timestamp: new Date(this.lastSyncTimestamp).toISOString() };
    }

    this.isSyncing = true;
    console.log("🔄 [SyncService] Starting periodic cache-to-database reconciliation...");
    
    const startTime = Date.now();
    let usersSynced = 0;

    try {
      const redis = await getRedis();
      if (!redis) {
        console.warn("⚠️ Redis unavailable, sync cancelled.");
        return { usersSynced: 0, timestamp: new Date().toISOString() };
      }

      // 1. Re-sync Users
      const users = await UserStore.getAll();
      for (const user of users) {
        await redis.hSet("mcp_social_profiles", user.id, JSON.stringify(user));
        usersSynced++;
      }

      // 2. Clear transient notification caches (they will be repopulated on next read)
      const keys = await redis.keys("user_notifications:*");
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`🧹 [SyncService] Cleared ${keys.length} notification list caches.`);
      }

      const unreadKeys = await redis.keys("user_unread_count:*");
      if (unreadKeys.length > 0) {
        await redis.del(unreadKeys);
        console.log(`🧹 [SyncService] Cleared ${unreadKeys.length} unread count caches.`);
      }

      this.lastSyncTimestamp = Date.now();
      const duration = Date.now() - startTime;
      
      console.log(`✅ [SyncService] Reconciled ${usersSynced} users in ${duration}ms.`);
      
      await AuditStore.log("CACHE_SYNC", null, { usersSynced, duration });

      return { usersSynced, timestamp: new Date(this.lastSyncTimestamp).toISOString() };
    } catch (e: any) {
      console.error("❌ [SyncService] Reconciliation failed:", e.message);
      throw e;
    } finally {
      this.isSyncing = false;
    }
  }
}
