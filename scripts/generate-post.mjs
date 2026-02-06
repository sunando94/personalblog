import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import matter from "gray-matter";
import { fileURLToPath } from 'url';

// dotenv.config() removed to prevent stdout noise during MCP initialization

/**
 * Multi-Agent Pipeline for Blog Generation
 */
export async function generatePost(options = {}) {
  const {
    topic = process.env.TOPIC,
    apiKey = process.env.GEMINI_API_KEY,
    releaseDateInput = process.env.RELEASE_DATE || "now",
    contextInput = process.env.ADDITIONAL_CONTEXT || ""
  } = options;

  if (!topic || !apiKey) {
    throw new Error("Missing TOPIC or GEMINI_API_KEY.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Model Fallback List
  const MODELS = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-1.5-flash"];

  const generateWithFallback = async (prompt, stageName) => {
    for (const modelName of MODELS) {
      try {
        console.log(`[${stageName}] Attempting with ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (e) {
        console.error(`[${stageName}] Failed with ${modelName}: ${e.message}`);
        if (modelName === MODELS[MODELS.length - 1]) throw e;
      }
    }
  };

  // 1. Daily Limit & Scheduling Logic
  const normalizeDate = (dateStr) => {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    // Handle DD/MM/YYYY
    const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
    if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
    // Handle YYYY-MM-DD
    const yyyymmdd = /^\d{4}-\d{2}-\d{2}/.exec(str);
    if (yyyymmdd) return yyyymmdd[0];
    
    // Fallback to JS Date parsing
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  };

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let projectRoot = process.cwd();
  if (projectRoot === "/") {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    projectRoot = path.resolve(__dirname, "..");
  }
  const postsDir = path.join(projectRoot, "_posts");
  await fs.mkdir(postsDir, { recursive: true });
  
  const existingFiles = await fs.readdir(postsDir);
  const existingDates = new Set();
  
  for (const file of existingFiles) {
    if (file.endsWith(".md")) {
      try {
        const content = await fs.readFile(path.join(postsDir, file), "utf-8");
        const { data } = matter(content);
        const rDate = normalizeDate(data.releaseDate || data.date);
        if (rDate) existingDates.add(rDate);
      } catch (e) {
        console.warn(`Could not parse date for ${file}: ${e.message}`);
      }
    }
  }

  let targetDate = releaseDateInput.toLowerCase() === "now" 
    ? new Date().toISOString().split('T')[0] 
    : normalizeDate(releaseDateInput) || new Date().toISOString().split('T')[0];

  // Ensure 1 post per day
  let dateObj = new Date(targetDate);
  if (isNaN(dateObj.getTime())) dateObj = new Date();

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
      const fullPath = path.join(projectRoot, contextInput);
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
  const guidelines = await fs.readFile(path.join(projectRoot, ".agent/docs/blog_post_guidelines.md"), "utf-8");

  // Helper to load and fill prompt templates
  const loadPrompt = async (name, data) => {
    let template = await fs.readFile(path.join(projectRoot, `mcp/prompts/${name}.md`), "utf-8");
    for (const [key, value] of Object.entries(data)) {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return template;
  };

  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // --- UNIFIED GENERATION PIPELINE ---
  console.log("Unified Blog Agent starting...");
  const unifiedPrompt = await loadPrompt('unified_post', {
    topic,
    guidelines,
    context: resolvedContext || "No additional context provided.",
    today,
    slug,
    finalReleaseDate: finalReleaseDate
  });

  let finalContent = await generateWithFallback(unifiedPrompt, "Unified Agent");
  finalContent = finalContent.trim();

  // Cleanup markdown fences
  if (finalContent.startsWith("```markdown")) {
    finalContent = finalContent.substring(11, finalContent.length - 3).trim();
  } else if (finalContent.startsWith("```")) {
    finalContent = finalContent.substring(3, finalContent.length - 3).trim();
  }

  const fileName = `${slug}.md`;
  const filePath = path.join(postsDir, fileName);

  // Helper to push to GitHub if we are in a read-only environment
  const pushToGithub = async (content, path) => {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO || "sunando94/personalblog";
    const branch = process.env.GITHUB_BRANCH || "dev";
    
    if (!token) {
      console.warn("Skipping GitHub push: GITHUB_TOKEN not found.");
      return false;
    }

    console.log(`Pushing to GitHub: ${repo} (${branch})...`);
    
    try {
      // 1. Get the current file SHA if it exists (to update)
      const getUrl = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
      const getRes = await fetch(getUrl, {
        headers: { "Authorization": `token ${token}` }
      });
      
      let sha;
      if (getRes.status === 200) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      }

      // 2. Create or Update file
      const putUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
      const putRes = await fetch(putUrl, {
        method: "PUT",
        headers: {
          "Authorization": `token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Add/Update blog post: ${fileName}`,
          content: Buffer.from(content).toString("base64"),
          branch: branch,
          sha: sha // Only needed for updates
        })
      });

      if (putRes.ok) {
        console.log("Successfully pushed to GitHub.");
        return true;
      } else {
        const err = await putRes.text();
        throw new Error(`GitHub API failed: ${err}`);
      }
    } catch (e) {
      console.error("GitHub push failed:", e.message);
      return false;
    }
  };

  // Attempt local write
  try {
    await fs.writeFile(filePath, finalContent);
    console.log(`Post generated locally: ${filePath}`);
  } catch (e) {
    if (e.code === 'EROFS' || e.message.includes('read-only')) {
      console.warn("Local filesystem is read-only. Attempting GitHub push fallback...");
    } else {
      throw e;
    }
  }

  // Always attempt GitHub push if token is present (to ensure persistence)
  if (process.env.GITHUB_TOKEN) {
    await pushToGithub(finalContent, `_posts/${fileName}`);
  }

  console.log(`\n✅ Pipeline Complete!`);
  console.log(`Release Date: ${finalReleaseDate}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('generate-post.mjs')) {
  generatePost().catch(err => {
    console.error("Pipeline failed:", err);
    process.exit(1);
  });
}
