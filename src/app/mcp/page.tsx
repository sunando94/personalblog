"use client";

import Container from "@/app/_components/container";
import Header from "@/app/_components/header";
import { Logo } from "@/app/_components/logo";
import Link from "next/link";
import cn from "classnames";

const TOOLS = [
  {
    title: "Blog Intelligence Server",
    description: "Expose your blog's RAG memory to Claude. Let it search your brain for technical answers.",
    type: "Remote SSE",
    url: "/api/mcp",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    title: "WebGPU Offloader",
    description: "An experimental server that offloads LLM reasoning to the client's local GPU.",
    type: "Browser Worker",
    url: "/browser-writer",
    icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
  }
];

export default function McpHub() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <Container>
        <div className="py-20 lg:py-32">
          {/* Hero Section */}
          <div className="max-w-4xl mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 text-blue-500 text-xs font-bold uppercase tracking-widest mb-6 ring-1 ring-blue-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Standard Protocol
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] mb-8 tracking-tighter">
              The <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Model Context</span> Hub
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-10 max-w-2xl">
              Model Context Protocol (MCP) is the universal bridge between AI models and your local/remote tools. 
              Here I host and share the interfaces that power the Agentic Web.
            </p>
            
            <div className="flex gap-4">
               <Link 
                href="/mcp/request"
                className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold shadow-xl hover:scale-105 transition-transform"
               >
                 Request Access API Key
               </Link>
               <Link 
                href="/posts/deploying-mcp-to-vercel"
                className="px-8 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
               >
                 Read Post
               </Link>
            </div>
          </div>

          {/* Grid of Tools */}
          <div className="grid md:grid-cols-3 gap-8 mb-24">
            {TOOLS.map((tool, i) => (
              <div 
                key={tool.title}
                className="group relative bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 hover:border-blue-500/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 fill-mode-both"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="absolute top-8 right-8 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-0.5">
                  {tool.type}
                </div>
                
                <div className="mb-6 p-4 rounded-2xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 w-fit shadow-md group-hover:scale-110 transition-transform">
                  {tool.icon}
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  {tool.title}
                </h3>
                
                <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-8">
                  {tool.description}
                </p>

                <div className="mt-auto">
                    {tool.url.startsWith('/') ? (
                        <Link 
                            href={tool.url}
                            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold hover:gap-3 transition-all"
                        >
                            View Integration
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Link>
                    ) : (
                        <a 
                            href={`https://${tool.url}`}
                            target="_blank"
                            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold transition-all"
                        >
                            Github Repo
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    )}
                </div>
              </div>
            ))}
          </div>

          {/* Installation Guide */}
          <div className="bg-gradient-to-br from-slate-900 to-black rounded-[40px] p-12 lg:p-20 text-white relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                <Logo className="w-full h-full transform translate-x-1/4 translate-y-1/4" />
             </div>

             <div className="relative z-10 max-w-2xl">
                <h2 className="text-4xl lg:text-5xl font-black mb-8 leading-tight">
                    How to use these seeds in <span className="text-blue-400">Claude</span>
                </h2>
                
                <div className="space-y-8">
                    <div className="flex gap-6">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold shrink-0">1</div>
                        <div>
                            <p className="font-bold text-lg mb-2 text-white">Get your Secret Token</p>
                            <p className="text-slate-400">Request an API token. This ensures only you can use your blog's thinking power.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-6">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold shrink-0">2</div>
                        <div>
                            <p className="font-bold text-lg mb-2 text-white">Update Claude Config</p>
                            <p className="text-slate-400">Add the SSE endpoint to your `claude_desktop_config.json` file in the `mcpServers` section.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-6">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold shrink-0">3</div>
                        <div>
                            <p className="font-bold text-lg mb-2 text-white">Acknowledge Tools</p>
                            <p className="text-slate-400">Open Claude Desktop. You should see a new hammer icon for "Sudo Blog Intelligence".</p>
                        </div>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
