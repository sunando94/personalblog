"use client";

import { useState, useEffect, useRef } from "react";
import * as webllm from "@mlc-ai/web-llm";

interface WriterClientProps {
  guidelines: string;
  promptTemplate: string;
}

export default function WriterClient({ guidelines, promptTemplate }: WriterClientProps) {
  const [engine, setEngine] = useState<webllm.MLCEngineInterface | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const selectedModel = "Llama-3.2-1B-Instruct-q4f32_1-MLC";

  async function initEngine() {
    setLoading(true);
    setError("");
    try {
      const newEngine = await webllm.CreateMLCEngine(selectedModel, {
        initProgressCallback: (info) => {
          setProgress(info.text);
          console.log(info.text);
        },
      });
      setEngine(newEngine);
    } catch (err: any) {
      console.error(err);
      setError(`Failed to initialize WebGPU engine: ${err.message}. Make sure your browser supports WebGPU and it is enabled.`);
    } finally {
      setLoading(false);
    }
  }

  const generatePost = async () => {
    if (!topic) return;

    setGenerating(true);
    setResult("");
    setError("");

    try {
      // 1. Try Remote API (Gemini) first
      console.log("Attempting Remote Generation...");
      const response = await fetch("/api/generate-blog-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, context, isDraft: false }),
      });

      if (response.ok) {
        setResult("# Success!\nYour post was generated via Gemini and saved to the repository.\n\nCheck your /_posts folder or GitHub deployment.");
        setGenerating(false);
        return;
      }

      const data = await response.json();
      
      // 2. Fallback to Local Engine if Rate Limited
      if (response.status === 429) {
        console.warn("Gemini Rate Limit Exceeded. Falling back to Local GPU...");
        
        if (!engine) {
          setError("Cloud API limit reached! Please click 'Pre-load GPU Engine' to continue with Local GPU inference.");
          setGenerating(false);
          return;
        }

        // Local Generation logic (WebLLM)
        const today = new Date().toISOString().split("T")[0];
        const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        
        let prompt = promptTemplate
          .replace("{{topic}}", topic)
          .replace("{{guidelines}}", guidelines)
          .replace("{{context}}", context || "No additional context provided.")
          .replace("{{today}}", today)
          .replace("{{slug}}", slug)
          .replace("{{finalReleaseDate}}", today);

        const chunks = await engine.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          stream: true,
        });

        let fullText = "";
        for await (const chunk of chunks) {
          const content = chunk.choices[0]?.delta?.content || "";
          fullText += content;
          setResult(fullText);
        }
      } else {
        throw new Error(data.message || "Unknown error occurred.");
      }
    } catch (err: any) {
      console.error(err);
      setError(`Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const downloadPost = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    a.href = url;
    a.download = `${slug || "generated-post"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Model Status Card */}
      <div className="relative group p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-2xl shadow-blue-500/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold mb-1">AI Engine Status</h3>
            <p className="text-sm text-slate-500">
              {engine ? `Local Engine Active: ${selectedModel}` : "Primary: Gemini Cloud | Fallback: Local GPU"}
            </p>
          </div>
          
          {!engine ? (
            <button
              onClick={initEngine}
              disabled={loading}
              className={`px-8 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                loading 
                ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                : "bg-black dark:bg-white text-white dark:text-black shadow-xl shadow-blue-500/20"
              }`}
            >
              {loading ? "Initializing..." : "Pre-load GPU Engine"}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-green-600 font-bold">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Local GPU Online
            </div>
          )}
        </div>

        {loading && (
          <div className="mt-6 space-y-2">
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: progress.includes("%") ? progress.split("%")[0].split("(").pop() + "%" : "10%" }}
              ></div>
            </div>
            <p className="text-xs text-slate-400 font-mono truncate">{progress}</p>
          </div>
        )}

        {error && (
          <div className={`mt-4 p-4 rounded-xl border text-sm ${
            error.includes("limit reached") 
            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-600 dark:text-amber-400"
            : "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-600 dark:text-red-400"
          }`}>
            {error}
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="space-y-6">
        <div className="space-y-4">
          <label className="block text-sm font-bold uppercase tracking-widest text-slate-400">Target Topic</label>
          <input 
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Mastering React 19 Server Components"
            className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-lg font-medium"
          />
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-bold uppercase tracking-widest text-slate-400">Additional Context (Optional)</label>
          <textarea 
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Paste URLs, technical specs, or personal notes here..."
            className="w-full h-32 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none font-mono text-sm"
          />
        </div>

        <button
          onClick={generatePost}
          disabled={generating || !topic}
          className={`w-full py-5 rounded-2xl font-black text-xl tracking-tight transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 ${
            generating || !topic
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-blue-600 text-white shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/50"
          }`}
        >
          {generating ? (
            <div className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {engine ? "Local GPU Working..." : "Remote Cloud Working..."}
            </div>
          ) : (
            "Start AI Generation Pipeline"
          )}
        </button>
      </div>

      {/* Result Section */}
      {result && (
        <div className="space-y-4 animate-in fade-in duration-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Draft Content</h3>
            <button 
              onClick={downloadPost}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold text-sm"
            >
              Download .md
            </button>
          </div>
          <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-inner overflow-auto max-h-[600px]">
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {result}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
