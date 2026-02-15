import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenPayload } from "@/lib/mcp-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ visitorId: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const payload = await getTokenPayload(authHeader);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { visitorId } = await params;

    // Get visitor details
    const visitorRes = await db.query(`
      SELECT 
        v.*,
        u.name as user_name,
        u.email as user_email,
        u.picture as user_picture
      FROM visitors v
      LEFT JOIN users u ON v.user_id = u.id
      WHERE v.visitor_id = $1
    `, [visitorId]);

    if (visitorRes.rows.length === 0) {
      return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
    }

    const visitor = visitorRes.rows[0];

    // Get all page views for this visitor
    const pageViewsRes = await db.query(`
      SELECT 
        id,
        path,
        session_id,
        user_agent,
        referrer,
        dwell_time_seconds,
        created_at
      FROM page_analytics
      WHERE visitor_id = $1
      ORDER BY created_at DESC
    `, [visitorId]);

    // Get session breakdown
    const sessionsRes = await db.query(`
      SELECT 
        session_id,
        COUNT(*) as page_views,
        MIN(created_at) as session_start,
        MAX(created_at) as session_end,
        SUM(dwell_time_seconds) as total_dwell_time,
        (ARRAY_AGG(referrer ORDER BY created_at))[1] as entry_referrer
      FROM page_analytics
      WHERE visitor_id = $1
      GROUP BY session_id
      ORDER BY session_start DESC
    `, [visitorId]);

    // Get page path breakdown
    const pathBreakdownRes = await db.query(`
      SELECT 
        path,
        COUNT(*) as views,
        AVG(dwell_time_seconds) as avg_dwell_time,
        MAX(created_at) as last_viewed
      FROM page_analytics
      WHERE visitor_id = $1
      GROUP BY path
      ORDER BY views DESC
    `, [visitorId]);

    // Get hourly activity pattern
    const activityPatternRes = await db.query(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as views
      FROM page_analytics
      WHERE visitor_id = $1
      GROUP BY hour
      ORDER BY hour
    `, [visitorId]);

    // Get daily activity (last 30 days)
    const dailyActivityRes = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as views,
        COUNT(DISTINCT session_id) as sessions
      FROM page_analytics
      WHERE visitor_id = $1 
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [visitorId]);

    return NextResponse.json({
      visitor,
      pageViews: pageViewsRes.rows,
      sessions: sessionsRes.rows,
      pathBreakdown: pathBreakdownRes.rows,
      activityPattern: activityPatternRes.rows,
      dailyActivity: dailyActivityRes.rows,
      stats: {
        totalPageViews: visitor.total_page_views,
        totalSessions: visitor.total_visits,
        avgPagesPerSession: visitor.total_visits > 0 
          ? (visitor.total_page_views / visitor.total_visits).toFixed(2)
          : 0,
        daysSinceFirstVisit: Math.floor(
          (new Date().getTime() - new Date(visitor.first_seen).getTime()) / (1000 * 60 * 60 * 24)
        ),
        daysSinceLastVisit: Math.floor(
          (new Date().getTime() - new Date(visitor.last_seen).getTime()) / (1000 * 60 * 60 * 24)
        )
      }
    });

  } catch (error) {
    console.error("Visitor detail error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
