"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function SiteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const startTime = useRef(Date.now());
  const viewId = useRef<string | null>(null);

  useEffect(() => {
    // Reset timer on path change
    startTime.current = Date.now();
    viewId.current = null;

    const trackView = async () => {
      try {
        const sessionId = sessionStorage.getItem("session_id") || Math.random().toString(36).substring(2);
        if (!sessionStorage.getItem("session_id")) sessionStorage.setItem("session_id", sessionId);

        const visitorId = localStorage.getItem("visitor_id") || Math.random().toString(36).substring(2);
        if (!localStorage.getItem("visitor_id")) localStorage.setItem("visitor_id", visitorId);

        const res = await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "view",
            path: pathname, // Use pathname directly
            sessionId,
            visitorId,
          }),
        });
        
        if (res.ok) {
           const data = await res.json();
           viewId.current = data.id;
        }
      } catch (e) {
        console.error("Failed to track view", e);
      }
    };

    trackView();

    // Heartbeat for dwell time
    const interval = setInterval(async () => {
      if (viewId.current) {
        const duration = Math.floor((Date.now() - startTime.current) / 1000);
        try {
            await fetch("/api/analytics/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "heartbeat",
                    id: viewId.current,
                    duration
                }),
                keepalive: true
            });
        } catch {}
      }
    }, 15000); // 15s interval

    return () => {
      clearInterval(interval);
      // Final update on unmount
      if (viewId.current) {
        const duration = Math.floor((Date.now() - startTime.current) / 1000);
        const blob = new Blob([JSON.stringify({
            type: "heartbeat",
            id: viewId.current,
            duration
        })], { type: 'application/json' });
        navigator.sendBeacon("/api/analytics/track", blob);
      }
    };
  }, [pathname, searchParams]);

  return null;
}
