import { NotificationStore } from "./stores/notification-store";

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
  primaryAction?: {
    label: string;
    endpoint: string;
    method: "POST" | "PATCH" | "DELETE";
    body?: any;
    successMessage?: string;
  };
}

/**
 * Create a new notification - Delegated to Store (Automatic Cache Invalidation)
 */
export async function createNotification(notification: Omit<Notification, "id" | "timestamp">): Promise<Notification> {
  return NotificationStore.create(notification);
}

/**
 * Get all notifications for a user - Delegated to Store (Automatic Cache-Aside)
 */
export async function getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
  return NotificationStore.getByUser(userId, unreadOnly);
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
  return NotificationStore.markAsRead(userId, notificationId);
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  return NotificationStore.markAllAsRead(userId);
}

/**
 * Delete a specific notification
 */
export async function deleteNotification(userId: string, notificationId: string): Promise<boolean> {
  return NotificationStore.delete(userId, notificationId);
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(userId: string): Promise<number> {
  return NotificationStore.deleteAll(userId);
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return NotificationStore.getUnreadCount(userId);
}
