export const EXAMPLE_PATH = "blog-starter";
export const CMS_NAME = "Markdown";
export const HOME_OG_IMAGE_URL = "https://og-image.vercel.app/Next.js%20Blog%20Starter%20Example.png?theme=light&md=1&fontSize=100px&images=https%3A%2F%2Fassets.vercel.com%2Fimage%2Fupload%2Ffront%2Fassets%2Fdesign%2Fnextjs-black-logo.svg";

/**
 * Personal Blog Categories
 * Central source of truth for allowed/preferred categories.
 */
export const ALLOWED_CATEGORIES = [
  "AI",
  "Data Engineering",
  "Deployment"
] as const;

export type Category = (typeof ALLOWED_CATEGORIES)[number];

export function isValidCategory(category: string): category is Category {
  return ALLOWED_CATEGORIES.includes(category as Category);
}
