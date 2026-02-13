"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as webllm from "@mlc-ai/web-llm";
import { AVAILABLE_MODELS } from "@/lib/models";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AuthModal } from "@/app/_components/auth-modal";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface WriterClientProps {
  guidelines: string;
  promptTemplate: string;
  smallChatPrompt: string;
  smallGeneratorPrompt: string;
  postsContext: string;
}

export default function WriterClient({ guidelines, promptTemplate, smallChatPrompt, smallGeneratorPrompt, postsContext }: WriterClientProps) {
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
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS.find(m => m.enabled)?.id || AVAILABLE_MODELS[0].id);
  const [showModelSelector, setShowModelSelector] = useState(false);
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
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasDownloadConsent, setHasDownloadConsent] = useState(false);
  const [isChatting, setIsChatting] = useState(true);
  const [lastUsage, setLastUsage] = useState<any>(null);
  const [generationStatus, setGenerationStatus] = useState("Analyzing Context");
  const [hasResolvedAuth, setHasResolvedAuth] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

    const consent = localStorage.getItem("local_llm_consent");
    if (consent === "true") {
      setHasDownloadConsent(true);
      setComputeMode('local');
    } else {
      setComputeMode('cloud');
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

  const fetchRagContext = async (query: string) => {
    try {
      setGenerationStatus("Neural RAG Search...");
      const res = await fetch("/api/assistant/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 3 }),
      });
      if (!res.ok) return "";
      const chunks = await res.json();
      if (!chunks || chunks.length === 0) return "";
      
      return chunks.map((c: any, i: number) => `[RELEVANT BLOG CONTEXT ${i+1}: ${c.title}]\n${c.content}`).join("\n\n---\n\n");
    } catch (e) {
      console.error("RAG fetch failed", e);
      return "";
    }
  };

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

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem("preferred_model", modelId);
    setShowModelSelector(false);
    
    // Reset engine to force re-init with new model on next message
    if (engine) {
      console.log(`[Studio] Switching to: ${modelId}. Engine will re-init...`);
      setEngine(null);
    }
  };

  useEffect(() => {
    const preferredModel = localStorage.getItem("preferred_model");
    if (preferredModel) {
      const model = AVAILABLE_MODELS.find(m => m.id === preferredModel);
      if (model && model.enabled) {
        setSelectedModel(preferredModel);
      }
    }
  }, []);

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
    setHasResolvedAuth(true);
  }, [searchParams]);

  // HARD GATE: Redirect guests away from the studio
  useEffect(() => {
    if (hasResolvedAuth && userRole === 'guest') {
       console.log("🚫 Guest detected, redirecting to profile...");
       router.push("/profile?tab=tools");
    }
  }, [hasResolvedAuth, userRole, router]);

  const isAdmin = userRole === 'admin';
  const isWriter = userRole === 'writer'
  const isGuest = !userRole || userRole === 'guest';

  // Generation Status Pipeline logic
  useEffect(() => {
    if (!generating) {
      setGenerationStatus("Context Ready");
      return;
    }

    const statuses = [
      "Analyzing Context...",
      "Neural Structuring...",
      "Creative Drafting...",
      "Applying Technical Tone...",
      "Checking Semantic Flow...",
      "Refining Grammar...",
      "Forging Final Markdown..."
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % statuses.length;
      setGenerationStatus(statuses[i]);
    }, 2800);

    return () => clearInterval(interval);
  }, [generating]);

  useEffect(() => {
     if (!isAdmin) {
        setComputeMode('local');
     }
  }, [isAdmin]);

  const workerRef = useRef<Worker | null>(null);

  async function initEngine() {
    if (!hasDownloadConsent) {
      setShowConsentModal(true);
      return null;
    }
    setLoading(true);
    setError("");
    try {
      // Advanced Usage: Use Web Worker to keep main thread free
      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL('../worker.ts', import.meta.url),
          { type: 'module' }
        );
      }

      const newEngine = await webllm.CreateWebWorkerMLCEngine(
        workerRef.current,
        selectedModel,
        {
          initProgressCallback: (info) => setProgress(info.text),
          appConfig: {
            ...webllm.prebuiltAppConfig,
            useIndexedDBCache: true // Advanced: Better caching for large models
          }
        }
      );
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

  const handleStop = async () => {
    if (computeMode === 'local' && engine) {
      try {
        await engine.interruptGenerate();
      } catch (e) {
        console.error("Failed to interrupt local engine", e);
      }
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setGenerating(false);
    setLoading(false);
    setError("Generation stopped by user.");
    
    setMessages(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role === "assistant" && !last.content) {
        return prev.slice(0, -1);
      }
      if (last.role === "assistant" && last.content) {
        const next = [...prev];
        next[next.length - 1] = { ...last, content: last.content + "\n\n*[Stopped]*" };
        return next;
      }
      return prev;
    });
  };

  const commitPost = async () => {
    if (!lastContent || !lastFileName) return;
    if (isGuest) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ **Access Required.** You need Writer or Admin privileges to push to Git. Redirecting you to the access request page..." }]);
      setTimeout(() => {
        router.push("/profile?tab=tools");
      }, 2500);
      return;
    }
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

  const processChat = async (rawInput: string, currentMessages: Message[]) => {
    setGenerating(true);
    setError("");
    abortControllerRef.current = new AbortController();

    try {
      if (computeMode === 'local') {
        let activeEngine = engine;
        if (!activeEngine) {
          activeEngine = await initEngine();
          if (!activeEngine) return;
        }

        const ragContext = await fetchRagContext(rawInput);
        const today = new Date().toISOString().split("T")[0];
        let systemPrompt = promptTemplate
          .replace("{{posts_context}}", postsContext)
          .replace("{{guidelines}}", guidelines)
          .replace("{{today}}", today);

        if (ragContext) {
           systemPrompt += `\n\n### RELEVANT BLOG CONTEXT (RAG)\nThe following are granular chunks retrieved from the blog for the current query. PRIORITIZE THIS CONTEXT over excerpts:\n${ragContext}`;
        }
        
        // Optimize for small models (< 1B)
        const isSmallModel = selectedModel.includes("135M") || selectedModel.includes("0.5B") || selectedModel.includes("360M");
        let finalSystemPrompt = systemPrompt;

        if (isSmallModel) {
          console.log("🔍 [Spark Studio] Passing RAG Context to Local Model:", ragContext?.substring(0, 100) + "...");
          finalSystemPrompt = `You are a high-precision technical assistant for the "Sudo Make Me Sandwich" blog.
STRICT RULE: Your memory of the external world is disabled. YOU MUST ONLY USE THE [BLOG CONTEXT] BELOW.
If a topic is not in the [BLOG CONTEXT], say "I don't know".
DO NOT mention "Ramda", "Iron Hand", or "Rakanic".

### [BLOG CONTEXT]
${ragContext || "No relevant blog posts found for this query."}
---
${smallChatPrompt.replace("{{today}}", today)}`;
        }

        const chatHistory = [
          { role: "system", content: finalSystemPrompt }, 
          ...currentMessages.map((m: any) => ({ role: m.role, content: m.content })),
          { role: "user", content: rawInput }
        ];
        
        const chunks = await activeEngine.chat.completions.create({ 
          messages: chatHistory as any, 
          stream: true,
          stream_options: { include_usage: true },
          temperature: isSmallModel ? 0.3 : 0.7,
          top_p: isSmallModel ? 0.9 : 1.0,
          stop: isSmallModel ? ["User:", "###", "<|endoftext|>"] : undefined
        });
        let fullText = "";
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);
        for await (const chunk of chunks) {
          const content = chunk.choices[0]?.delta?.content || "";
          fullText += content;
          if (chunk.usage) setLastUsage(chunk.usage);
          setMessages(prev => { 
            const next = [...prev]; 
            next[next.length - 1] = { role: "assistant", content: fullText };
            return next; 
          });
        }
        const finalReply = await activeEngine.getMessage();
        if (finalReply && finalReply !== fullText) {
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: finalReply };
            return next;
          });
        }
      } else {
        const token = localStorage.getItem("mcp_token");
        
        // Use the dedicated Assistant Ask API for grounded RAG chat
        const res = await fetch("/api/assistant/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ query: rawInput }),
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error);
        
        const reply = data.answer + (data.sources?.length > 0 
          ? `\n\n**Sources:** ${data.sources.map((s: any) => `[${s.title}](https://personalblog.vercel.app/posts/${s.slug})`).join(', ')}`
          : '');
          
        setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const startGeneration = async (topic: string, coverImage: string, currentMessages: Message[]) => {
    abortControllerRef.current = new AbortController();
    try {
      if (computeMode === 'local') {
        let activeEngine = engine;
        if (!activeEngine) {
          activeEngine = await initEngine();
          if (!activeEngine) throw new Error("Engine failed to start");
        }
        const ragContext = await fetchRagContext(topic);
        const today = new Date().toISOString().split("T")[0];
        let systemPrompt = promptTemplate
           .replace("{{posts_context}}", postsContext)
           .replace("{{guidelines}}", guidelines)
           .replace("{{today}}", today);

        if (ragContext) {
          systemPrompt += `\n\n### RELEVANT BLOG CONTEXT (RAG)\nUse this context to ensure technical accuracy and avoid duplicating existing posts:\n${ragContext}`;
        }
        
        // Optimize for small models (< 1B)
        const isSmallModel = selectedModel.includes("135M") || selectedModel.includes("0.5B") || selectedModel.includes("360M");
        let finalSystemPrompt = systemPrompt;

        if (isSmallModel) {
          finalSystemPrompt = smallGeneratorPrompt
            .replace("{{topic}}", topic)
            .replace("{{today}}", today)
            .replace("{{guidelines_preview}}", guidelines.substring(0, 500));
          
          if (ragContext) {
            finalSystemPrompt += `\n\n### RELEVANT CONTEXT (RAG)\n${ragContext}`;
          }
        }

        const chatHistory = [{ role: "system", content: finalSystemPrompt }, ...currentMessages.map((m: any) => ({ role: m.role, content: m.content })), { role: "user", content: topic }];
        const chunks = await activeEngine.chat.completions.create({ 
          messages: chatHistory as any, 
          stream: true,
          stream_options: { include_usage: true },
          temperature: isSmallModel ? 0.2 : 0.7, // Lower temp for generation
          top_p: isSmallModel ? 0.85 : 1.0,
          stop: isSmallModel ? ["User:", "###", "<|endoftext|>"] : undefined
        });
        let fullText = "";
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);
        for await (const chunk of chunks) {
          const content = chunk.choices[0]?.delta?.content || "";
          fullText += content;
          if (chunk.usage) setLastUsage(chunk.usage);
          setMessages(prev => { 
            const next = [...prev]; 
            next[next.length - 1] = { role: "assistant", content: fullText };
            return next; 
          });
        }
        const finalReply = await activeEngine.getMessage();
        if (finalReply) fullText = finalReply;
        
        setLastContent(fullText);
        setLastFileName(fullText.match(/title:\s*"(.*)"/)?.[1]?.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".md" || `draft-${Date.now()}.md`);
      } else {
        const ragContext = await fetchRagContext(topic);
        const token = localStorage.getItem("mcp_token");
        const res = await fetch("/api/generate-blog-post", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ 
            topic, 
            context: ragContext || undefined,
            authorName: authorInfo?.name, 
            authorPicture: authorInfo?.picture, 
            coverImage 
          }),
          signal: abortControllerRef.current.signal
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setLastFileName(data.fileName);
        setLastContent(data.content);
        setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
      }
      setIsRefining(true);
    } catch (err) {
      throw err;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || generating) return;

    resetInactivityTimer();

    const rawInput = input.trim();
    const cmd = rawInput.toLowerCase();
    const hasUrlOrFile = /https?:\/\/[^\s]+/.test(rawInput) || !!lastContent;
    
    // Strict intent detection for blogging metadata workflow
    const isTopicRequest = /\b(write|create|generate|draft|make|start)\b/i.test(rawInput) && /\b(blog|post|article|draft)\b/i.test(rawInput);

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
    if (cmd === "new") {
      setIsRefining(false);
      setIsChatting(true);
      setLastContent("");
      setLastFileName("");
      setIsExpanded(false);
      setManualOverride(false);
      setMessages(prev => [...prev, { role: "user", content: rawInput }, { role: "assistant", content: "Workspace cleared. What can I help you with now?" }]);
      setInput("");
      setWorkflowStep('input');
      return;
    }

    // --- SECOND STAGE: IMAGE CAPTURE ---
    if (workflowStep === 'awaiting_image') {
      const coverImage = cmd === 'skip' ? "" : rawInput;
      const userMsg: Message = { role: "user", content: rawInput };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput("");
      setWorkflowStep('input');
      setGenerating(true);
      setError("");

      try {
        await startGeneration(draftTopic, coverImage, nextMessages);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setGenerating(false);
      }
      return;
    }

    // --- PRIMARY STAGE: CHAT OR BLOG INITIATION ---
    if (workflowStep === 'input') {
      // 1. Consent Check
      if (computeMode === 'local' && !hasDownloadConsent) {
        setShowConsentModal(true);
        return;
      }

      const userMsg: Message = { role: "user", content: rawInput };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput("");

      // 2. Intent Branching
      if (isTopicRequest) {
        // BLOGGING INTENT - Check Authorization
        if (isGuest) {
          setMessages(prev => [...prev, { role: "assistant", content: "⚠️ **Access Required.** You need Writer or Admin privileges to generate blog posts. Redirecting you to the access request page..." }]);
          setTimeout(() => {
            router.push("/profile?tab=tools");
          }, 2500);
          return;
        }

        setIsChatting(false);
        setDraftTopic(rawInput);
        
        if (hasUrlOrFile) {
          setGenerating(true);
          setError("");
          try {
            await startGeneration(rawInput, "", nextMessages);
          } catch (err: any) {
            setError(err.message);
            setGenerating(false);
          }
        } else {
          setWorkflowStep('awaiting_image');
          setTimeout(() => {
             setMessages(prev => [...prev, { role: "assistant", content: `**Blogging Intent Detected:** "${rawInput}"\n\nTo ensure consistency, provide a **Cover Image URL** (or type 'skip').` }]);
          }, 300);
        }
      } else {
        // CASUAL CHAT OR REFINEMENT
        if (isRefining) {
          if (isGuest) {
            setMessages(prev => [...prev, { role: "assistant", content: "⚠️ **Access Required.** You need Writer or Admin privileges to refine blog drafts. Redirecting you to the access request page..." }]);
            setTimeout(() => {
              router.push("/profile?tab=tools");
            }, 2500);
            return;
          }
          setGenerating(true);
          setError("");
          try {
            if (computeMode === 'local') {
              let activeEngine = engine;
              if (!activeEngine) activeEngine = await initEngine();
              if (activeEngine) {
                const ragContext = await fetchRagContext(rawInput);
                const today = new Date().toISOString().split("T")[0];
                let systemPrompt = promptTemplate
                  .replace("{{posts_context}}", postsContext)
                  .replace("{{guidelines}}", guidelines)
                  .replace("{{today}}", today);

                if (ragContext) {
                   systemPrompt += `\n\n### [BLOG CONTEXT] (RAG)\nSTRICT RULE: Only use this context for technical facts. DO NOT hallucinate "Ramda" or "Iron Hand".\n${ragContext}`;
                }
                const chatHistory = [
                  { role: "system", content: systemPrompt }, 
                  ...nextMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content })), 
                  { role: "user", content: `REFINEMENT REQUEST: Apply these changes to the existing draft: ${rawInput}\n\nEXISTING DRAFT:\n${lastContent}` }
                ];
                
                const chunks = await activeEngine.chat.completions.create({ 
                  messages: chatHistory as any, 
                  stream: true,
                  stream_options: { include_usage: true }
                });
                let fullText = "";
                setMessages(prev => [...prev, { role: "assistant", content: "" }]);
                for await (const chunk of chunks) {
                  const content = chunk.choices[0]?.delta?.content || "";
                  fullText += content;
                  if (chunk.usage) setLastUsage(chunk.usage);
                  setMessages(prev => { 
                    const next = [...prev]; 
                    next[next.length - 1] = { role: "assistant", content: fullText };
                    return next; 
                  });
                }
                const finalReply = await activeEngine.getMessage();
                if (finalReply) fullText = finalReply;
                setLastContent(fullText);
              }
            } else {
              const token = localStorage.getItem("mcp_token");
              abortControllerRef.current = new AbortController();
              const res = await fetch("/api/generate-blog-post", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ 
                  topic: `REFINEMENT: ${rawInput}`, 
                  context: lastContent,
                  authorName: authorInfo?.name, 
                  authorPicture: authorInfo?.picture 
                }),
                signal: abortControllerRef.current.signal
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.message);
              setLastContent(data.content);
              setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
            }
          } catch (err: any) {
            setError(err.message);
          } finally {
            setGenerating(false);
          }
        } else {
          await processChat(rawInput, nextMessages);
        }
      }
      return;
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

  if (!hasResolvedAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-[75vh] w-full bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 border-dashed animate-pulse">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Verifying Identity...</p>
      </div>
    );
  }

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
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight mb-8 uppercase">
          Sudo Write <span className="text-blue-600">Draft</span>
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-12 max-w-2xl leading-relaxed font-medium">
          Bring the content you want to publish or use local/hosted LLMs to fine-tune your drafts. 
          Once satisfied, push to Git—the repo maintainer will review and update the post for you.
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
            <div className="flex items-center gap-3 relative">
              <div className={`h-2.5 w-2.5 rounded-full ${generating ? "bg-amber-500 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.4)]" : engine || computeMode === 'cloud' ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" : loading ? "bg-blue-500 animate-pulse" : "bg-indigo-500 shadow-lg"}`}></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {generating 
                    ? (computeMode === 'cloud' ? "Cloud Generating..." : "Local Thinking...") 
                    : (computeMode === 'cloud' ? "Cloud Ready" : (engine ? "Neural Active" : (loading ? "Waking Engine..." : "Engine Idle")))}
                </span>
                {computeMode === 'local' && (
                  <button 
                    onClick={() => setShowModelSelector(!showModelSelector)}
                    className="flex items-center gap-1 group/btn -mt-0.5"
                  >
                    <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 group-hover/btn:text-indigo-500 transition-colors">
                      {AVAILABLE_MODELS.find((m: any) => m.id === selectedModel)?.name || 'Select Model'}
                    </span>
                    <svg className={`w-2.5 h-2.5 text-slate-300 transition-transform ${showModelSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                  </button>
                )}
              </div>

              {/* In-Studio Model Selector */}
              {showModelSelector && computeMode === 'local' && (
                <div className="absolute top-12 left-0 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-[110] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-2 max-h-[400px] overflow-y-auto">
                    <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 mb-1">Select Neural Model</div>
                    {AVAILABLE_MODELS.filter((m: any) => m.enabled).map((model: any) => (
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
                          <p className={`text-[11px] font-black ${selectedModel === model.id ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-300'}`}>{model.name}</p>
                          <p className="text-[9px] text-slate-400 font-medium">{model.size} • {model.description.split(',')[0]}</p>
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
            <div className="flex items-center gap-4">
              <select 
                value={computeMode} 
                onChange={(e) => {
                  const val = e.target.value as 'local' | 'cloud';
                  if (val === 'local' && !hasDownloadConsent) {
                    setShowConsentModal(true);
                  } else {
                    setComputeMode(val);
                  }
                }}
                disabled={!isAdmin || !isWriter}
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
                   <h3 className="text-4xl font-black mb-2 tracking-tighter text-slate-300 dark:text-slate-700 uppercase">Sudo Write Draft</h3>
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
                  <div className="flex flex-col gap-4 animate-in fade-in duration-700">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-10 h-10 border-4 border-indigo-100 dark:border-indigo-900/40 rounded-full"></div>
                          <div className="absolute inset-0 w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 animate-pulse">
                            {generationStatus}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                            Neural Engine Processing...
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={handleStop}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 group"
                      >
                        <svg className="w-3 h-3 group-hover:animate-pulse" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>
                        Stop Execution
                      </button>
                    </div>
                  </div>
                )}

                {lastUsage && !generating && (
                   <div className="flex items-center gap-4 px-8 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 w-fit animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Tokens</span>
                        <span className="text-xs font-bold font-mono text-indigo-600">{lastUsage.total_tokens}</span>
                      </div>
                      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Completion</span>
                        <span className="text-xs font-bold font-mono text-emerald-600">{lastUsage.completion_tokens}</span>
                      </div>
                      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Prompt</span>
                        <span className="text-xs font-bold font-mono text-amber-600">{lastUsage.prompt_tokens}</span>
                      </div>
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
                     placeholder={isRefining ? "Suggest changes to the draft..." : isChatting ? "Ask anything or start a blog post..." : "Describe the blog post topic..."}
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

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        returnTo="/browser-writer" 
      />
      
      {showConsentModal && (
        <div className="fixed inset-0 z-[250] bg-slate-950/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-10 md:p-12 rounded-[3.5rem] max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-3xl">
                🏎️
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Neural Engine Download</h2>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Privacy-First Computing</p>
              </div>
            </div>

            <div className="space-y-4 mb-10 text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              <p>
                To provide the highest level of privacy, we run a local LLM directly in your browser.
              </p>
              <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-sm italic">
                "Local LLM takes up disk space (Smallest: ~600MB) but it keeps your data safe from model training by running entirely on your local GPU."
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  setShowConsentModal(false);
                  setComputeMode('cloud');
                }}
                className="py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
              >
                Use Cloud Only
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem("local_llm_consent", "true");
                  setHasDownloadConsent(true);
                  setShowConsentModal(false);
                  setComputeMode('local');
                  initEngine();
                }}
                className="py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all active:scale-95"
              >
                Accept & Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
