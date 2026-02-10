import Container from "@/app/_components/container";
import { PaginatedPostList } from "@/app/_components/paginated-post-list";
import { getAllPosts } from "@/lib/api";
import { ALLOWED_CATEGORIES } from "@/lib/constants";

export default function AllPosts() {
  const allPosts = getAllPosts();

  return (
    <main>
      <Container>
        <div className="mb-20">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight mb-8">
            All Posts
          </h1>
          
          <div className="flex flex-wrap gap-2 mb-12">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 mr-2 uppercase tracking-widest pt-1.5">
              Categories:
            </span>
            {ALLOWED_CATEGORIES.map(cat => (
              <span key={cat} className="px-4 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-slate-700">
                {cat}
              </span>
            ))}
          </div>
          <PaginatedPostList allPosts={allPosts} />
        </div>
      </Container>
    </main>
  );
}
