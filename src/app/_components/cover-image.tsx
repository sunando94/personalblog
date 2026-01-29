import cn from "classnames";
import Link from "next/link";
import Image from "next/image";

type Props = {
  title: string;
  src: string;
  slug?: string;
};

const CoverImage = ({ title, src, slug }: Props) => {
  const image = (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-800 shadow-lg">
      <Image
        src={src}
        alt={`Cover Image for ${title}`}
        className={cn("object-cover transition-transform duration-700 ease-in-out", {
          "hover:scale-105": slug,
        })}
        fill
        priority
      />
    </div>
  );
  return (
    <div className="sm:mx-0">
      {slug ? (
        <Link href={`/posts/${slug}`} aria-label={title} className="block group">
          {image}
        </Link>
      ) : (
        image
      )}
    </div>
  );
};

export default CoverImage;
