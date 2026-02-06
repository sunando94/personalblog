import fs from "fs/promises";
import path from "path";
import { getAllPostsIncludingScheduled } from "@/lib/api";
import AssistantClient from "./assistant-client";

export async function GlobalAssistant() {
  const guidelinesPath = path.join(process.cwd(), ".agent/docs/blog_post_guidelines.md");
  const promptPath = path.join(process.cwd(), "mcp/prompts/assistant.md");
  
  let guidelines = "";
  let promptTemplate = "";
  
  try {
    guidelines = await fs.readFile(guidelinesPath, "utf-8");
    promptTemplate = await fs.readFile(promptPath, "utf-8");
  } catch (e) {
    console.error("Failed to load assistant configs", e);
  }

  const posts = getAllPostsIncludingScheduled();
  const postsContext = posts.map(p => `- TITLE: ${p.title}\n  SLUG: ${p.slug}\n  DATE: ${p.date}\n  EXCERPT: ${p.excerpt}`).join('\n\n');

  return (
    <AssistantClient 
      guidelines={guidelines} 
      promptTemplate={promptTemplate} 
      postsContext={postsContext} 
    />
  );
}
