import { Post } from "@/interfaces/post";
import fs from "fs";
import matter from "gray-matter";
import { join } from "path";
import { getAuthorWithDefaults } from "./author";

const postsDirectory = join(process.cwd(), "_posts");

export function getPostSlugs() {
  return fs.readdirSync(postsDirectory);
}

export function getPostBySlug(slug: string) {
  const realSlug = slug.replace(/\.md$/, "");
  const fullPath = join(postsDirectory, `${realSlug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const post = { ...data, slug: realSlug, content } as Post;
  const today = new Date().toISOString().split("T")[0];

  // Default releaseDate to today if missing
  if (!post.releaseDate) {
    post.releaseDate = today;
  } else {
    // If user provides DD/MM/YYYY, normalize to YYYY-MM-DD for comparison
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = String(post.releaseDate).match(dateRegex);
    if (match) {
      post.releaseDate = `${match[3]}-${match[2]}-${match[1]}`;
    }
  }

  // Apply default author if author is not fully specified
  if (post.author) {
    post.author = getAuthorWithDefaults(post.author);
  } else {
    post.author = getAuthorWithDefaults();
  }

  return post;
}

export function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export function getAllPosts(): Post[] {
  const slugs = getPostSlugs();
  const today = getToday();

  const posts = slugs
    .map((slug) => getPostBySlug(slug))
    .filter((post) => post.title && post.releaseDate && post.releaseDate <= today)
    // sort posts by date in descending order
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return posts;
}

export function getAllPostsIncludingScheduled(): Post[] {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug))
    .filter((post) => post.title)
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return posts;
}

export function getRelatedPosts(currentSlug: string, count: number = 3): Post[] {
  const allPosts = getAllPosts();
  const currentPost = allPosts.find((p) => p.slug === currentSlug);

  if (!currentPost) return [];

  const currentKeywords = new Set(currentPost.keywords || []);

  const scoredPosts = allPosts
    .filter((post) => post.slug !== currentSlug)
    .map((post) => {
      const postKeywords = post.keywords || [];
      const score = postKeywords.filter((k) => currentKeywords.has(k)).length;
      return { post, score };
    })
    .sort((a, b) => b.score - a.score); // Sort by overlap score

  // If no detailed overlap, just take the most recent ones
  if (scoredPosts.length === 0 || scoredPosts[0].score === 0) {
    return allPosts.filter((p) => p.slug !== currentSlug).slice(0, count);
  }

  return scoredPosts.slice(0, count).map((p) => p.post);
}
