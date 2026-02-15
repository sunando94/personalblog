"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  totalViews: number;
  uniqueVisitors: number;
  avgDwellTime: number;
  topPages: Array<{ path: string; views: number; avg_dwell: number }>;
  recentActivity: Array<{ hour: string; views: string }>;
}

interface StorageStats {
  raw_size: string;
  raw_count: string;
}

export default function AnalyticsTabContent() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchStorageStats();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/admin/analytics", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      setAnalytics(data);
    } catch (err: any) {
      console.error(err.message);
    }
  };

  const fetchStorageStats = async () => {
    try {
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/admin/analytics/optimize", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ mode: "analyze" })
      });
      if (res.ok) {
        const data = await res.json();
        setStorageStats(data);
      }
    } catch {}
  };

  const runOptimization = async () => {
    if (!confirm("This will aggregate raw logs older than 7 days into daily summaries and DELETE the raw entries to save space. Continue?")) return;
    
    try {
      setOptimizing(true);
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/admin/analytics/optimize", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ mode: "optimize", retentionDays: 7 })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchStorageStats();
        fetchAnalytics();
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      alert(`Optimization failed: ${e.message}`);
    } finally {
      setOptimizing(false);
    }
  };

  if (!analytics) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Page Views</p>
          <p className="text-4xl font-black text-slate-900 dark:text-white">{analytics.totalViews}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Unique Visitors</p>
          <p className="text-4xl font-black text-slate-900 dark:text-white">{analytics.uniqueVisitors}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Avg. Dwell Time</p>
          <p className="text-4xl font-black text-slate-900 dark:text-white">{analytics.avgDwellTime}s</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          <h3 className="text-lg font-black mb-6">Top Pages</h3>
          <div className="space-y-4">
            {analytics.topPages.map((page: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl">
                <div className="flex items-center gap-4">
                  <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-black rounded-lg">{i + 1}</span>
                  <div className="overflow-hidden">
                    <p className="font-bold text-sm truncate max-w-[200px]">{page.path}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm">{page.views} views</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{Math.round(page.avg_dwell || 0)}s avg</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          <h3 className="text-lg font-black mb-6">24h Activity</h3>
          <div className="h-64 flex items-end gap-2">
            {analytics.recentActivity.map((item: any, i: number) => {
              const max = Math.max(...analytics.recentActivity.map((a: any) => parseInt(a.views)));
              const height = max > 0 ? (parseInt(item.views) / max) * 100 : 0;
              return (
                <div key={i} className="flex-1 h-full flex flex-col items-center gap-2 group">
                  <div className="w-full flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg relative overflow-hidden group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/20 transition-colors">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-lg transition-all duration-1000"
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{new Date(item.hour).getHours()}h</span>
                </div>
              );
            })}
            {analytics.recentActivity.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                No recent data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Storage Management Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="text-xl font-black mb-2">Storage Optimization</h3>
            <p className="text-slate-400 text-sm max-w-xl">
              You are currently using close to your 1GB limit? Use this tool to compress raw analytics logs into daily summaries.
              This retains historical trends while freeing up significant space.
            </p>
          </div>
          <div className="flex items-center gap-6">
            {storageStats && (
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Size</p>
                <p className="text-2xl font-black">{storageStats.raw_size || '0 B'}</p>
                <p className="text-[10px] text-slate-500">{parseInt(storageStats.raw_count).toLocaleString()} raw rows</p>
              </div>
            )}
            <button 
              onClick={runOptimization}
              disabled={optimizing}
              className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
            >
              {optimizing ? 'Optimizing...' : 'Compress Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
