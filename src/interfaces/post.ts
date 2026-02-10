import { type Author } from "./author";
import { Category } from "../lib/constants";

export type Post = {
  slug: string;
  title: string;
  date: string;
  coverImage: string;
  author: Author;
  excerpt: string;
  ogImage: {
    url: string;
  };
  content: string;
  preview?: boolean;
  releaseDate?: string;
  keywords?: string[];
  category?: Category;
};
