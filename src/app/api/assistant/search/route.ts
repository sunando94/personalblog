import { NextRequest, NextResponse } from "next/server";
import { EmbeddingService } from "@/lib/embedding-service";

export async function POST(req: NextRequest) {
  try {
    const { query, limit } = await req.json();
    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const results = await EmbeddingService.search(query, limit || 3);
    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
