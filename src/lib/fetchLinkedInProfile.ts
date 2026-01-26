/**
 * Fetches LinkedIn profile picture
 * This function can be called at build time or runtime to get the profile picture
 */
export async function fetchLinkedInProfilePicture(): Promise<string | null> {
  try {
    // Try to fetch from our API route
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/linkedin-profile`);
    
    if (response.ok) {
      const data = await response.json();
      return data.image || null;
    }
  } catch (error) {
    console.error("Error fetching LinkedIn profile picture:", error);
  }
  
  return null;
}

/**
 * Gets LinkedIn profile picture with fallback
 * Use this in your components to get the profile picture
 */
export async function getLinkedInProfilePicture(linkedinUrl: string): Promise<string> {
  // First, try to fetch it
  const fetchedImage = await fetchLinkedInProfilePicture();
  if (fetchedImage) {
    return fetchedImage;
  }
  
  // Fallback to placeholder
  return "https://ui-avatars.com/api/?name=Sunando+Bhattacharya&background=random&size=128";
}
