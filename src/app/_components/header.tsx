"use client";

import Link from "next/link";
import { DEFAULT_AUTHOR } from "@/lib/author";
import { useState, useEffect } from "react";

const Header = () => {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetchDynamicTitle();
  }, []);

  const fetchDynamicTitle = async () => {
    try {
      const response = await fetch("/api/generate-title?type=header");
      if (response.ok) {
        const data = await response.json();
        setTitle(data.title);
      }
    } catch (error) {
      console.error("Failed to fetch dynamic title:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback title
  const displayTitle = title || `${DEFAULT_AUTHOR.name.split(" ")[0]}'s Blog`;

  return (
    <header className="mb-16 mt-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <Link
          href="/"
          className="group relative inline-block"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-white dark:bg-slate-800 rounded-lg p-2 border-2 border-transparent group-hover:border-blue-500 dark:group-hover:border-blue-400 transition-all duration-300">
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight py-1">
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {DEFAULT_AUTHOR.name.split(" ")[0]}'s
                    </span>
                    <span className="text-gray-900 dark:text-gray-100">Blog</span>
                    <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                  </span>
                ) : (
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                    {displayTitle}
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Stories & Insights
              </p>
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
          >
            Home
          </Link>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <Link
            href="/posts"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
          >
            All Posts
          </Link>
          {DEFAULT_AUTHOR.linkedin && (
            <>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <Link
                href={DEFAULT_AUTHOR.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center gap-1"
              >
                Connect
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
