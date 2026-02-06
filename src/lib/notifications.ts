import { createClient } from "redis";

const REDIS_URL = process.env.storage_REDIS_URL || process.env.REDIS_URL;

// Singleton Redis Client for notifications
let notificationRedisClient: any = null;
let redisAvailable = true;

// In-memory fallback
let inMemoryNotifications = new Map<string, { value: string; expiresAt: number }>();

export interface Notification {
  id: string;
  userId: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    href: string;
  };
}

async function getNotificationRedis() {
  if (!redisAvailable) {
    return null;
  }

  if (!notificationRedisClient && REDIS_URL) {
    try {
      notificationRedisClient = createClient({ url: REDIS_URL });
      notificationRedisClient.on("error", (err: any) => {
        console.error("Notification Redis Client Error", err);
        redisAvailable = false;
      });
      await notificationRedisClient.connect();
      console.log("✅ Notification Redis connected successfully");
    } catch (err) {
      console.warn("⚠️ Notification Redis unavailable, using in-memory storage fallback");
      redisAvailable = false;
      notificationRedisClient = null;
    }
  }
  return notificationRedisClient;
}

// In-memory helpers
function setInMemory(key: string, value: string, expirySeconds?: number) {
  const expiresAt = expirySeconds ? Date.now() + expirySeconds * 1000 : Infinity;
  inMemoryNotifications.set(key, { value, expiresAt });
}

function getInMemory(key: string): string | null {
  const item = inMemoryNotifications.get(key);
  if (!item) return null;
  if (item.expiresAt < Date.now()) {
    inMemoryNotifications.delete(key);
    return null;
  }
  return item.value;
}

function deleteInMemory(key: string) {
  inMemoryNotifications.delete(key);
}

function getAllKeysInMemory(pattern: string): string[] {
  const regex = new RegExp(pattern.replace('*', '.*'));
  return Array.from(inMemoryNotifications.keys()).filter(key => regex.test(key));
}

// 7 days TTL in seconds
const NOTIFICATION_TTL = 7 * 24 * 60 * 60;

/**
 * Create a new notification
 */
export async function createNotification(notification: Omit<Notification, "id" | "timestamp">): Promise<Notification> {
  const redis = await getNotificationRedis();
  
  const newNotification: Notification = {
    ...notification,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };

  const key = `notification:${notification.userId}:${newNotification.id}`;
  
  if (redis) {
    // Store notification with 7-day TTL
    await redis.set(key, JSON.stringify(newNotification), { EX: NOTIFICATION_TTL });
    
    // Add to user's notification list (sorted set with timestamp as score)
    await redis.zAdd(
      `user_notifications:${notification.userId}`,
      { score: Date.now(), value: newNotification.id }
    );
    
    // Set TTL on the sorted set as well
    await redis.expire(`user_notifications:${notification.userId}`, NOTIFICATION_TTL);
  } else {
    setInMemory(key, JSON.stringify(newNotification), NOTIFICATION_TTL);
  }

  return newNotification;
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
  const redis = await getNotificationRedis();
  const notifications: Notification[] = [];

  if (redis) {
    // Get notification IDs from sorted set (newest first)
    const notificationIds = await redis.zRange(`user_notifications:${userId}`, 0, -1, { REV: true });
    
    // Fetch each notification
    for (const id of notificationIds) {
      const key = `notification:${userId}:${id}`;
      const data = await redis.get(key);
      
      if (data) {
        const notification = JSON.parse(data);
        if (!unreadOnly || !notification.read) {
          notifications.push(notification);
        }
      } else {
        // Clean up stale reference
        await redis.zRem(`user_notifications:${userId}`, id);
      }
    }
  } else {
    // In-memory fallback
    const keys = getAllKeysInMemory(`notification:${userId}:*`);
    for (const key of keys) {
      const data = getInMemory(key);
      if (data) {
        const notification = JSON.parse(data);
        if (!unreadOnly || !notification.read) {
          notifications.push(notification);
        }
      }
    }
    
    // Sort by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  return notifications;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
  const redis = await getNotificationRedis();
  const key = `notification:${userId}:${notificationId}`;

  if (redis) {
    const data = await redis.get(key);
    if (!data) return false;

    const notification = JSON.parse(data);
    notification.read = true;

    // Update with same TTL
    const ttl = await redis.ttl(key);
    await redis.set(key, JSON.stringify(notification), { EX: ttl > 0 ? ttl : NOTIFICATION_TTL });
    return true;
  } else {
    const data = getInMemory(key);
    if (!data) return false;

    const notification = JSON.parse(data);
    notification.read = true;
    setInMemory(key, JSON.stringify(notification), NOTIFICATION_TTL);
    return true;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const redis = await getNotificationRedis();
  let count = 0;

  if (redis) {
    const notificationIds = await redis.zRange(`user_notifications:${userId}`, 0, -1);
    
    for (const id of notificationIds) {
      const key = `notification:${userId}:${id}`;
      const data = await redis.get(key);
      
      if (data) {
        const notification = JSON.parse(data);
        if (!notification.read) {
          notification.read = true;
          const ttl = await redis.ttl(key);
          await redis.set(key, JSON.stringify(notification), { EX: ttl > 0 ? ttl : NOTIFICATION_TTL });
          count++;
        }
      }
    }
  } else {
    const keys = getAllKeysInMemory(`notification:${userId}:*`);
    for (const key of keys) {
      const data = getInMemory(key);
      if (data) {
        const notification = JSON.parse(data);
        if (!notification.read) {
          notification.read = true;
          setInMemory(key, JSON.stringify(notification), NOTIFICATION_TTL);
          count++;
        }
      }
    }
  }

  return count;
}

/**
 * Delete a specific notification
 */
export async function deleteNotification(userId: string, notificationId: string): Promise<boolean> {
  const redis = await getNotificationRedis();
  const key = `notification:${userId}:${notificationId}`;

  if (redis) {
    await redis.del(key);
    await redis.zRem(`user_notifications:${userId}`, notificationId);
    return true;
  } else {
    deleteInMemory(key);
    return true;
  }
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(userId: string): Promise<number> {
  const redis = await getNotificationRedis();
  let count = 0;

  if (redis) {
    const notificationIds = await redis.zRange(`user_notifications:${userId}`, 0, -1);
    
    for (const id of notificationIds) {
      await redis.del(`notification:${userId}:${id}`);
      count++;
    }
    
    await redis.del(`user_notifications:${userId}`);
  } else {
    const keys = getAllKeysInMemory(`notification:${userId}:*`);
    for (const key of keys) {
      deleteInMemory(key);
      count++;
    }
  }

  return count;
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const notifications = await getUserNotifications(userId, true);
  return notifications.length;
}
