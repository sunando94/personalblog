
"use client";

import { useEffect, useState } from "react";

type Heading = {
  id: string;
  text: string;
  level: number;
};

export function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    // Select all h2 and h3 elements within the post content
    // We target the stable ID added in PostBody
    const elements = Array.from(document.querySelectorAll("#post-content h2, #post-content h3"));
    
    const mappedHeadings = elements.map((elem) => ({
      id: elem.id,
      text: elem.textContent || "",
      level: Number(elem.tagName.substring(1)),
    }));

    setHeadings(mappedHeadings);

    // Set up Intersection Observer for active state
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "0px 0px -40% 0px" }
    );

    elements.forEach((elem) => observer.observe(elem));

    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) return null;

  return (
    <nav className="hidden lg:block sticky top-32 max-h-[calc(100vh-8rem)] overflow-y-auto w-64 pr-4">
      <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 pl-4">
        On This Page
      </h4>
      <ul className="space-y-2 text-sm border-l border-gray-100 dark:border-slate-800">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={`block pl-4 py-1 transition-colors border-l-2 -ml-[2px] ${
                activeId === heading.id
                  ? "border-blue-600 text-blue-600 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:border-gray-300"
              }`}
              style={{ paddingLeft: heading.level === 3 ? "2rem" : "1rem" }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(heading.id)?.scrollIntoView({ behavior: "smooth" });
                setActiveId(heading.id);
              }}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
