import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import matter from "gray-matter";

dotenv.config();

/**
 * Multi-Agent Pipeline for Blog Generation
 */
export async function generatePost(options = {}) {
  const {
    topic = process.env.TOPIC,
    apiKey = process.env.GEMINI_API_KEY,
    releaseDateInput = process.env.RELEASE_DATE || "now",
    contextInput = process.env.ADDITIONAL_CONTEXT || "",
    isDraft = process.env.MODE === "draft"
  } = options;

  if (!topic || !apiKey) {
    throw new Error("Missing TOPIC or GEMINI_API_KEY.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  // 1. Daily Limit & Scheduling Logic
  const postsDir = path.join(process.cwd(), "_posts");
  await fs.mkdir(postsDir, { recursive: true });
  
  const existingFiles = await fs.readdir(postsDir);
  const existingDates = new Set();
  
  for (const file of existingFiles) {
    if (file.endsWith(".md")) {
      const content = await fs.readFile(path.join(postsDir, file), "utf-8");
      const { data } = matter(content);
      const rDate = data.releaseDate || data.date;
      if (rDate) {
        existingDates.add(new Date(rDate).toISOString().split('T')[0]);
      }
    }
  }

  let targetDate = releaseDateInput.toLowerCase() === "now" 
    ? new Date().toISOString().split('T')[0] 
    : releaseDateInput;

  // Ensure 1 post per day
  let dateObj = new Date(targetDate);
  while (existingDates.has(dateObj.toISOString().split('T')[0])) {
    console.log(`Post already exists for ${dateObj.toISOString().split('T')[0]}. Scheduling for next day...`);
    dateObj.setDate(dateObj.getDate() + 1);
  }
  const finalReleaseDate = dateObj.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  // 2. Resolve Context
  let resolvedContext = "";
  if (contextInput) {
    console.log(`Resolving context: ${contextInput.substring(0, 50)}...`);
    if (contextInput.startsWith("http")) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const res = await fetch(contextInput, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        resolvedContext = await res.text();
        resolvedContext = resolvedContext.replace(/<[^>]*>?/gm, ' ').substring(0, 8000); 
        console.log("Context resolved via HTTP.");
      } catch (e) {
        console.error("Context fetch failed or timed out:", e.message);
        resolvedContext = contextInput;
      }
    } else {
      const fullPath = path.join(process.cwd(), contextInput);
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          resolvedContext = await fs.readFile(fullPath, "utf-8");
          console.log("Context resolved via local file.");
        } else {
          resolvedContext = contextInput;
        }
      } catch (e) {
        resolvedContext = contextInput;
      }
    }
  }

  // Read Guidelines
  const guidelines = await fs.readFile(path.join(process.cwd(), ".agent/docs/blog_post_guidelines.md"), "utf-8");

  // Helper to load and fill prompt templates
  const loadPrompt = async (name, data) => {
    let template = await fs.readFile(path.join(process.cwd(), `mcp/prompts/${name}.md`), "utf-8");
    for (const [key, value] of Object.entries(data)) {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return template;
  };

  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // --- MULTI-AGENT PIPELINE ---

  // AGENT 1: WRITER
  console.log("Stage 1: Writer Agent starting...");
  const writerPrompt = await loadPrompt('writer', {
    topic,
    guidelines,
    context: resolvedContext || "No additional context provided."
  });
  const writerResult = await model.generateContent(writerPrompt);
  const draft = writerResult.response.text();

  // AGENT 2: REVIEWER
  console.log("Stage 2: Reviewer Agent critiquing...");
  const reviewerPrompt = await loadPrompt('reviewer', {
    draft,
    guidelines
  });
  const reviewerResult = await model.generateContent(reviewerPrompt);
  const reviewedDraft = reviewerResult.response.text();

  // AGENT 3: SEO & PUBLISHER
  console.log("Stage 3: SEO & Publisher Agent finalising...");
  const seoPrompt = await loadPrompt('seo', {
    draft: reviewedDraft,
    topic,
    today,
    slug,
    finalReleaseDate: finalReleaseDate
  });
  const seoResult = await model.generateContent(seoPrompt);
  let finalContent = seoResult.response.text().trim();

  // Cleanup markdown fences
  if (finalContent.startsWith("```markdown")) {
    finalContent = finalContent.substring(11, finalContent.length - 3).trim();
  } else if (finalContent.startsWith("```")) {
    finalContent = finalContent.substring(3, finalContent.length - 3).trim();
  }

  // Prefix with [DRAFT] if in draft mode
  if (isDraft) {
    finalContent = finalContent.replace(/^title: "(.*)"/m, 'title: "[DRAFT] $1"');
  }

  const fileName = `${slug}.md`;
  const filePath = path.join(postsDir, fileName);

  await fs.writeFile(filePath, finalContent);

  console.log(`\n✅ Pipeline Complete!`);
  console.log(`Post generated: ${filePath}`);
  console.log(`Release Date: ${finalReleaseDate}`);
  if (isDraft) console.log(`Mode: DRAFT`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('generate-post.mjs')) {
  generatePost().catch(err => {
    console.error("Pipeline failed:", err);
    process.exit(1);
  });
}
