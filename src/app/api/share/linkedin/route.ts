import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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
        const userId = profileData.sub; // This is the user's URN (e.g. urn:li:person:abcdef)

        // LinkedIn media description has a 256 character limit
        const cardDescription = excerpt || "Read more on my blog";
        const truncatedCardDescription = cardDescription.length > 253
            ? cardDescription.substring(0, 250) + "..."
            : cardDescription;

        // Create the UGC Post
        const postBody = {
            author: `urn:li:person:${userId}`,
            lifecycleState: "PUBLISHED",
            specificContent: {
                "com.linkedin.ugc.ShareContent": {
                    shareCommentary: {
                        text: commentary || `Check out this post: ${title}`,
                    },
                    shareMediaCategory: "ARTICLE",
                    media: [
                        {
                            status: "READY",
                            description: {
                                text: truncatedCardDescription,
                            },
                            originalUrl: url,
                            title: {
                                text: title,
                            },
                            thumbnails: image ? [
                                {
                                    url: image
                                }
                            ] : [],
                        },
                    ],
                },
            },
            visibility: {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
            },
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
            console.error("LinkedIn Share Error:", errorText);
            return NextResponse.json({ error: "Failed to post to LinkedIn" }, { status: shareResponse.status });
        }

        const shareData = await shareResponse.json();
        return NextResponse.json({ success: true, id: shareData.id });
    } catch (error) {
        console.error("LinkedIn API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
