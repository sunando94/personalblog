import { Post } from "@/interfaces/post";
import { PostPreview } from "./post-preview";
import Link from "next/link";

type Props = {
  posts: Post[];
};

export function RecentPosts({ posts }: Props) {
  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight">
          Recent Posts
        </h2>
        <Link
          href="/posts"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold transition-colors duration-200 flex items-center gap-2 group"
        >
          View All
          <span className="group-hover:translate-x-1 transition-transform duration-200">
            →
          </span>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
        {posts.slice(0, 6).map((post) => (
          <div
            key={post.slug}
            className="group bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600"
          >
            <PostPreview
              title={post.title}
              coverImage={post.coverImage}
              date={post.date}
              author={post.author}
              slug={post.slug}
              excerpt={post.excerpt}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
