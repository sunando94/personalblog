import { NextRequest, NextResponse } from "next/server";
import { getTokenPayload } from "@/lib/mcp-auth";
import { getPool } from "@/lib/db";


export async function POST(request: NextRequest) {
  const client = await getPool().connect();
  try {
    const authHeader = request.headers.get("Authorization");
    const payload = await getTokenPayload(authHeader);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await client.query("BEGIN");

    // Migrate existing visitor data from page_analytics
    const result = await client.query(`
      INSERT INTO visitors (
        visitor_id, 
        first_seen, 
        last_seen, 
        total_visits, 
        total_page_views, 
        first_referrer, 
        first_user_agent,
        device_type
      )
      SELECT 
        visitor_id,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen,
        COUNT(DISTINCT session_id) as total_visits,
        COUNT(*) as total_page_views,
        (ARRAY_AGG(referrer ORDER BY created_at))[1] as first_referrer,
        (ARRAY_AGG(user_agent ORDER BY created_at))[1] as first_user_agent,
        $1 as device_type
      FROM page_analytics
      WHERE visitor_id IS NOT NULL
      GROUP BY visitor_id
      ON CONFLICT (visitor_id) DO NOTHING
    `, ['desktop']); // Default to desktop for historical data

    // Update device types based on first user agent
    await client.query(`
      UPDATE visitors v
      SET device_type = CASE
        WHEN v.first_user_agent ~* 'mobile|android|iphone|ipod|blackberry|iemobile|opera mini' THEN 'mobile'
        WHEN v.first_user_agent ~* 'tablet|ipad|playbook|silk' THEN 'tablet'
        ELSE 'desktop'
      END
      WHERE device_type IS NULL OR device_type = 'desktop'
    `);

    await client.query("COMMIT");

    return NextResponse.json({ 
      success: true, 
      message: `Successfully migrated ${result.rowCount} visitors from historical data.`,
      migrated: result.rowCount
    });

  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
