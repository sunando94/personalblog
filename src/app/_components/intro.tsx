"use client";

import { DEFAULT_AUTHOR } from "@/lib/author";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Logo } from "./logo";
import { AuthModal } from "./auth-modal";
import { BrainSearch } from "./brain-search";

export function Intro() {
  const router = useRouter();
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleDashboardClick = () => {
    const token = localStorage.getItem("mcp_token");
    if (token) {
      router.push("/browser-writer");
    } else {
      setShowAuthModal(true);
    }
  };

  useEffect(() => {
    fetchDynamicSubtitle();
  }, []);

  const fetchDynamicSubtitle = async () => {
    try {
      const response = await fetch("/api/generate-title?type=intro");
      if (response.ok) {
        const data = await response.json();
        setSubtitle(data.title);
      }
    } catch (error) {
      console.error("Failed to fetch dynamic subtitle:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Static title for consistent branding
  const staticTitle = "Sudo Make Me Sandwich";

  return (
    <section className="relative mb-16 md:mb-20 mt-8">
      {/* Decorative background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-8 mb-10">
        {/* Logo */}
        <div className="w-24 h-24 md:w-32 md:h-32 relative group shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-60 transition-opacity duration-500"></div>
          <div className="relative w-full h-full bg-white dark:bg-slate-950 rounded-3xl p-2 shadow-2xl overflow-hidden border-2 border-gray-100 dark:border-slate-800 group-hover:border-blue-500/50 transition-all duration-300 flex items-center justify-center">
            <Logo className="w-full h-full p-1 text-black dark:text-white" />
          </div>
        </div>

        {/* Main heading with animated gradient */}
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-tight py-2">
          <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
            {staticTitle}
          </span>
        </h1>
      </div>

      {/* Tagline and description */}
      <div className="max-w-6xl">
        <div>
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-8 bg-gray-200 dark:bg-slate-800 animate-pulse rounded-lg w-full"></div>
              <div className="h-8 bg-gray-200 dark:bg-slate-800 animate-pulse rounded-lg w-3/4"></div>
            </div>
          ) : (
            <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
              {subtitle}
            </p>
          )}
        </div>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
          Join me as I write about technology, life, and everything in between.
        </p>

        {/* RAG Playground: Search the Brain */}
        <BrainSearch />
      </div>

      {/* Social links and CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mt-8">
        <div className="flex items-center gap-4">
          {DEFAULT_AUTHOR.linkedin && (
            <Link
              href={DEFAULT_AUTHOR.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              aria-label="Connect on LinkedIn"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              <span className="font-medium">Connect</span>
            </Link>
          )}
          {DEFAULT_AUTHOR.github && (
            <Link
              href={DEFAULT_AUTHOR.github}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              aria-label="View GitHub"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="font-medium">GitHub</span>
            </Link>
          )}
        </div>

        <button
          onClick={handleDashboardClick}
          className="group flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl font-bold"
        >
          Contribute
        </button>

        <Link
          href="/mcp"
          className="text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors duration-200 flex items-center gap-2 group"
        >
          MCP Hub
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </Link>

        <Link
          href="/posts"
          className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200 flex items-center gap-2 group"
        >
          Explore Posts
          <svg
            className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </Link>
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        returnTo="/browser-writer" 
      />
    </section>
  );
}
