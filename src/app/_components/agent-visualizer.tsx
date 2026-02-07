
"use client";

import { useState, useEffect, useRef } from "react";

type AgentState = "idle" | "thinking" | "working" | "waiting" | "success" | "error";

const DEFAULT_LOGS = [
  { agent: "System", msg: "Workflow initialized. Waiting for task..." },
  { agent: "Planner", msg: "Analyzing request: 'Create a Snake game'" },
  { agent: "Planner", msg: "Decomposition: 1. Game Loop 2. Snake Class 3. Food Class 4. UI" },
  { agent: "Planner", msg: "Plan approved. Handing off to Executor." },
  { agent: "Executor", msg: "Reading file: game_engine.py" },
  { agent: "Executor", msg: "Writing code for 'Snake Class'..." },
  { agent: "Executor", msg: "Writing code for 'Game Loop'..." },
  { agent: "Executor", msg: "Task execution complete. Submitting for review." },
  { agent: "Reviewer", msg: "Linting code... 2 errors found." },
  { agent: "Reviewer", msg: "Critique: Missing type hints in move() method." },
  { agent: "Reviewer", msg: "Sending back to Executor for fixes." },
  { agent: "Executor", msg: "Applying fixes to game_engine.py..." },
  { agent: "Executor", msg: "Resubmitting..." },
  { agent: "Reviewer", msg: "All checks passed. Quality Gate approved." },
  { agent: "System", msg: "Workflow finished successfully." },
];

interface LogItem {
  agent: string;
  msg: string;
}

interface AgentVisualizerProps {
  title?: string;
  initialLogs?: LogItem[];
}

export function AgentVisualizer({ 
  title = "Agent Swarm Visualizer", 
  initialLogs = DEFAULT_LOGS 
}: AgentVisualizerProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (!isRunning) return;

    let timeout: NodeJS.Timeout;
    if (activeStep < initialLogs.length) {
      timeout = setTimeout(() => {
        setLogs(prev => [...prev, initialLogs[activeStep]]);
        setActiveStep(prev => prev + 1);
      }, 1500); // 1.5s delay between steps
    } else {
      setIsRunning(false);
    }

    return () => clearTimeout(timeout);
  }, [isRunning, activeStep, initialLogs]);

  const startSimulation = () => {
    setLogs([]);
    setActiveStep(1); // Skip init msg
    setLogs([initialLogs[0]]);
    setIsRunning(true);
  };

  const currentAgent = activeStep < initialLogs.length ? initialLogs[activeStep]?.agent : "System";

  return (
    <div className="my-10 p-6 bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
      
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🤖</span> Agent Swarm Visualizer
        </h3>
        <button
          onClick={startSimulation}
          disabled={isRunning}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            isRunning 
              ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
              : "bg-green-600 hover:bg-green-500 text-white shadow-lg hover:shadow-green-500/20"
          }`}
        >
          {isRunning ? "Running Simulation..." : "Start Workflow"}
        </button>
      </div>

      {/* Agents Diagram */}
      <div className="flex justify-between items-center mb-8 relative px-4">
        {/* Connection Lines */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-700 -z-10 transform -translate-y-1/2"></div>
        
        {/* Planner Node */}
        <div className={`relative z-10 flex flex-col items-center transition-all duration-300 ${currentAgent === "Planner" ? "scale-110" : "scale-100 opacity-70"}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 mb-3 shadow-[0_0_20px_rgba(0,0,0,0.3)] bg-slate-800 ${
            currentAgent === "Planner" ? "border-blue-500 shadow-blue-500/30" : "border-slate-600"
          }`}>
            <span className="text-3xl">🧠</span>
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider ${currentAgent === "Planner" ? "text-blue-400" : "text-slate-500"}`}>Planner</span>
        </div>

        {/* Executor Node */}
        <div className={`relative z-10 flex flex-col items-center transition-all duration-300 ${currentAgent === "Executor" ? "scale-110" : "scale-100 opacity-70"}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 mb-3 shadow-[0_0_20px_rgba(0,0,0,0.3)] bg-slate-800 ${
            currentAgent === "Executor" ? "border-purple-500 shadow-purple-500/30" : "border-slate-600"
          }`}>
             <span className="text-3xl">💻</span>
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider ${currentAgent === "Executor" ? "text-purple-400" : "text-slate-500"}`}>Executor</span>
        </div>

        {/* Reviewer Node */}
        <div className={`relative z-10 flex flex-col items-center transition-all duration-300 ${currentAgent === "Reviewer" ? "scale-110" : "scale-100 opacity-70"}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 mb-3 shadow-[0_0_20px_rgba(0,0,0,0.3)] bg-slate-800 ${
            currentAgent === "Reviewer" ? "border-pink-500 shadow-pink-500/30" : "border-slate-600"
          }`}>
             <span className="text-3xl">⚖️</span>
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider ${currentAgent === "Reviewer" ? "text-pink-400" : "text-slate-500"}`}>Reviewer</span>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="bg-black rounded-lg p-4 font-mono text-xs h-48 overflow-y-auto border border-slate-800 shadow-inner" ref={scrollRef}>
        <div className="text-slate-500 mb-2">// System Logs</div>
        {logs.length === 0 && <div className="text-slate-600 italic">Ready to start...</div>}
        {logs.map((log, i) => (
          <div key={i} className="mb-1 animate-in fade-in slide-in-from-left-2 duration-300">
            <span className={`${
              log.agent === "Planner" ? "text-blue-400" :
              log.agent === "Executor" ? "text-purple-400" :
              log.agent === "Reviewer" ? "text-pink-400" : "text-slate-400"
            }`}>[{log.agent}]</span>
            <span className="text-slate-300 ml-2">{log.msg}</span>
          </div>
        ))}
        {isRunning && (
           <div className="animate-pulse text-green-500 mt-2">_</div>
        )}
      </div>
    </div>
  );
}
