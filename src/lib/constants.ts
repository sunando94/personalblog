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
