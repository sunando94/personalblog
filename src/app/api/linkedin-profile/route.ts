import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Fetches LinkedIn profile picture and name
 */
export async function GET() {
  const linkedinUrl = "https://www.linkedin.com/in/sb1994";

  try {
    // Method 0: Try using the authenticated session if available
    const cookieStore = await cookies();
    const token = cookieStore.get("linkedin_access_token")?.value;

    if (token) {
      try {
        const response = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            image: data.picture,
            name: data.name || data.given_name + " " + data.family_name
          });
        }
      } catch (error) {
        console.error("LinkedIn userinfo error:", error);
      }
    }

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
          return NextResponse.json({
            image: data.image,
            name: data.title?.split(" | ")[0] // Usually "Name | LinkedIn"
          });
        }
      } catch (error) {
        console.error("LinkPreview API error:", error);
      }
    }

    // Method 2: Try using LinkedIn's public profile page structure
    try {
      const response = await fetch(linkedinUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (response.ok) {
        const html = await response.text();

        // Extract name
        let name = null;
        const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
        if (ogTitleMatch) {
          name = ogTitleMatch[1].split(" | ")[0];
        }

        // Try to extract profile picture from meta tags or structured data
        const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (ogImageMatch && ogImageMatch[1]) {
          return NextResponse.json({ image: ogImageMatch[1], name });
        }

        // Try to find image in JSON-LD structured data
        const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is);
        if (jsonLdMatch) {
          try {
            const jsonData = JSON.parse(jsonLdMatch[1]);
            if (jsonData.image) {
              return NextResponse.json({ image: jsonData.image, name });
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }

        if (name) return NextResponse.json({ image: null, name });
      }
    } catch (error) {
      console.error("Error fetching LinkedIn page:", error);
    }

    // Method 3: Return null
    return NextResponse.json({
      image: null,
      name: null,
      message: "Could not automatically fetch profile info.",
    });
  } catch (error) {
    console.error("Error in LinkedIn profile fetch:", error);
    return NextResponse.json(
      { image: null, name: null, error: "Failed to fetch profile info" },
      { status: 500 }
    );
  }
}
