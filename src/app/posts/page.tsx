import Container from "@/app/_components/container";
import Header from "@/app/_components/header";
import { PostListPreview } from "@/app/_components/post-list-preview";
import { getAllPosts } from "@/lib/api";

export default function AllPosts() {
  const allPosts = getAllPosts();

  return (
    <main>
      <Container>
        <Header />
        <div className="mb-20">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight mb-12">
            All Posts
          </h1>
          <div className="flex flex-col gap-8 mb-32">
            {allPosts.map((post) => (
              <div
                key={post.slug}
                className="group bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                <PostListPreview
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
        </div>
      </Container>
    </main>
  );
}
