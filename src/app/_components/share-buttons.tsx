"use client";

import { Post } from "@/interfaces/post";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DateFormatter from "./date-formatter";

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
  const [mounted, setMounted] = useState(false);
  const [origin, setOrigin] = useState("");
  const [userProfile, setUserProfile] = useState<{ image: string | null; name?: string }>({ image: null });
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(-1);

  const MOCK_MENTIONS = [
    { name: "Sunando Bhattacharya", id: "sb1994", type: "person" },
    { name: "JJ Kasper", id: "jjk", type: "person" },
    { name: "Next.js", id: "nextjs", type: "organization" },
    { name: "LinkedIn", id: "linkedin", type: "organization" },
  ];

  const filteredMentions = MOCK_MENTIONS.filter(m =>
    m.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  useEffect(() => {
    setMounted(true);
    setOrigin(window.location.origin);

    // Fetch LinkedIn profile for the share header
    fetch("/api/linkedin-profile")
      .then(res => res.json())
      .then(data => {
        if (data.image || data.name) {
          setUserProfile({
            image: data.image,
            name: data.name
          });
        }
      })
      .catch(() => { });
  }, []);

  const postUrl = origin
    ? `${origin}/posts/${post.slug}`
    : "";

  const fullImageUrl = origin
    ? post.ogImage.url.startsWith('http')
      ? post.ogImage.url
      : `${origin}${post.ogImage.url}`
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

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@")) {
      setMentionQuery(lastWord.substring(1));
      setShowMentions(true);
      setMentionIndex(cursorPosition);
    } else {
      setShowMentions(false);
    }
    setShareText(value);
  };

  const insertMention = (name: string) => {
    const before = shareText.substring(0, shareText.lastIndexOf("@", mentionIndex));
    const after = shareText.substring(mentionIndex);
    setShareText(`${before}@${name} ${after}`);
    setShowMentions(false);
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to share");
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-gray-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={userProfile.image || post.author.picture}
                    alt="Your Profile"
                    className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 font-semibold text-gray-900 dark:text-white">
                    {userProfile.name || post.author.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Post to Anyone</div>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">
              <div className="relative">
                <textarea
                  className="w-full text-lg bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-500 outline-none resize-none min-h-[100px] mb-4"
                  placeholder="Share your thoughts about this article on linkedin"
                  value={shareText}
                  onChange={handleTextareaChange}
                />

                {showMentions && filteredMentions.length > 0 && (
                  <div className="absolute top-full left-0 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl w-64 overflow-hidden -mt-4 animate-in slide-in-from-top-2">
                    {filteredMentions.map((mention, i) => (
                      <button
                        key={mention.id}
                        onClick={() => insertMention(mention.name)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 text-left transition-colors border-b border-gray-100 dark:border-slate-700/50 last:border-none"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                          {mention.name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{mention.name}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{mention.type}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview Card */}
              <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-gray-50/50 dark:bg-slate-800/50 transition-all hover:bg-gray-50 dark:hover:bg-slate-800">
                <div className="p-3 flex items-center gap-2 border-b border-gray-100/50 dark:border-slate-700/50">
                  <img src={post.author.picture} alt={post.author.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                      {post.author.name}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                      <span><DateFormatter dateString={post.date} /></span> • <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" /></svg>
                    </div>
                  </div>
                </div>

                <div className="p-3">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{post.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>
                {post.coverImage && (
                  <div className="aspect-video relative overflow-hidden border-t border-gray-100 dark:border-slate-700">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-500 dark:text-gray-400 transition-colors tooltip" title="Add emoji">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-500 dark:text-gray-400 transition-colors tooltip" title="Schedule for later">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white rounded-full font-semibold transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  {isSharing ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Posting...
                    </>
                  ) : (
                    "Post"
                  )}
                </button>
              </div>
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


        </div>
      </div>
    </div>
  );
}
