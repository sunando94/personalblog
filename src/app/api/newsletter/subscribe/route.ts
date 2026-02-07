import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    try {
      await db.query(
        `INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
        [email.toLowerCase().trim()]
      );

      return NextResponse.json({ success: true });
    } catch (dbError: any) {
      console.error("Database error during subscription:", dbError);
      return NextResponse.json(
        { error: "Failed to process subscription" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
