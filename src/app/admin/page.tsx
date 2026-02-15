"use client";

import React, { useEffect, useState, Suspense } from "react";
import Container from "@/app/_components/container";
import Link from "next/link";
import UsersTabContent from "./_components/UsersTabContent";
import VectorsTabContent from "./_components/VectorsTabContent";
import AnalyticsTabContent from "./_components/AnalyticsTabContent";
import VisitorsTabContent from "./_components/VisitorsTabContent";
import PostsTabContent from "./_components/PostsTabContent";

import { useSearchParams } from "next/navigation";

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Admin Panel...</div>}>
      <AdminPanelContent />
    </Suspense>
  );
}

function AdminPanelContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [diagData, setDiagData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"users" | "vectors" | "analytics" | "posts" | "visitors">("users");

  const syncCache = async () => {
    try {
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to sync cache");
      alert("✅ Cache synchronized successfully!");
    } catch (err: any) {
      alert(`⚠️ ${err.message}`);
    }
  };

  const runDiagnostics = async () => {
    try {
      const token = localStorage.getItem("mcp_token");
      
      // Check PostgreSQL by testing users endpoint
      let postgresOk = false;
      try {
        const usersRes = await fetch("/api/admin/users", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        postgresOk = usersRes.ok;
      } catch {}
      
      // Check Redis by testing analytics endpoint (uses Redis cache)
      let redisOk = false;
      try {
        const analyticsRes = await fetch("/api/admin/analytics", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        redisOk = analyticsRes.ok;
      } catch {}
      
      setDiagData({
        postgres: postgresOk,
        redis: redisOk
      });
    } catch (err: any) {
      console.error("Diagnostics failed:", err.message);
      setDiagData({
        postgres: false,
        redis: false
      });
    }
  };

  useEffect(() => {
    const querySearch = searchParams.get("search");
    if (querySearch) {
      setSearch(querySearch);
    }
    
    // Run diagnostics on mount
    runDiagnostics();
    
    // Check authentication
    const token = localStorage.getItem("mcp_token");
    if (!token) {
      setError("Authentication required");
    }
  }, [searchParams]);

  const TabButton = ({ active, onClick, label, icon }: any) => (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
        active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12">
      <Container>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
              Admin Control Panel
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
              Manage users, content, and system infrastructure
            </p>
          </div>


          {/* Tabs */}
          <div className="flex gap-1 mb-8 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit">
            <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} label="Identity" />
            <TabButton active={activeTab === 'vectors'} onClick={() => setActiveTab('vectors')} label="Vector Index" icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>} />
            <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} label="Analytics" icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>} />
            <TabButton active={activeTab === 'visitors'} onClick={() => setActiveTab('visitors')} label="Visitors" icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>} />
            <TabButton active={activeTab === 'posts'} onClick={() => setActiveTab('posts')} label="Posts" icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>} />
          </div>

          {/* System Connectivity Card */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl mb-10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h2 className="text-xl font-black tracking-tight">System Connectivity</h2>
              <button 
                onClick={runDiagnostics}
                className="px-6 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition-all active:scale-95"
              >
                Ping Services
              </button>
            </div>

            {diagData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">PostgreSQL</span>
                    <span className={`w-2 h-2 rounded-full ${diagData.postgres ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500'}`}></span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{diagData.postgres ? 'Connected' : 'Disconnected'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Redis</span>
                    <span className={`w-2 h-2 rounded-full ${diagData.redis ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500'}`}></span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{diagData.redis ? 'Connected' : 'Disconnected'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Tab Content */}
          {error ? (
            <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-red-100 dark:border-red-900/20 shadow-xl">
              <div className="text-4xl mb-4">🔐</div>
              <h2 className="text-xl font-black text-red-600 mb-2">Access Restricted</h2>
              <p className="text-slate-500 mb-6">{error}</p>
              <Link href="/" className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:scale-105 transition-transform inline-block">Return Home</Link>
            </div>
          ) : activeTab === 'users' ? (
            <UsersTabContent onSearchChange={setSearch} onSyncCache={syncCache} />
          ) : activeTab === 'vectors' ? (
            <VectorsTabContent search={search} />
          ) : activeTab === 'analytics' ? (
            <AnalyticsTabContent />
          ) : activeTab === 'visitors' ? (
            <VisitorsTabContent />
          ) : activeTab === 'posts' ? (
            <PostsTabContent />
          ) : null}
        </div>
      </Container>
    </div>
  );
}
