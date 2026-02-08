
"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";
import markdownStyles from "./markdown-styles.module.css";

type Props = {
  content: string;
};

export function PostBody({ content }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    let isCancelled = false;

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

    // Presets for Interactive Components
    const PRESETS: Record<string, any> = {
      // RAG Presets
      "rag-nextjs": [
        { id: 1, topic: "RSC", text: "React Server Components allow rendering UI on the server to reduce client bundle size." },
        { id: 2, topic: "App Router", text: "The App Router uses a file-system based routing mechanism in the /app directory." },
        { id: 3, topic: "Edge Functions", text: "Vercel Edge Functions allow running compute at the edge, closer to the user." },
        { id: 4, topic: "ISR", text: "Incremental Static Regeneration updates static pages after build time without rebuilding the whole site." },
        { id: 5, topic: "Image Optimization", text: "Next.js Image component automatically optimizes images for size and format (WebP/AVIF)." },
        { id: 6, topic: "Middleware", text: "Middleware allows you to run code before a request is completed, useful for auth and redirects." },
      ],
      "rag-vector": [
          { id: 1, topic: "Embeddings", text: "Vector embeddings represent semantic meaning of text as a list of floating point numbers." },
          { id: 2, topic: "Cosine Similarity", text: "Cosine similarity measures the cosine of the angle between two vectors to determine similarity." },
          { id: 3, topic: "HNSW", text: "Hierarchical Navigable Small World graphs are used for approximate nearest neighbor search." },
          { id: 4, topic: "Dimensionality", text: "High-dimensional vectors (e.g. 1536d) capture more semantic nuance than lower dimensions." },
          { id: 5, topic: "Sparse Vectors", text: "Sparse vectors (BM25) capture keyword frequency and are better for exact matches." },
      ],
    };

    // Helper to safely mount React components
    const mountComponent = async (id: string, Component: any) => {
        if (!containerRef.current) return;
        
        // Find by ID first for backward compat, then class
        const elements = [
            ...Array.from(containerRef.current.querySelectorAll(`#${id}`)),
            ...Array.from(containerRef.current.querySelectorAll(`.${id.replace("-root", "")}`))
        ];
        
        for (const el of elements) {
            let trackId = el.id;
            if (!trackId) {
                trackId = `${id}-${Math.random().toString(36).substr(2, 9)}`;
                el.id = trackId;
            }

            if (rootsRef.current.has(trackId)) continue;

            const { createRoot } = await import("react-dom/client");
            
            // CHECK CANCELLATION BEFORE CREATING ROOT
            if (isCancelled) return;

            // Parse props
            const title = el.getAttribute("data-title");
            const preset = el.getAttribute("data-preset");
            const chunksStr = el.getAttribute("data-data"); 
            
            let props: any = {};
            if (title) props.title = title;
            
            let data = null;
            if (preset && PRESETS[preset]) {
                data = PRESETS[preset];
            } else if (chunksStr) {
                try {
                   data = JSON.parse(chunksStr);
                } catch (e) {
                   console.error("Failed to parse data attribute", e);
                }
            }

            // Map data to specific props
            if (data) {
                if (id.includes("rag-simulator")) props.initialChunks = data;
            }

            const root = createRoot(el);
            root.render(<Component {...props} />);
            rootsRef.current.set(trackId, root);
        }
    };

    // Mount RAG Simulator
    import("./rag-simulator").then(({ RagSimulator }) => {
        if (!isCancelled) mountComponent("rag-simulator-root", RagSimulator);
    });

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

    return () => {
      isCancelled = true;
      observer.disconnect();
      // Cleanup all React roots safely
      rootsRef.current.forEach((root) => {
          setTimeout(() => {
              root.unmount();
          }, 0);
      });
      rootsRef.current.clear();
    };
  }, [content]);

  return (
    <div className="mx-auto px-4 md:px-0">
      <div
        ref={containerRef}
        id="post-content"
        className={markdownStyles["markdown"]}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
