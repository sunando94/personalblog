import { NextRequest, NextResponse } from "next/server";
import { generatePost } from "../../../../scripts/generate-post.mjs";
import { getTokenPayload } from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300; 

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const payload = await getTokenPayload(authHeader);

  if (!payload) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "A valid Guest or Writer token is required." }, { status: 401 });
  }

  try {
    const { topic, context } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    // Capture content but don't persist yet
    const result = await generatePost({
      topic,
      contextInput: context,
      releaseDateInput: "now",
      dryRun: true
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("API Generation Error:", error);

    // Detect Rate Limit
    if (error.message?.includes("429") || error.status === 429) {
      return NextResponse.json(
        { error: "RATE_LIMIT_EXCEEDED", message: "Gemini API free limit reached." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "GENERATION_FAILED", message: error.message },
      { status: 500 }
    );
  }
}
