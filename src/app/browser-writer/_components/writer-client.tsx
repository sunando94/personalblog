"use client";

import { useState, useEffect, useRef } from "react";
import * as webllm from "@mlc-ai/web-llm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface WriterClientProps {
  guidelines: string;
  promptTemplate: string;
  postsContext: string;
}

export default function WriterClient({ guidelines, promptTemplate, postsContext }: WriterClientProps) {
  const [engine, setEngine] = useState<webllm.MLCEngineInterface | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [lastFileName, setLastFileName] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("Llama-3.2-1B-Instruct-q4f32_1-MLC");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, generating]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  }, [input]);

  useEffect(() => {
    const token = localStorage.getItem("mcp_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {
        setUserRole('guest');
      }
    } else {
      setUserRole('guest');
    }

    const preferredModel = localStorage.getItem("preferred_model");
    if (preferredModel) setSelectedModel(preferredModel);
  }, []);

  const isGuest = !userRole || userRole === 'guest';

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
    } catch (err: any) {
      setError(`Failed to initialize WebGPU engine: ${err.message}.`);
    } finally {
      setLoading(false);
    }
  }

  const handleSend = async () => {
    if (!input.trim() || generating) return;

    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setGenerating(true);
    setError("");

    try {
      if (engine) {
        // Local GPU Flow
        const today = new Date().toISOString().split("T")[0];
        const systemPrompt = promptTemplate
          .replace("{{posts_context}}", postsContext)
          .replace("{{guidelines}}", guidelines)
          .replace("{{today}}", today);

        const chatHistory = [
          { role: "system", content: systemPrompt },
          ...newMessages.map(m => ({ role: m.role, content: m.content }))
        ];

        const chunks = await engine.chat.completions.create({
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

        // Logic check: if fullText starts with "---", it's likely a post
        if (fullText.trim().startsWith("---")) {
           // Attempt to guess slug from title if present
           const titleMatch = fullText.match(/title:\s*"(.*)"/);
           const slug = (titleMatch ? titleMatch[1] : `draft-${Date.now()}`)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
           setLastFileName(`${slug}.md`);
        } else {
           setLastFileName("");
        }

      } else {
        // Fallback to Remote API
        const response = await fetch("/api/generate-blog-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: input }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to generate");

        setLastFileName(data.fileName);
        setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const commitPost = async () => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant" || !lastFileName) return;

    setCommitting(true);
    setError("");
    try {
      const res = await fetch("/api/commit-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: lastMsg.content,
          fileName: lastFileName
        }),
      });

      if (!res.ok) throw new Error("Commit failed");
      
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "✅ **Success!** Your post has been committed to the repository and pushed to GitHub." 
      }]);
    } catch (err: any) {
      setError(`Commit failed: ${err.message}`);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[75vh] max-h-[900px] bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all">
      {/* Header / Engine Status */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${engine ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"} transition-all duration-500`}></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            {engine ? "Neural Engine: Active" : "Pipeline: Waiting..."}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {!engine && !loading && (
            <button 
              onClick={initEngine} 
              className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
              Wake Neural Forge
            </button>
          )}
          {loading && (
            <div className="flex items-center gap-3">
               <div className="w-32 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 animate-progress origin-left w-full"></div>
               </div>
               <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Igniting...</span>
            </div>
          )}
        </div>
      </div>

      {/* Chat History */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-20">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-transform duration-500">
               <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
               </svg>
            </div>
            <h3 className="text-3xl font-black mb-3 tracking-tighter">Neural <span className="text-indigo-600">Studio</span></h3>
            <p className="text-slate-500 font-medium max-w-sm">Craft high-fidelity technical content with Spark AI, powered by your local GPU.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <div className={`max-w-[90%] md:max-w-[80%] ${
              msg.role === "user" 
              ? "bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-4 rounded-[2rem] shadow-xl" 
              : "w-full"
            }`}>
              {msg.role === "assistant" ? (
                <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-[10px]">SPARK</div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">NEURAL_DRAFT_GEN-01</span>
                  </div>
                  <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-sm md:text-base font-medium">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <p className="font-bold text-sm md:text-base">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {generating && (
          <div className="flex justify-start animate-pulse">
            <div className="flex items-center gap-4 p-8 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[2.5rem] border border-indigo-100/50 dark:border-indigo-800/20">
              <div className="flex gap-1.5">
                 <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                 <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-indigo-600">Neural Synthesis in Progress...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-6 bg-red-50 dark:bg-red-900/10 text-red-600 text-[11px] font-bold rounded-2xl border border-red-100 dark:border-red-900/20 flex items-center gap-3">
             <span className="text-lg">⚠️</span> {error}
          </div>
        )}

        {/* Action Button (Commit) */}
        {!generating && messages.length > 0 && messages[messages.length - 1].role === "assistant" && !messages[messages.length - 1].content.includes("✅ Success") && lastFileName && (
          <div className="sticky bottom-0 flex flex-col md:flex-row items-center justify-center gap-4 py-8 bg-gradient-to-t from-white dark:from-slate-900 via-white/95 dark:via-slate-900/95 to-transparent">
            {isGuest ? (
               <div className="flex flex-col items-center gap-4 p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contribution Restricted</p>
                  <a 
                    href="/api/auth/linkedin"
                    className="flex items-center gap-3 px-8 py-3 bg-[#0077b5] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/10 hover:scale-105 active:scale-95 transition-all"
                  >
                    Login with LinkedIn to Commit
                  </a>
               </div>
            ) : (
              <button
                onClick={commitPost}
                disabled={committing}
                className={`group flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                  committing ? "bg-slate-100 text-slate-400" : "bg-indigo-600 text-white shadow-2xl shadow-indigo-500/30 hover:scale-105 active:scale-95"
                }`}
              >
                <svg className={`w-4 h-4 ${committing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
                {committing ? "Committing..." : "Push to Repository"}
              </button>
            )}
            <button
              onClick={() => {
                const blob = new Blob([messages[messages.length - 1].content], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = lastFileName || "generation.md";
                a.click();
              }}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
            >
              Export as Markdown
            </button>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto">
          <div className={`relative flex items-end gap-2 bg-slate-50 dark:bg-slate-950 p-2 pl-6 rounded-[2rem] border-2 transition-all ${generating ? 'border-transparent opacity-50' : 'border-transparent focus-within:border-indigo-500/20 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:shadow-2xl focus-within:shadow-indigo-500/10'}`}>
            <textarea 
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={generating}
              placeholder="Ask me to write a technical insight..."
              className="flex-1 py-3 bg-transparent outline-none font-medium text-slate-700 dark:text-slate-200 resize-none max-h-[240px] text-sm md:text-base leading-relaxed"
            />
            
            <button 
              onClick={() => handleSend()}
              disabled={!input.trim() || generating}
              className={`p-3 rounded-2xl transition-all ${!input.trim() || generating ? 'text-slate-300' : 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:scale-90'}`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
          <p className="mt-3 text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">
            Powered by WebGPU • Local Intelligence • Zero Data Leakage
          </p>
        </div>
      </div>
    </div>
  );
}
