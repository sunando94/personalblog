import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import cn from "classnames";
import ReactMarkdown from "react-markdown";
import * as webllm from "@mlc-ai/web-llm";

export function BrainSearch() {
  const [query, setQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [result, setResult] = useState<{ answer: string; sources: { title: string; slug: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [computeMode, setComputeMode] = useState<'cloud' | 'local'>('cloud');
  const [localProgress, setLocalProgress] = useState("");
  const [engine, setEngine] = useState<webllm.MLCEngineInterface | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const initLocalEngine = async () => {
    if (engine) return engine;
    
    try {
      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL('../browser-writer/worker.ts', import.meta.url),
          { type: 'module' }
        );
      }

      const newEngine = await webllm.CreateWebWorkerMLCEngine(
        workerRef.current,
        "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        {
          initProgressCallback: (info) => setLocalProgress(info.text),
          appConfig: {
            ...webllm.prebuiltAppConfig,
            useIndexedDBCache: true
          }
        }
      );
      setEngine(newEngine);
      return newEngine;
    } catch (err: any) {
      console.error("Local Engine Init Error:", err);
      throw new Error("Failed to initialize local GPU engine. Is WebGPU enabled?");
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isAsking) return;

    setIsAsking(true);
    setResult(null);
    setError(null);
    
    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    // Try Cloud first
    if (computeMode === 'cloud') {
      try {
        const res = await fetch("/api/assistant/ask", {
          method: "POST",
          body: JSON.stringify({ query }),
          headers: { "Content-Type": "application/json" },
          signal
        });

        if (!res.ok) {
           const data = await res.json().catch(() => ({}));
           const errorMsg = data.error || "Cloud Assistant failed";
           if (res.status === 429 || errorMsg.includes('429')) {
             setError('429: Cloud Quota Exceeded');
             setComputeMode('local');
             // Continue to local flow
           } else {
             throw new Error(errorMsg);
           }
        } else {
          const data = await res.json();
          setResult(data);
          setIsAsking(false);
          return;
        }
      } catch (err: any) {
        if (!err.message.includes('429')) {
            console.warn("Cloud Assistant failed, falling back to Local LLM...", err);
            setComputeMode('local');
        }
        // If it was already set to local or we just set it, continue
      }
    }

    // Local LLM Flow
    try {
      setLocalProgress("Initializing Local GPU Engine...");
      const activeEngine = await initLocalEngine();
      
      setLocalProgress("Fetching context from Blog Brain...");
      const searchRes = await fetch("/api/assistant/search", {
        method: "POST",
        body: JSON.stringify({ query, limit: 4 }),
        headers: { "Content-Type": "application/json" },
        signal
      });
      const chunks = await searchRes.json();
      
      if (signal.aborted) return;
      
      if (chunks.length === 0) {
        setResult({
            answer: "I couldn't find any relevant snippets in the blog.",
            sources: []
        });
        return;
      }

      // EAGER SHOW: Show chunks while LLM thinks
      setResult({ answer: "", sources: chunks.map((c: any) => ({ title: c.title, slug: c.slug })) });

      setLocalProgress("Reasoning locally on your GPU...");
      const context = chunks.map((c: any, i: number) => `[Source ${i+1}: ${c.title}]\n${c.content}`).join("\n\n---\n\n");
      const prompt = `Task: Answer USER QUERY in 1-2 sentences using CONTEXT. 
Rules: Use ONLY the provided context. Cite sources [Source 1]. BE VERY BRIEF (Max 3 lines). 

USER QUERY: "${query}"

CONTEXT:
${context}

ANSWER:`;

      const response = await activeEngine.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      if (signal.aborted) return;

      setResult({
        answer: response.choices[0].message.content || "Empty response from local model.",
        sources: chunks.map((c: any) => ({ title: c.title, slug: c.slug }))
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setResult(null);
        return;
      }
      setError(`Local Fallback Failed: ${err.message}`);
    } finally {
      if (!signal.aborted) {
        setIsAsking(false);
        setLocalProgress("");
      }
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setIsAsking(false);
    setLocalProgress("");
    setError("Request cancelled.");
  };

  useEffect(() => {
    if (result && scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [result]);

  return (
    <div className="w-full max-w-4xl mt-12 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="relative group">
        {/* Mode Toggle Overlay */}
        <div className="absolute -top-10 right-0 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-700">
            <button 
                type="button"
                onClick={() => setComputeMode(computeMode === 'cloud' ? 'local' : 'cloud')}
                className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                    computeMode === 'local' 
                        ? "bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                        : "bg-slate-500/10 text-slate-500 border border-slate-500/20 hover:border-slate-500/40"
                )}
            >
                <div className={cn("w-1.5 h-1.5 rounded-full", computeMode === 'local' ? "bg-amber-500 animate-pulse" : "bg-slate-500")}></div>
                {computeMode === 'local' ? "Local GPU Active" : "Cloud Gemini Mode"}
            </button>
        </div>

        {/* Glow effect */}
        <div className={cn(
            "absolute -inset-1 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-500",
            computeMode === 'local' ? "bg-gradient-to-r from-amber-400 to-orange-600" : "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
        )}></div>
        
        <form onSubmit={handleAsk} className="relative flex items-center bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="pl-6 text-slate-400">
            {computeMode === 'local' ? (
                <div className="w-6 h-6 text-amber-500 animate-in spin-in-90 duration-500">
                    <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
                </div>
            ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={computeMode === 'local' ? "Privacy First Search - Running on your GPU..." : "Ask your blog brain anything..."}
            className="flex-1 bg-transparent border-none px-6 py-5 text-lg text-slate-800 dark:text-slate-100 placeholder-slate-500 focus:ring-0 outline-none"
          />
          <button
            type={isAsking ? "button" : "submit"}
            onClick={isAsking ? handleCancel : undefined}
            disabled={!isAsking && !query.trim()}
            className={cn(
              "mr-2 px-6 py-2 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 border",
              !isAsking && !query.trim() 
                ? "bg-slate-50 dark:bg-slate-800/50 text-slate-300 border-slate-100 dark:border-slate-800 cursor-not-allowed" 
                : isAsking
                    ? "bg-red-50 dark:bg-red-950/30 text-red-500 border-red-100 dark:border-red-900/50 hover:bg-red-100"
                    : computeMode === 'local' 
                        ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-sm"
                        : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white hover:bg-slate-800 dark:hover:bg-slate-100 shadow-md"
            )}
          >
            {isAsking ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
                <span className="text-[10px] uppercase tracking-tighter">Cancel</span>
              </>
            ) : (
              "Ask"
            )}
          </button>
        </form>
      </div>

      {/* Progress / Mode Indicator */}
      {computeMode === 'local' && (
          <div className="mt-2 flex items-center gap-2 px-4">
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500/60">
                  Browser-Side Intelligence {error?.includes('429') && "(Cloud Fallback Active)"}
              </span>
          </div>
      )}

      {/* Results Section */}
      {(result || (error && !isAsking) || isAsking) && (
        <div 
          ref={scrollRef}
          className="mt-4 p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in duration-300 overflow-hidden break-words"
        >
          {isAsking && !result && (
            <div className="flex flex-col gap-3">
              {localProgress ? (
                  <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <span>{localProgress.includes('Downloading') ? 'Loading Weights...' : 'Solving...'}</span>
                          {localProgress.match(/\d+/) && <span>{localProgress.match(/\d+/)![0]}%</span>}
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full transition-all duration-300" 
                            style={{ width: `${localProgress.match(/\d+/) ? localProgress.match(/\d+/)![0] : '15'}%` }}
                          />
                      </div>
                  </div>
              ) : (
                  <>
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 animate-pulse rounded w-1/2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 animate-pulse rounded w-full"></div>
                  </>
              )}
            </div>
          )}

          {error && !isAsking && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/20">
              <span className="font-bold opacity-80">System: </span> {error}
            </div>
          )}

          {result && (
            <div className="max-w-none space-y-4">
              {/* Answer Area */}
              {result.answer && (
                <div className="text-sm md:text-base leading-relaxed text-slate-700 dark:text-slate-300 border-l-2 border-blue-500/30 pl-4 py-1 italic break-words overflow-hidden">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => {
                        if (typeof children === 'string') {
                          const parts = children.split(/(\[Source \d+\])/g);
                          return (
                            <p className="mb-0">
                              {parts.map((part, i) => {
                                const match = part.match(/\[Source (\d+)\]/);
                                if (match) {
                                  const index = parseInt(match[1]) - 1;
                                  const source = result.sources[index];
                                  if (source) {
                                    return (
                                      <Link
                                        key={i}
                                        href={`/posts/${source.slug}`}
                                        className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase hover:bg-blue-100 transition-colors"
                                      >
                                        {part}
                                      </Link>
                                    );
                                  }
                                }
                                return part;
                              })}
                            </p>
                          );
                        }
                        return <p className="mb-0">{children}</p>;
                      }
                    }}
                  >
                    {result.answer}
                  </ReactMarkdown>
                </div>
              )}
              
              {/* Sources Area */}
              {result.sources.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verified Blog Sources</span>
                    <span className="text-[10px] font-black text-blue-500/50 px-2 py-0.5 rounded-full border border-blue-500/20">{result.sources.length} matches</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Array.from(new Set(result.sources.map(s => s.slug))).map((slug, idx) => {
                      const source = result.sources.find(s => s.slug === slug);
                      return (
                        <Link 
                          key={slug}
                          href={`/posts/${slug}`}
                          className="group flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-800/50"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:text-blue-500 group-hover:border-blue-200 transition-colors">
                            {idx + 1}
                          </div>
                          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 line-clamp-2 leading-tight">
                            {source?.title}
                          </p>
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

