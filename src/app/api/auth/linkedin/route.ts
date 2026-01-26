import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get("returnTo") || "/";

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const redirectUri = `${siteUrl}/api/auth/linkedin/callback`;

    if (!clientId || clientId === "your-linkedin-client-id") {
        return NextResponse.json(
            { error: "Configuration Error: LINKEDIN_CLIENT_ID not set. Please update .env.local with your real credentials." },
            { status: 500 }
        );
    }

    // Generate a random state for security (in a real app, store this in a session/cookie and verify it)
    // For this simple implementation, we'll just encode the returnTo path
    const state = encodeURIComponent(returnTo);

    // Scope required for sharing on behalf of a member
    // w_member_social: Create, modify, and delete posts, comments, and likes on behalf of the member.
    // profile: To get basic profile info (optional but good to have)
    const scope = "w_member_social profile openid email";

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;

    return NextResponse.redirect(authUrl);
}
