import { NextRequest, NextResponse } from "next/server";
import { createTokenPair, refreshAccessToken } from "@/lib/mcp-auth";

/**
 * Standard OAuth2 Token Endpoint
 * Supports grant_type=client_credentials and grant_type=refresh_token
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { grant_type, client_id, client_secret, refresh_token } = body;

    if (grant_type === "client_credentials") {
      const MASTER_TOKEN = process.env.MCP_MASTER_TOKEN;
      
      // Determine scope based on whether they provided the secret
      const isWriter = client_secret && client_secret === MASTER_TOKEN;
      const scope = isWriter ? "writer" : "guest";

      if (!client_id) {
        return NextResponse.json({ error: "invalid_request", message: "client_id is required" }, { status: 400 });
      }

      // If they tried to provide a secret but it's wrong, reject it (anti-brute force)
      if (client_secret && !isWriter) {
        return NextResponse.json({ error: "invalid_client", message: "Invalid Admin Secret." }, { status: 401 });
      }

      const tokens = await createTokenPair(client_id, scope);
      return NextResponse.json(tokens);
    }

    if (grant_type === "refresh_token") {
      if (!refresh_token) {
        return NextResponse.json({ error: "invalid_request", message: "refresh_token required" }, { status: 400 });
      }

      const tokens = await refreshAccessToken(refresh_token);
      return NextResponse.json(tokens);
    }

    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: "server_error", message: err.message }, { status: 500 });
  }
}
