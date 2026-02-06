"use client";

import { useRouter } from "next/navigation";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnTo: string;
}

export function AuthModal({ isOpen, onClose, returnTo }: AuthModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
       <div className="bg-white dark:bg-slate-950 rounded-[2rem] p-10 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
          {/* Close Button */}
          <button 
             onClick={onClose}
             className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>

          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-inner">⚡️</div>
          <h2 className="text-2xl font-black mb-3 tracking-tight">Access Required</h2>
          <p className="text-slate-500 font-medium mb-8 text-sm leading-relaxed">
            The AI Writer Dashboard is restricted to authenticated contributors and admins. Verify your identity to unlock the neural forge.
          </p>
          <a 
            href={`/api/auth/linkedin?returnTo=${encodeURIComponent(returnTo)}`}
            className="w-full py-4 bg-[#0077b5] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-[#006097] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            Login with LinkedIn
          </a>
       </div>
    </div>
  );
}
