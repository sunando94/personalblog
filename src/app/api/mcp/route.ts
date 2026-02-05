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
