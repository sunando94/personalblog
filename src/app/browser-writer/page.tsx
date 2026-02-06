import fs from "fs/promises";
import path from "path";
import Container from "@/app/_components/container";
import WriterClient from "./_components/writer-client";
import { getAllPostsIncludingScheduled } from "@/lib/api";

import { Suspense } from "react";

export default async function BrowserWriterPage() {
  const guidelines = await fs.readFile(
    path.join(process.cwd(), ".agent/docs/blog_post_guidelines.md"),
    "utf-8"
  );
  const promptTemplate = await fs.readFile(
    path.join(process.cwd(), "mcp/prompts/assistant.md"),
    "utf-8"
  );

  const posts = getAllPostsIncludingScheduled();
  const postsContext = posts.map(p => `- TITLE: ${p.title}\n  SLUG: ${p.slug}\n  DATE: ${p.date}\n  EXCERPT: ${p.excerpt}`).join('\n\n');

  return (
    <main>
      <Container>
        <div className="py-12">
          <div className="w-full">
            <Suspense fallback={
              <div className="h-[75vh] flex items-center justify-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 animate-pulse">
                <div className="text-center">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white">
                    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initializing Studio...</p>
                </div>
              </div>
            }>
              <WriterClient 
                guidelines={guidelines} 
                promptTemplate={promptTemplate} 
                postsContext={postsContext}
              />
            </Suspense>
          </div>
        </div>
      </Container>
    </main>
  );
}
