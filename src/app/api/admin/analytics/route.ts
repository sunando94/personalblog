import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenPayload } from "@/lib/mcp-auth";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const payload = await getTokenPayload(authHeader);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Total Stats (optimized using visitors table where possible)
    const totalViewsRes = await db.query(`SELECT COUNT(*) as count FROM page_analytics`);
    const uniqueVisitorsRes = await db.query(`SELECT COUNT(*) as count FROM visitors`);
    const avgDwellRes = await db.query(`SELECT AVG(dwell_time_seconds) as avg_dwell FROM page_analytics WHERE dwell_time_seconds > 0`);

    // Visitor Insights
    const newVisitorsRes = await db.query(`
      SELECT COUNT(*) as count 
      FROM visitors 
      WHERE first_seen > NOW() - INTERVAL '7 days'
    `);

    const returningVisitorsRes = await db.query(`
      SELECT COUNT(*) as count 
      FROM visitors 
      WHERE total_visits > 1 AND last_seen > NOW() - INTERVAL '7 days'
    `);

    // Device Breakdown
    const deviceBreakdownRes = await db.query(`
      SELECT device_type, COUNT(*) as count
      FROM visitors
      GROUP BY device_type
      ORDER BY count DESC
    `);

    // Top Referrers
    const topReferrersRes = await db.query(`
      SELECT first_referrer, COUNT(*) as count
      FROM visitors
      WHERE first_referrer IS NOT NULL AND first_referrer != ''
      GROUP BY first_referrer
      ORDER BY count DESC
      LIMIT 10
    `);

    // Top Pages
    const topPagesRes = await db.query(`
      SELECT path, COUNT(*) as views, AVG(dwell_time_seconds) as avg_dwell 
      FROM page_analytics 
      GROUP BY path 
      ORDER BY views DESC 
      LIMIT 10
    `);

    // Recent Activity (last 24h volume)
    const recentActivityRes = await db.query(`
      SELECT date_trunc('hour', created_at) as hour, COUNT(*) as views 
      FROM page_analytics 
      WHERE created_at > NOW() - INTERVAL '24 hours' 
      GROUP BY hour 
      ORDER BY hour ASC
    `);

    return NextResponse.json({
      totalViews: parseInt(totalViewsRes.rows[0].count),
      uniqueVisitors: parseInt(uniqueVisitorsRes.rows[0].count),
      avgDwellTime: Math.round(parseFloat(avgDwellRes.rows[0].avg_dwell || '0')),
      newVisitors: parseInt(newVisitorsRes.rows[0].count),
      returningVisitors: parseInt(returningVisitorsRes.rows[0].count),
      deviceBreakdown: deviceBreakdownRes.rows,
      topReferrers: topReferrersRes.rows,
      topPages: topPagesRes.rows,
      recentActivity: recentActivityRes.rows
    });

  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
