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

export default function AdminPostsPage() {
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading posts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-red-800 dark:text-red-200 font-semibold">Error</h3>
            <p className="text-red-600 dark:text-red-400 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Posts Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage and share your blog posts to LinkedIn
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Posts
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
              {posts.length}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Shared to LinkedIn
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
              {shares.size}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Not Shared
            </div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
              {posts.length - shares.size}
            </div>
          </div>
        </div>

        {/* Posts Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Article Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Release Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    LinkedIn Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {posts.map((post) => {
                  const share = shares.get(post.slug);
                  const isPublished = isPostPublished(post);
                  const isShared = !!share;
                  const isSharing = sharingPost === post.slug;

                  return (
                    <tr key={post.slug} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {post.title}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {post.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {post.releaseDate ? formatDate(post.releaseDate) : formatDate(post.date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPublished ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Published
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Scheduled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isShared ? (
                          <div>
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              ✓ Shared
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatDate(share.shared_at)}
                            </div>
                            {share.shared_by && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                by {share.shared_by}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                            Not Shared
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/posts/${post.slug}`)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleShareToLinkedIn(post)}
                            disabled={isSharing}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              isSharing
                                ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                : "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                            }`}
                          >
                            {isSharing ? (
                              <span className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Sharing...
                              </span>
                            ) : isShared ? (
                              "Share Again"
                            ) : (
                              "Share to LinkedIn"
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
