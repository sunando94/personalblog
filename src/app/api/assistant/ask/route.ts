import { NextRequest, NextResponse } from "next/server";
import { EmbeddingService } from "@/lib/embedding-service";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    // 1. Search for relevant chunks
    const chunks = await EmbeddingService.search(query, 4);

    // 2. Generate answer
    const answer = await EmbeddingService.generateAnswer(query, chunks);

    return NextResponse.json({ 
      answer, 
      sources: chunks.map(c => ({ title: c.title, slug: c.slug })) 
    });
  } catch (err: any) {
    console.error("Assistant API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
