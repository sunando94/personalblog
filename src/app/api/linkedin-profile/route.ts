import { NextResponse } from "next/server";

/**
 * Fetches LinkedIn profile picture
 * Note: LinkedIn doesn't provide a public API, so we use alternative methods
 */
export async function GET() {
  const linkedinUrl = "https://www.linkedin.com/in/sb1994";

  try {
    // Method 1: Try using LinkPreview API (requires API key)
    if (process.env.LINKPREVIEW_API_KEY) {
      try {
        const response = await fetch(
          `https://api.linkpreview.net/?q=${encodeURIComponent(linkedinUrl)}`,
          {
            headers: {
              "X-Linkpreview-Api-Key": process.env.LINKPREVIEW_API_KEY,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.image) {
            return NextResponse.json({ image: data.image });
          }
        }
      } catch (error) {
        console.error("LinkPreview API error:", error);
      }
    }

    // Method 2: Try using LinkedIn's public profile page structure
    // This is a workaround and may not always work due to LinkedIn's anti-scraping
    try {
      const response = await fetch(linkedinUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (response.ok) {
        const html = await response.text();
        // Try to extract profile picture from meta tags or structured data
        const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (ogImageMatch && ogImageMatch[1]) {
          return NextResponse.json({ image: ogImageMatch[1] });
        }

        // Try to find image in JSON-LD structured data
        const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is);
        if (jsonLdMatch) {
          try {
            const jsonData = JSON.parse(jsonLdMatch[1]);
            if (jsonData.image) {
              return NextResponse.json({ image: jsonData.image });
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }
    } catch (error) {
      console.error("Error fetching LinkedIn page:", error);
    }

    // Method 3: Return null - user can set manually
    return NextResponse.json({
      image: null,
      message: "Could not automatically fetch profile picture. Please set it manually in src/lib/author.ts",
    });
  } catch (error) {
    console.error("Error in LinkedIn profile fetch:", error);
    return NextResponse.json(
      { image: null, error: "Failed to fetch profile picture" },
      { status: 500 }
    );
  }
}
