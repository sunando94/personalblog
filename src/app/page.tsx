import Container from "@/app/_components/container";
import { HeroPost } from "@/app/_components/hero-post";
import { Intro } from "@/app/_components/intro";
import { WriterSection } from "@/app/_components/writer-section";
import { RecentPosts } from "@/app/_components/recent-posts";
import { getAllPosts } from "@/lib/api";

export default function Index() {
  const allPosts = getAllPosts();

  const heroPost = allPosts[0];
  const recentPosts = allPosts.slice(1, 7);

  return (
    <main>
      <Container>
        <Intro />
        <WriterSection />
        {heroPost && (
          <HeroPost
            title={heroPost.title}
            coverImage={heroPost.coverImage}
            date={heroPost.date}
            author={heroPost.author}
            slug={heroPost.slug}
            excerpt={heroPost.excerpt}
          />
        )}
        {recentPosts.length > 0 && <RecentPosts posts={recentPosts} />}
      </Container>
    </main>
  );
}
