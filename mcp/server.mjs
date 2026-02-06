import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { generatePost } from "../scripts/generate-post.mjs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

export function createServer() {
  const server = new Server(
    {
      name: "personal-blog-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  /**
   * Tool Definitions
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "generate_blog_post",
          description: "Triggers the multi-agent pipeline to generate a new blog post.",
          inputSchema: {
            type: "object",
            properties: {
              topic: { type: "string", description: "The topic of the blog post." },
              additional_context: { type: "string", description: "URL, text, or file context." },
              release_date: { type: "string", description: "YYYY-MM-DD or 'now'." },
              mode: { type: "string", enum: ["prod", "draft"], default: "prod" },
            },
            required: ["topic"],
          },
        },
        {
          name: "list_posts",
          description: "Lists all blog posts in the _posts directory.",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "read_post",
          description: "Reads a specific blog post content.",
          inputSchema: {
            type: "object",
            properties: {
              slug: { type: "string", description: "The filename/slug of the post." },
            },
            required: ["slug"],
          },
        },
        {
          name: "get_manual_generation_bundle",
          description: "Prepares a complete instruction bundle for the local LLM to write a post manually (no API calls).",
          inputSchema: {
            type: "object",
            properties: {
              topic: { type: "string" },
              additional_context: { type: "string" }
            },
            required: ["topic"]
          }
        }
      ],
    };
  });

  /**
   * Tool Execution
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === "generate_blog_post") {
        console.log(`[MCP] Starting blog generation for topic: ${args.topic}`);
        const startTime = Date.now();
        
        try {
          await generatePost({
            topic: args.topic,
            contextInput: args.additional_context,
            releaseDateInput: args.release_date || "now",
            isDraft: args.mode === "draft",
          });
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`[MCP] Blog generation completed in ${duration}s`);
          
          return {
            content: [{ type: "text", text: `Success! Blog post generated for "${args.topic}" in ${duration}s.` }],
          };
        } catch (genError) {
          // Check for Rate Limit (429) in the error message
          if (genError.message?.includes("429") || genError.message?.includes("limit reached")) {
            console.warn(`[MCP] Gemini Rate Limit reached. Prepping Agentic Fallback Bundle...`);
            
            const guidelines = await fs.readFile(path.join(projectRoot, ".agent/docs/blog_post_guidelines.md"), "utf-8");
            const promptTemplate = await fs.readFile(path.join(projectRoot, "mcp/prompts/unified_post.md"), "utf-8");
            
            const fallbackMsg = `
⚠️ CLOUD API LIMIT REACHED (429)
The automated generation pipeline hit a rate limit. However, since you are an advanced AI Agent, I am falling back to "Agentic Mode".

Please use your OWN MODEL to generate the blog post for "${args.topic}" following these exact instructions and guidelines.

### YOUR RULES & GUIDELINES:
${guidelines}

### PROMPT TEMPLATE TO FOLLOW:
${promptTemplate}

### TOPIC:
${args.topic}

### ADDITIONAL CONTEXT:
${args.additional_context || "None provided."}

### TASK:
Generate the full Markdown content now. Once you have it, I can save it for you or you can commit it.
            `;
            
            return {
              content: [{ type: "text", text: fallbackMsg }],
            };
          }
          
          // Re-throw if it's a different error (e.g. read-only filesystem)
          throw genError;
        }
      }

      let projectRoot = process.cwd();
      if (projectRoot === "/") {
        projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
      }

      if (name === "list_posts") {
        const postsDir = path.join(projectRoot, "_posts");
        console.error(`[MCP] Listing posts in: ${postsDir}`);
        const files = await fs.readdir(postsDir);
        return {
          content: [{ type: "text", text: files.filter(f => f.endsWith(".md")).join("\n") }],
        };
      }
 
      if (name === "read_post") {
        const fileName = String(args.slug).endsWith(".md") ? String(args.slug) : `${args.slug}.md`;
        const filePath = path.join(projectRoot, "_posts", fileName);
        console.error(`[MCP] Reading post: ${filePath}`);
        const content = await fs.readFile(filePath, "utf-8");
        return {
          content: [{ type: "text", text: content }],
        };
      }

      if (name === "get_manual_generation_bundle") {
        const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
        const guidelines = await fs.readFile(path.join(projectRoot, ".agent/docs/blog_post_guidelines.md"), "utf-8");
        const promptTemplate = await fs.readFile(path.join(projectRoot, "mcp/prompts/unified_post.md"), "utf-8");
        
        const bundle = `
### MANUAL GENERATION BUNDLE
You are to write a blog post for "${args.topic}".
Instead of me calling an external API, I want YOU (the current LLM) to write it following these rules.

### PROJECT RULES & GUIDELINES:
${guidelines}

### PROMPT TEMPLATE TO FOLLOW:
${promptTemplate}

### TOPIC:
${args.topic}

### ADDITIONAL CONTEXT:
${args.additional_context || "None provided."}

Please output the final Markdown. Once you generate it, I will use the 'save_post' tool (or manual git push) to save it.
        `;

        return {
          content: [{ type: "text", text: bundle }],
        };
      }

      throw new Error(`Tool not found: ${name}`);
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  });

  return server;
}
