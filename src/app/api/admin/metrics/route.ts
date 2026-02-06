import { NextRequest, NextResponse } from "next/server";
import { getAdminMetrics, isValidToken } from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";

/**
 * Admin API to fetch metrics for the Dashboard
 * Protected by Master Token
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const isAuthorized = await isValidToken(authHeader);

  // For Admin APIs, we MUST ensure it's the Master Token (simple check for now)
  const MASTER_TOKEN = process.env.MCP_MASTER_TOKEN;
  if (!isAuthorized || (authHeader?.substring(7) !== MASTER_TOKEN)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const metrics = await getAdminMetrics();
    return NextResponse.json(metrics);
  } catch (err: any) {
    return NextResponse.json({ error: "server_error", message: err.message }, { status: 500 });
  }
}
