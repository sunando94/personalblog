"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as webllm from "@mlc-ai/web-llm";

interface Post {
  slug: string;
  title: string;
  date: string;
  releaseDate?: string;
  excerpt: string;
  coverImage: string;
}

interface LinkedInShare {
  slug: string;
  linkedin_post_id: string;
  shared_at: string;
  shared_by: string;
}

export default function PostsTabContent() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [shares, setShares] = useState<Map<string, LinkedInShare>>(new Map());
  const [loading, setLoading] = useState(true);
  const [sharingPost, setSharingPost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [shareFormat, setShareFormat] = useState<"post" | "article">("post");
  const [commentary, setCommentary] = useState("");
  const [articleTeaser, setArticleTeaser] = useState("");

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // AI generation loading state
  const [generatingTeaser, setGeneratingTeaser] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem("mcp_token");
      
      // Fetch all posts from API
      const postsRes = await fetch("/api/admin/posts", {
        headers: token ? {
          "Authorization": `Bearer ${token}`
        } : {}
      });
      
      if (!postsRes.ok) {
        if (postsRes.status === 401) {
          router.push("/");
          return;
        }
        throw new Error("Failed to fetch posts");
      }
      
      const postsData = await postsRes.json();
      setPosts(postsData.posts);

      // Fetch LinkedIn shares
      const sharesRes = await fetch("/api/admin/linkedin-shares", {
        headers: token ? {
          "Authorization": `Bearer ${token}`
        } : {}
      });
      
      if (sharesRes.ok) {
        const sharesData = await sharesRes.json();
        const sharesMap = new Map<string, LinkedInShare>(
          sharesData.shares.map((share: LinkedInShare) => [share.slug, share] as [string, LinkedInShare])
        );
        setShares(sharesMap);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openShareModal = (post: Post) => {
    setSelectedPost(post);
    setShareFormat("post");
    
    // Standard post commentary
    setCommentary(`🚀 New blog post alert!\n\n${post.title}\n\n${post.excerpt}`);
    
    // Enhanced article teaser with engaging content
    const excerptPreview = post.excerpt.length > 200 
      ? post.excerpt.substring(0, 200) + "..." 
      : post.excerpt;
    
    // Default template (will be replaced by AI if available)
    setArticleTeaser(
      `💡 Just published: ${post.title}\n\n` +
      `${excerptPreview}\n\n` +
      `🔍 In this article, I dive deep into:\n` +
      `• Real-world implementation strategies\n` +
      `• Best practices and common pitfalls\n` +
      `• Actionable takeaways you can use today\n\n` +
      `💬 What's your experience with this? Drop your thoughts in the comments!\n\n` +
      `👇 Full article linked in the first comment`
    );
    
    setShowShareModal(true);
  };

  // Generate AI-powered teaser when format changes to "article"
  const handleFormatChange = async (format: "post" | "article") => {
    setShareFormat(format);
    
    if (format === "article" && selectedPost) {
      // Generate AI teaser using WebLLM
      setGeneratingTeaser(true);
      let engine: webllm.MLCEngineInterface | null = null;
      
      try {
        // Get user's preferred model from settings
        const preferredModel = localStorage.getItem("preferred_model") || "Phi-3.5-mini-instruct-q4f16_1-MLC";
        
        console.log("🤖 Loading WebLLM model:", preferredModel);
        
        // Create WebLLM engine with user's preferred model
        engine = await webllm.CreateMLCEngine(preferredModel, {
          initProgressCallback: (progress) => {
            console.log("WebLLM loading:", progress);
          },
        });

        const prompt = `You are a LinkedIn content expert. Create an engaging LinkedIn post teaser for this technical blog article.

Title: ${selectedPost.title}
Excerpt: ${selectedPost.excerpt}

Requirements:
- Start with an attention-grabbing hook (use emojis sparingly)
- Include 2-3 sentences summarizing the key value
- Add 3 bullet points with specific takeaways
- Include a call-to-action question
- End with "👇 Full article linked in the first comment"
- Keep it under 300 words, conversational tone

Generate ONLY the LinkedIn post text:`;

        const response = await engine.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 500,
        });

        const teaser = response.choices[0]?.message?.content || "";
        if (teaser) {
          setArticleTeaser(teaser);
        }
      } catch (err) {
        console.error("Failed to generate AI teaser:", err);
        // Keep the default template
      } finally {
        // Clean up engine
        if (engine) {
          try {
            await engine.unload();
          } catch (e) {
            console.error("Failed to unload engine:", e);
          }
        }
        setGeneratingTeaser(false);
      }
    }
  };

  const handleShareToLinkedIn = async () => {
    if (!selectedPost) return;
    
    try {
      setSharingPost(selectedPost.slug);
      
      const origin = window.location.origin;
      const postUrl = `${origin}/posts/${selectedPost.slug}`;
      const imageUrl = `${origin}${selectedPost.coverImage}`;

      const response = await fetch("/api/share/linkedin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          url: postUrl,
          title: selectedPost.title,
          excerpt: selectedPost.excerpt,
          image: imageUrl,
          slug: selectedPost.slug,
          commentary: shareFormat === "post" ? commentary : articleTeaser,
          format: shareFormat,
          addLinkAsComment: shareFormat === "article"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to share to LinkedIn");
      }

      const data = await response.json();
      
      // Refresh shares data
      await fetchData();
      
      setShowShareModal(false);
      setToast({ 
        message: `Successfully shared to LinkedIn as ${shareFormat === "post" ? "Post" : "Article Teaser"}!`, 
        type: "success" 
      });
    } catch (err: any) {
      setToast({ 
        message: `Failed to share: ${err.message}`, 
        type: "error" 
      });
    } finally {
      setSharingPost(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const isPostPublished = (post: Post) => {
    if (!post.releaseDate) return true;
    return new Date(post.releaseDate) <= new Date();
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400">Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-red-800 dark:text-red-200 font-semibold">Error</h3>
        <p className="text-red-600 dark:text-red-400 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Total Posts
          </div>
          <div className="text-4xl font-black text-slate-900 dark:text-white">
            {posts.length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Shared to LinkedIn
          </div>
          <div className="text-4xl font-black text-green-600 dark:text-green-400">
            {shares.size}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Not Shared
          </div>
          <div className="text-4xl font-black text-orange-600 dark:text-orange-400">
            {posts.length - shares.size}
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-950/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Post
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  LinkedIn
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
              {posts.map((post) => {
                const isShared = shares.has(post.slug);
                const isPublished = isPostPublished(post);
                
                return (
                  <tr key={post.slug} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg overflow-hidden">
                          <img src={post.coverImage} alt="" className="h-10 w-10 object-cover" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {post.title}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {post.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white">
                        {formatDate(post.releaseDate || post.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        isPublished 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {isPublished ? 'Published' : 'Scheduled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isShared ? (
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-green-600 dark:text-green-400">Shared</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Not shared</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openShareModal(post)}
                        disabled={sharingPost === post.slug}
                        className={`px-4 py-2 rounded-lg transition-all ${
                          isShared
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {sharingPost === post.slug ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sharing...
                          </span>
                        ) : isShared ? (
                          'Share Again'
                        ) : (
                          'Post to LinkedIn'
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {posts.length === 0 && (
          <div className="py-20 text-center border-t border-slate-50 dark:border-slate-800">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No posts found</p>
          </div>
        )}
      </div>

      {/* LinkedIn Share Modal */}
      {showShareModal && selectedPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Share to LinkedIn
                </h2>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {selectedPost.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedPost.excerpt}
                </p>
              </div>

              {/* Format Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Share Format
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleFormatChange("post")}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                      shareFormat === "post"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        : "border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                    }`}
                  >
                    <div className="font-semibold">Post</div>
                    <div className="text-xs mt-1">Share as a regular LinkedIn post with link preview</div>
                  </button>
                  <button
                    onClick={() => handleFormatChange("article")}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                      shareFormat === "article"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        : "border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                    }`}
                  >
                    <div className="font-semibold">Article Teaser ✨</div>
                    <div className="text-xs mt-1">AI-generated teaser with blog link in comments</div>
                  </button>
                </div>
              </div>

              {/* Commentary/Teaser Editor */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {shareFormat === "post" ? "Post Commentary" : "Article Teaser"}
                  {generatingTeaser && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400 text-xs">
                      <span className="inline-block animate-spin mr-1">⚡</span>
                      Generating AI teaser...
                    </span>
                  )}
                </label>
                <textarea
                  value={shareFormat === "post" ? commentary : articleTeaser}
                  onChange={(e) => shareFormat === "post" ? setCommentary(e.target.value) : setArticleTeaser(e.target.value)}
                  rows={8}
                  disabled={generatingTeaser}
                  className={`w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                    generatingTeaser ? "opacity-50 cursor-wait" : ""
                  }`}
                  placeholder={generatingTeaser ? "Generating AI teaser..." : shareFormat === "post" ? "Write your post commentary..." : "Write your article teaser..."}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {shareFormat === "post" 
                    ? "This will appear as your post text with a link preview card below."
                    : generatingTeaser 
                      ? "AI is crafting an engaging teaser for your article..."
                      : "This will appear as your post text. The blog link will be added as the first comment automatically."
                  }
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShareToLinkedIn}
                  disabled={!!sharingPost}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    sharingPost
                      ? "bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                      : "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                  }`}
                >
                  {sharingPost ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sharing...
                    </span>
                  ) : (
                    `Share as ${shareFormat === "post" ? "Post" : "Article Teaser"}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-top-5 duration-300">
          <div className={`rounded-lg shadow-2xl p-4 pr-12 max-w-md ${
            toast.type === "success" 
              ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-400" 
              : "bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-400"
          }`}>
            <div className="flex items-start gap-3">
              {toast.type === "success" ? (
                <svg className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <p className={`text-sm font-medium ${
                toast.type === "success" 
                  ? "text-green-800 dark:text-green-200" 
                  : "text-red-800 dark:text-red-200"
              }`}>
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
