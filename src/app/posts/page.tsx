import Container from "@/app/_components/container";
import Header from "@/app/_components/header";
import { PaginatedPostList } from "@/app/_components/paginated-post-list";
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
          <PaginatedPostList allPosts={allPosts} />
        </div>
      </Container>
    </main>
  );
}
