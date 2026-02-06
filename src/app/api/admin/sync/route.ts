import { NextRequest, NextResponse } from "next/server";
import { getTokenPayload } from "@/lib/mcp-auth";
import { SyncService } from "@/lib/sync";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const payload = await getTokenPayload(authHeader);

  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
