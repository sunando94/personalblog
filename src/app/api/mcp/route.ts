import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest } from "next/server";
// @ts-ignore
import { createServer } from "../../../../mcp/server.mjs";
import { mcpDocsHtml } from "@/lib/mcp-docs";
import { isValidToken } from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const acceptHeader = request.headers.get("accept");
  const authHeader = request.headers.get("authorization");

  // 1. Documentation access (No Auth required for the landing page itself)
  if (acceptHeader?.includes("text/html")) {
    return new Response(mcpDocsHtml(request.nextUrl.origin), {
      headers: { "Content-Type": "text/html" },
    });
  }

  // 2. MCP Connection access (Auth Required)
  const isAuthorized = await isValidToken(authHeader);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ 
      error: "UNAUTHORIZED", 
      message: "Please provide a valid Bearer token. Request one at /mcp/request" 
    }), { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  const server = createServer();
  
  try {
    await server.connect(transport);
    
    const url = new URL(request.url);
    const headers = new Headers(request.headers);
    headers.set("Accept", "application/json, text/event-stream");
    
    const modifiedRequest = new Request(url, {
      method: request.method,
      headers: headers,
      // @ts-ignore
      duplex: 'half'
    });

    return await transport.handleRequest(modifiedRequest);
  } catch (error) {
    console.error("MCP SSE GET error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  // Auth Required for all POST calls (Tool Executions)
  const isAuthorized = await isValidToken(authHeader);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ 
      error: "UNAUTHORIZED", 
      message: "Invalid or missing token." 
    }), { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  const server = createServer();
  try {
    await server.connect(transport);
    
    const url = new URL(request.url);
    const headers = new Headers(request.headers);
    headers.set("Accept", "application/json, text/event-stream");
    
    const body = await request.text();
    const modifiedRequest = new Request(url, {
      method: request.method,
      headers: headers,
      body: body,
      // @ts-ignore
      duplex: 'half'
    });

    return await transport.handleRequest(modifiedRequest);
  } catch (error) {
    console.error("MCP POST error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
