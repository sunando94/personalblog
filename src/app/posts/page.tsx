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
          
          <PaginatedPostList allPosts={allPosts} categories={[...ALLOWED_CATEGORIES]} />
        </div>
      </Container>
    </main>
  );
}
