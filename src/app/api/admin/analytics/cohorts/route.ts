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

    // Cohort analysis: Group visitors by first visit week and track retention
    const cohortRes = await db.query(`
      WITH cohorts AS (
        SELECT 
          visitor_id,
          DATE_TRUNC('week', first_seen) as cohort_week,
          first_seen,
          last_seen
        FROM visitors
        WHERE first_seen > NOW() - INTERVAL '12 weeks'
      ),
      cohort_sizes AS (
        SELECT 
          cohort_week,
          COUNT(*) as cohort_size
        FROM cohorts
        GROUP BY cohort_week
      ),
      retention AS (
        SELECT 
          c.cohort_week,
          FLOOR(EXTRACT(EPOCH FROM (v.last_seen - c.cohort_week)) / (7 * 24 * 60 * 60))::INTEGER as weeks_since_first,
          COUNT(DISTINCT v.visitor_id) as retained_visitors
        FROM cohorts c
        JOIN visitors v ON c.visitor_id = v.visitor_id
        WHERE v.last_seen >= c.cohort_week
        GROUP BY c.cohort_week, weeks_since_first
      )
      SELECT 
        r.cohort_week,
        r.weeks_since_first,
        r.retained_visitors,
        cs.cohort_size,
        ROUND(100.0 * r.retained_visitors / cs.cohort_size, 2) as retention_rate
      FROM retention r
      JOIN cohort_sizes cs ON r.cohort_week = cs.cohort_week
      ORDER BY r.cohort_week DESC, r.weeks_since_first
    `);

    // Visitor segmentation
    const segmentationRes = await db.query(`
      SELECT 
        CASE 
          WHEN total_visits = 1 THEN 'One-time'
          WHEN total_visits BETWEEN 2 AND 5 THEN 'Occasional (2-5)'
          WHEN total_visits BETWEEN 6 AND 10 THEN 'Regular (6-10)'
          ELSE 'Power User (10+)'
        END as segment,
        COUNT(*) as visitor_count,
        AVG(total_page_views) as avg_page_views,
        AVG(total_page_views::numeric / total_visits) as avg_pages_per_visit
      FROM visitors
      GROUP BY segment
      ORDER BY 
        CASE segment
          WHEN 'One-time' THEN 1
          WHEN 'Occasional (2-5)' THEN 2
          WHEN 'Regular (6-10)' THEN 3
          ELSE 4
        END
    `);

    // New vs Returning (last 7 days)
    const newVsReturningRes = await db.query(`
      SELECT 
        DATE(pa.created_at) as date,
        COUNT(DISTINCT CASE WHEN v.first_seen >= DATE_TRUNC('day', pa.created_at) THEN v.visitor_id END) as new_visitors,
        COUNT(DISTINCT CASE WHEN v.first_seen < DATE_TRUNC('day', pa.created_at) THEN v.visitor_id END) as returning_visitors
      FROM page_analytics pa
      JOIN visitors v ON pa.visitor_id = v.visitor_id
      WHERE pa.created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(pa.created_at)
      ORDER BY date DESC
    `);

    // Engagement distribution
    const engagementRes = await db.query(`
      SELECT 
        CASE 
          WHEN total_page_views = 1 THEN '1 page'
          WHEN total_page_views BETWEEN 2 AND 5 THEN '2-5 pages'
          WHEN total_page_views BETWEEN 6 AND 10 THEN '6-10 pages'
          WHEN total_page_views BETWEEN 11 AND 20 THEN '11-20 pages'
          ELSE '20+ pages'
        END as engagement_level,
        COUNT(*) as visitor_count
      FROM visitors
      GROUP BY engagement_level
      ORDER BY 
        CASE engagement_level
          WHEN '1 page' THEN 1
          WHEN '2-5 pages' THEN 2
          WHEN '6-10 pages' THEN 3
          WHEN '11-20 pages' THEN 4
          ELSE 5
        END
    `);

    return NextResponse.json({
      cohortAnalysis: cohortRes.rows,
      segmentation: segmentationRes.rows,
      newVsReturning: newVsReturningRes.rows,
      engagementDistribution: engagementRes.rows
    });

  } catch (error) {
    console.error("Cohort analysis error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
