"use client";

import { useEffect, useState } from "react";
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

interface UsersTabProps {
  onSearchChange?: (search: string) => void;
  onSyncCache?: () => Promise<void>;
}

export default function UsersTabContent({ onSearchChange, onSyncCache }: UsersTabProps) {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
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

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.id.toLowerCase().includes(search.toLowerCase())
  );

  const RoleButton = ({ active, onClick, label, color = "indigo" }: any) => (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
        active 
          ? `bg-${color}-600 text-white shadow-lg shadow-${color}-500/20` 
          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      {/* Search Bar and Sync Cache */}
      <div className="mb-8 flex gap-4">
        <input
          type="text"
          placeholder="🔍 Search by name or ID..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onSearchChange?.(e.target.value);
          }}
          className="flex-1 px-6 py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors font-medium"
        />
        {onSyncCache && (
          <button
            onClick={onSyncCache}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap"
          >
            Sync Cache
          </button>
        )}
      </div>

      {/* Pending Requests Alert */}
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

      {/* Users Table */}
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

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-10 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Remove User?</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-white">{confirmDelete.name}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={performRemove}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
