"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Visitor {
  visitor_id: string;
  first_seen: string;
  last_seen: string;
  total_visits: number;
  total_page_views: number;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  first_referrer: string;
  first_user_agent: string;
  device_type: string;
  country: string | null;
  city: string | null;
  recent_pages: Array<{
    path: string;
    created_at: string;
    dwell_time_seconds: number;
  }>;
}

interface VisitorStats {
  totalViews: number;
  uniqueVisitors: number;
  avgDwellTime: number;
  newVisitors: number;
  returningVisitors: number;
  deviceBreakdown: Array<{ device_type: string; count: string }>;
  topReferrers: Array<{ first_referrer: string; count: string }>;
}

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("last_seen");
  const [deviceFilter, setDeviceFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, [page, sortBy, deviceFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem("mcp_token");
      
      // Fetch stats
      const statsRes = await fetch("/api/admin/analytics", {
        headers: token ? {
          "Authorization": `Bearer ${token}`
        } : {}
      });
      
      if (!statsRes.ok) {
        if (statsRes.status === 401) {
          router.push("/");
          return;
        }
        throw new Error("Failed to fetch stats");
      }
      
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch visitors
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sortBy,
        sortOrder: "DESC"
      });
      
      if (deviceFilter) {
        params.append("device", deviceFilter);
      }

      const visitorsRes = await fetch(`/api/admin/analytics/visitors?${params}`, {
        headers: token ? {
          "Authorization": `Bearer ${token}`
        } : {}
      });
      
      if (!visitorsRes.ok) {
        if (visitorsRes.status === 401) {
          router.push("/");
          return;
        }
        throw new Error("Failed to fetch visitors");
      }
      
      const visitorsData = await visitorsRes.json();
      setVisitors(visitorsData.visitors);
      setTotalPages(visitorsData.pagination.totalPages);
      
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case "mobile": return "📱";
      case "tablet": return "📲";
      case "desktop": return "💻";
      default: return "🖥️";
    }
  };

  const getLocationString = (visitor: Visitor) => {
    if (visitor.city && visitor.country) {
      return `${visitor.city}, ${visitor.country}`;
    }
    if (visitor.country) {
      return visitor.country;
    }
    return "Unknown";
  };

  const getReferrerDomain = (url: string) => {
    if (!url) return "Direct";
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      return domain;
    } catch {
      return "Direct";
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-red-800 dark:text-red-200 font-semibold">Error</h3>
            <p className="text-red-600 dark:text-red-400 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Visitor Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time insights into your blog visitors
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Views
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.totalViews.toLocaleString()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Unique Visitors
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.uniqueVisitors.toLocaleString()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                New Visitors (7d)
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {stats.newVisitors.toLocaleString()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Returning (7d)
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {stats.returningVisitors.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="last_seen">Last Seen</option>
                <option value="first_seen">First Seen</option>
                <option value="total_visits">Total Visits</option>
                <option value="total_page_views">Total Page Views</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Device
              </label>
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Devices</option>
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
              </select>
            </div>
          </div>
        </div>

        {/* Visitors Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Visitor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {visitors.map((visitor) => (
                  <tr
                    key={visitor.visitor_id}
                    onClick={() => router.push(`/admin/analytics/visitors/${visitor.visitor_id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {visitor.user_name ? visitor.user_name[0].toUpperCase() : visitor.visitor_id.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {visitor.user_name || `Visitor ${visitor.visitor_id.substring(0, 8)}`}
                          </div>
                          {visitor.user_email && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {visitor.user_email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        🌍 {getLocationString(visitor)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {getDeviceIcon(visitor.device_type)} {visitor.device_type}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {getReferrerDomain(visitor.first_referrer)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {visitor.total_visits} visits
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {visitor.total_page_views} pages
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(visitor.last_seen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
