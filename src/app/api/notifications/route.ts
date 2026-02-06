import { NextResponse } from "next/server";
import {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
  type Notification,
} from "@/lib/notifications";

export type { Notification };

/**
 * GET /api/notifications
 * Query params:
 * - userId: Filter notifications by user ID
 * - unreadOnly: If "true", only return unread notifications
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const notifications = await getUserNotifications(userId, unreadOnly);
    const unreadCount = await getUnreadCount(userId);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Body: { userId, type, title, message, action? }
 * Creates a new notification with 7-day TTL
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, type, title, message, action } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: "userId, type, title, and message are required" },
        { status: 400 }
      );
    }

    const notification = await createNotification({
      userId,
      type,
      title,
      message,
      read: false,
      action,
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Body: { userId, notificationId?, markAllRead? }
 * Mark notification(s) as read
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, notificationId, markAllRead } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (markAllRead) {
      const count = await markAllNotificationsAsRead(userId);
      return NextResponse.json({ success: true, count });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId is required when markAllRead is false" },
        { status: 400 }
      );
    }

    const success = await markNotificationAsRead(userId, notificationId);
    if (!success) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * Query params:
 * - userId: User ID (required)
 * - notificationId: Specific notification to delete (optional)
 * If notificationId is not provided, deletes all notifications for the user
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (notificationId) {
      await deleteNotification(userId, notificationId);
    } else {
      await deleteAllNotifications(userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
