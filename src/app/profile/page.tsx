"use client";

import React, { useEffect, useState, Suspense } from "react";
import Container from "@/app/_components/container";
import { useSearchParams, useRouter } from "next/navigation";

export default function UserProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
       <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // UI State
  const [activeTab, setActiveTab] = useState<"identity" | "tools">("identity");
  
  // Token & Identity State
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [tokenScope, setTokenScope] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  
  // Generation State
  const [adminSecret, setAdminSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [diagData, setDiagData] = useState<any>(null);
  
  // Request Access State
  const [requestStatus, setRequestStatus] = useState<"idle" | "success" | "error">("idle");

  const handleRequestAccess = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/request-writer-access", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Request failed");
      
      setRequestStatus("success");
    } catch (err: any) {
      setError(err.message);
      setRequestStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const refreshState = () => {
    const token = localStorage.getItem("mcp_token");
    setActiveToken(token);
    if (token) {
      try {
        const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
        setTokenScope(payload.role || payload.scope || 'guest');
        if (payload.name) setClientId(payload.name);
      } catch (e) {
        console.error("JWT Decode failed", e);
      }
    } else {
      setTokenScope(null);
    }
  };

  useEffect(() => {
    // 1. Check URL for tokens (LinkedIn Redirect)
    const urlToken = searchParams.get("token");
    const tabParam = searchParams.get("tab") as "identity" | "tools";
    
    if (tabParam) setActiveTab(tabParam);

    if (urlToken) {
      localStorage.setItem("mcp_token", urlToken);
      window.dispatchEvent(new Event('mcp_auth_changed'));
      // Clean up URL without losing the tab param if possible, or just strip it
      const newUrl = window.location.pathname + (tabParam ? `?tab=${tabParam}` : '');
      window.history.replaceState({}, document.title, newUrl);
    }

    refreshState();

    const handleAuthChange = () => refreshState();
    window.addEventListener('mcp_auth_changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    
    return () => {
      window.removeEventListener('mcp_auth_changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [searchParams]);

  const currentUser = (() => {
    if (!activeToken) return null;
    try {
      return JSON.parse(decodeURIComponent(escape(atob(activeToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
    } catch (e) {
      return null;
    }
  })();

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: clientId || "guest-user",
          client_secret: adminSecret
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Generation failed");

      localStorage.setItem("mcp_token", data.access_token);
      window.dispatchEvent(new Event('mcp_auth_changed'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="py-12">
        <Container>
          <div className="max-w-5xl mx-auto px-4">
            
            {/* Page Header */}
            <div className="mb-10">
              <h1 className="text-4xl font-black tracking-tighter mb-2">My <span className="text-blue-600">Profile</span></h1>
              <p className="text-slate-500 font-medium">Manage your social identity and developer credentials.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 mb-10 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit border border-slate-200 dark:border-slate-800">
               <button 
                onClick={() => setActiveTab("identity")}
                className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'identity' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
               >
                 👤 Identity
               </button>
               <button 
                onClick={() => setActiveTab("tools")}
                className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'tools' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
               >
                 🔑 API Tokens
               </button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'identity' ? (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-blue-500/5">
                  <h2 className="text-2xl font-black tracking-tight mb-8">Social Profile</h2>
                  
                  {currentUser?.provider === 'linkedin' ? (
                    <div className="flex flex-col md:flex-row items-center gap-8 p-10 rounded-[2.5rem] bg-slate-50 dark:bg-slate-950 border border-blue-100 dark:border-blue-900/30">
                       <img 
                         src={currentUser.picture || `https://ui-avatars.com/api/?name=${currentUser.name}`} 
                         className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 shadow-2xl scale-110" 
                         alt=""
                       />
                       <div className="text-center md:text-left flex-1 min-w-0">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Connected via {currentUser.provider}</p>
                          <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3 truncate">{currentUser.name}</h3>
                          <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6">
                            <span className="px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-[10px] font-black uppercase">{currentUser.role || 'Guest'} Access</span>
                            <span className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase">Active Session</span>
                          </div>
                          <button 
                            onClick={() => { localStorage.removeItem("mcp_token"); window.dispatchEvent(new Event('mcp_auth_changed')); }}
                            className="px-6 py-2.5 rounded-xl bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          >
                            Disconnect LinkedIn
                          </button>
                       </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl text-3xl">🧩</div>
                      <h3 className="text-2xl font-black mb-4">Identity Required</h3>
                      <p className="text-slate-500 mb-10 max-w-md mx-auto font-medium">Authenticate with LinkedIn to personalize your workspace and unlock collaborative writing features.</p>
                      <a 
                        href="/api/auth/linkedin"
                        className="inline-flex items-center justify-center gap-4 px-10 py-5 rounded-2xl bg-[#0077b5] text-white font-black hover:bg-[#005582] transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                      >
                         <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                           <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                         </svg>
                         Login with LinkedIn
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                   {/* Left: Role Management & Tokens */}
                   <div className="lg:col-span-7 space-y-10">
                      
                      {currentUser?.role === 'guest' ? (
                        /* Guest View: Request Access */
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-blue-500/5">
                           <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl">🚀</div>
                           <h2 className="text-2xl font-black tracking-tight mb-4">Unlock Writer Privileges</h2>
                           <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                             Guests have read-only access. To write posts, commit changes, and use the neural writing tools, you need to request <span className="text-blue-600 font-bold">Writer Access</span>.
                           </p>
                           
                           {requestStatus === 'success' ? (
                             <div className="p-6 bg-green-50 dark:bg-green-900/20 text-green-600 font-bold rounded-2xl border border-green-100 dark:border-green-800 flex items-center gap-3">
                               <span className="text-xl">✅</span>
                               Your request for Writer access has been sent.
                             </div>
                           ) : (
                             <button 
                               onClick={handleRequestAccess}
                               disabled={loading}
                               className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50 disabled:scale-100"
                             >
                               {loading ? "Sending Request..." : "Request Writer Access"}
                             </button>
                           )}
                           {error && <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-bold border border-red-100 dark:border-red-900/30">⚠️ {error}</div>}
                        </div>
                      ) : currentUser?.role === 'writer' ? (
                        /* Writer View: Request Admin */
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-purple-500/5">
                           <div className="bg-purple-50 dark:bg-purple-900/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl">⚡️</div>
                           <h2 className="text-2xl font-black tracking-tight mb-4">Upgrade to Admin</h2>
                           <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                             You have Writer privileges. To manage users, configure system settings, and oversee the platform, request <span className="text-purple-600 font-bold">Admin Access</span>.
                           </p>
                           
                           {requestStatus === 'success' ? (
                             <div className="p-6 bg-green-50 dark:bg-green-900/20 text-green-600 font-bold rounded-2xl border border-green-100 dark:border-green-800 flex items-center gap-3">
                               <span className="text-xl">✅</span>
                               Your request for Admin access has been sent.
                             </div>
                           ) : (
                             <button 
                               onClick={handleRequestAccess}
                               disabled={loading}
                               className="w-full py-5 rounded-2xl bg-purple-600 text-white font-black hover:bg-purple-700 transition-all shadow-xl shadow-purple-600/20 active:scale-95 disabled:opacity-50 disabled:scale-100"
                             >
                               {loading ? "Sending Request..." : "Request Admin Access"}
                             </button>
                           )}
                           {error && <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-bold border border-red-100 dark:border-red-900/30">⚠️ {error}</div>}
                        </div>
                      ) : currentUser?.role === 'admin' ? (
                        /* Admin View: Status */
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                           <div className="bg-slate-900 text-white w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl relative z-10">🛡️</div>
                           <h2 className="text-2xl font-black tracking-tight mb-4 relative z-10">System Administrator</h2>
                           <p className="text-slate-500 font-medium mb-8 leading-relaxed relative z-10">
                             You have full control over the platform. You can manage users, generate tokens, and configure global settings from the Admin Panel.
                           </p>
                           <a href="/admin" className="inline-block px-8 py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform relative z-10">
                             Go to Admin Panel
                           </a>
                        </div>
                      ) : (
                        /* Fallback: Not Authenticated */
                         <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center text-center">
                            <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl">🔒</div>
                            <h2 className="text-2xl font-black tracking-tight mb-4">Authentication Required</h2>
                            <p className="text-slate-500 font-medium mb-8 leading-relaxed max-w-sm">
                              Please sign in with LinkedIn to view your access level and manage API tokens.
                            </p>
                            <button 
                              onClick={() => setActiveTab("identity")}
                              className="px-8 py-4 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                            >
                              Go to Login
                            </button>
                         </div>
                      )}

                   </div>

                   {/* Right: JWT Display (Only for Writers/Admins) */}
                   <div className="lg:col-span-5">
                      {currentUser?.role !== 'guest' && (
                        <div className="bg-slate-950 rounded-[2.5rem] p-10 text-white border border-slate-800 shadow-2xl h-full flex flex-col relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                Live Access Token
                              </h3>
                              {activeToken ? (
                                <div className="flex-1 flex flex-col">
                                  <div className="flex-1 p-8 bg-black/50 rounded-3xl font-mono text-[11px] break-all border border-white/5 text-blue-300/60 leading-relaxed overflow-auto max-h-[500px] shadow-inner">
                                    {activeToken}
                                  </div>
                                  <button 
                                    onClick={() => navigator.clipboard.writeText(activeToken)}
                                    className="mt-8 w-full py-5 rounded-2xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-95 shadow-sm"
                                  >
                                    Copy Credentials
                                  </button>
                                </div>
                              ) : (
                                <div className="flex-1 flex flex-col items-center justify-center py-32 text-center text-slate-500 italic text-xs px-10">
                                  <div className="text-5xl mb-6 opacity-20">🎫</div>
                                  <p>Secure session expired. Generate a new token to interact with the API.</p>
                                </div>
                              )}
                        </div>
                      )}
                      
                      {currentUser?.role === 'guest' && (
                        <div className="h-full bg-slate-100 dark:bg-slate-900/50 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 border-dashed flex flex-col items-center justify-center text-center opacity-75">
                           <div className="text-5xl mb-6 opacity-30 grayscale">🔒</div>
                           <h3 className="text-lg font-bold text-slate-400 mb-2">Access Token Locked</h3>
                           <p className="text-slate-500 text-xs font-medium max-w-xs">Writer access tokens are only available to approved contributors. Please request access to continue.</p>
                        </div>
                      )}
                   </div>
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>
    </main>
  );
}

