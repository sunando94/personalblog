"use client";

import { useState, useEffect } from "react";
import { DEFAULT_AUTHOR } from "@/lib/author";
import Avatar from "./avatar";

/**
 * Avatar component that tries to fetch LinkedIn profile picture
 * Falls back to placeholder if fetch fails
 */
export function LinkedInAvatar() {
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProfilePicture() {
      try {
        const response = await fetch("/api/linkedin-profile");
        if (response.ok) {
          const data = await response.json();
          if (data.image) {
            setProfilePicture(data.image);
          }
        }
      } catch (error) {
        console.error("Failed to fetch LinkedIn profile picture:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfilePicture();
  }, []);

  // Use fetched picture if available, otherwise use default
  const picture = profilePicture || DEFAULT_AUTHOR.picture;

  return (
    <Avatar
      name={DEFAULT_AUTHOR.name}
      picture={picture}
      linkedin={DEFAULT_AUTHOR.linkedin}
    />
  );
}
