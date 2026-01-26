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

        // First fetch the user profile to get the URN
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
        const authorUrn = `urn:li:person:${userId}`;

        // Construct a richer commentary that includes title and excerpt
        const richCommentary = [
            title,
            excerpt ? `\n\n${excerpt}` : '',
            commentary ? `\n\n💬 ${commentary}` : '',
            `\n\nRead more: ${url}`
        ].filter(Boolean).join('');

        let assetUrn = null;
        let shareMediaCategory = "ARTICLE";

        // Try to upload image if provided and not local
        if (image && !image.includes("localhost") && !image.includes("127.0.0.1")) {
            try {
                // 1. Download the image
                const imageRes = await fetch(image);
                if (imageRes.ok) {
                    const imageBlob = await imageRes.blob();

                    // 2. Register upload
                    const { uploadUrl, asset } = await registerImageUpload(token, authorUrn);

                    // 3. Upload binary
                    const uploadRes = await fetch(uploadUrl, {
                        method: "POST",
                        body: imageBlob,
                        headers: {
                            "Content-Type": imageBlob.type || "image/jpeg",
                        },
                    });

                    if (uploadRes.ok) {
                        assetUrn = asset;
                        shareMediaCategory = "IMAGE";
                    }
                }
            } catch (err) {
                console.error("Failed to upload LinkedIn image, falling back to article share:", err);
            }
        }

        const cardDescription = excerpt || "Read more on my blog";
        const truncatedCardDescription = cardDescription.length > 253
            ? cardDescription.substring(0, 250) + "..."
            : cardDescription;

        // Create the Post Body
        const postBody: any = {
            author: authorUrn,
            lifecycleState: "PUBLISHED",
            specificContent: {
                "com.linkedin.ugc.ShareContent": {
                    shareCommentary: {
                        text: richCommentary,
                    },
                    shareMediaCategory: shareMediaCategory,
                    media: [
                        {
                            status: "READY",
                            description: {
                                text: truncatedCardDescription,
                            },
                        },
                    ],
                },
            },
            visibility: {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
            },
        };

        // Add specific media fields based on category
        if (shareMediaCategory === "IMAGE" && assetUrn) {
            postBody.specificContent["com.linkedin.ugc.ShareContent"].media[0].media = assetUrn;
            postBody.specificContent["com.linkedin.ugc.ShareContent"].media[0].title = { text: title };
        } else {
            postBody.specificContent["com.linkedin.ugc.ShareContent"].media[0].originalUrl = url;
            postBody.specificContent["com.linkedin.ugc.ShareContent"].media[0].title = { text: title };
        }

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
            console.error("LinkedIn Share Error:", errorText);

            let errorMessage = "Failed to post to LinkedIn";
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorJson.serviceErrorCode || errorMessage;

                // Common local development error
                if (errorMessage.includes("Url") && url.includes("localhost")) {
                    errorMessage = "LinkedIn cannot access your local development server. Please test this on a deployed site or use a public image URL.";
                }
            } catch (e) {
                // Not JSON
            }

            return NextResponse.json({ error: errorMessage }, { status: shareResponse.status });
        }

        const shareData = await shareResponse.json();
        return NextResponse.json({ success: true, id: shareData.id });
    } catch (error) {
        console.error("LinkedIn API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
