import { Author } from "@/interfaces/author";

export const DEFAULT_AUTHOR: Author = {
  name: "Sunando Bhattacharya",
  // Try to use local image first, fallback to placeholder
  picture: "/assets/blog/authors/sunando-bhattacharya.jpeg",
  linkedin: "https://www.linkedin.com/in/sb1994",
  github: "", // Add your GitHub URL here when available
};

export function getAuthorWithDefaults(author?: Partial<Author>): Author {
  return {
    ...DEFAULT_AUTHOR,
    ...author,
  };
}
