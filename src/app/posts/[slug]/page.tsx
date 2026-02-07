import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPostsIncludingScheduled, getPostBySlug, getToday } from "@/lib/api";
import markdownToHtml from "@/lib/markdownToHtml";
import Container from "@/app/_components/container";
import { PostBody } from "@/app/_components/post-body";
import { PostHeader } from "@/app/_components/post-header";
import { ShareButtons } from "@/app/_components/share-buttons";
import { ScheduledPostMessage } from "@/app/_components/scheduled-post-message";
import { Suspense } from "react";

export default async function Post(props: Params) {
  const params = await props.params;
  const post = getPostBySlug(params.slug);

  if (!post) {
    return notFound();
  }

  const today = getToday();
  const isScheduled = post.releaseDate && post.releaseDate > today;

  if (isScheduled) {
    return (
      <main>
        <Container>
          <ScheduledPostMessage releaseDate={post.releaseDate} />
        </Container>
      </main>
    );
  }

  const content = await markdownToHtml(post.content || "");

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            image: [
              new URL(post.ogImage.url, process.env.NEXT_PUBLIC_SITE_URL || 'https://sunandobhattacharya.vercel.app').toString()
            ],
            datePublished: post.date,
            dateModified: post.date,
            author: [{
                "@type": "Person",
                name: post.author.name,
                url: process.env.NEXT_PUBLIC_SITE_URL // Assuming a profile page or similar
            }]
          })
        }}
      />
      <Container>
        <article className="mb-32">
          <PostHeader
            title={post.title}
            coverImage={post.coverImage}
            date={post.date}
            author={post.author}
          />
          <PostBody content={content} />
          <Suspense fallback={<div className="h-20 animate-pulse bg-gray-100 dark:bg-slate-800 rounded-lg" />}>
            <ShareButtons post={post} />
          </Suspense>
        </article>
      </Container>
    </main>
  );
}

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata(props: Params): Promise<Metadata> {
  const params = await props.params;
  const post = getPostBySlug(params.slug);

  if (!post) {
    return notFound();
  }

  const title = `${post.title} | Personal Blog`;
  const url = `/posts/${post.slug}`;

  return {
    title,
    description: post.excerpt,
    keywords: post.keywords || ["Technology", "Blog", "AI", "Software Engineering"],
    openGraph: {
      title,
      description: post.excerpt,
      url,
      type: "article",
      publishedTime: post.date,
      authors: [post.author?.name || "Sunando Bhattacharya"],
      images: [
        {
          url: post.ogImage.url,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: post.excerpt,
      images: [post.ogImage.url],
    },
    alternates: {
      canonical: url,
    },
    authors: [{ name: post.author?.name || "Sunando Bhattacharya" }],
  };
}

export async function generateStaticParams() {
  const posts = getAllPostsIncludingScheduled();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}
