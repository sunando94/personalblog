import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { registerImageUpload } from "@/lib/linkedin-api";

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("linkedin_access_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { url, title, commentary, excerpt, image } = await request.json();

        if (!url || !title) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Fetch user profile
        const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!profileResponse.ok) {
            return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 401 });
        }

        const profileData = await profileResponse.json();
        const userId = profileData.sub;
        const authorUrn = userId.startsWith("urn:li:") ? userId : `urn:li:person:${userId}`;

        // 2. Format commentary: Link is always separated from your custom thoughts
        const richCommentary = commentary
            ? `${commentary}\n\nRead more: ${url}`
            : `${title}\n\nRead more: ${url}`;

        const cardDescription = excerpt || "Read more on my blog";
        const truncatedCardDescription = cardDescription.length > 253
            ? cardDescription.substring(0, 250) + "..."
            : cardDescription;

        let assetUrn = null;

        // 3. Handle Image Upload (Crucial for Localhost debugging)
        if (image) {
            try {
                const imageRes = await fetch(image);
                if (imageRes.ok) {
                    const imageBlob = await imageRes.blob();
                    const { uploadUrl, asset } = await registerImageUpload(token, authorUrn);
                    const uploadRes = await fetch(uploadUrl, {
                        method: "POST",
                        body: imageBlob,
                        headers: { "Content-Type": imageBlob.type || "image/jpeg" },
                    });

                    if (uploadRes.ok) {
                        assetUrn = asset;
                    }
                }
            } catch (err) {
                console.error("LinkedIn Image Upload failed:", err);
            }
        }

        /**
         * LINKEDIN API RULES:
         * - ARTICLE category: Clickable "box" with link. Does NOT allow custom 'media' assets (URNs).
         *   LinkedIn scrapes the image from originalUrl. (Won't show on localhost).
         * - IMAGE category: Shows the uploaded asset. Does NOT show the link "box".
         * 
         * To fix your error, we MUST decide which category to use. 
         * Providing 'media' to 'ARTICLE' causes the "media type validation failed" error.
         */

        let mediaCategory = "ARTICLE";
        let mediaElement: any = {
            status: "READY",
            originalUrl: url,
            title: { text: title },
            description: { text: truncatedCardDescription }
        };

        // If we successfully uploaded an image, we switch to IMAGE category 
        // to ensure you actually see the picture on LinkedIn while on localhost.
        if (assetUrn) {
            mediaCategory = "IMAGE";
            mediaElement = {
                status: "READY",
                media: assetUrn,
                title: { text: title }
            };
        }

        const postBody = {
            author: authorUrn,
            lifecycleState: "PUBLISHED",
            specificContent: {
                "com.linkedin.ugc.ShareContent": {
                    shareCommentary: { text: richCommentary },
                    shareMediaCategory: mediaCategory,
                    media: [mediaElement],
                },
            },
            visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        };

        const shareResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            },
            body: JSON.stringify(postBody),
        });

        if (!shareResponse.ok) {
            const errorText = await shareResponse.text();
            console.error("LinkedIn API Error Response:", errorText);
            return NextResponse.json({ error: errorText }, { status: shareResponse.status });
        }

        const shareData = await shareResponse.json();
        return NextResponse.json({ success: true, id: shareData.id });

    } catch (error) {
        console.error("LinkedIn Logic Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
