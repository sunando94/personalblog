"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as webllm from "@mlc-ai/web-llm";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authorInfo, setAuthorInfo] = useState<{name: string, picture: string} | null>(null);
  const [lastContent, setLastContent] = useState("");
  const [workflowStep, setWorkflowStep] = useState<'input' | 'awaiting_image'>('input');
  const [draftTopic, setDraftTopic] = useState("");
  
  // Studio State
  const [computeMode, setComputeMode] = useState<'local' | 'cloud'>('local');
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLocalhost(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    }
  }, []);

  // Persistence: Load on mount
  useEffect(() => {
    const saved = localStorage.getItem("spark_studio_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.messages) setMessages(parsed.messages);
        if (parsed.lastContent) setLastContent(parsed.lastContent);
        if (parsed.lastFileName) setLastFileName(parsed.lastFileName);
        if (parsed.isRefining) setIsRefining(parsed.isRefining);
        if (parsed.draftTopic) setDraftTopic(parsed.draftTopic);
        if (parsed.workflowStep) setWorkflowStep(parsed.workflowStep);
      } catch (e) {
        console.error("Failed to load Spark Studio state", e);
      }
    }
  }, []);

  // Persistence: Save on change
  useEffect(() => {
    const state = {
      messages,
      lastContent,
      lastFileName,
      isRefining,
      draftTopic,
      workflowStep
    };
    localStorage.setItem("spark_studio_state", JSON.stringify(state));
  }, [messages, lastContent, lastFileName, isRefining, draftTopic, workflowStep]);

  // Auto-Sleep Logic: 5 minutes of inactivity
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    
    inactivityTimerRef.current = setTimeout(() => {
      if (engine) {
        console.log("WebLLM Engine entering deep sleep due to 5min inactivity...");
        setEngine(null);
      }
    }, 5 * 60 * 1000);
  }, [engine]);

  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  // RE-INITIALIZE AUTO-EXPANSION (SMART TRIGGER)
  useEffect(() => {
    if (scrollRef.current && !manualOverride) {
      const isScrollable = scrollRef.current.scrollHeight > scrollRef.current.clientHeight;
      if (((isScrollable && messages.length > 0) || messages.length > 2) && !isExpanded) {
        setIsExpanded(true);
      }
    }
  }, [messages, generating, isExpanded, manualOverride]);

  // Lock body scroll ONLY when explicitly expanded
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [isExpanded]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, generating, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  }, [input]);

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
       localStorage.setItem("mcp_token", urlToken);
       const newUrl = window.location.pathname;
       window.history.replaceState({}, document.title, newUrl);
    }

    const token = localStorage.getItem("mcp_token");
    if (token) {
      try {
        const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
        setUserRole(payload.role || 'guest');
        if (payload.name && payload.picture) {
           setAuthorInfo({ name: payload.name, picture: payload.picture });
        }
      } catch (e) {
        setUserRole('guest');
        setShowAuthModal(true);
      }
    } else {
      setUserRole('guest');
      setShowAuthModal(true);
    }
  }, [searchParams]);

  const isAdmin = userRole === 'admin';
  const isGuest = !userRole || userRole === 'guest';

  useEffect(() => {
     if (!isAdmin) {
        setComputeMode('local');
     }
  }, [isAdmin]);

  async function initEngine() {
    setLoading(true);
    setError("");
    try {
      const newEngine = await webllm.CreateMLCEngine(selectedModel, {
        initProgressCallback: (info) => setProgress(info.text),
      });
      setEngine(newEngine);
      resetInactivityTimer();
      return newEngine;
    } catch (err: any) {
      const msg = `Failed to initialize WebGPU engine: ${err.message}.`;
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }

  const handleSend = async () => {
    if (!input.trim() || generating) return;

    resetInactivityTimer();

    const rawInput = input.trim();
    const cmd = rawInput.toLowerCase();

    // Command Detection
    if (lastContent && (cmd === "post" || cmd === "commit" || cmd === "publish" || cmd.includes("post the above"))) {
      setMessages(prev => [...prev, { role: "user", content: rawInput }]);
      setInput("");
      await commitPost();
      return;
    }

    if (lastContent && (cmd === "download" || cmd === "export" || cmd.includes("export as markdown"))) {
      setMessages(prev => [...prev, { role: "user", content: rawInput }]);
      setInput("");
      const blob = new Blob([lastContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = lastFileName || "generation.md"; a.click();
      return;
    }

    // New Topic Reset
    if (isRefining && cmd === "new") {
      setIsRefining(false);
      setLastContent("");
      setLastFileName("");
      setIsExpanded(false);
      setManualOverride(false);
      setMessages(prev => [...prev, { role: "user", content: rawInput }, { role: "assistant", content: "Draft cleared. What's the new topic?" }]);
      setInput("");
      return;
    }

    // --- REFINEMENT WORKFLOW ---
    if (isRefining || (lastContent && workflowStep === 'input' && !cmd.startsWith("/"))) {
      setMessages(prev => [...prev, { role: "user", content: rawInput }]);
      setInput("");
      setGenerating(true);
      setError("");

      try {
        if (computeMode === 'local') {
          let activeEngine = engine;
          if (!activeEngine) activeEngine = await initEngine();

          if (activeEngine) {
            const today = new Date().toISOString().split("T")[0];
            const systemPrompt = promptTemplate.replace("{{posts_context}}", postsContext).replace("{{guidelines}}", guidelines).replace("{{today}}", today);
            const chatHistory = [
              { role: "system", content: systemPrompt }, 
              ...messages.map(m => ({ role: m.role, content: m.content })), 
              { role: "user", content: `REFINEMENT REQUEST: Apply these changes to the existing draft: ${rawInput}\n\nEXISTING DRAFT:\n${lastContent}` }
            ];
            
            const chunks = await activeEngine.chat.completions.create({ messages: chatHistory as any, stream: true });
            let fullText = "";
            setMessages(prev => [...prev, { role: "assistant", content: "" }]);
            for await (const chunk of chunks) {
              const content = chunk.choices[0]?.delta?.content || "";
              fullText += content;
              setMessages(prev => { const next = [...prev]; next[next.length - 1].content = fullText; return next; });
            }
            setLastContent(fullText);
          }
        } else {
          const token = localStorage.getItem("mcp_token");
          const response = await fetch("/api/generate-blog-post", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ 
               topic: `REFINEMENT REQUEST: Apply these changes to the existing draft: ${rawInput}`, 
               context: `EXISTING DRAFT:\n${lastContent}`,
               authorName: authorInfo?.name,
               authorPicture: authorInfo?.picture
            }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "Refinement failed");

          setLastContent(data.content);
          setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setGenerating(false);
      }
      return;
    }

    // --- GENERATION WORKFLOW: CAPTURE TOPIC ---
    if (workflowStep === 'input') {
      setMessages(prev => [...prev, { role: "user", content: rawInput }]);
      setInput("");
      setDraftTopic(rawInput);
      setWorkflowStep('awaiting_image');
      setTimeout(() => {
         setMessages(prev => [...prev, { role: "assistant", content: `**Topic Received:** "${rawInput}"\n\nProvide a **Cover Image URL** (or type 'skip').` }]);
      }, 300);
      return;
    }

    // --- GENERATION WORKFLOW: CAPTURE IMAGE & GENERATE ---
    const topic = draftTopic;
    const coverImage = rawInput.toLowerCase() === 'skip' ? "" : rawInput;
    setMessages(prev => [...prev, { role: "user", content: rawInput }]);
    setInput("");
    setWorkflowStep('input');
    setGenerating(true);
    setError("");

    try {
      if (computeMode === 'local') {
        let activeEngine = engine;
        if (!activeEngine) activeEngine = await initEngine();

        if (activeEngine) {
          const today = new Date().toISOString().split("T")[0];
          const systemPrompt = promptTemplate.replace("{{posts_context}}", postsContext).replace("{{guidelines}}", guidelines).replace("{{today}}", today);
          const chatHistory = [{ role: "system", content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: topic }];
          const chunks = await activeEngine.chat.completions.create({ messages: chatHistory as any, stream: true });
          let fullText = "";
          setMessages(prev => [...prev, { role: "assistant", content: "" }]);
          for await (const chunk of chunks) {
            const content = chunk.choices[0]?.delta?.content || "";
            fullText += content;
            setMessages(prev => { const next = [...prev]; next[next.length - 1].content = fullText; return next; });
          }
          setLastContent(fullText);
          setLastFileName(fullText.match(/title:\s*"(.*)"/)?.[1]?.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".md" || `draft-${Date.now()}.md`);
        }
      } else {
        const token = localStorage.getItem("mcp_token");
        const res = await fetch("/api/generate-blog-post", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ topic, authorName: authorInfo?.name, authorPicture: authorInfo?.picture, coverImage }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setLastFileName(data.fileName);
        setLastContent(data.content);
        setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
      }
      setIsRefining(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const commitPost = async () => {
    if (!lastContent || !lastFileName) return;
    setCommitting(true);
    setError("");
    try {
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/commit-post", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ content: lastContent, fileName: lastFileName }),
      });
      if (!res.ok) throw new Error("Commit failed");
      setMessages(prev => [...prev, { role: "assistant", content: "✅ **Success!** Your post has been committed." }]);
    } catch (err: any) {
      setError(`Commit failed: ${err.message}`);
    } finally {
      setCommitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setLastContent(content);
      setLastFileName(file.name);
      setIsRefining(true);
      setWorkflowStep('input');
      
      setMessages(prev => [
        ...prev, 
        { role: "user", content: `📁 Uploaded file: **${file.name}**` },
        { role: "assistant", content: `📁 **Attachment Loaded:** \`${file.name}\`\n\nThe context has been initialized from this file. You can now **ask Spark to summarize it**, **update it**, or **push it to the repository**.` }
      ]);
      resetInactivityTimer();
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleStudio = () => {
    const nextState = !isExpanded;
    setManualOverride(!nextState);
    setIsExpanded(nextState);
  };

  return (
    <div className="w-full">
      {/* Ghost Container to prevent page jump on collapse */}
      {!isExpanded && <div className="absolute opacity-0 pointer-events-none h-[75vh]" aria-hidden="true" />}

      {/* Dreamy Background Dimmer */}
      <div className={`fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[90] transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${
        isExpanded ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}></div>

      {/* Header Context */}
      <div className={`transition-all duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)] transform ${
        isExpanded ? "opacity-0 -translate-y-12 max-h-0 mb-0 scale-95" : "opacity-100 translate-y-0 max-h-[500px] mb-8 scale-100"
      }`}>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight mb-8">
          Personal AI <span className="text-blue-600">Assistant</span>
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-12 max-w-2xl">
          Your local intelligence for managing posts. List, chat, and draft new technical insights securely in your browser.
        </p>
      </div>

      <div className={isExpanded ? "h-[75vh] w-full" : "h-full w-full"}>
        {/* Main Studio Frame */}
        <div className={`flex flex-col bg-white dark:bg-slate-900 shadow-2xl transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] transform ${
          isExpanded 
            ? "fixed inset-0 z-[100] rounded-none shadow-none origin-center scale-100 overflow-hidden" 
            : "relative h-[75vh] max-h-[900px] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 origin-center scale-100 overflow-hidden"
        }`}>
          {/* Studio Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 z-[20] shrink-0">
            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${generating ? "bg-amber-500 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.4)]" : engine || computeMode === 'cloud' ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" : loading ? "bg-blue-500 animate-pulse" : "bg-indigo-500 shadow-lg"}`}></div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {generating 
                  ? (computeMode === 'cloud' ? "Cloud Generating..." : "Local Thinking...") 
                  : (computeMode === 'cloud' ? "Cloud Ready" : (engine ? "Neural Active" : (loading ? "Waking Engine..." : "Engine Idle")))}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <select 
                value={computeMode} 
                onChange={(e) => setComputeMode(e.target.value as 'local' | 'cloud')}
                disabled={!isAdmin}
                className="bg-slate-50 dark:bg-slate-950 text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase outline-none"
              >
                <option value="local">Local GPU</option>
                <option value="cloud">Cloud (Gemini)</option>
              </select>

              {messages.length > 0 && (
                <button 
                  onClick={() => {
                    if (confirm("Clear current workspace and history?")) {
                      setMessages([]);
                      setLastContent("");
                      setLastFileName("");
                      setIsRefining(false);
                      setDraftTopic("");
                      setWorkflowStep('input');
                      localStorage.removeItem("spark_studio_state");
                    }
                  }}
                  className="text-[10px] font-black uppercase text-rose-400 hover:text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all"
                >
                  Clear
                </button>
              )}

              <button 
                onClick={toggleStudio} 
                className={`text-[10px] font-black uppercase transition-all flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                  isExpanded 
                    ? "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" 
                    : "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100"
                }`}
              >
                {isExpanded ? "Exit Studio" : "Studio Mode"}
              </button>
            </div>
          </div>

          {/* Top Cloud Fade Effect */}
          <div className="absolute top-[56px] left-0 right-0 h-24 bg-gradient-to-b from-white dark:from-slate-950 via-white/80 dark:via-slate-950/80 to-transparent z-[15] pointer-events-none"></div>

          {/* Chat History */}
          <div ref={scrollRef} className={`flex-1 ${messages.length === 0 && !loading ? "overflow-hidden" : "overflow-y-auto"} pt-24 pb-32 scroll-smooth`}>
            <div className={`space-y-8 px-6 w-[80%] mx-auto transition-all duration-1000`}>
               {messages.length === 0 && !loading && (
                 <div className="h-[40vh] flex flex-col items-center justify-center text-center opacity-40">
                   <h3 className="text-4xl font-black mb-2 tracking-tighter text-slate-300 dark:text-slate-700">Spark Studio</h3>
                   <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Initialize a workspace to begin.</p>
                 </div>
               )}

               {messages.map((msg, i) => (
                 <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-6 duration-[800ms] ease-out w-full`}>
                   <div className={`${msg.role === "user" ? "max-w-[85%] bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-4 rounded-3xl shadow-lg" : "w-full max-w-full overflow-hidden"}`}>
                     {msg.role === "assistant" ? (
                       <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-8 md:p-12 rounded-[2.5rem] shadow-sm transform transition-all duration-700 overflow-x-auto">
                         <div className="prose prose-slate dark:prose-invert max-w-none text-base md:text-lg leading-relaxed font-medium transition-all break-words prose-pre:max-w-full prose-pre:overflow-x-auto">
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                         </div>
                       </div>
                     ) : <p className="font-bold text-base md:text-lg break-words">{msg.content}</p>}
                   </div>
                 </div>
               ))}

               {loading && (
                 <div className="flex flex-col items-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                   <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-6 rounded-[2rem] w-full max-w-md">
                     <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                       <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span> Initializing Neural Engine
                     </p>
                     <p className="text-sm font-medium text-slate-500 mb-4">{progress}</p>
                     <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: progress.includes('%') ? progress.split('%')[0].split(' ').pop() + '%' : '10%' }}></div>
                     </div>
                   </div>
                 </div>
               )}

               {generating && (
                 <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 animate-pulse flex items-center gap-2">
                   <span className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></span>Forging Content...
                 </div>
               )}
            </div>
          </div>

          {/* Actions & Input */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 shrink-0 z-[20]">
             {!generating && !loading && lastContent && (
               <div className="flex flex-wrap items-center justify-center gap-6 p-6">
                 <button onClick={commitPost} disabled={committing} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all">
                   {committing ? "Pushing..." : "Push to Git"}
                 </button>
                 <button onClick={() => { const b = new Blob([lastContent], { type: "text/markdown" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = lastFileName; a.click(); }} className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase rounded-2xl hover:bg-slate-200 transition-all font-mono">
                   Download .md
                 </button>
               </div>
             )}

             <div className="p-6 md:p-10">
               <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".md,.markdown" className="hidden" />
               <div className="w-[80%] mx-auto">
                 <div className="relative flex items-end bg-white dark:bg-slate-900 pr-2 pb-2 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 focus-within:border-indigo-500 transition-all duration-500">
                   {/* Paperclip pinned to the top-left corner of the input area */}
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="absolute left-6 top-6 text-slate-400 hover:text-indigo-600 transition-all hover:scale-110 active:scale-95 z-10"
                     title="Attach or re-upload Markdown"
                   >
                     <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                   </button>

                   <textarea 
                     ref={textareaRef}
                     rows={1}
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                     disabled={generating || loading}
                     placeholder={isRefining ? "Suggest changes..." : "Ask Spark to write something (optional: attach a file)..."}
                     className="flex-1 py-6 pl-16 pr-4 bg-transparent outline-none font-medium text-slate-700 dark:text-slate-200 resize-none max-h-[400px] text-base md:text-lg"
                   />
                   
                   <button onClick={() => handleSend()} disabled={!input.trim() || generating || loading} className={`p-5 rounded-3xl transition-all ${!input.trim() || generating || loading ? 'text-slate-200' : 'text-indigo-600 active:scale-110 hover:bg-indigo-50 dark:hover:bg-indigo-900/40'}`}>
                     <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                   </button>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>

      <AuthGuard show={showAuthModal} />
    </div>
  );
}

function AuthGuard({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6">
       <div className="bg-white dark:bg-slate-950 p-12 rounded-[3.5rem] max-w-sm w-full text-center shadow-2xl">
          <h2 className="text-3xl font-black mb-4 tracking-tight">Identity Required</h2>
          <a href="/api/auth/linkedin?returnTo=/browser-writer" className="block w-full py-5 bg-[#0077b5] text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-all">Login with LinkedIn</a>
       </div>
    </div>
  );
}
