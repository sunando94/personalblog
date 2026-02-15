import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { registerImageUpload } from "@/lib/linkedin-api";
import { db } from "@/lib/db";
import { log } from "console";
import { url } from "inspector";
import { title } from "process";
import image from "next/image";

// Types
interface ShareRequest {
    url: string;
    title: string;
    commentary: string;
    excerpt?: string;
    image?: string;
    slug?: string;
    format?: "post" | "article";
    addLinkAsComment?: boolean;
}

interface LinkedInProfile {
    sub: string;
    name?: string;
}

// Helper: Get LinkedIn profile
async function getLinkedInProfile(token: string): Promise<{ authorUrn: string; profileData: LinkedInProfile }> {
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error("❌ [LinkedIn] Failed to fetch profile:", errorText);
        throw new Error("Failed to fetch user profile - token may be expired");
    }

    const profileData = await profileResponse.json();
    const userId = profileData.sub;
    const authorUrn = userId.startsWith("urn:li:") ? userId : `urn:li:person:${userId}`;

    return { authorUrn, profileData };
}

// Helper: Upload image to LinkedIn
async function uploadImage(token: string, authorUrn: string, imageUrl: string): Promise<string | null> {
    try {
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) return null;

        const imageBlob = await imageRes.blob();
        const { uploadUrl, asset } = await registerImageUpload(token, authorUrn);
        
        const uploadRes = await fetch(uploadUrl, {
            method: "POST",
            body: imageBlob,
            headers: { "Content-Type": imageBlob.type || "image/jpeg" },
        });

        return uploadRes.ok ? asset : null;
    } catch (err) {
        console.error("❌ [LinkedIn] Image upload failed:", err);
        return null;
    }
}

// Helper: Build post body
function buildPostBody(
    authorUrn: string,
    commentary: string,
    format: "post" | "article",
    addLinkAsComment: boolean,
    url: string,
    title: string,
    excerpt: string,
    assetUrn: string | null
) {
    // Format commentary
    let richCommentary: string;
    let includeMediaLink = true;

    if (format === "article" && addLinkAsComment) {
        richCommentary = commentary || `${title}\n\n${excerpt || ""}`;
        includeMediaLink = false;
    } else {
        richCommentary = commentary
            ? `${commentary}\n\nRead more: ${url}`
            : `${title}\n\nRead more: ${url}`;
    }

    // Determine media category and element
    let mediaCategory: string;
    let mediaElement: any = null;

    if (format === "article" && addLinkAsComment) {
        mediaCategory = "NONE";
    } else if (assetUrn) {
        mediaCategory = "IMAGE";
        mediaElement = {
            status: "READY",
            media: assetUrn,
            title: { text: title }
        };
    } else if (includeMediaLink) {
        mediaCategory = "ARTICLE";
        const cardDescription = excerpt || "Read more on my blog";
        const truncatedDescription = cardDescription.length > 253
            ? cardDescription.substring(0, 250) + "..."
            : cardDescription;
        
        mediaElement = {
            status: "READY",
            originalUrl: url,
            title: { text: title },
            description: { text: truncatedDescription }
        };
    } else {
        mediaCategory = "NONE";
    }

    const postBody: any = {
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
            "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: richCommentary },
                shareMediaCategory: mediaCategory,
            },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    if (mediaElement) {
        postBody.specificContent["com.linkedin.ugc.ShareContent"].media = [mediaElement];
    }

    return postBody;
}

// Helper: Create LinkedIn post
async function createLinkedInPost(token: string, postBody: any): Promise<string> {
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
        console.error("❌ [LinkedIn] Post creation failed:", errorText);
        
        // Handle duplicate post error
        if (errorText.includes("DUPLICATE_POST") || errorText.includes("Duplicate post")) {
            throw new Error("LinkedIn detected this as a duplicate post. Try modifying the commentary or waiting a few minutes before sharing again.");
        }
        
        throw new Error(`LinkedIn API Error: ${errorText}`);
    }

    const shareData = await shareResponse.json();
    return shareData.id;
}

// Helper: Add comment to post (LinkedIn API limitation workaround)
async function addCommentToPost(token: string, authorUrn: string, postId: string, url: string): Promise<{ success: boolean; postUrl?: string }> {
    // LinkedIn's public API no longer supports adding comments to posts
    // We'll return the post URL so users can manually add the comment
    
    // Extract the share ID from the URN (e.g., urn:li:share:7428689671011962880 -> 7428689671011962880)
    const shareId = postId.replace('urn:li:share:', '');
    const linkedInPostUrl = `https://www.linkedin.com/feed/update/${postId}`;
    
    console.log("⚠️ [LinkedIn] Comment API not available. Post URL:", linkedInPostUrl);
    console.log("💡 [LinkedIn] Please manually add this comment:", `📖 Read the full article here: ${url}`);
    
    return { 
        success: false, 
        postUrl: linkedInPostUrl 
    };
}

// Helper: Track share in database
async function trackShare(slug: string, postId: string, userName: string): Promise<void> {
    try {
        await db.query(`
            INSERT INTO linkedin_shares (slug, linkedin_post_id, shared_by)
            VALUES ($1, $2, $3)
            ON CONFLICT (slug) 
            DO UPDATE SET 
                linkedin_post_id = EXCLUDED.linkedin_post_id,
                shared_at = CURRENT_TIMESTAMP,
                shared_by = EXCLUDED.shared_by
        `, [slug, postId, userName]);
        
        console.log(`✅ [LinkedIn] Tracked share for: ${slug}`);
    } catch (err) {
        console.error("❌ [LinkedIn] Failed to track share:", err);
    }
}

// Main POST handler
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("linkedin_access_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const data: ShareRequest = await request.json();
        console.log("ShareRequest",data)
        const { url, title, commentary, excerpt = "", image, slug, format = "post", addLinkAsComment = false } = data;

        if (!url || !title) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Get LinkedIn profile
        const { authorUrn, profileData } = await getLinkedInProfile(token);

        // 2. Upload image (if provided)
        const assetUrn = image ? await uploadImage(token, authorUrn, image) : null;

        // 3. Build post body
        const postBody = buildPostBody(authorUrn, commentary, format, addLinkAsComment, url, title, excerpt, assetUrn);

        // 4. Create LinkedIn post
        const postId = await createLinkedInPost(token, postBody);

        // 5. Add comment (if article format)
        let commentAdded = false;
        if (addLinkAsComment && format === "article") {
            commentAdded = await addCommentToPost(token, authorUrn, postId, url);
        }

        // 6. Track in database
        if (slug) {
            await trackShare(slug, postId, profileData.name || profileData.sub);
        }

        return NextResponse.json({ 
            success: true, 
            id: postId, 
            format, 
            commentAdded 
        });

    } catch (error) {
        console.error("❌ [LinkedIn] Unexpected error:", error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : "Internal Server Error" 
        }, { status: 500 });
    }
}
