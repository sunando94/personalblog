"use client";

import { useState, useEffect } from "react";
import cn from "classnames";

export function NewsletterModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Check if user has already dismissed or subscribed
    const hasSeenModal = localStorage.getItem("newsletter_dismissed");
    if (hasSeenModal) return;

    // Show after 20 seconds
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 20000);

    // Also trigger on exit intent (mouse leaving window)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setIsOpen(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    // Persist dismissal for 7 days
    const expiry = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("newsletter_dismissed", expiry.toString());
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setStatus("success");
        // Persist subscription for 30 days
        const expiry = new Date().getTime() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem("newsletter_dismissed", expiry.toString());
        setTimeout(() => setIsOpen(false), 3000);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Subscription failed");
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className={cn(
        "relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-2xl transition-all duration-500 transform scale-100",
        status === "success" ? "border-green-500/50" : "border-white/20"
      )}>
        {/* Decorative background element */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-purple-600/20 blur-3xl" />

        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative z-10">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500 ring-1 ring-blue-500/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>

          <h2 className="mb-2 text-3xl font-black tracking-tight text-white">
            Engineering Deep Dives
          </h2>
          <p className="mb-8 text-lg text-slate-400 leading-relaxed">
            No spam. Just technical manifestos on RAG, LLM Agents, and Edge Engineering, delivered straight to your inbox.
          </p>

          {status === "success" ? (
            <div className="flex flex-col items-center justify-center py-4 text-center animate-in zoom-in duration-300">
              <div className="mb-4 rounded-full bg-green-500/20 p-3 text-green-500 ring-1 ring-green-500/30">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xl font-bold text-white">You&apos;re in!</p>
              <p className="text-slate-400">Welcome to the inner circle.</p>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-4">
              <div className="group relative">
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-white placeholder-slate-500 outline-none ring-blue-500/20 transition-all focus:border-blue-500 focus:ring-4"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={status === "loading"}
                className={cn(
                  "relative w-full overflow-hidden rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50",
                  status === "loading" && "cursor-not-allowed"
                )}
              >
                {status === "loading" ? (
                  <div className="flex items-center justify-center">
                    <svg className="mr-2 h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Subscribing...
                  </div>
                ) : (
                  "Get Updates"
                )}
              </button>
            </form>
          )}

          {status === "error" && (
            <p className="mt-4 text-center text-sm font-medium text-red-500">{errorMessage}</p>
          )}

          <p className="mt-6 text-center text-xs text-slate-500">
            By subscribing, you agree to our privacy policy. One-click unsubscribe anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
