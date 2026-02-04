"use client";

import { useState } from "react";
import { Post } from "@/interfaces/post";
import { PostListPreview } from "./post-list-preview";

type Props = {
    allPosts: Post[];
};

export function PaginatedPostList({ allPosts }: Props) {
    const [currentPage, setCurrentPage] = useState(1);
    const [postsPerPage, setPostsPerPage] = useState(5);

    const totalPages = Math.ceil(allPosts.length / postsPerPage);
    const indexOfLastPost = currentPage * postsPerPage;
    const indexOfFirstPost = indexOfLastPost - postsPerPage;
    const currentPosts = allPosts.slice(indexOfFirstPost, indexOfLastPost);

    const paginate = (pageNumber: number) => {
        setCurrentPage(pageNumber);
        // Smooth scroll to top of the content area
        const contentElement = document.getElementById("post-list-top");
        if (contentElement) {
            contentElement.scrollIntoView({ behavior: "smooth" });
        } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handlePostsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPostsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    return (
        <div>
            <div id="post-list-top" className="scroll-mt-24" />
            <div className="flex flex-col gap-8 mb-16">
                {currentPosts.map((post) => (
                    <div
                        key={post.slug}
                        className="group bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600"
                    >
                        <PostListPreview
                            title={post.title}
                            coverImage={post.coverImage}
                            date={post.date}
                            author={post.author}
                            slug={post.slug}
                            excerpt={post.excerpt}
                        />
                    </div>
                ))}
            </div>

            {allPosts.length > 5 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-8 border-t border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 rounded-xl px-6 mb-20">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Items per page
                        </span>
                        <div className="relative">
                            <select
                                id="postsPerPage"
                                value={postsPerPage}
                                onChange={handlePostsPerPageChange}
                                className="appearance-none bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-4 pr-10 py-2 transition-all duration-200 cursor-pointer shadow-sm hover:border-gray-400 dark:hover:border-slate-500"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <nav className="flex items-center gap-2" aria-label="Pagination">
                        <button
                            onClick={() => paginate(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 text-gray-500 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 group"
                            title="Previous Page"
                        >
                            <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className="flex items-center gap-1.5 mx-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                                <button
                                    key={number}
                                    onClick={() => paginate(number)}
                                    className={`min-w-[40px] h-10 px-3 flex items-center justify-center text-sm font-semibold rounded-lg transition-all duration-200 ${currentPage === number
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/40"
                                            : "text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400"
                                        }`}
                                >
                                    {number}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 text-gray-500 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 group"
                            title="Next Page"
                        >
                            <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </nav>
                </div>
            )}
        </div>
    );
}
