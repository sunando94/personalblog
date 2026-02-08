import { Post } from "@/interfaces/post";
import Link from "next/link";
import DateFormatter from "./date-formatter";
import CoverImage from "./cover-image";

type Props = {
  posts: Post[];
};

export function RelatedPosts({ posts }: Props) {
  if (posts.length === 0) return null;

  return (
    <section>
      <h2 className="mb-8 text-2xl font-bold tracking-tighter leading-tight">
        You Might Also Like
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 md:gap-x-16 lg:gap-x-12 gap-y-20 md:gap-y-32 mb-32">
        {posts.map((post) => (
          <div key={post.slug}>
            <div className="mb-5">
              <CoverImage
                title={post.title}
                slug={post.slug}
                src={post.coverImage}
              />
            </div>
            <h3 className="text-xl font-bold mb-3 leading-snug">
              <Link href={`/posts/${post.slug}`} className="hover:underline">
                {post.title}
              </Link>
            </h3>
            <div className="text-sm mb-4 text-gray-400">
              <DateFormatter dateString={post.date} />
            </div>
            <p className="text-sm leading-relaxed mb-4 text-neutral-500 dark:text-neutral-300">
              {post.excerpt.slice(0, 100)}...
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
