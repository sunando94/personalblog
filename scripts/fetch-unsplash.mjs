import fs from "fs/promises";
import path from "path";

/**
 * Fetches a high-quality image from Unsplash for a given topic and saves it locally.
 * @param {string} query - The search query for Unsplash
 * @param {string} slug - The post slug (used for directory naming)
 * @returns {Promise<string|null>} - The local path to the saved image or null if failed
 */
export async function fetchUnsplashImage(query, slug) {
  try {
    console.log(`Searching Unsplash for: "${query}"...`);
    // Fetch more results to filter out premium/watermarked ones
    const searchUrl = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=10`;
    const res = await fetch(searchUrl);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      console.warn("No Unsplash results found for query:", query);
      return null;
    }

    // Filter out premium images which often have watermarks or require subscription
    const freeResults = data.results.filter(r => !r.premium && !r.plus);
    
    if (freeResults.length === 0) {
      console.warn("No free Unsplash results found for query:", query);
      return null;
    }

    const imageUrl = freeResults[0].urls.regular;
    console.log(`Found free image: ${imageUrl}`);

    const projectRoot = process.cwd();
    const assetsDir = path.join(projectRoot, "public/assets/blog", slug);
    await fs.mkdir(assetsDir, { recursive: true });

    const imageRes = await fetch(imageUrl);
    const buffer = await imageRes.arrayBuffer();
    const fileName = "cover.png";
    const filePath = path.join(assetsDir, fileName);

    await fs.writeFile(filePath, Buffer.from(buffer));
    console.log(`Saved Unsplash image to: ${filePath}`);

    return `/assets/blog/${slug}/${fileName}`;
  } catch (error) {
    console.error("Failed to fetch Unsplash image:", error.message);
    return null;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('fetch-unsplash.mjs')) {
  const query = process.argv[2] || "technology";
  const slug = process.argv[3] || "test-post";
  fetchUnsplashImage(query, slug);
}
