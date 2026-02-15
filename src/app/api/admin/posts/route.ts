import { NextRequest, NextResponse } from "next/server";
import { getTokenPayload } from "@/lib/mcp-auth";
import { getAllPosts } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const payload = await getTokenPayload(authHeader);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const posts = getAllPosts();
    
    // Return only necessary fields
    const postsData = posts.map(post => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      releaseDate: post.releaseDate,
      excerpt: post.excerpt,
      coverImage: post.coverImage
    }));

    return NextResponse.json({
      posts: postsData
    });

  } catch (error) {
    console.error("Posts fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
