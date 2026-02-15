import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenPayload } from "@/lib/mcp-auth";

// Helper to categorize referrers
function categorizeReferrer(referrer: string): string {
  if (!referrer || referrer === '') return 'Direct';
  
  const url = referrer.toLowerCase();
  
  if (url.includes('google.')) return 'Google';
  if (url.includes('bing.')) return 'Bing';
  if (url.includes('duckduckgo.')) return 'DuckDuckGo';
  if (url.includes('yahoo.')) return 'Yahoo';
  if (url.includes('baidu.')) return 'Baidu';
  
  if (url.includes('linkedin.')) return 'LinkedIn';
  if (url.includes('twitter.') || url.includes('t.co')) return 'Twitter/X';
  if (url.includes('facebook.')) return 'Facebook';
  if (url.includes('instagram.')) return 'Instagram';
  if (url.includes('reddit.')) return 'Reddit';
  if (url.includes('hackernews.') || url.includes('news.ycombinator.')) return 'Hacker News';
  
  if (url.includes('github.')) return 'GitHub';
  if (url.includes('stackoverflow.')) return 'Stack Overflow';
  if (url.includes('medium.')) return 'Medium';
  if (url.includes('dev.to')) return 'Dev.to';
  
  return 'Other';
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const payload = await getTokenPayload(authHeader);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all referrers and categorize them
    const referrersRes = await db.query(`
      SELECT 
        first_referrer,
        COUNT(*) as visitor_count,
        SUM(total_page_views) as total_page_views,
        AVG(total_page_views) as avg_page_views_per_visitor,
        AVG(total_visits) as avg_visits_per_visitor
      FROM visitors
      GROUP BY first_referrer
      ORDER BY visitor_count DESC
    `);

    // Categorize referrers
    const categorized = referrersRes.rows.reduce((acc: any, row: any) => {
      const category = categorizeReferrer(row.first_referrer);
      
      if (!acc[category]) {
        acc[category] = {
          category,
          visitor_count: 0,
          total_page_views: 0,
          avg_page_views_per_visitor: 0,
          avg_visits_per_visitor: 0,
          referrers: []
        };
      }
      
      acc[category].visitor_count += parseInt(row.visitor_count);
      acc[category].total_page_views += parseInt(row.total_page_views);
      acc[category].referrers.push({
        referrer: row.first_referrer,
        visitor_count: parseInt(row.visitor_count),
        avg_page_views: parseFloat(row.avg_page_views_per_visitor || 0).toFixed(2),
        avg_visits: parseFloat(row.avg_visits_per_visitor || 0).toFixed(2)
      });
      
      return acc;
    }, {});

    // Calculate averages for categories
    Object.values(categorized).forEach((cat: any) => {
      cat.avg_page_views_per_visitor = (cat.total_page_views / cat.visitor_count).toFixed(2);
      cat.avg_visits_per_visitor = (
        cat.referrers.reduce((sum: number, r: any) => sum + parseFloat(r.avg_visits), 0) / cat.referrers.length
      ).toFixed(2);
      
      // Sort referrers within category
      cat.referrers.sort((a: any, b: any) => b.visitor_count - a.visitor_count);
      
      // Keep top 10 referrers per category
      cat.referrers = cat.referrers.slice(0, 10);
    });

    const sourceCategories = Object.values(categorized)
      .sort((a: any, b: any) => b.visitor_count - a.visitor_count);

    // Traffic source trends (last 30 days)
    const trendsRes = await db.query(`
      SELECT 
        DATE(pa.created_at) as date,
        COUNT(DISTINCT v.visitor_id) as visitors,
        COUNT(*) as page_views
      FROM page_analytics pa
      JOIN visitors v ON pa.visitor_id = v.visitor_id
      WHERE pa.created_at > NOW() - INTERVAL '30 days'
        AND DATE(pa.created_at) = DATE(v.first_seen)
      GROUP BY DATE(pa.created_at)
      ORDER BY date DESC
    `);

    // Device breakdown by traffic source
    const deviceBySourceRes = await db.query(`
      SELECT 
        device_type,
        COUNT(*) as visitor_count
      FROM visitors
      GROUP BY device_type
      ORDER BY visitor_count DESC
    `);

    // Top landing pages by source
    const landingPagesRes = await db.query(`
      SELECT 
        pa.path,
        COUNT(DISTINCT v.visitor_id) as unique_visitors,
        COUNT(*) as total_views
      FROM page_analytics pa
      JOIN visitors v ON pa.visitor_id = v.visitor_id
      WHERE pa.created_at = (
        SELECT MIN(created_at) 
        FROM page_analytics 
        WHERE visitor_id = v.visitor_id
      )
      GROUP BY pa.path
      ORDER BY unique_visitors DESC
      LIMIT 20
    `);

    interface SourceCategory {
      category: string;
      visitor_count: number;
      total_page_views: number;
      avg_page_views_per_visitor: string;
      avg_visits_per_visitor: string;
      referrers: any[];
    }

    return NextResponse.json({
      sourceCategories,
      trends: trendsRes.rows,
      deviceBySource: deviceBySourceRes.rows,
      topLandingPages: landingPagesRes.rows,
      summary: {
        totalSources: sourceCategories.length,
        topSource: (sourceCategories[0] as SourceCategory)?.category || 'None',
        topSourceVisitors: (sourceCategories[0] as SourceCategory)?.visitor_count || 0
      }
    });

  } catch (error) {
    console.error("Traffic source analysis error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
