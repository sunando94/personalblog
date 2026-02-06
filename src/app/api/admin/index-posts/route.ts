import { NextRequest, NextResponse } from "next/server";
import { EmbeddingService } from "@/lib/embedding-service";

export const dynamic = "force-dynamic";

/**
 * GET Handler for Vercel Cron
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  
  // Security check for Vercel Cron
  if (process.env.CRON_SECRET) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized Cron Access" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
     return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  try {
    const result = await EmbeddingService.syncAllPosts();
    return NextResponse.json({ 
      success: true, 
      message: "Post indexing completed successfully.",
      ...result
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { getTokenPayload } from "@/lib/mcp-auth";

/**
 * Admin POST for manual triggers
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const payload = await getTokenPayload(authHeader);

  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await req.json().catch(() => ({}));
    
    if (slug) {
      const result = await EmbeddingService.syncSinglePost(slug);
      return NextResponse.json(result);
    }
    
    const result = await EmbeddingService.syncAllPosts();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
