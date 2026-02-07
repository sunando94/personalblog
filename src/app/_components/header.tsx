"use client";

import Link from "next/link";
import { Logo } from "./logo";
import Container from "./container";
import { useState, useEffect } from "react";

const Header = () => {
  const [user, setUser] = useState<{ name: string; picture?: string; scope?: string; role?: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUser = () => {
    const token = localStorage.getItem("mcp_token");
    if (token) {
      try {
        const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
        if (payload.name) {
          setUser({ name: payload.name, picture: payload.picture, scope: payload.scope, role: payload.role });
        }
      } catch (e) {
        console.error("Failed to parse token for header", e);
      }
    } else {
      setUser(null);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      let userId = localStorage.getItem("notification_user_id");
      
      // PRIORITY FIX: Use Authenticated User ID if logged in
      const token = localStorage.getItem("mcp_token");
      if (token) {
        try {
          const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
          if (payload.sub) {
             userId = payload.sub;
          }
        } catch (e) {
          // Token invalid, fall back to guest ID
        }
      }

      if (!userId) {
        // Create if doesn't exist to ensure we have a persistent ID for guests
        userId = `user_${crypto.randomUUID()}`;
        localStorage.setItem("notification_user_id", userId);
      }
      
      const response = await fetch(`/api/notifications?userId=${userId}&unreadOnly=true`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notification count", error);
    }
  };

  useEffect(() => {
    // 1. Initial Load
    refreshUser();
    fetchUnreadCount();

    // 2. Listen for URL tokens (immediate update after redirect)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("token");
      if (urlToken) {
        localStorage.setItem("mcp_token", urlToken);
        refreshUser();
      }
    }

    // 3. Listen for changes from other tabs or same-tab manual dispatches
    window.addEventListener('storage', refreshUser);
    window.addEventListener('mcp_auth_changed', refreshUser);
    
    // Refresh notifications every 30s
    const notificationInterval = setInterval(fetchUnreadCount, 30000);
    
    return () => {
      window.removeEventListener('storage', refreshUser);
      window.removeEventListener('mcp_auth_changed', refreshUser);
      clearInterval(notificationInterval);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("mcp_token");
    window.location.reload();
  };

  // Static title for consistent branding
  const displayTitle = "Sudo Make Me Sandwich";

  return (
    <header className="py-6 border-b border-gray-100 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <Container>
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="group relative inline-block"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative bg-white dark:bg-slate-800 rounded-lg p-1 border-2 border-transparent group-hover:border-blue-500 dark:group-hover:border-blue-400 transition-all duration-300 overflow-hidden flex items-center justify-center">
                  <Logo className="w-8 h-8 text-black dark:text-white" />
                </div>
              </div>
              <div className="hidden sm:block text-left">
                <h1 className="text-xl font-black tracking-tight leading-none overflow-hidden">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {displayTitle}
                  </span>
                </h1>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                  Stories & Insights
                </p>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-8">
            <nav className="hidden lg:flex items-center gap-6">
              <NavLink href="/">Home</NavLink>
              <NavLink href="/posts">Posts</NavLink>
              <NavLink href="/portfolio">Portfolio</NavLink>
              <NavLink href="/browser-writer">Contribute</NavLink>
            </nav>

            <div className="flex items-center gap-4 pl-8 border-l border-gray-100 dark:border-slate-800 h-8">
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group focus:outline-none border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                >
                  <div className="relative">
                    <img 
                      src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name || 'Guest'}&background=random`} 
                      alt={user?.name || 'Guest'} 
                      className="w-8 h-8 rounded-full object-cover shadow-sm"
                    />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-slate-950 rounded-full flex items-center justify-center">
                        <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-black text-gray-900 dark:text-white hidden sm:block">
                    {user?.name || 'Guest'}
                  </span>
                  <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    
                    {/* Top Branding/Identity */}
                    <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-50 dark:border-slate-800">
                      <img 
                        src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name || 'Guest'}&background=random`} 
                        alt={user?.name || 'Guest'} 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 dark:text-white truncate">{user?.name || 'Guest User'}</p>
                        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest leading-none mt-1">{user?.scope || 'Public'} Session</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"></path></svg>
                    </div>

                    {/* Main Actions */}
                    <div className="py-2">
                      {user?.role === 'admin' && (
                        <Link 
                          href="/admin" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                        >
                          <span className="text-gray-400 group-hover:text-purple-600 transition-colors"><ShieldIcon /></span>
                          <span className="text-sm font-bold text-gray-700 dark:text-slate-200 group-hover:text-purple-600 transition-colors">Admin Panel</span>
                        </Link>
                      )}
                      <Link 
                        href="/profile?tab=identity" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                      >
                        <span className="text-gray-400 group-hover:text-blue-600 transition-colors"><UserIcon /></span>
                        <span className="text-sm font-bold text-gray-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors">My Profile</span>
                      </Link>
                      <Link 
                        href="/profile?tab=tools" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                      >
                        <span className="text-gray-400 group-hover:text-blue-600 transition-colors"><KeyIcon /></span>
                        <span className="text-sm font-bold text-gray-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors">API Token</span>
                      </Link>
                      <Link 
                        href="/notifications" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group relative"
                      >
                        <span className="text-gray-400 group-hover:text-indigo-600 transition-colors"><BellIcon /></span>
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </Link>
                      <Link 
                        href="/settings" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                      >
                        <span className="text-gray-400 group-hover:text-indigo-600 transition-colors"><SettingsIcon /></span>
                        <span className="text-sm font-bold text-gray-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">Settings</span>
                      </Link>
                      {user && (
                        <button 
                          onClick={logout}
                          className="w-full flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group border-t border-slate-50 dark:border-slate-800 mt-2"
                        >
                          <span className="text-gray-400 group-hover:text-red-500 transition-colors"><LogoutIcon /></span>
                          <span className="text-sm font-bold text-gray-700 dark:text-slate-200 group-hover:text-red-500 transition-colors">Log Out</span>
                        </button>
                      )}
                    </div>

                    {/* Footer / Context Switcher */}
                    {!user && (
                      <Link href="/profile" className="w-full flex items-center gap-4 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white border border-blue-500">
                           <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-blue-600">Connect LinkedIn</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest text-[11px]">
      {children}
    </Link>
  );
}

function DropdownItem({ icon, label, count }: { icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group">
      <div className="flex items-center gap-4">
        <span className="text-gray-400 group-hover:text-blue-600 transition-colors">{icon}</span>
        <span className="text-sm font-bold text-gray-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors">{label}</span>
      </div>
      {count && (
        <span className="text-[10px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded-md min-w-[1.2rem] text-center">
          {count}
        </span>
      )}
    </button>
  );
}

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
);

const KeyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
);

export default Header;
