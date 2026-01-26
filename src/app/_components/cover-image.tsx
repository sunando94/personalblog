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
    <Image
      src={src}
      alt={`Cover Image for ${title}`}
      className={cn("shadow-sm w-full rounded-lg object-cover aspect-video max-h-[450px] md:max-h-[500px]", {
        "hover:shadow-xl hover:scale-[1.02] transition-all duration-300": slug,
      })}
      width={1300}
      height={630}
    />
  );
  return (
    <div className="sm:mx-0 overflow-hidden rounded-lg">
      {slug ? (
        <Link href={`/posts/${slug}`} aria-label={title} className="block">
          {image}
        </Link>
      ) : (
        image
      )}
    </div>
  );
};

export default CoverImage;
