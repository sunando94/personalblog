import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const baseUrl = siteUrl;

    // Default redirect back to home if state is missing
    const returnTo = state ? decodeURIComponent(state) : "/";

    if (error) {
        console.error("LinkedIn Auth Error:", error, errorDescription);
        return NextResponse.redirect(`${baseUrl}${returnTo}?linkedin_error=${encodeURIComponent(errorDescription || error)}`);
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}${returnTo}?linkedin_error=No code returned`);
    }

    try {
        const clientId = process.env.LINKEDIN_CLIENT_ID;
        const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
        const redirectUri = `${baseUrl}/api/auth/linkedin/callback`;

        if (!clientId || !clientSecret) {
            throw new Error("LinkedIn credentials not configured");
        }

        // Exchange code for access token
        const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            throw new Error(`Failed to exchange token: ${tokenResponse.status} - ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        const expiresIn = tokenData.expires_in;

        // Create response redirecting back to the original page
        const response = NextResponse.redirect(`${baseUrl}${returnTo}?linkedin_connected=true`);

        // Set HTTP-only cookie with the access token
        response.cookies.set("linkedin_access_token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: expiresIn,
            sameSite: "lax",
        });

        return response;
    } catch (error) {
        console.error("LinkedIn Callback Error:", error);
        return NextResponse.redirect(`${baseUrl}${returnTo}?linkedin_error=Failed to connect`);
    }
}
