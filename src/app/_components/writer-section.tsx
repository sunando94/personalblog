import Link from "next/link";

export function WriterSection() {
  return (
    <section className="relative my-24 p-8 md:p-12 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-3xl overflow-hidden group shadow-2xl shadow-blue-500/5">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] animate-pulse"></div>
      
      <div className="relative grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest">
            Neural Workshop
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-[1.1] text-slate-900 dark:text-white">
            Automate your <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Digital Persona.</span>
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
            Our multi-agent pipeline generates, reviews, and SEO-optimizes your blog posts in seconds. 
            Experience high-fidelity writing powered by local GPU inference.
          </p>
          
          <div className="flex flex-wrap gap-4 pt-4">
            <Link 
              href="/admin" 
              className="px-8 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black font-extrabold shadow-xl hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
            >
              Admin Central
            </Link>
            <Link 
              href="/browser-writer" 
              className="px-8 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-extrabold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm uppercase tracking-widest"
            >
              Neural Studio
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <WriterFeature 
            title="MCP Server" 
            desc="Connect your local IDE to our blog engine via Model Context Protocol."
            icon="🔌"
          />
          <WriterFeature 
            title="Local GPU" 
            desc="Run privacy-first local inference directly in your browser using WebGPU."
            icon="🏎️"
          />
          <WriterFeature 
            title="Git Ops" 
            desc="Automated PR creation and branching for seamless review."
            icon="🌿"
          />
          <WriterFeature 
            title="OAuth2" 
            desc="Secure token-based access with industry standard authentication."
            icon="🛡️"
          />
        </div>
      </div>
    </section>
  );
}

function WriterFeature({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:border-blue-500/30 transition-all group/feature">
      <div className="text-3xl mb-4 group-hover/feature:scale-125 transition-transform duration-300 transform-gpu origin-left">{icon}</div>
      <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
