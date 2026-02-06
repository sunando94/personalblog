"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import * as webllm from "@mlc-ai/web-llm";
import { AVAILABLE_MODELS } from "@/lib/models";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AssistantClientProps {
  guidelines: string;
  promptTemplate: string;
  postsContext: string;
}

export default function AssistantClient({ guidelines, promptTemplate, postsContext }: AssistantClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [engine, setEngine] = useState<webllm.MLCEngineInterface | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [generating, setGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load model preference
  useEffect(() => {
    const preferredModel = localStorage.getItem("preferred_model");
    if (preferredModel) setSelectedModel(preferredModel);
  }, []);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem("preferred_model", modelId);
    setShowModelSelector(false);
    
    // Reset engine to force re-init with new model on next message
    if (engine) {
      console.log(`Switching to model: ${modelId}. Neural Engine will re-init...`);
      setEngine(null);
    }
  };

  // Auto-Sleep Logic: 5 minutes of inactivity
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    
    inactivityTimerRef.current = setTimeout(() => {
      if (engine) {
        console.log("Global Assistant Engine entering deep sleep due to 5min inactivity...");
        setEngine(null);
      }
    }, 5 * 60 * 1000);
  }, [engine]);

  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, generating, isOpen]);

  // Textarea resize logic
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  async function initEngine() {
    setLoading(true);
    setError("");
    try {
      const newEngine = await webllm.CreateMLCEngine(selectedModel, {
        initProgressCallback: (info) => {
          setProgress(info.text);
        },
      });
      setEngine(newEngine);
      resetInactivityTimer();
      return newEngine;
    } catch (err: any) {
      setError(`Local GPU failed: ${err.message}.`);
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStop = async () => {
    if (engine) {
      await engine.interruptGenerate();
    } else if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setGenerating(false);
  };

  const handleSend = async () => {
    if (!input.trim() || generating) return;

    resetInactivityTimer();

    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setGenerating(true);
    setError("");

    try {
      let activeEngine = engine;
      // AUTO-WAKE: If local mode but engine is asleep, wake it up now
      if (!activeEngine) {
        activeEngine = await initEngine();
      }

      if (activeEngine) {
        // Local GPU Flow
        const today = new Date().toISOString().split("T")[0];
        const systemPrompt = promptTemplate
          .replace("{{posts_context}}", postsContext)
          .replace("{{guidelines}}", guidelines)
          .replace("{{today}}", today);

        const chatHistory = [
          { role: "system", content: systemPrompt },
          ...newMessages
        ];

        const chunks = await activeEngine.chat.completions.create({
          messages: chatHistory as any,
          stream: true,
        });

        let fullText = "";
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);

        for await (const chunk of chunks) {
          const content = chunk.choices[0]?.delta?.content || "";
          fullText += content;
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1].content = fullText;
            return next;
          });
        }
      } else {
        // Remote API Fallback
        abortControllerRef.current = new AbortController();
        const response = await fetch("/api/generate-blog-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: input }),
          signal: abortControllerRef.current.signal,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Remote assistant failed");

        setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setGenerating(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 rounded-[1.25rem] shadow-[0_15px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.4)] flex items-center justify-center z-[100] transition-all hover:scale-110 active:scale-95 group overflow-visible"
      >
        {isOpen ? (
          <svg className="w-8 h-8 text-slate-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
        ) : (
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Spark Icon */}
            <svg 
              className="w-8 h-8 text-slate-900 dark:text-white transition-transform duration-500" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" 
                fill="currentColor" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            
            {/* Status Dot */}
            {engine ? (
               <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
            ) : (
               loading ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900 animate-spin border-t-transparent"></span>
               ) : (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-slate-400 rounded-full border-2 border-white dark:border-slate-900"></span>
               )
            )}
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-[0_30px_100px_rgba(0,0,0,0.2)] z-[100] flex flex-col overflow-hidden transition-all duration-300 ${
          isExpanded 
            ? 'inset-4 rounded-[2.5rem] animate-in fade-in zoom-in-95 duration-300' 
            : 'bottom-28 right-8 w-[400px] h-[600px] max-h-[80vh] rounded-[2rem] animate-in fade-in slide-in-from-bottom-10 duration-500'
        }`}>
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                <div className="flex items-center gap-3 relative">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white leading-none mb-1">EchoBot</h3>
                    <button 
                      onClick={() => setShowModelSelector(!showModelSelector)}
                      className="flex items-center gap-1 group/btn"
                    >
                       <span className={`w-1.5 h-1.5 rounded-full ${engine ? 'bg-green-500 animate-pulse' : loading ? 'bg-blue-500 animate-bounce' : 'bg-slate-400'}`}></span>
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover/btn:text-indigo-500 transition-colors">
                          {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || 'Select Model'}
                       </span>
                       <svg className={`w-3 h-3 text-slate-300 transition-transform ${showModelSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                  </div>

                  {/* Model Selector Dropdown */}
                  {showModelSelector && (
                    <div className="absolute top-12 left-0 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-[110] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-2 max-h-[400px] overflow-y-auto">
                        <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 mb-1">Select Neural Model</div>
                        {AVAILABLE_MODELS.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => handleModelChange(model.id)}
                            className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center justify-between group ${
                              selectedModel === model.id 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30' 
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div>
                              <p className={`text-xs font-black ${selectedModel === model.id ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-300'}`}>{model.name}</p>
                              <p className="text-[10px] text-slate-400">{model.size}</p>
                            </div>
                            {selectedModel === model.id && (
                              <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white scale-75">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    title={isExpanded ? "Exit fullscreen" : "Expand fullscreen"}
                  >
                    {isExpanded ? (
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"></path></svg>
                    ) : (
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                    )}
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
             {messages.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-6 text-2xl">🧠</div>
                  <h4 className="text-xl font-black mb-2">Welcome to EchoBot!</h4>
                  <p className="text-xs text-slate-500 font-medium mb-6">I'm your local AI. I know your posts and can help you write, summarize, or just chat. Feel free to explore!</p>
                  
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                    <div className="relative p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                       <div className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                             </svg>
                          </div>
                          <div className="text-left">
                             <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">Local Processing Notice</p>
                             <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                To protect your privacy, this AI runs entirely on your GPU. A small neural model (~200MB) will be securely downloaded to your browser's persistent cache.
                             </p>
                             <div className="mt-3 flex items-center gap-2">
                                <Link 
                                  href="/settings" 
                                  className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                                >
                                  Manage Storage 
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                                </Link>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
             )}

             {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                     msg.role === 'user' 
                     ? 'bg-slate-900 dark:bg-white text-white dark:text-black font-bold' 
                     : 'bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 whitespace-pre-wrap leading-relaxed'
                   }`}>
                      {msg.content}
                   </div>
                </div>
             ))}

             {generating && (
               <div className="flex gap-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-fit">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
               </div>
             )}

             {error && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-100">{error}</div>}
             
             {loading && (
               <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Preparing WebGPU Engine</p>
                  <div className="w-full h-1 bg-blue-200 dark:bg-blue-900/30 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-600 animate-progress origin-left w-full"></div>
                  </div>
                  <p className="text-[8px] text-slate-400 mt-2 font-mono truncate">{progress}</p>
               </div>
             )}
          </div>

          {/* Input Area */}
          <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
             <div className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-900 p-2 pl-4 rounded-2xl border-2 border-transparent focus-within:border-blue-500/20 transition-all">
                <textarea 
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Ask local assistant..."
                  className="flex-1 py-2 bg-transparent outline-none text-sm font-medium resize-none max-h-[160px]"
                />
                {generating ? (
                  <button 
                    onClick={handleStop}
                    className="p-2 rounded-xl transition-all text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm active:scale-90"
                    title="Stop generating"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                ) : (
                  <button 
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className={`p-2 rounded-xl transition-all ${!input.trim() ? 'text-slate-300' : 'text-blue-600 hover:bg-white dark:hover:bg-slate-800 shadow-sm active:scale-90'}`}
                  >
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                  </button>
                )}
             </div>
             <p className="mt-3 text-[8px] text-center text-slate-400 font-bold uppercase tracking-widest">Local Session • WebGPU Secured</p>
          </div>
        </div>
      )}
    </>
  );
}
