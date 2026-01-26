"use client";

import { Post } from "@/interfaces/post";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  post: Post;
};

export function ShareButtons({ post }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareText, setShareText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const postUrl = typeof window !== "undefined"
    ? `${window.location.origin}/posts/${post.slug}`
    : "";

  const fullImageUrl = typeof window !== "undefined"
    ? post.ogImage.url.startsWith('http')
      ? post.ogImage.url
      : `${window.location.origin}${post.ogImage.url}`
    : "";

  // Standard share links (for other platforms or fallback)
  const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;

  useEffect(() => {
    // Check URL parameters for auth status
    if (searchParams.get("linkedin_connected") === "true") {
      setIsConnected(true);
      // Clean up URL
      router.replace(window.location.pathname);
      setStatusMessage({ type: "success", text: "Connected to LinkedIn! You can now share this post." });
      // Open modal automatically after connecting
      setTimeout(() => setShowModal(true), 500);
    } else if (searchParams.get("linkedin_error")) {
      setStatusMessage({ type: "error", text: `LinkedIn Connection Failed: ${searchParams.get("linkedin_error")}` });
    }
  }, [searchParams, router]);

  const handleLinkedInClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    // Check if we have the cookie (simple check, or rely on previous state)
    // Since we can't read httpOnly cookies in JS, we rely on the flow.
    // Ideally user clicks "Connect & Share" -> redirects -> returns -> we offer "Share Now".
    // Alternatively, we could try to call an endpoint (like /api/me) to check auth status,
    // but for this simple implementation, we assume if we aren't freshly connected, we might need to connect.
    // Let's assume the user needs to connect if they haven't just done so.
    // OR we can try to share, and if it fails with 401, we redirect to login.

    if (isConnected) {
      setShowModal(true);
    } else {
      // Try to open modal first - maybe they are already connected from a previous session (cookie persists)
      // But we can't know for sure. Let's try to verify via API or just optimistically show modal.
      // Better UX: Show Modal "Share on LinkedIn", when they click "Post", call API. 
      // API returns 401? Then redirect to Auth.
      setShowModal(true);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/share/linkedin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: postUrl,
          title: post.title,
          commentary: shareText,
          excerpt: post.excerpt,
          image: fullImageUrl,
        }),
      });

      if (response.status === 401) {
        // Not authenticated, redirect to login
        const returnTo = window.location.pathname;
        window.location.href = `/api/auth/linkedin?returnTo=${encodeURIComponent(returnTo)}`;
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to share");
      }

      const data = await response.json();
      setStatusMessage({ type: "success", text: "Successfully posted to LinkedIn!" });
      setShowModal(false);
      setShareText("");
    } catch (error) {
      console.error("Share error:", error);
      setStatusMessage({ type: "error", text: "Failed to share post. Please try again." });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 my-8 pt-8 border-t border-gray-200 dark:border-slate-700">

      {statusMessage && (
        <div className={`p-4 rounded-lg text-sm ${statusMessage.type === "success"
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          }`}>
          {statusMessage.text}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Share on LinkedIn</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Add a comment (optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none h-32"
                placeholder={post.excerpt || `Check out this post: ${post.title}`}
                value={shareText}
                onChange={(e) => setShareText(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
                disabled={isSharing}
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSharing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Posting...
                  </>
                ) : (
                  "Post to LinkedIn"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Share:
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLinkedInClick}
            className="flex items-center gap-2 px-4 py-2 bg-[#0077b5] hover:bg-[#006097] text-white rounded-lg transition-colors duration-200 text-sm font-medium"
            aria-label="Share on LinkedIn"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </button>

          <Link
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
            aria-label="Share on Twitter"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Twitter
          </Link>

          <Link
            href={facebookShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-lg transition-colors duration-200 text-sm font-medium"
            aria-label="Share on Facebook"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
          </Link>
        </div>
      </div>
    </div>
  );
}
