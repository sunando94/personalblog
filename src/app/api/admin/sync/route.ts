import { NextRequest, NextResponse } from "next/server";
import { getTokenPayload } from "@/lib/mcp-auth";
import { SyncService } from "@/lib/sync";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const payload = await getTokenPayload(authHeader);

  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return performSync();
}

/**
 * GET Handler for Vercel Cron
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  
  // Security check for Vercel Cron
  // If CRON_SECRET is set, we expect it in the Authorization header
  if (process.env.CRON_SECRET) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized Cron Access" }, { status: 401 });
    }
  }

  return performSync();
}

async function performSync() {
  try {
    const result = await SyncService.reconcile(true); // Force sync
    return NextResponse.json({ 
      success: true, 
      message: "Cache-Database synchronization completed successfully.",
      ...result
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
