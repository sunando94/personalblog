"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";
import markdownStyles from "./markdown-styles.module.css";

type Props = {
  content: string;
};

export function PostBody({ content }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderMermaid = async () => {
      if (!containerRef.current) return;

      const isDarkMode = document.documentElement.classList.contains("dark");

      mermaid.initialize({
        startOnLoad: false,
        theme: isDarkMode ? "dark" : "default",
        securityLevel: "loose",
        fontFamily: "inherit",
      });

      const mermaidElements = containerRef.current.querySelectorAll(".mermaid, .language-mermaid");

      for (const el of Array.from(mermaidElements)) {
        const target = (el.tagName === "CODE" ? el.parentElement : el) as HTMLElement;
        if (!target) continue;

        // If it was already processed, we need to restore the original text for re-rendering
        const originalText = target.getAttribute("data-original-text") || el.textContent || "";
        if (!originalText.trim()) continue;

        if (!target.getAttribute("data-original-text")) {
          target.setAttribute("data-original-text", originalText);
        }

        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, originalText);

          // Find or create a container for the SVG
          let container = target.nextElementSibling as HTMLElement;
          if (!container || !container.classList.contains("mermaid-rendered-container")) {
            container = document.createElement("div");
            container.className = `mermaid-rendered-container ${markdownStyles["mermaid-container"]}`;
            target.style.display = "none";
            target.parentNode?.insertBefore(container, target.nextSibling);
          }

          container.innerHTML = svg;
          container.setAttribute("data-processed", "true");
        } catch (error) {
          console.error("Mermaid rendering failed:", error);
        }
      }
    };

    renderMermaid();

    // Observe changes to dark mode
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          renderMermaid();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [content]);

  return (
    <div className="mx-auto px-4 md:px-0">
      <div
        ref={containerRef}
        className={markdownStyles["markdown"]}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
