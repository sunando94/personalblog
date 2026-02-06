import fs from "fs/promises";
import path from "path";
import Container from "@/app/_components/container";
import Header from "@/app/_components/header";
import WriterClient from "./_components/writer-client";

export default async function BrowserWriterPage() {
  const guidelines = await fs.readFile(
    path.join(process.cwd(), ".agent/docs/blog_post_guidelines.md"),
    "utf-8"
  );
  const promptTemplate = await fs.readFile(
    path.join(process.cwd(), "mcp/prompts/unified_post.md"),
    "utf-8"
  );

  return (
    <main>
      <Container>
        <Header />
        <div className="py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight mb-8">
              Browser Writer <span className="text-blue-600">AI</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-12 max-w-2xl">
              Generate high-quality technical blog posts directly in your browser using 
              <strong> WebGPU</strong>. No API keys needed, zero server costs, and total privacy.
            </p>
            
            <WriterClient 
              guidelines={guidelines} 
              promptTemplate={promptTemplate} 
            />
          </div>
        </div>
      </Container>
    </main>
  );
}
