import fs from "fs/promises";
import path from "path";
import Container from "@/app/_components/container";
import WriterClient from "./_components/writer-client";
import { getAllPostsIncludingScheduled } from "@/lib/api";

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
          <div className="max-w-4xl mx-auto">
            <WriterClient 
              guidelines={guidelines} 
              promptTemplate={promptTemplate} 
              postsContext={postsContext}
            />
          </div>
        </div>
      </Container>
    </main>
  );
}
