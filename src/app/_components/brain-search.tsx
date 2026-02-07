"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import cn from "classnames";
import ReactMarkdown from "react-markdown";

export function BrainSearch() {
  const [query, setQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [result, setResult] = useState<{ answer: string; sources: { title: string; slug: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isAsking) return;

    setIsAsking(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/assistant/ask", {
        method: "POST",
        body: JSON.stringify({ query }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to get an answer");

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAsking(false);
    }
  };

  useEffect(() => {
    if (result && scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [result]);

  return (
    <div className="w-full max-w-4xl mt-12 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-500"></div>
        
        <form onSubmit={handleAsk} className="relative flex items-center bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="pl-6 text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the brain... (e.g., 'How do I deploy MCP on Vercel?')"
            className="flex-1 bg-transparent border-none px-6 py-5 text-lg text-slate-800 dark:text-slate-100 placeholder-slate-500 focus:ring-0 outline-none"
          />
          <button
            type="submit"
            disabled={isAsking || !query.trim()}
            className={cn(
              "px-8 py-5 font-bold transition-all duration-300 flex items-center gap-2",
              isAsking || !query.trim() 
                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed" 
                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            )}
          >
            {isAsking ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Thinking...
              </>
            ) : (
              "Ask"
            )}
          </button>
        </form>
      </div>

      {/* Results Section */}
      {(result || error || isAsking) && (
        <div 
          ref={scrollRef}
          className="mt-6 p-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in duration-500"
        >
          {isAsking && !result && (
            <div className="flex flex-col gap-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 animate-pulse rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-800 animate-pulse rounded w-full"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-800 animate-pulse rounded w-5/6"></div>
            </div>
          )}

          {error && (
            <div className="text-red-500 font-medium">
              Error: {error}
            </div>
          )}

          {result && (
            <div className="prose dark:prose-invert max-w-none">
              <div className="mb-6 leading-relaxed text-slate-700 dark:text-slate-300">
                <ReactMarkdown>{result.answer}</ReactMarkdown>
              </div>
              
              {result.sources.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Sources from the blog
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(result.sources.map(s => s.slug))).map(slug => {
                      const source = result.sources.find(s => s.slug === slug);
                      return (
                        <Link 
                          key={slug}
                          href={`/posts/${slug}`}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                        >
                          {source?.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
