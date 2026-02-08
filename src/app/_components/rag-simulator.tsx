
"use client";

import { useState, useMemo } from "react";

// Mock Data: Knowledge Base about "SpaceX Starship"
const DEFAULT_KNOWLEDGE_BASE = [
  { id: 1, text: "Starship is a fully reusable super heavy-lift launch vehicle under development by SpaceX.", topic: "Overview" },
  { id: 2, text: "The Starship spacecraft is the second stage of the Starship system. It is designed to carry both crew and cargo.", topic: "Second Stage" },
  { id: 3, text: "Super Heavy is the first stage booster of the Starship system. It is powered by 33 Raptor engines.", topic: "First Stage" },
  { id: 4, text: "The Raptor engine is a reusable methalox staged-combustion engine.", topic: "Engine" },
  { id: 5, text: "Starship creates a new paradigm for space exploration with low marginal cost per launch.", topic: "Economics" },
  { id: 6, text: "The heat shield is made of hexagonal ceramic tiles to protect against reentry capability.", topic: "Heat Shield" },
  { id: 7, text: "SpaceX plans to use Starship for Mars colonization missions.", topic: "Mars" },
  { id: 8, text: "The integrated payload volume is 1,000 m3, larger than any other launcher.", topic: "Payload" },
];

interface KnowledgeBaseChunk {
  id: number;
  text: string;
  topic: string;
}

interface RagSimulatorProps {
  title?: string;
  initialChunks?: KnowledgeBaseChunk[];
  defaultQuery?: string;
}

// Simple "mock" similarity function based on keyword overlap for demo purposes
// In a real app, this would be vector dot product
function calculateMockSimilarity(query: string, text: string): number {
  if (!query) return 0;
  const queryTerms = query.toLowerCase().split(" ");
  const textLower = text.toLowerCase();
  let matches = 0;
  queryTerms.forEach(term => {
    if (textLower.includes(term)) matches += 1;
  });
  // Add some randomness to simulate vector semantics
  const baseScore = matches / queryTerms.length; 
  return Math.min(0.99, Math.max(0.1, baseScore + (Math.random() * 0.2)));
}

export function RagSimulator({ 
  title = "Interactive RAG Simulator", 
  initialChunks = DEFAULT_KNOWLEDGE_BASE,
  defaultQuery = "What engines does Starship use?"
}: RagSimulatorProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [topK, setTopK] = useState(3);
  const [threshold, setThreshold] = useState(0.4);

  // Calculate scores dynamically
  const scoredChunks = useMemo(() => {
    const scored = initialChunks.map(chunk => ({
      ...chunk,
      score: calculateMockSimilarity(query, chunk.text)
    }));
    return scored.sort((a, b) => b.score - a.score);
  }, [query, initialChunks]);

  const retrievedChunks = scoredChunks
    .filter(chunk => chunk.score >= threshold)
    .slice(0, topK);

  return (
    <div className="my-10 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm not-prose">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {title}
        </h3>
        <span className="text-xs font-mono bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400">
          v1.0.0
        </span>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
           <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
             User Query
           </label>
           <input 
             type="text"
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
             placeholder="Search knowledge base..."
           />
        </div>
        <div className="space-y-4">
           <div>
             <div className="flex justify-between mb-1">
               <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Top-K (Retrieval Limit)</label>
               <span className="text-xs font-mono font-bold text-blue-600">{topK}</span>
             </div>
             <input 
               type="range" min="1" max="8" step="1"
               value={topK}
               onChange={(e) => setTopK(Number(e.target.value))}
               className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
             />
           </div>
           <div>
             <div className="flex justify-between mb-1">
               <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Similarity Threshold</label>
               <span className="text-xs font-mono font-bold text-purple-600">{threshold.toFixed(2)}</span>
             </div>
             <input 
               type="range" min="0" max="1" step="0.05"
               value={threshold}
               onChange={(e) => setThreshold(Number(e.target.value))}
               className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
             />
           </div>
        </div>
      </div>

      {/* Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* All Chunks / Knowledge Base */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Knowledge Base (Vector Space)</h4>
          <div className="h-64 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {scoredChunks.map((chunk) => {
              const notRetrievedReason = chunk.score < threshold ? "Score too low" : "Exceeds Top-K";
              const isRetrieved = retrievedChunks.includes(chunk);

              return (
                <div 
                  key={chunk.id}
                  className={`p-3 rounded-lg border text-xs transition-all duration-300 ${isRetrieved 
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm transform scale-[1.02]" 
                    : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-60 grayscale"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{chunk.topic}</span>
                    <span className={`font-mono font-bold ${isRetrieved ? "text-blue-600" : "text-slate-400"}`}>
                      {chunk.score.toFixed(3)}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{chunk.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Context Window / LLM Input */}
        <div>
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            LLM Context Window
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
              {retrievedChunks.length} Chunks
            </span>
          </h4>
          <div className="h-64 bg-slate-900 rounded-lg p-4 overflow-y-auto text-xs font-mono text-slate-300 border border-slate-800 shadow-inner">
             <div className="text-slate-500 mb-2"># System Prompt included...</div>
             <div className="text-purple-400 mb-2">Context:</div>
             {retrievedChunks.length > 0 ? (
               retrievedChunks.map((chunk, i) => (
                 <div key={chunk.id} className="mb-3 pl-2 border-l-2 border-green-500/50">
                   <span className="text-slate-500 select-none">[{i+1}] </span>
                   <span className="text-green-300">{chunk.text}</span>
                 </div>
               ))
             ) : (
               <div className="text-slate-600 italic p-4 text-center">
                 No chunks passed the threshold. The LLM will likely hallucinate or say "I don't know".
               </div>
             )}
             <div className="text-blue-400 mt-4">User: {query}</div>
             <div className="text-purple-400">Assistant: <span className="animate-pulse">_</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
