import { type Author } from "@/interfaces/author";
import Link from "next/link";
import Avatar from "./avatar";
import CoverImage from "./cover-image";
import DateFormatter from "./date-formatter";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  excerpt: string;
  author: Author;
  slug: string;
};

export function PostPreview({
  title,
  coverImage,
  date,
  excerpt,
  author,
  slug,
}: Props) {
  return (
    <div className="p-6">
      <div className="mb-5 overflow-hidden rounded-lg">
        <CoverImage slug={slug} title={title} src={coverImage} />
      </div>
      <h3 className="text-2xl mb-3 leading-snug font-bold">
        <Link
          href={`/posts/${slug}`}
          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
        >
          {title}
        </Link>
      </h3>
      <div className="text-sm mb-4 text-gray-600 dark:text-gray-400">
        <DateFormatter dateString={date} />
      </div>
      <p className="text-base leading-relaxed mb-4 text-gray-700 dark:text-gray-300 line-clamp-3">
        {excerpt}
      </p>
      <Avatar name={author.name} picture={author.picture} linkedin={author.linkedin} />
    </div>
  );
}
