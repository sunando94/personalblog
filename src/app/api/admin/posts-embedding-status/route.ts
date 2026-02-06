import { NextRequest, NextResponse } from "next/server";
import { getTokenPayload } from "@/lib/mcp-auth";
import { EmbeddingService } from "@/lib/embedding-service";
import { getAllPostsIncludingScheduled } from "@/lib/api";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const payload = await getTokenPayload(authHeader);

  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const posts = getAllPostsIncludingScheduled();
    const status = await EmbeddingService.getEmbeddingStatus();
    
    const results = posts.map(post => ({
      slug: post.slug,
      title: post.title,
      embeddingStatus: status[post.slug] || { exists: false, updatedAt: null }
    }));

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
