import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get("returnTo") || "/profile";
  
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = `${new URL(req.url).origin}/api/auth/linkedin/callback`;
  
  // If no LinkedIn credentials, show a mock login for demo purposes
  if (!clientId) {
    const mockProfile = {
      id: "mock-li-admin",
      name: "Sunando Bhattacharya",
      picture: "https://ui-avatars.com/api/?name=Sunando+Bhattacharya&background=0077b5&color=fff",
      provider: "linkedin"
    };
    
    // In a real app, this would be the LinkedIn Auth URL. 
    // For demo, we redirect directly to callback with 'mock=true'
    return NextResponse.redirect(`${redirectUri}?mock=true&name=${encodeURIComponent(mockProfile.name)}&id=${mockProfile.id}&state=${encodeURIComponent(returnTo)}`);
  }

  const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(returnTo)}&scope=openid%20profile%20email%20w_member_social`;

  return NextResponse.redirect(linkedinAuthUrl);
}
