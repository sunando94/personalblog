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

  let projectRoot = process.cwd();
  if (projectRoot === "/") {
    projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  }

  /**
   * Helper to fill prompt templates from mcp/prompts/
   */
  const fillPrompt = async (name, data) => {
    let template = await fs.readFile(path.join(projectRoot, `mcp/prompts/${name}.md`), "utf-8");
    for (const [key, value] of Object.entries(data)) {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return template;
  };

  /**
   * Tool Definitions
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "generate_blog_post",
          description: "Triggers the multi-agent pipeline to generate a new blog post. Automatically falls back to agentic mode on rate limits.",
          inputSchema: {
            type: "object",
            properties: {
              release_date: { type: "string", description: "YYYY-MM-DD or 'now'." },
              category: { 
                type: "string", 
                description: "The primary focus. Preferred: AI, Data Engineering, Deployment." 
              },
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
          const result = await generatePost({
            topic: args.topic,
            contextInput: args.additional_context,
            releaseDateInput: args.release_date || "now",
            category: args.category || "AI",
            mcpMode: true
          });
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          const branchSuffix = result.github?.branch ? ` on branch \`${result.github.branch}\`` : '';
          const prSuffix = result.github?.prUrl ? `\n\nReview & Merge here: ${result.github.prUrl}` : '';
          return {
            content: [{ type: "text", text: `Success! Blog post generated for "${args.topic}" in ${duration}s${branchSuffix}.${prSuffix}` }],
          };
        } catch (genError) {
          if (genError.message?.includes("429") || genError.message?.includes("limit reached")) {
            console.warn(`[MCP] Gemini Rate Limit reached. Prepping Agentic Fallback...`);
            
            const guidelines = await fs.readFile(path.join(projectRoot, ".agent/docs/blog_post_guidelines.md"), "utf-8");
            const promptTemplate = await fs.readFile(path.join(projectRoot, "mcp/prompts/unified_post.md"), "utf-8");
            
            const fallbackMsg = await fillPrompt('agentic_fallback', {
              topic: args.topic,
              guidelines,
              promptTemplate,
              context: args.additional_context || "None provided."
            });
            
            return { content: [{ type: "text", text: fallbackMsg }] };
          }
          throw genError;
        }
      }

      if (name === "list_posts") {
        const postsDir = path.join(projectRoot, "_posts");
        const files = await fs.readdir(postsDir);
        return {
          content: [{ type: "text", text: files.filter(f => f.endsWith(".md")).join("\n") }],
        };
      }
 
      if (name === "read_post") {
        const fileName = String(args.slug).endsWith(".md") ? String(args.slug) : `${args.slug}.md`;
        const filePath = path.join(projectRoot, "_posts", fileName);
        const content = await fs.readFile(filePath, "utf-8");
        return {
          content: [{ type: "text", text: content }],
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
