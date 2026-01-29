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
    const isDarkMode = document.documentElement.classList.contains("dark");

    mermaid.initialize({
      startOnLoad: false,
      theme: isDarkMode ? "dark" : "default",
      securityLevel: "loose",
      fontFamily: "inherit",
    });

    const renderMermaid = async () => {
      if (!containerRef.current) return;

      const mermaidElements = containerRef.current.querySelectorAll(".mermaid, .language-mermaid");

      for (const el of Array.from(mermaidElements)) {
        const target = el.tagName === "CODE" ? el.parentElement : el;
        if (!target || target.getAttribute("data-processed")) continue;

        try {
          let text = el.textContent || "";
          if (!text.trim()) continue;

          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

          const container = document.createElement("div");
          // Use the class from CSS modules
          container.className = markdownStyles["mermaid-container"];

          const { svg } = await mermaid.render(id, text);
          container.innerHTML = svg;

          target.parentNode?.replaceChild(container, target);
          container.setAttribute("data-processed", "true");
        } catch (error) {
          console.error("Mermaid rendering failed:", error);
          // Optional: Render error message
        }
      }
    };

    renderMermaid();

    // Re-render handled by navigation/content change for now
  }, [content]);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <div
        ref={containerRef}
        className={markdownStyles["markdown"]}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
