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

    const { retentionDays = 7, mode = "optimize" } = await request.json();
    
    // Validate retentionDays to prevent SQL injection via string template
    const days = parseInt(String(retentionDays));
    if (isNaN(days) || days < 1) {
       return NextResponse.json({ error: "Invalid retention days" }, { status: 400 });
    }

    if (mode === "analyze") {
      const stats = await client.query(`
         SELECT 
           (SELECT COUNT(*) FROM page_analytics) as raw_count,
           (SELECT COUNT(*) FROM analytics_daily_summary) as summary_count,
           (SELECT pg_size_pretty(pg_total_relation_size('page_analytics'))) as raw_size,
           (SELECT COUNT(*) FROM page_analytics WHERE created_at < NOW() - ($1 || ' days')::INTERVAL) as deletable_count
      `, [days]);
      return NextResponse.json(stats.rows[0]);
    }

    await client.query("BEGIN");

    // 1. Aggregate Data
    // We group by date and path.
    await client.query(`
      INSERT INTO analytics_daily_summary (date, path, total_views, unique_visitors, avg_dwell_time)
      SELECT 
        DATE(created_at) as date,
        path,
        COUNT(*) as total_views,
        COUNT(DISTINCT visitor_id) as unique_visitors,
        AVG(dwell_time_seconds) as avg_dwell_time
      FROM page_analytics
      WHERE created_at < NOW() - ($1 || ' days')::INTERVAL
      GROUP BY DATE(created_at), path
      ON CONFLICT (date, path) 
      DO UPDATE SET 
        total_views = analytics_daily_summary.total_views + EXCLUDED.total_views,
        unique_visitors = GREATEST(analytics_daily_summary.unique_visitors, EXCLUDED.unique_visitors), 
        avg_dwell_time = (analytics_daily_summary.avg_dwell_time * analytics_daily_summary.total_views + EXCLUDED.avg_dwell_time * EXCLUDED.total_views) / NULLIF(analytics_daily_summary.total_views + EXCLUDED.total_views, 0)
    `, [days]);

    // 2. Delete Raw Data
    const deleteRes = await client.query(`
      DELETE FROM page_analytics 
      WHERE created_at < NOW() - ($1 || ' days')::INTERVAL
    `, [days]);

    await client.query("COMMIT");

    return NextResponse.json({ 
      success: true, 
      message: `Optimization complete. Aggregated data and removed ${deleteRes.rowCount} raw records.` 
    });

  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Optimization failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
