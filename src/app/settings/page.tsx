"use client";

import { useState, useEffect } from "react";
import Container from "@/app/_components/container";
import Link from "next/link";

interface StorageEstimate {
  usage?: number;
  quota?: number;
}

import { AVAILABLE_MODELS } from "@/lib/models";

export default function SettingsPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS.find(m => m.enabled)?.id || AVAILABLE_MODELS[0].id);
  const [storage, setStorage] = useState<StorageEstimate>({});
  const [autoLoadModel, setAutoLoadModel] = useState(false);
  const [enableAnalytics, setEnableAnalytics] = useState(false);

  useEffect(() => {
    // Load theme
    const savedTheme = localStorage.getItem("personal-blog-theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }

    // Load model preference
    const savedModel = localStorage.getItem("preferred_model");
    if (savedModel) {
      const model = AVAILABLE_MODELS.find(m => m.id === savedModel);
      if (model && model.enabled) {
        setSelectedModel(savedModel);
      }
    }

    // Load other settings
    setAutoLoadModel(localStorage.getItem("auto_load_model") === "true");
    setEnableAnalytics(localStorage.getItem("enable_analytics") === "true");

    // Get storage estimate
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(setStorage);
    }
  }, []);

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("personal-blog-theme", newTheme);
    
    // Apply theme
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    document.documentElement.setAttribute("data-mode", newTheme);

    // Trigger storage event to sync across tabs/components
    window.dispatchEvent(new StorageEvent("storage", {
      key: "personal-blog-theme",
      newValue: newTheme
    }));
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem("preferred_model", modelId);
  };

  const handleAutoLoadChange = () => {
    const newValue = !autoLoadModel;
    setAutoLoadModel(newValue);
    localStorage.setItem("auto_load_model", String(newValue));
  };

  const handleAnalyticsChange = () => {
    const newValue = !enableAnalytics;
    setEnableAnalytics(newValue);
    localStorage.setItem("enable_analytics", String(newValue));
  };
  
  const handleDeleteAccount = async () => {
    if (!confirm("🚨 PERMANENT ACTION: Are you sure you want to delete your account? This will erase all your data, notifications, and settings. This cannot be undone.")) return;
    
    // Triple confirmation for such a destructive action
    if (!confirm("Second confirmation: All your personal configurations and access will be lost. Proceed?")) return;

    try {
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to delete account");

      // Clear all user data
      localStorage.removeItem("mcp_token");
      localStorage.removeItem("mcp_refresh_token");
      localStorage.removeItem("mcp_user");
      
      alert("Your account has been permanently deleted. We're sorry to see you go.");
      window.location.href = "/";
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleClearCache = async () => {
    if (!confirm("This will clear all cached WebLLM models. You'll need to re-download them. Continue?")) return;
    
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      alert("Cache cleared successfully! Refresh the page to see changes.");
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(setStorage);
      }
    } catch (e) {
      alert("Failed to clear cache. Please try manually in browser settings.");
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(2)} MB`;
  };

  const usagePercent = storage.usage && storage.quota 
    ? (storage.usage / storage.quota) * 100 
    : 0;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="pt-12">
        <Container>
          <div className="max-w-4xl mx-auto px-4">
            
            {/* Header */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </div>
                <h1 className="text-4xl font-black tracking-tighter">Settings</h1>
              </div>
              <p className="text-slate-500 font-medium">Customize your Neural Studio experience</p>
            </div>

            {/* Appearance */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl mb-6">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                <span className="text-2xl">🎨</span>
                Appearance
              </h2>
              
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-3">Theme</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleThemeChange("light")}
                    className={`p-6 rounded-2xl border-2 transition-all ${
                      theme === "light"
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl">
                        ☀️
                      </div>
                      <div className="text-left">
                        <p className="font-black text-slate-900 dark:text-white">Light</p>
                        <p className="text-xs text-slate-500">Bright & clean</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleThemeChange("dark")}
                    className={`p-6 rounded-2xl border-2 transition-all ${
                      theme === "dark"
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xl">
                        🌙
                      </div>
                      <div className="text-left">
                        <p className="font-black text-slate-900 dark:text-white">Dark</p>
                        <p className="text-xs text-slate-500">Easy on eyes</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Neural Engine */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl mb-6">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                Neural Engine
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-3">
                    Preferred Local Model
                  </label>
                  <div className="space-y-3">
                    {AVAILABLE_MODELS.filter(m => m.enabled).map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleModelChange(model.id)}
                        className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
                          selectedModel === model.id
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-black text-slate-900 dark:text-white mb-1">{model.name}</p>
                            <p className="text-xs text-slate-500 mb-2">{model.description}</p>
                            <span className="inline-block px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                              {model.size}
                            </span>
                          </div>
                          {selectedModel === model.id && (
                            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-1">Auto-load Model</p>
                    <p className="text-xs text-slate-500">Automatically initialize GPU on page load</p>
                  </div>
                  <button
                    onClick={handleAutoLoadChange}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      autoLoadModel ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        autoLoadModel ? "translate-x-6" : ""
                      }`}
                    ></span>
                  </button>
                </div>
              </div>
            </div>

            {/* Storage */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl mb-6">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                <span className="text-2xl">💾</span>
                Storage Management
              </h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Cache Usage</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatBytes(storage.usage)} / {formatBytes(storage.quota)}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {usagePercent.toFixed(1)}% of available storage used
                  </p>
                </div>

                <button
                  onClick={handleClearCache}
                  className="w-full py-4 rounded-2xl border-2 border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 font-black text-sm uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
                >
                  Clear All Cached Models
                </button>
              </div>
            </div>

            {/* Privacy */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl mb-6">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                <span className="text-2xl">🔒</span>
                Privacy & Data
              </h2>
              
              <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white mb-1">Anonymous Analytics</p>
                  <p className="text-xs text-slate-500">Help improve the platform with usage data</p>
                </div>
                <button
                  onClick={handleAnalyticsChange}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    enableAnalytics ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      enableAnalytics ? "translate-x-6" : ""
                    }`}
                  ></span>
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border-2 border-red-100 dark:border-red-900/20 shadow-xl mb-6 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                 <span className="text-6xl font-black text-red-600 uppercase -rotate-12 transform">Danger</span>
              </div>
              
              <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-red-600">
                <span className="text-2xl">⚠️</span>
                Danger Zone
              </h2>
              
              <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-red-900 dark:text-red-400 mb-1">Delete Account</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove your account and all associated data</p>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-6 py-3 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-widest hover:bg-red-700 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/30 whitespace-nowrap"
                  >
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions - Removed since everything saves instantly */}
            <div className="flex items-center justify-center pt-6 pb-6">
               <p className="text-sm text-slate-400 font-medium">All changes are saved automatically</p>
            </div>

          </div>
        </Container>
      </div>
    </main>
  );
}
