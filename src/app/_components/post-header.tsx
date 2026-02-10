import Avatar from "./avatar";
import CoverImage from "./cover-image";
import DateFormatter from "./date-formatter";
import { PostTitle } from "@/app/_components/post-title";
import { type Author } from "@/interfaces/author";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  author: Author;
  category?: string;
};

export function PostHeader({ title, coverImage, date, author, category }: Props) {
  return (
    <>
      <PostTitle>{title}</PostTitle>
      <div className="hidden md:block md:mb-12">
        <Avatar name={author.name} picture={author.picture} linkedin={author.linkedin} />
      </div>
      <div className="mb-8 md:mb-16 sm:mx-0 relative">
        {category && (
          <div className="absolute top-4 left-4 z-10 lg:top-8 lg:left-8">
            <span className="px-4 py-2 text-sm font-bold tracking-wider uppercase bg-blue-600 text-white rounded-full shadow-2xl">
              {category}
            </span>
          </div>
        )}
        <CoverImage title={title} src={coverImage} />
      </div>
      <div className="mx-auto px-4 md:px-0">
        <div className="block md:hidden mb-6">
          <Avatar name={author.name} picture={author.picture} linkedin={author.linkedin} />
        </div>
        <div className="font-bold text-lg">
          <DateFormatter dateString={date} />
        </div>
      </div>
    </>
  );
}
