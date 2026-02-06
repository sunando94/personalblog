"use client";

import { useState, useEffect, useCallback } from "react";
import Container from "@/app/_components/container";
import Link from "next/link";

interface Notification {
  id: string;
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

// Get or create a persistent user ID for this browser
function getUserId(): string {
  if (typeof window === "undefined") return "anonymous";
  
  let userId = localStorage.getItem("notification_user_id");
  if (!userId) {
    userId = `user_${crypto.randomUUID()}`;
    localStorage.setItem("notification_user_id", userId);
  }
  return userId;
}

// Format timestamp to relative time
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Determine User ID (Reactive to Auth Changes)
  useEffect(() => {
    const resolveUserId = () => {
      // 1. Try Authenticated User
      const token = localStorage.getItem("mcp_token");
      if (token) {
        try {
          const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
          if (payload.sub) return payload.sub;
        } catch (e) {}
      }
      
      // 2. Fallback to Guest ID
      let guestId = localStorage.getItem("notification_user_id");
      if (!guestId) {
        guestId = `user_${crypto.randomUUID()}`;
        localStorage.setItem("notification_user_id", guestId);
      }
      return guestId;
    };

    setUserId(resolveUserId());

    const handleAuthChange = () => setUserId(resolveUserId());
    window.addEventListener('mcp_auth_changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    
    return () => {
      window.removeEventListener('mcp_auth_changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      setError(null);
      const response = await fetch(`/api/notifications?userId=${userId}&unreadOnly=${filter === "unread"}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId, filter]);

  // Initial fetch and auto-refresh every 30 seconds
  useEffect(() => {
    if (userId) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications, userId]);

  const filteredNotifications = notifications;

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, notificationId: id }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, markAllRead: true }),
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const clearAll = async () => {
    if (confirm("Clear all notifications? This action cannot be undone.")) {
      try {
        const response = await fetch(`/api/notifications?userId=${userId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setNotifications([]);
          setUnreadCount(0);
        }
      } catch (err) {
        console.error("Error clearing notifications:", err);
      }
    }
  };

  const handlePrimaryAction = async (notificationId: string, action: any) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("mcp_token");
      const response = await fetch(action.endpoint, {
        method: action.method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(action.body),
      });

      if (response.ok) {
        // Mark as read and maybe show success toast/message
        await markAsRead(notificationId);
        if (action.successMessage) {
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, message: `✅ ${action.successMessage}`, primaryAction: undefined } : n));
        }
      } else {
        const data = await response.json();
        alert(`Action failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
        alert(`Error: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return (
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case "info":
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case "warning":
        return (
          <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case "error":
        return (
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="pt-12">
        <Container>
          <div className="max-w-4xl mx-auto px-4">
            
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                  </svg>
                </div>
                <h1 className="text-4xl font-black tracking-tighter">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-sm font-black">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-slate-500 font-medium">
                Stay updated with your latest activity • Auto-refreshes every 30s
              </p>
            </div>

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-600 font-bold">{error}</p>
                  <button
                    onClick={fetchNotifications}
                    className="ml-auto px-4 py-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between mb-6 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    filter === "all"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setFilter("unread")}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    filter === "unread"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                {loading && (
                  <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </div>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                  Clear all
                </button>
              </div>
            </div>

            {/* Notifications List */}
            {loading && notifications.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-16 border border-slate-100 dark:border-slate-800 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="animate-spin h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Loading notifications...</h3>
                <p className="text-slate-500">Please wait while we fetch your notifications</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-16 border border-slate-100 dark:border-slate-800 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No notifications</h3>
                <p className="text-slate-500">You're all caught up! Check back later for updates.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl p-6 border transition-all hover:shadow-lg ${
                      notification.read
                        ? "border-slate-100 dark:border-slate-800"
                        : "border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {getIcon(notification.type)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-black text-slate-900 dark:text-white">
                            {notification.title}
                          </h3>
                          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center gap-3">
                          {notification.primaryAction && (
                            <button
                              onClick={() => handlePrimaryAction(notification.id, notification.primaryAction)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                            >
                              {notification.primaryAction.label}
                            </button>
                          )}

                          {notification.action && (
                            <Link
                              href={notification.action.href}
                              className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                              {notification.action.label} →
                            </Link>
                          )}
                          
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                              {notification.primaryAction ? "Dismiss" : "Mark as read"}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-indigo-600 mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Back Button */}
            <div className="mt-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </Container>
      </div>
    </main>
  );
}
