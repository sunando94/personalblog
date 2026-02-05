import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest } from "next/server";
// @ts-ignore - The server file is .mjs and might not have types in this project context
import { server } from "../../../../mcp/server.mjs";

const transport = new WebStandardStreamableHTTPServerTransport();

let isConnected = false;

async function ensureConnected() {
  if (!isConnected) {
    try {
      await server.connect(transport);
      isConnected = true;
    } catch (error) {
      console.error("Failed to connect MCP server to transport:", error);
    }
  }
}

export async function GET(request: NextRequest) {
  // Check if the request is from a browser for documentation
  const acceptHeader = request.headers.get("accept");
  if (acceptHeader?.includes("text/html")) {
    return new Response(
      `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Personal Blog MCP | API Documentation</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #09090b;
            --card: #121215;
            --border: #27272a;
            --primary: #f8fafc;
            --accent: #3b82f6;
            --text-secondary: #94a3b8;
            --glow: rgba(59, 130, 246, 0.15);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background-color: var(--bg);
            color: var(--primary);
            font-family: 'Outfit', sans-serif;
            line-height: 1.6;
            overflow-x: hidden;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 80px 24px;
        }

        header {
            margin-bottom: 60px;
            text-align: center;
        }

        .badge {
            display: inline-block;
            padding: 6px 12px;
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 99px;
            color: var(--accent);
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 16px;
            letter-spacing: 0.05em;
        }

        h1 {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 16px;
            letter-spacing: -0.02em;
            background: linear-gradient(to right, #ffffff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            font-size: 18px;
            color: var(--text-secondary);
            font-weight: 400;
        }

        .grid {
            margin-top: 60px;
        }

        .section-title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .section-title::after {
            content: '';
            flex: 1;
            height: 1px;
            background: var(--border);
        }

        .card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 24px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .card:hover {
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
            box-shadow: 0 10px 40px -15px var(--glow);
        }

        .tool-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .tool-name {
            font-family: 'JetBrains Mono', monospace;
            color: var(--accent);
            font-size: 18px;
            font-weight: 600;
        }

        .card p {
            color: var(--text-secondary);
            margin-bottom: 24px;
        }

        .params-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--primary);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 12px;
        }

        .param-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .param-item {
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            justify-content: space-between;
        }

        .param-desc {
            color: var(--text-secondary);
        }

        .code-block {
            background: #000;
            border-radius: 12px;
            padding: 24px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            color: #d1d5db;
            border: 1px solid var(--border);
            line-height: 1.7;
            overflow-x: auto;
        }

        footer {
            margin-top: 80px;
            text-align: center;
            color: var(--text-secondary);
            font-size: 14px;
            border-top: 1px solid var(--border);
            padding-top: 40px;
        }

        .dot {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            display: inline-block;
            margin-right: 8px;
            box-shadow: 0 0 10px #22c55e;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <span class="badge">MODEL CONTEXT PROTOCOL</span>
            <h1>Personal Blog API</h1>
            <p class="subtitle">Secure, high-performance bridge between AI models and your blog engine.</p>
        </header>

        <section class="grid">
            <h2 class="section-title"><span class="dot"></span>Live Tools</h2>
            
            <div class="card">
                <div class="tool-header">
                    <span class="tool-name">generate_blog_post</span>
                </div>
                <p>Triggers the advanced multi-agent pipeline (Writer → Reviewer → SEO) to produce a production-ready technical article.</p>
                <div class="params-title">Parameters</div>
                <ul class="param-list">
                    <li class="param-item"><span>topic*</span> <span class="param-desc">Main subject of the post</span></li>
                    <li class="param-item"><span>additional_context</span> <span class="param-desc">URL, raw text, or file path</span></li>
                    <li class="param-item"><span>release_date</span> <span class="param-desc">YYYY-MM-DD or 'now'</span></li>
                    <li class="param-item"><span>mode</span> <span class="param-desc">'prod' or 'draft'</span></li>
                </ul>
            </div>

            <div class="card">
                <div class="tool-header">
                    <span class="tool-name">list_posts</span>
                </div>
                <p>Retrieves a comprehensive catalog of all established markdown articles within the repository.</p>
            </div>

            <div class="card">
                <div class="tool-header">
                    <span class="tool-name">read_post</span>
                </div>
                <p>Extracts the full markdown content and frontmatter of a specific post for analysis or context.</p>
                <div class="params-title">Parameters</div>
                <ul class="param-list">
                    <li class="param-item"><span>slug*</span> <span class="param-desc">The unique filename of the post</span></li>
                </ul>
            </div>
        </section>

        <section class="grid" style="margin-top: 40px;">
            <h2 class="section-title">Quick Connect</h2>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">Add this endpoint to your MCP client to start orchestrating content generation.</p>
            <div class="code-block">
POST ${request.nextUrl.origin}/api/mcp<br>
Content-Type: application/json<br>
Accept: text/event-stream
            </div>
        </section>

        <footer>
            Built with ❤️ for Technical Excellence & AI Integration.
        </footer>
    </div>
</body>
</html>`,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  try {
    await ensureConnected();
    return await transport.handleRequest(request);
  } catch (error) {
    console.error("MCP SSE GET error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureConnected();
    return await transport.handleRequest(request);
  } catch (error) {
    console.error("MCP POST error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
