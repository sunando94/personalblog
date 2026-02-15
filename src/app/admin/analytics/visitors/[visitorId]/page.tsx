"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface VisitorDetail {
  visitor: {
    visitor_id: string;
    first_seen: string;
    last_seen: string;
    total_visits: number;
    total_page_views: number;
    user_name: string | null;
    user_email: string | null;
    user_picture: string | null;
    first_referrer: string;
    first_user_agent: string;
    device_type: string;
    country: string | null;
    city: string | null;
  };
  pageViews: Array<{
    id: string;
    path: string;
    session_id: string;
    user_agent: string;
    referrer: string;
    dwell_time_seconds: number;
    created_at: string;
  }>;
  sessions: Array<{
    session_id: string;
    page_views: number;
    session_start: string;
    session_end: string;
    total_dwell_time: number;
    entry_referrer: string;
  }>;
  pathBreakdown: Array<{
    path: string;
    views: number;
    avg_dwell_time: number;
    last_viewed: string;
  }>;
  activityPattern: Array<{
    hour: number;
    views: number;
  }>;
  dailyActivity: Array<{
    date: string;
    views: number;
    sessions: number;
  }>;
  stats: {
    totalPageViews: number;
    totalSessions: number;
    avgPagesPerSession: string;
    daysSinceFirstVisit: number;
    daysSinceLastVisit: number;
  };
}

export default function VisitorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const visitorId = params.visitorId as string;
  
  const [data, setData] = useState<VisitorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVisitorDetail();
  }, [visitorId]);

  const fetchVisitorDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/analytics/visitors/${visitorId}`, {
        credentials: "include"
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/");
          return;
        }
        throw new Error("Failed to fetch visitor details");
      }
      
      const visitorData = await res.json();
      setData(visitorData);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case "mobile": return "📱";
      case "tablet": return "📲";
      case "desktop": return "💻";
      default: return "🖥️";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading visitor details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.back()}
            className="mb-6 text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Analytics
          </button>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-red-800 dark:text-red-200 font-semibold">Error</h3>
            <p className="text-red-600 dark:text-red-400 mt-2">{error || "Visitor not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  const { visitor, pageViews, sessions, pathBreakdown, activityPattern, stats } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="mb-6 text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Analytics
        </button>

        {/* Visitor Profile */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 h-20 w-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {visitor.user_name ? visitor.user_name[0].toUpperCase() : visitor.visitor_id.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {visitor.user_name || `Visitor ${visitor.visitor_id.substring(0, 12)}`}
              </h1>
              {visitor.user_email && (
                <p className="text-gray-600 dark:text-gray-400 mt-1">{visitor.user_email}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  🌍 {visitor.city && visitor.country ? `${visitor.city}, ${visitor.country}` : visitor.country || "Unknown location"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  {getDeviceIcon(visitor.device_type)} {visitor.device_type}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  🔗 ID: {visitor.visitor_id}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Page Views
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
              {stats.totalPageViews}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Sessions
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
              {stats.totalSessions}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Avg Pages/Session
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
              {stats.avgPagesPerSession}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              First Visit
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-2">
              {stats.daysSinceFirstVisit}d ago
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Last Visit
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-2">
              {stats.daysSinceLastVisit === 0 ? "Today" : `${stats.daysSinceLastVisit}d ago`}
            </div>
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Most Viewed Pages
          </h2>
          <div className="space-y-3">
            {pathBreakdown.slice(0, 10).map((page) => (
              <div key={page.path} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {page.path}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Avg time: {formatDuration(Math.round(page.avg_dwell_time))}
                  </div>
                </div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {page.views} views
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Pattern */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Hourly Activity Pattern
          </h2>
          <div className="flex items-end gap-2 h-32">
            {Array.from({ length: 24 }, (_, i) => {
              const hourData = activityPattern.find(h => h.hour === i);
              const views = hourData?.views || 0;
              const maxViews = Math.max(...activityPattern.map(h => h.views), 1);
              const height = (views / maxViews) * 100;
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 dark:bg-blue-400 rounded-t transition-all hover:bg-blue-600 dark:hover:bg-blue-300"
                    style={{ height: `${height}%` }}
                    title={`${i}:00 - ${views} views`}
                  />
                  {i % 3 === 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {i}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Recent Sessions
          </h2>
          <div className="space-y-4">
            {sessions.slice(0, 10).map((session) => (
              <div key={session.session_id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Session {session.session_id.substring(0, 8)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(session.session_start)}
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div>{session.page_views} pages</div>
                  <div>Duration: {formatDuration(session.total_dwell_time)}</div>
                  {session.entry_referrer && (
                    <div>From: {new URL(session.entry_referrer).hostname.replace("www.", "")}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All Page Views */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            All Page Views ({pageViews.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Dwell Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Referrer
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {pageViews.map((view) => (
                  <tr key={view.id}>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {view.path}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(view.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDuration(view.dwell_time_seconds)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {view.referrer ? new URL(view.referrer).hostname.replace("www.", "") : "Direct"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
