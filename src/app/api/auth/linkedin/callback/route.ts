import { NextRequest, NextResponse } from "next/server";
import { createSocialTokenPair, ExternalProfile } from "@/lib/mcp-auth";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const isMock = searchParams.get("mock") === "true";

  let profile: ExternalProfile;

  if (isMock) {
    profile = {
      id: searchParams.get("id") || "mock-123",
      name: searchParams.get("name") || "Mock User",
      picture: `https://ui-avatars.com/api/?name=${searchParams.get("name")}&background=random`,
      provider: "linkedin"
    };
  } else {
    if (!code) return NextResponse.redirect(`${origin}/profile?error=no_code`);

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = `${origin}/api/auth/linkedin/callback`;

    try {
      // 1. Exchange 'code' for 'access_token'
      const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId!,
          client_secret: clientSecret!,
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) {
        console.error("LinkedIn Token Error:", tokenData);
        return NextResponse.redirect(`${origin}/profile?error=token_exchange_failed`);
      }

      // 2. Fetch profile using access_token (OpenID Connect userinfo endpoint)
      const userinfoResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const userData = await userinfoResponse.json();
      if (!userinfoResponse.ok) {
        console.error("LinkedIn UserInfo Error:", userData);
        return NextResponse.redirect(`${origin}/profile?error=profile_fetch_failed`);
      }

      profile = {
        id: userData.sub,
        name: userData.name || `${userData.given_name} ${userData.family_name}`,
        picture: userData.picture,
        email: userData.email,
        provider: "linkedin"
      };
    } catch (err: any) {
      console.error("LinkedIn Auth Exception:", err);
      return NextResponse.redirect(`${origin}/profile?error=internal_auth_error`);
    }
  }

  // Create JWT for this user
  const authData = await createSocialTokenPair(profile);

  // Redirect back to request origin (state) or profile
  const returnTo = searchParams.get("state") || "/profile";
  
  // Create response
  const response = NextResponse.redirect(`${origin}${returnTo}${returnTo.includes('?') ? '&' : '?'}linkedin_connected=true&token=${authData.access_token}&name=${encodeURIComponent(authData.name)}&picture=${encodeURIComponent(authData.picture || "")}`);
  
  // Set the access token cookie for the sharing API
  // Use a long expiration to keep the user connected
  response.cookies.set("linkedin_access_token", authData.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return response;
}
