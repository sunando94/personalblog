import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest } from "next/server";
// @ts-ignore
import { server } from "../../../../mcp/server.mjs";
import { mcpDocsHtml } from "@/lib/mcp-docs";

export async function GET(request: NextRequest) {
  // Check if the request is from a browser for documentation
  const acceptHeader = request.headers.get("accept");
  if (acceptHeader?.includes("text/html")) {
    return new Response(mcpDocsHtml(request.nextUrl.origin), {
      headers: { "Content-Type": "text/html" },
    });
  }

  // MCP SSE connection - create a fresh transport per request to fix "Stateless transport cannot be reused"
  const transport = new WebStandardStreamableHTTPServerTransport();
  
  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } catch (error) {
    console.error("MCP SSE GET error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const transport = new WebStandardStreamableHTTPServerTransport();
  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } catch (error) {
    console.error("MCP POST error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
