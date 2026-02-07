import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, path, sessionId, visitorId, id, duration } = body;
    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";

    if (type === "view") {
      const result = await db.query(
        `INSERT INTO page_analytics (path, session_id, visitor_id, user_agent, referrer) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id`,
        [path, sessionId, visitorId, userAgent, referrer]
      );
      return NextResponse.json({ id: result.rows[0].id });
    } 
    
    if (type === "heartbeat" && id) {
      await db.query(
        `UPDATE page_analytics SET dwell_time_seconds = $1 WHERE id = $2`,
        [duration, id]
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
