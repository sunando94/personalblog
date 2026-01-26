"use client";

import { Author } from "@/interfaces/author";
import Link from "next/link";
import { useState } from "react";

type Props = {
  name: string;
  picture: string;
  linkedin?: string;
};

const Avatar = ({ name, picture, linkedin }: Props) => {
  const [imgSrc, setImgSrc] = useState(picture);
  const [hasError, setHasError] = useState(false);

  // Fallback image if the main image fails to load
  const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackImage);
    }
  };

  const authorContent = (
    <>
      <img
        src={imgSrc}
        className="w-12 h-12 rounded-full mr-4 object-cover"
        alt={name}
        onError={handleImageError}
      />
      <div className="text-xl font-bold">{name}</div>
    </>
  );

  if (linkedin) {
    return (
      <Link
        href={linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
      >
        {authorContent}
      </Link>
    );
  }

  return <div className="flex items-center">{authorContent}</div>;
};

export default Avatar;
