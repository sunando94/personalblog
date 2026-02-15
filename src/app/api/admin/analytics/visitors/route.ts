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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const sortBy = searchParams.get("sortBy") || "last_seen";
    const sortOrder = searchParams.get("sortOrder") || "DESC";
    const deviceFilter = searchParams.get("device");
    const offset = (page - 1) * limit;

    // Build WHERE clause for filters
    const whereConditions = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (deviceFilter) {
      whereConditions.push(`device_type = $${paramIndex}`);
      queryParams.push(deviceFilter);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    // Validate sort column to prevent SQL injection
    const validSortColumns = ["last_seen", "first_seen", "total_visits", "total_page_views", "visitor_id"];
    const validSortOrders = ["ASC", "DESC"];
    
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : "last_seen";
    const safeSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : "DESC";

    // Get total count
    const countRes = await db.query(`
      SELECT COUNT(*) as total
      FROM visitors
      ${whereClause}
    `, queryParams);

    const total = parseInt(countRes.rows[0].total);

    // Get paginated visitors with their latest page view
    queryParams.push(limit, offset);
    const visitorsRes = await db.query(`
      SELECT 
        v.*,
        u.name as user_name,
        u.email as user_email,
        (
          SELECT json_agg(
            json_build_object(
              'path', pa.path,
              'created_at', pa.created_at,
              'dwell_time_seconds', pa.dwell_time_seconds
            )
            ORDER BY pa.created_at DESC
          )
          FROM (
            SELECT path, created_at, dwell_time_seconds
            FROM page_analytics
            WHERE visitor_id = v.visitor_id
            ORDER BY created_at DESC
            LIMIT 5
          ) pa
        ) as recent_pages
      FROM visitors v
      LEFT JOIN users u ON v.user_id = u.id
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, queryParams);

    return NextResponse.json({
      visitors: visitorsRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Visitor analytics error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
