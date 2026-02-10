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
  category?: string;
};

export function PostListPreview({
  title,
  coverImage,
  date,
  excerpt,
  author,
  slug,
  category,
}: Props) {
  return (
    <div className="flex flex-col md:flex-row gap-6 p-6">
      <div className="md:w-1/3 overflow-hidden rounded-lg shrink-0 relative">
        {category && (
          <div className="absolute top-3 left-3 z-10">
            <span className="px-2 py-0.5 text-[10px] font-extrabold tracking-widest uppercase bg-blue-600 text-white rounded-md shadow-lg">
              {category}
            </span>
          </div>
        )}
        <CoverImage slug={slug} title={title} src={coverImage} />
      </div>
      <div className="flex flex-col justify-between flex-1">
        <div>
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
          <p className="text-base leading-relaxed mb-4 text-gray-700 dark:text-gray-300 line-clamp-2 md:line-clamp-3">
            {excerpt}
          </p>
        </div>
        <Avatar name={author.name} picture={author.picture} linkedin={author.linkedin} />
      </div>
    </div>
  );
}
