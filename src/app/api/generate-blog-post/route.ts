import { NextRequest, NextResponse } from "next/server";
import { generatePost } from "../../../../scripts/generate-post.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow for long generation times

export async function POST(req: NextRequest) {
  try {
    const { topic, context } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    // Capture logs and check for 429 specifically in our pipeline
    // Note: The generatePost script uses process.env.GEMINI_API_KEY
    await generatePost({
      topic,
      contextInput: context,
      releaseDateInput: "now"
    });

    return NextResponse.json({ success: true, message: "Post generated and saved to GitHub/Local disk." });
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
