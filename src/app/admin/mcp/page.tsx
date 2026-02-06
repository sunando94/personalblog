"use client";

import React, { useEffect, useState } from "react";
import Header from "@/app/_components/header";
import Container from "@/app/_components/container";

interface TokenInfo {
  clientId: string;
  issueDate: string;
  expiresAt: string;
  status: string;
}

interface AuditLog {
  type: string;
  clientId: string;
  timestamp: string;
  details: string;
}

export default function AdminDashboard() {
  const [data, setData] = useState<{ logs: AuditLog[], activeTokens: TokenInfo[] } | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchMetrics = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/metrics", {
        headers: { "Authorization": `Bearer ${adminKey}` }
      });
      if (!res.ok) throw new Error("Unauthorized access. Admin Secret required.");
      const metrics = await res.json();
      setData(metrics);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />
      <Container>
        <div className="py-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-black tracking-tight">Admin <span className="text-blue-600">Dashboard</span></h1>
              <p className="text-slate-500">Monitor MCP token generation and audit logs.</p>
            </div>
            
            <div className="flex gap-4">
              <input 
                type="password"
                placeholder="Admin Secret"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none"
              />
              <button 
                onClick={fetchMetrics}
                className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold"
              >
                Access Logs
              </button>
            </div>
          </div>

          {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-8">{error}</div>}

          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Active Tokens */}
              <section className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  Active OAuth2 Clients
                </h2>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-4 font-bold">Client ID</th>
                        <th className="px-6 py-4 font-bold">Issued At</th>
                        <th className="px-6 py-4 font-bold">Expires</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.activeTokens.map((t, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4 font-medium text-blue-600">{t.clientId}</td>
                          <td className="px-6 py-4 text-slate-500">{new Date(t.issueDate).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-slate-500">{new Date(t.expiresAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {data.activeTokens.length === 0 && (
                        <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400">No active tokens found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Audit Logs */}
              <section className="space-y-6">
                <h2 className="text-xl font-bold">Audit History</h2>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {data.logs.map((log, i) => (
                    <div key={i} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase text-blue-500 tracking-widest">{log.type}</span>
                        <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm font-bold mb-1">{log.clientId}</p>
                      <p className="text-xs text-slate-500">{log.details}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}
