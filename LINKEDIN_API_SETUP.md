# LinkedIn API Integration Setup

This guide explains how to set up the LinkedIn API integration for programmatic sharing, based on the [official LinkedIn documentation](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin).

## Overview

The blog now includes:
1. **Share Buttons** - Simple share buttons on each post (no API required)
2. **LinkedIn API Integration** - Full API integration for programmatic sharing (requires setup)

## Quick Start: Share Buttons (Already Working!)

Share buttons are already added to all blog posts. Users can click to share posts on:
- LinkedIn
- Twitter/X
- Facebook

No additional setup required! ✅

## LinkedIn API Integration (Advanced)

If you want to automatically share new blog posts to LinkedIn programmatically, follow these steps:

### Step 1: Create a LinkedIn App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Click "Create app"
3. Fill in the required information:
   - App name: Your blog name
   - Company LinkedIn Page: Your LinkedIn profile
   - Privacy policy URL: Your blog's privacy policy
   - App logo: Your blog logo
4. Submit and wait for approval

### Step 2: Add Share on LinkedIn Product

1. In your app, go to the **Products** tab
2. Click "Request access" for **Share on LinkedIn**
3. Wait for approval (usually instant for basic access)

### Step 3: Get OAuth Credentials

1. Go to the **Auth** tab in your app
2. Note down:
   - **Client ID**
   - **Client Secret**
   - **Redirect URL** (e.g., `http://localhost:3001/api/auth/linkedin/callback`)

### Step 4: Request Required Permissions

When requesting authorization, you need the `w_member_social` scope:

```
w_member_social - Required to create a LinkedIn post on behalf of the authenticated member
```

### Step 5: Set Up Environment Variables

Create a `.env.local` file in your project root:

```env
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3001/api/auth/linkedin/callback
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

### Step 6: Implement OAuth Flow

You'll need to implement OAuth 2.0 authentication. The flow:

1. Redirect user to LinkedIn authorization URL
2. User authorizes your app
3. LinkedIn redirects back with authorization code
4. Exchange code for access token
5. Use access token to create shares

### Step 7: Use the API Functions

The blog includes helper functions in `src/lib/linkedin-api.ts`:

```typescript
import { shareBlogPost } from "@/lib/linkedin-api";

// Share a blog post
await shareBlogPost(
  accessToken,
  authorUrn, // Your LinkedIn Person URN
  {
    title: "My Blog Post Title",
    url: "https://yourblog.com/posts/my-post",
    excerpt: "Post excerpt here"
  }
);
```

## API Functions Available

### `createTextShare(options)`
Creates a text-only share on LinkedIn.

### `createArticleShare(options)`
Creates an article/URL share (perfect for blog posts).

### `createImageShare(options)`
Creates an image share (requires image upload).

### `shareBlogPost(accessToken, authorUrn, post)`
Helper function specifically for sharing blog posts.

## Rate Limits

| Throttle Type | Daily Request Limit |
| ------------- | ------------------- |
| Member        | 150 Requests        |
| Application   | 100,000 Requests    |

## Example: Auto-Share on Post Publish

You can create an API route to automatically share new posts:

```typescript
// src/app/api/share-post/route.ts
import { shareBlogPost } from "@/lib/linkedin-api";
import { getPostBySlug } from "@/lib/api";

export async function POST(request: Request) {
  const { slug, accessToken, authorUrn } = await request.json();
  
  const post = getPostBySlug(slug);
  const postUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/posts/${slug}`;
  
  try {
    const result = await shareBlogPost(accessToken, authorUrn, {
      title: post.title,
      url: postUrl,
      excerpt: post.excerpt,
    });
    
    return Response.json({ success: true, postId: result.postId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

## Getting Your Person URN

To get your Person URN (needed for the `author` field):

1. Use the [Sign In with LinkedIn using OpenID Connect](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication) flow
2. The Person URN will be in the format: `urn:li:person:123456789`

## Resources

- [Official LinkedIn Share API Documentation](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin)
- [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
- [OAuth 2.0 Guide](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)

## Current Implementation

✅ **Share Buttons** - Working (no setup needed)
⏳ **API Integration** - Ready to use (requires OAuth setup)

The share buttons work immediately. The API integration is ready but requires you to set up OAuth authentication first.
