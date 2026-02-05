import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest } from "next/server";
// @ts-ignore
import { createServer } from "../../../../mcp/server.mjs";
import { mcpDocsHtml } from "@/lib/mcp-docs";

export async function GET(request: NextRequest) {
  // Check if the request is from a browser for documentation
  const acceptHeader = request.headers.get("accept");
  if (acceptHeader?.includes("text/html")) {
    return new Response(mcpDocsHtml(request.nextUrl.origin), {
      headers: { "Content-Type": "text/html" },
    });
  }

  // MCP SSE connection requirements
  const transport = new WebStandardStreamableHTTPServerTransport();
  const server = createServer();
  
  try {
    await server.connect(transport);
    
    // Normalize headers for the SDK - it expects both text/event-stream and application/json
    const url = new URL(request.url);
    const modifiedRequest = new NextRequest(url, {
      method: request.method,
      headers: new Headers(request.headers),
      body: request.body,
      // @ts-ignore - Next.js RequestInit types
      duplex: 'half'
    });
    modifiedRequest.headers.set("Accept", "text/event-stream, application/json");

    return await transport.handleRequest(modifiedRequest);
  } catch (error) {
    console.error("MCP SSE GET error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const transport = new WebStandardStreamableHTTPServerTransport();
  const server = createServer();
  try {
    await server.connect(transport);
    
    // Normalize headers for POST requests
    const url = new URL(request.url);
    const modifiedRequest = new NextRequest(url, {
      method: request.method,
      headers: new Headers(request.headers),
      body: await request.clone().text(), // SDK needs it as text/blob sometimes
      // @ts-ignore
      duplex: 'half'
    });
    
    if (!modifiedRequest.headers.has("Accept")) {
        modifiedRequest.headers.set("Accept", "application/json");
    }

    return await transport.handleRequest(modifiedRequest);
  } catch (error) {
    console.error("MCP POST error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
