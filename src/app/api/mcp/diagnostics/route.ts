import { NextRequest, NextResponse } from "next/server";
import { isValidToken } from "@/lib/mcp-auth";
import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const isAuthorized = await isValidToken(authHeader);

  if (!isAuthorized) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const redis = createClient({ url: REDIS_URL });
    await redis.connect();

    // 1. Connectivity Test
    await redis.set("mcp_diag_ping", String(Date.now()));
    const pong = await redis.get("mcp_diag_ping");

    // 2. Metrics check
    const logCount = await redis.lLen("mcp_audit_logs");
    const tokenCount = await redis.hLen("mcp_active_tokens");

    // 3. TTL Check
    const refreshKeys = await redis.keys("mcp_refresh:*");
    let sampleTtl = null;
    if (refreshKeys.length > 0) {
      sampleTtl = await redis.ttl(refreshKeys[0]);
    }

    await redis.quit();

    return NextResponse.json({
      status: "healthy",
      connection: pong ? "connected" : "failed",
      provider: "Redis Cloud",
      stats: {
        auditLogs: logCount,
        activeClients: tokenCount,
      },
      ttlManagement: {
        sampleTokenTtl: sampleTtl ? `${(sampleTtl / 3600 / 24).toFixed(2)} days` : "none issued yet",
        limit: "7 days"
      }
    });
  } catch (err: any) {
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
