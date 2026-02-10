import Avatar from "@/app/_components/avatar";
import CoverImage from "@/app/_components/cover-image";
import { type Author } from "@/interfaces/author";
import Link from "next/link";
import DateFormatter from "./date-formatter";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  excerpt: string;
  author: Author;
  slug: string;
  category?: string;
};

export function HeroPost({
  title,
  coverImage,
  date,
  excerpt,
  author,
  slug,
  category,
}: Props) {
  return (
    <section className="mb-20 md:mb-28">
      <div className="mb-8 md:mb-12 group relative">
        {category && (
          <div className="absolute top-6 left-6 z-10">
            <span className="px-4 py-2 text-sm font-bold tracking-wider uppercase bg-blue-600 text-white rounded-full shadow-2xl">
              {category}
            </span>
          </div>
        )}
        <CoverImage title={title} src={coverImage} slug={slug} />
      </div>
      <div className="md:grid md:grid-cols-2 md:gap-x-16 lg:gap-x-12">
        <div>
          <h3 className="mb-4 text-4xl lg:text-6xl leading-tight font-bold">
            <Link
              href={`/posts/${slug}`}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
            >
              {title}
            </Link>
          </h3>
          <div className="mb-6 md:mb-0 text-lg text-gray-600 dark:text-gray-400">
            <DateFormatter dateString={date} />
          </div>
        </div>
        <div>
          <p className="text-lg leading-relaxed mb-6 text-gray-700 dark:text-gray-300">
            {excerpt}
          </p>
          <Avatar name={author.name} picture={author.picture} linkedin={author.linkedin} />
        </div>
      </div>
    </section>
  );
}
