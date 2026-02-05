import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest } from "next/server";
// @ts-ignore
import { createServer } from "../../../../mcp/server.mjs";
import { mcpDocsHtml } from "@/lib/mcp-docs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Check if the request is from a browser for documentation
  const acceptHeader = request.headers.get("accept");
  if (acceptHeader?.includes("text/html")) {
    return new Response(mcpDocsHtml(request.nextUrl.origin), {
      headers: { "Content-Type": "text/html" },
    });
  }

  // MCP SSE connection requirements
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  const server = createServer();
  
  try {
    await server.connect(transport);
    
    // Create a modified request with guaranteed Accept headers
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
