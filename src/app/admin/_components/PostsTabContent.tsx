"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleShareToLinkedIn = async (post: Post) => {
    try {
      setSharingPost(post.slug);
      
      const origin = window.location.origin;
      const postUrl = `${origin}/posts/${post.slug}`;
      const imageUrl = `${origin}${post.coverImage}`;

      const response = await fetch("/api/share/linkedin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          url: postUrl,
          title: post.title,
          excerpt: post.excerpt,
          image: imageUrl,
          slug: post.slug,
          commentary: `🚀 New blog post alert!\n\n${post.title}\n\n${post.excerpt}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to share to LinkedIn");
      }

      const data = await response.json();
      
      // Refresh shares data
      await fetchData();
      
      alert("Successfully shared to LinkedIn!");
    } catch (err: any) {
      alert(`Failed to share: ${err.message}`);
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
                        onClick={() => handleShareToLinkedIn(post)}
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
    </div>
  );
}
