import { db } from "../db";
import { Notification } from "../notifications";
import { getRedis } from "../redis";

const NOTIF_CACHE_PREFIX = "user_notifications:";
const UNREAD_COUNT_PREFIX = "user_unread_count:";

export class NotificationStore {
  /**
   * Create a new notification - SQL + Invalidate Cache
   */
  static async create(notification: Omit<Notification, "id" | "timestamp">): Promise<Notification> {
    const res = await db.query(`
      INSERT INTO notifications (
        user_id, type, title, message, is_read, 
        action_label, action_href, 
        primary_action_label, primary_action_endpoint, primary_action_method, primary_action_body, primary_action_success_message
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      notification.userId,
      notification.type,
      notification.title,
      notification.message,
      notification.read,
      notification.action?.label || null,
      notification.action?.href || null,
      notification.primaryAction?.label || null,
      notification.primaryAction?.endpoint || null,
      notification.primaryAction?.method || null,
      notification.primaryAction?.body ? JSON.stringify(notification.primaryAction.body) : null,
      notification.primaryAction?.successMessage || null
    ]);

    const row = res.rows[0];
    
    // Invalidate Caches
    const redis = await getRedis();
    if (redis) {
      await redis.del(`${NOTIF_CACHE_PREFIX}${notification.userId}:all`);
      await redis.del(`${NOTIF_CACHE_PREFIX}${notification.userId}:unread`);
      await redis.del(`${UNREAD_COUNT_PREFIX}${notification.userId}`);
    }

    return this.mapRowToNotification(row);
  }

  /**
   * Get notifications locally from Cache-Aside
   */
  static async getByUser(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const redis = await getRedis();
    const cacheKey = `${NOTIF_CACHE_PREFIX}${userId}:${unreadOnly ? 'unread' : 'all'}`;

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    let query = "SELECT * FROM notifications WHERE user_id = $1";
    const params = [userId];

    if (unreadOnly) {
      query += " AND is_read = FALSE";
    }

    query += " ORDER BY created_at DESC LIMIT 50";

    const res = await db.query(query, params);
    const notifications = res.rows.map(row => this.mapRowToNotification(row));

    // Cache results for 5 minutes
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(notifications), { EX: 300 });
    }

    return notifications;
  }

  /**
   * Get unread count with Cache-Aside
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const redis = await getRedis();
    const cacheKey = `${UNREAD_COUNT_PREFIX}${userId}`;

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return parseInt(cached);
    }

    const res = await db.query(
      "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
      [userId]
    );
    const count = parseInt(res.rows[0].count);

    if (redis) {
      await redis.set(cacheKey, count.toString(), { EX: 600 });
    }

    return count;
  }

  /**
   * Mark as read - Update SQL + Invalidate Cache
   */
  static async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const res = await db.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
      [notificationId, userId]
    );
    
    if ((res.rowCount ?? 0) > 0) {
      const redis = await getRedis();
      if (redis) {
        await redis.del(`${NOTIF_CACHE_PREFIX}${userId}:all`);
        await redis.del(`${NOTIF_CACHE_PREFIX}${userId}:unread`);
        await redis.del(`${UNREAD_COUNT_PREFIX}${userId}`);
      }
      return true;
    }
    return false;
  }

  /**
   * Mark all as read
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const res = await db.query(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
      [userId]
    );
    
    const redis = await getRedis();
    if (redis) {
      await redis.del(`${NOTIF_CACHE_PREFIX}${userId}:all`);
      await redis.del(`${NOTIF_CACHE_PREFIX}${userId}:unread`);
      await redis.del(`${UNREAD_COUNT_PREFIX}${userId}`);
    }
    
    return res.rowCount ?? 0;
  }

  /**
   * Delete - Update SQL + Invalidate Cache
   */
  static async delete(userId: string, notificationId: string): Promise<boolean> {
    const res = await db.query(
      "DELETE FROM notifications WHERE id = $1 AND user_id = $2",
      [notificationId, userId]
    );
    
    if ((res.rowCount ?? 0) > 0) {
      const redis = await getRedis();
      if (redis) {
        await redis.del(`${NOTIF_CACHE_PREFIX}${userId}:all`);
        await redis.del(`${NOTIF_CACHE_PREFIX}${userId}:unread`);
        await redis.del(`${UNREAD_COUNT_PREFIX}${userId}`);
      }
      return true;
    }
    return false;
  }

  /**
   * resolveRoleRequest - Deletes all "Role Upgrade Request" notifications for all admins
   * ensures admins are in sync after a request is handled.
   */
  static async resolveRoleRequest(targetUserId: string): Promise<void> {
    
    // 1. Find all affected admin userIds before deleting
    const findRes = await db.query(
      "SELECT DISTINCT user_id FROM notifications WHERE primary_action_body->>'userId' = $1",
      [targetUserId]
    );
    const adminIds = findRes.rows.map(r => r.user_id);

    // 2. Perform bulk delete
    await db.query(
      "DELETE FROM notifications WHERE primary_action_body->>'userId' = $1",
      [targetUserId]
    );

    // 3. Clear caches for all affected admins
    const redis = await getRedis();
    if (redis && adminIds.length > 0) {
      for (const adminId of adminIds) {
        await redis.del(`${NOTIF_CACHE_PREFIX}${adminId}:all`);
        await redis.del(`${NOTIF_CACHE_PREFIX}${adminId}:unread`);
        await redis.del(`${UNREAD_COUNT_PREFIX}${adminId}`);
      }
    }
  }

  /**
   * Delete All
   */
  static async deleteAll(userId: string): Promise<number> {
    const res = await db.query("DELETE FROM notifications WHERE user_id = $1", [userId]);
    
    const redis = await getRedis();
    if (redis) {
      await redis.del(`${NOTIF_CACHE_PREFIX}${userId}:all`);
      await redis.del(`${NOTIF_CACHE_PREFIX}${userId}:unread`);
      await redis.del(`${UNREAD_COUNT_PREFIX}${userId}`);
    }

    return res.rowCount ?? 0;
  }

  private static mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as any,
      title: row.title,
      message: row.message,
      timestamp: row.created_at.toISOString(),
      read: row.is_read,
      action: row.action_label ? { label: row.action_label, href: row.action_href } : undefined,
      primaryAction: row.primary_action_label ? {
          label: row.primary_action_label,
          endpoint: row.primary_action_endpoint,
          method: row.primary_action_method as any,
          body: row.primary_action_body,
          successMessage: row.primary_action_success_message
      } : undefined
    };
  }
}
