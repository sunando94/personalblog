import { NextResponse } from "next/server";
import { getDayOfYear } from "date-fns";
import titles from "./title.json";

// We don't need the elaborate cache anymore since the calculation is cheap,
// but we can still set cache headers for the client.

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "header"; // header or intro

    // Get the day of the year (1-366)
    const dayOfYear = getDayOfYear(new Date());

    // Calculate index (0-based)
    // We use modulo to ensure it wraps around if we have fewer titles than days (though we should have 365)
    // For intro, we can just use a different offset or a static string if preferred.
    // Since the user provided list is for "header", we'll use it for header.
    // For intro, we'll just cycle through the same list with an offset to provide variety,
    // or we could stick to a static welcome if the titles don't fit.
    // Given the examples "Code & Coffee", these fit short headers.

    let title = "";

    // Use the daily rotation for both header and intro
    const index = (dayOfYear - 1) % titles.length;

    if (type === "header") {
      title = titles[index];
    } else {
      // For intro, use a different title from the list (offset by 182 days ~ approx half year)
      // This ensures header and intro are different each day
      const introIndex = (index + 182) % titles.length;
      title = titles[introIndex];
    }

    return NextResponse.json(
      { title, cached: false },
      {
        headers: {
          // Cache for 1 hour locally, revalidate every hour
          "Cache-Control": `public, s-maxage=3600, stale-while-revalidate=3600`,
        },
      }
    );
  } catch (error) {
    console.error("Error generating title:", error);

    return NextResponse.json({
      title: "Code & Coffee", // Fallback
      cached: false,
      fallback: true,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
