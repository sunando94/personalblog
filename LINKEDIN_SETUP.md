# LinkedIn Profile Picture Setup

This guide explains how to set up your LinkedIn profile picture for the blog.

## Option 1: Manual Setup (Recommended)

Since LinkedIn has anti-scraping measures, the easiest way is to manually set your profile picture:

1. **Visit your LinkedIn profile**: https://www.linkedin.com/in/sb1994
2. **Right-click on your profile picture** and select "Copy image address" or "Open image in new tab"
3. **Copy the image URL** (it will look something like: `https://media.licdn.com/dms/image/...`)
4. **Update `src/lib/author.ts`**:
   ```typescript
   export const DEFAULT_AUTHOR: Author = {
     name: "Sunando Bhattacharya",
     picture: "YOUR_LINKEDIN_IMAGE_URL_HERE", // Paste the URL here
     linkedin: "https://www.linkedin.com/in/sb1994",
     github: "",
   };
   ```

## Option 2: Download and Save Locally

1. **Visit your LinkedIn profile**: https://www.linkedin.com/in/sb1994
2. **Right-click on your profile picture** and select "Save image as..."
3. **Save the image** to: `public/assets/blog/authors/sunando-bhattacharya.jpg`
4. The image will be automatically used (already configured in `src/lib/author.ts`)

## Option 3: Use LinkPreview API (Optional)

If you have a LinkPreview API key:

1. Get a free API key from: https://www.linkpreview.net/
2. Add it to your `.env.local` file:
   ```
   LINKPREVIEW_API_KEY=your_api_key_here
   ```
3. The API route will automatically try to fetch your profile picture

## Current Configuration

The blog is currently configured to look for your profile picture at:
- Local path: `/assets/blog/authors/sunando-bhattacharya.jpg`
- Fallback: Auto-generated avatar with your name

If the local image doesn't exist, it will automatically fall back to a placeholder avatar.
