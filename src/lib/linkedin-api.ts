/**
 * LinkedIn API Integration
 * Based on: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
 * 
 * This module provides functions to interact with LinkedIn's UGC (User Generated Content) API
 * to create shares programmatically.
 * 
 * Note: Requires OAuth 2.0 authentication with w_member_social scope
 */

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";

export interface LinkedInShareOptions {
  accessToken: string;
  authorUrn: string; // Person URN of the member creating the share
  text: string;
  url?: string;
  title?: string;
  description?: string;
  visibility?: "PUBLIC" | "CONNECTIONS";
}

export interface LinkedInImageShareOptions extends LinkedInShareOptions {
  imageUrl: string;
  imageFile?: File;
}

/**
 * Creates a text-only share on LinkedIn
 */
export async function createTextShare(options: LinkedInShareOptions) {
  const { accessToken, authorUrn, text, visibility = "PUBLIC" } = options;

  const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: text,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": visibility,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn API error: ${response.status} - ${error}`);
  }

  const postId = response.headers.get("X-RestLi-Id");
  return { postId, status: response.status };
}

/**
 * Creates an article/URL share on LinkedIn
 */
export async function createArticleShare(options: LinkedInShareOptions) {
  const { accessToken, authorUrn, text, url, title, description, visibility = "PUBLIC" } = options;

  if (!url) {
    throw new Error("URL is required for article shares");
  }

  const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: text,
          },
          shareMediaCategory: "ARTICLE",
          media: [
            {
              status: "READY",
              description: description ? { text: description } : undefined,
              originalUrl: url,
              title: title ? { text: title } : undefined,
            },
          ],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": visibility,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn API error: ${response.status} - ${error}`);
  }

  const postId = response.headers.get("X-RestLi-Id");
  return { postId, status: response.status };
}

/**
 * Registers an image for upload to LinkedIn
 */
export async function registerImageUpload(
  accessToken: string,
  authorUrn: string
) {
  const response = await fetch(
    `${LINKEDIN_API_BASE}/assets?action=registerUpload`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: authorUrn,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    uploadUrl: data.value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ].uploadUrl,
    asset: data.value.asset,
  };
}

/**
 * Uploads an image to LinkedIn
 */
export async function uploadImage(uploadUrl: string, imageFile: File) {
  const formData = new FormData();
  formData.append("file", imageFile);

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: imageFile,
    headers: {
      "Content-Type": imageFile.type,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Image upload error: ${response.status} - ${error}`);
  }

  return { success: true };
}

/**
 * Creates an image share on LinkedIn
 */
export async function createImageShare(options: LinkedInImageShareOptions) {
  const {
    accessToken,
    authorUrn,
    text,
    imageFile,
    imageUrl,
    title,
    description,
    visibility = "PUBLIC",
  } = options;

  let assetUrn: string;

  if (imageFile) {
    // Register and upload image
    const { uploadUrl, asset } = await registerImageUpload(
      accessToken,
      authorUrn
    );
    await uploadImage(uploadUrl, imageFile);
    assetUrn = asset;
  } else {
    // For external images, you might need to download and upload
    // or use a different approach
    throw new Error("Image file is required for image shares");
  }

  const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: text,
          },
          shareMediaCategory: "IMAGE",
          media: [
            {
              status: "READY",
              description: description ? { text: description } : undefined,
              media: assetUrn,
              title: title ? { text: title } : undefined,
            },
          ],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": visibility,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn API error: ${response.status} - ${error}`);
  }

  const postId = response.headers.get("X-RestLi-Id");
  return { postId, status: response.status };
}

/**
 * Helper function to share a blog post on LinkedIn
 */
export async function shareBlogPost(
  accessToken: string,
  authorUrn: string,
  post: {
    title: string;
    url: string;
    excerpt?: string;
  }
) {
  return createArticleShare({
    accessToken,
    authorUrn,
    text: `Check out my latest blog post: ${post.title}`,
    url: post.url,
    title: post.title,
    description: post.excerpt,
    visibility: "PUBLIC",
  });
}
