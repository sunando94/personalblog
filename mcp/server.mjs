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
      await generatePost({
        topic: args.topic,
        contextInput: args.additional_context,
        releaseDateInput: args.release_date || "now",
        isDraft: args.mode === "draft",
      });
      return {
        content: [{ type: "text", text: `Post generation triggered for ${args.topic}.` }],
      };
    }

    if (name === "list_posts") {
      const postsDir = path.join(process.cwd(), "_posts");
      const files = await fs.readdir(postsDir);
      return {
        content: [{ type: "text", text: files.filter(f => f.endsWith(".md")).join("\n") }],
      };
    }

    if (name === "read_post") {
      const filePath = path.join(process.cwd(), "_posts", args.slug.endsWith(".md") ? args.slug : `${args.slug}.md`);
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

export { server };
