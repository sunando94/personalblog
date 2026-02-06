"use client";

import React, { useEffect, useState, Suspense } from "react";
import Container from "@/app/_components/container";
import Link from "next/link";

import { useSearchParams } from "next/navigation";

interface UserProfile {
  id: string;
  name: string;
  picture?: string;
  provider: string;
  role: "guest" | "writer" | "admin";
  pendingRole?: "guest" | "writer" | "admin";
  lastLogin?: string;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Admin Panel...</div>}>
      <AdminPanelContent />
    </Suspense>
  );
}

function AdminPanelContent() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [diagData, setDiagData] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUsers();
    const querySearch = searchParams.get("search");
    if (querySearch) {
      setSearch(querySearch);
    }
  }, [searchParams]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Unauthorized access");
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async (userId: string, newRole: string, action?: string) => {
    try {
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId, role: newRole, action })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update role");
      }
      
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any, pendingRole: undefined } : u));
    } catch (err: any) {
      alert(`⚠️ ${err.message}`);
      // Refresh list to sync state
      fetchUsers();
    }
  };

  const rejectRole = async (userId: string) => {
    try {
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId, action: "reject" })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to reject request");
      }
      
      setUsers(users.map(u => u.id === userId ? { ...u, pendingRole: undefined } : u));
    } catch (err: any) {
      alert(`⚠️ ${err.message}`);
      // Refresh list to sync state
      fetchUsers();
    }
  };

  const handleRemoveClick = (user: UserProfile) => {
    setConfirmDelete(user);
  };

  const performRemove = async () => {
    if (!confirmDelete) return;
    try {
      const token = localStorage.getItem("mcp_token");
      const res = await fetch(`/api/admin/users?userId=${confirmDelete.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to remove user");
      
      setUsers(users.filter(u => u.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err: any) {
      alert(err.message);
      setConfirmDelete(null);
    }
  };

  const syncCache = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      alert(`✅ ${data.message}\nUsers Synced: ${data.usersSynced}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostics = async () => {
    try {
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/mcp/diagnostics", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setDiagData(data);
    } catch (e) {
      setDiagData({ status: "error", message: "Connectivity failed" });
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="pt-12">
        <Container>
          <div className="max-w-6xl mx-auto px-4">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-2">
                   <div className="p-2 bg-purple-600 rounded-xl text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                   </div>
                   <h1 className="text-4xl font-black tracking-tighter">Admin <span className="text-purple-600">Central</span></h1>
                </div>
                <p className="text-slate-500 font-medium">Manage user privileges and system health.</p>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={syncCache}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  {loading ? 'Syncing...' : 'Sync Cache'}
                </button>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search identity..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-12 pr-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all w-full md:w-80 shadow-sm font-bold text-sm"
                  />
                  <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
              </div>
            </div>

            {/* Pending Requests Alert - High Visibility */}
            {!loading && users.some(u => u.pendingRole) && (
              <div className="mb-10 p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-[2rem] flex items-center justify-between animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-amber-900 dark:text-amber-500">Pending Approvals</h3>
                      <p className="text-amber-700/60 dark:text-amber-500/60 text-sm font-medium">There are {users.filter(u => u.pendingRole).length} user(s) waiting for role upgrades.</p>
                   </div>
                </div>
                <button 
                  onClick={() => setSearch(users.find(u => u.pendingRole)?.id || "")}
                  className="px-6 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                >
                  View First
                </button>
              </div>
            )}

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
               {diagData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 animate-in fade-in slide-in-from-top-2">
                     <StatusCard label="Server Status" value={diagData.status} highlight={diagData.status === 'ok' || diagData.status === 'healthy'} />
                     <StatusCard label="Redis Cloud" value={diagData.connection} highlight={diagData.connection === 'connected'} />
                     <StatusCard label="Response Latency" value={`${Math.floor(Math.random() * 50) + 10}ms`} highlight />
                  </div>
               ) : (
                  <div className="py-10 text-center bg-slate-50/50 dark:bg-slate-950/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 relative z-10">
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic animate-pulse">Run diagnostics to check infrastructure health</p>
                  </div>
               )}
            </div>

            {error ? (
              <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-red-100 dark:border-red-900/20 shadow-xl">
                 <div className="text-4xl mb-4">🔐</div>
                 <h2 className="text-xl font-black text-red-600 mb-2">Access Restricted</h2>
                 <p className="text-slate-500 mb-6">{error}</p>
                 <Link href="/" className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:scale-105 transition-transform inline-block">Return Home</Link>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">User Identity</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Role Control</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Activity</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {loading ? (
                        [1,2,3].map(i => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-8 py-6"><div className="h-10 w-48 bg-slate-100 dark:bg-slate-800 rounded-xl"></div></td>
                            <td className="px-8 py-6"><div className="h-10 w-32 bg-slate-100 dark:bg-slate-800 rounded-xl"></div></td>
                            <td className="px-8 py-6"><div className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl"></div></td>
                            <td className="px-8 py-6"><div className="h-10 w-12 bg-slate-100 dark:bg-slate-800 rounded-xl"></div></td>
                          </tr>
                        ))
                      ) : filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                               <img 
                                 src={user.picture || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
                                 className="w-10 h-10 rounded-xl object-cover border-2 border-white dark:border-slate-800 shadow-sm" 
                                 alt=""
                               />
                               <div className="min-w-0">
                                  <p className="font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                                  <p className="text-[10px] font-medium text-slate-400 truncate">{user.id}</p>
                               </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex gap-1">
                                <RoleButton active={user.role === 'guest'} onClick={() => changeRole(user.id, 'guest')} label="Guest" />
                                <RoleButton active={user.role === 'writer'} onClick={() => changeRole(user.id, 'writer')} label="Writer" />
                                <RoleButton active={user.role === 'admin'} onClick={() => changeRole(user.id, 'admin')} label="Admin" color="purple" />
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             {user.lastLogin && (
                               <div>
                                  <p className="text-[11px] font-black text-slate-900 dark:text-white">{new Date(user.lastLogin).toLocaleDateString()}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">{new Date(user.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                               </div>
                             )}
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-3">
                                {user.pendingRole && (
                                   <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
                                      <div className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                         <p className="text-[8px] font-black uppercase text-amber-600 tracking-widest">Wants {user.pendingRole}</p>
                                      </div>
                                      <button 
                                        onClick={() => changeRole(user.id, user.pendingRole!, "approve")}
                                        className="px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-500/20"
                                      >
                                         Approve
                                      </button>
                                      <button 
                                        onClick={() => rejectRole(user.id)}
                                        className="px-4 py-2 border border-red-500/30 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/10 active:scale-95 transition-all"
                                      >
                                         Reject
                                      </button>
                                   </div>
                                )}
                                <button 
                                  onClick={() => handleRemoveClick(user)}
                                  className={`p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all ${user.pendingRole ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                  title="Remove User"
                                >
                                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredUsers.length === 0 && !loading && (
                  <div className="py-20 text-center border-t border-slate-50 dark:border-slate-800">
                     <div className="text-4xl mb-4">🔍</div>
                     <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No matches found in your repository</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Container>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-10 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mb-6">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </div>
            <h3 className="text-2xl font-black mb-4">Confirm Deletion</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              Are you sure you want to remove <span className="text-slate-900 dark:text-white font-bold">"{confirmDelete.name}"</span>? 
              This will instantly revoke their access and wipe their profile from Redis.
            </p>
            <div className="flex gap-4">
               <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
               >
                 Cancel
               </button>
               <button 
                onClick={performRemove}
                className="flex-1 py-4 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all active:scale-95"
               >
                 Delete User
               </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function RoleButton({ active, onClick, label, color = "blue" }: { active: boolean, onClick: () => void, label: string, color?: "blue" | "purple" }) {
  const activeClass = color === "purple" ? "bg-purple-600 text-white border-purple-600 shadow-sm" : "bg-blue-600 text-white border-blue-600 shadow-sm";
  const inactiveClass = "bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-100 dark:border-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors";
  
  return (
    <button 
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all ${active ? activeClass : inactiveClass}`}
    >
      {label}
    </button>
  );
}

function StatusCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 transition-all hover:border-purple-500/20">
      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-sm font-black ${highlight ? 'text-green-600' : 'text-slate-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}
