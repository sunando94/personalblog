import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Helper to detect device type from user agent
function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'mobile';
  }
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, path, sessionId, visitorId, id, duration } = body;
    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";
    
    // Get IP address from headers
    const ip = request.headers.get("x-forwarded-for")?.split(',')[0].trim() ||
               request.headers.get("x-real-ip") ||
               "unknown";

    if (type === "view") {
      // Upsert visitor dimension table
      const deviceType = getDeviceType(userAgent);
      
      // Check if this is a new session for this visitor
      const existingSessionRes = await db.query(`
        SELECT 1 FROM page_analytics 
        WHERE visitor_id = $1 AND session_id = $2 
        LIMIT 1
      `, [visitorId, sessionId]);
      
      const isNewSession = existingSessionRes.rows.length === 0;
      
      // Get geolocation for new visitors (async, don't block)
      let country = null;
      let city = null;
      let region = null;
      
      if (isNewSession && ip !== "unknown") {
        try {
          const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
            signal: AbortSignal.timeout(2000) // 2 second timeout
          });
          if (geoResponse.ok) {
            const geo = await geoResponse.json();
            country = geo.country_name || null;
            city = geo.city || null;
            region = geo.region || null;
          }
        } catch (error) {
          // Silently fail geolocation - don't block analytics
          console.warn("Geolocation lookup failed:", error);
        }
      }
      
      // Upsert visitor with conditional visit increment and geo data
      await db.query(`
        INSERT INTO visitors (visitor_id, first_seen, last_seen, total_visits, total_page_views, first_referrer, first_user_agent, device_type, country, city)
        VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 1, $2, $3, $4, $5, $6)
        ON CONFLICT (visitor_id) 
        DO UPDATE SET 
          last_seen = CURRENT_TIMESTAMP,
          total_visits = visitors.total_visits + $7,
          total_page_views = visitors.total_page_views + 1,
          updated_at = CURRENT_TIMESTAMP,
          country = COALESCE(visitors.country, EXCLUDED.country),
          city = COALESCE(visitors.city, EXCLUDED.city)
      `, [visitorId, referrer, userAgent, deviceType, country, city, isNewSession ? 1 : 0]);

      // Insert page analytics event
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
