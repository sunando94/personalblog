
"use client";

import { useState } from "react";
import Link from "next/link";

interface Project {
  title: string;
  description: string;
  tags: string[];
  link: string;
  techStackDetailed?: string[];
  challenge?: string;
  solution?: string;
}

export function ProjectCard({ project }: { project: Project }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="group relative p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 block h-full flex flex-col">
        <div className="mb-4 flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold group-hover:text-blue-600 transition-colors flex items-center gap-2">
              <Link href={project.link} className={project.link !== "#" ? "hover:underline" : ""}>
                {project.title}
              </Link>
              {project.link !== "#" && (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
              )}
            </h3>
          </div>
          
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            {project.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] uppercase font-bold tracking-wider text-gray-500 bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* View Architecture Button */}
        <button
          onClick={() => setIsOpen(true)}
          className="mt-4 w-full py-2 text-xs font-bold uppercase tracking-widest text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-100 dark:border-blue-900/30"
        >
          View Architecture
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-slate-700 overflow-hidden relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-100 dark:bg-slate-800 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <div className="p-8">
              <h3 className="text-2xl font-black mb-1 text-gray-900 dark:text-white">{project.title}</h3>
              <p className="text-sm text-gray-500 font-medium mb-6">Architectural Deep Dive</p>

              <div className="space-y-6">
                {project.challenge && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-red-500"></span> The Challenge
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20">
                      {project.challenge}
                    </p>
                  </div>
                )}

                {project.solution && (
                   <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-green-600 mb-2 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-green-500"></span> The Solution
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/20">
                      {project.solution}
                    </p>
                  </div>
                )}

                {project.techStackDetailed && (
                   <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-blue-500"></span> Tech Stack
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {project.techStackDetailed.map(tech => (
                        <span key={tech} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                {project.link !== "#" && (
                   <Link 
                     href={project.link}
                     className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full transition-colors"
                   >
                     Read Implementation Guide
                   </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
