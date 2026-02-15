"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Post {
  slug: string;
  title: string;
  embeddingStatus: {
    exists: boolean;
    hash?: string;
    updatedAt?: string;
  };
}

interface VectorsTabProps {
  search?: string;
}

export default function VectorsTabContent({ search = "" }: VectorsTabProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [syncingPost, setSyncingPost] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [postPage, setPostPage] = useState(1);
  const postsPerPage = 10;

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    setPostPage(1);
  }, [search]);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/admin/posts-embedding-status", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      setPosts(data);
    } catch (err: any) {
      console.error(err.message);
    }
  };

  const generateEmbedding = async (slug: string) => {
    try {
      setSyncingPost(slug);
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/admin/index-posts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ slug })
      });
      const data = await res.json();
      if (data.success) {
        fetchPosts();
      } else {
        throw new Error(data.message || "Unknown error");
      }
    } catch (err: any) {
      alert(`⚠️ ${err.message}`);
    } finally {
      setSyncingPost(null);
    }
  };

  const generateAllEmbeddings = async () => {
    if (!confirm("This will generate embeddings for all posts. This may take several minutes. Continue?")) return;
    
    try {
      setSyncingAll(true);
      const token = localStorage.getItem("mcp_token");
      const res = await fetch("/api/admin/index-posts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Successfully generated embeddings for all posts!`);
        fetchPosts();
      } else {
        throw new Error(data.message || "Unknown error");
      }
    } catch (err: any) {
      alert(`⚠️ ${err.message}`);
    } finally {
      setSyncingAll(false);
    }
  };

  const filtered = posts.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.slug.toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((postPage - 1) * postsPerPage, postPage * postsPerPage);
  const totalPages = Math.ceil(filtered.length / postsPerPage);

  return (
    <div className="space-y-6">
      {/* Generate All Button */}
      <div className="flex justify-end">
        <button
          onClick={generateAllEmbeddings}
          disabled={syncingAll}
          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncingAll ? (
            <span className="flex items-center gap-2">
              <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Generating All...
            </span>
          ) : 'Generate All Embeddings'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Document Name</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Embedding Status</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Fingerprint</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Last Updated</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {paginated.map(post => (
              <tr key={post.slug} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <Link href={`/posts/${post.slug}`} target="_blank" className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                      {post.title}
                    </Link>
                    <p className="text-[10px] font-medium text-slate-400">{post.slug}.md</p>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    {syncingAll ? (
                      <>
                        <svg className="w-3 h-3 animate-spin text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                          Syncing...
                        </span>
                      </>
                    ) : (
                      <>
                        <div className={`w-2 h-2 rounded-full ${post.embeddingStatus.exists ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`}></div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${post.embeddingStatus.exists ? 'text-green-600' : 'text-slate-400'}`}>
                          {post.embeddingStatus.exists ? 'Active Index' : 'Pending'}
                        </span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6 text-[10px] font-mono text-slate-400">
                  {post.embeddingStatus.exists ? post.embeddingStatus.hash?.substring(0, 8) : '——'}
                </td>
                <td className="px-8 py-6">
                  {post.embeddingStatus.updatedAt ? (
                    <div>
                      <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{new Date(post.embeddingStatus.updatedAt).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase">{new Date(post.embeddingStatus.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Never</span>
                  )}
                </td>
                <td className="px-8 py-6 text-right">
                  <button 
                    onClick={() => generateEmbedding(post.slug)}
                    disabled={syncingPost === post.slug}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${post.embeddingStatus.exists ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95'}`}
                  >
                    {syncingPost === post.slug ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        Syncing...
                      </span>
                    ) : post.embeddingStatus.exists ? 'Refresh' : 'Generate'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length > postsPerPage && (
              <tr>
                <td colSpan={5} className="px-8 py-4 bg-slate-50/50 dark:bg-slate-950/20">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Showing {(postPage - 1) * postsPerPage + 1} - {Math.min(postPage * postsPerPage, filtered.length)} of {filtered.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={postPage === 1}
                        onClick={() => setPostPage(p => Math.max(1, p - 1))}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                          <button
                            key={num}
                            onClick={() => setPostPage(num)}
                            className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${postPage === num ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      <button 
                        disabled={postPage === totalPages}
                        onClick={() => setPostPage(p => Math.min(totalPages, p + 1))}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
