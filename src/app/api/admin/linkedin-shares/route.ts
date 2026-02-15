import { NextRequest, NextResponse } from "next/server";
import { getTokenPayload } from "@/lib/mcp-auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const payload = await getTokenPayload(authHeader);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.query(`
      SELECT 
        slug,
        linkedin_post_id,
        shared_at,
        shared_by
      FROM linkedin_shares
      ORDER BY shared_at DESC
    `);

    return NextResponse.json({
      shares: result.rows
    });

  } catch (error) {
    console.error("LinkedIn shares fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
