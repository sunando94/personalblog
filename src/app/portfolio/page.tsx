
import Container from "@/app/_components/container";
import { Metadata } from "next";
import Link from "next/link";
import { ProjectCard } from "@/app/_components/project-card";

export const metadata: Metadata = {
  title: "Portfolio | Sunando Bhattacharya",
  description: "Principal Software Engineer & AI Specialist. Expert in Databricks, Apache Spark, RAG, and Agentic Workflows.",
};

export default function Portfolio() {
  const skills = [
    "Generative AI & LLMs",
    "Agentic Workflows",
    "Principal Engineering",
    "Data Engineering",
    "Databricks & Spark",
    "Snowflake Data Cloud",
    "Kubernetes & Operators",
    "Apache Kafka",
    "Scala & Python",
    "System Design",
    "AWS Cloud",
    "RAG Architecture",
  ];

  const projects = [
    {
      title: "Production RAG Engine",
      description: "Built a high-scale hybrid retrieval system using Reciprocal Rank Fusion, combining BM25 and Vector Search for precise enterprise knowledge retrieval.",
      tags: ["RAG", "Vector Search", "Gemini", "Pinecone"],
      link: "/posts/production-rag-master-class-the-final-blueprint",
      techStackDetailed: [
        "Python 3.10", "LangChain", "OpenAI Embeddings", "Pinecone Vector DB", "PostgreSQL (pgvector)", "Reciprocal Rank Fusion", "FastAPI"
      ],
      challenge: "Standard vector search was failing on domain-specific keyword queries (e.g., 'Error 503'), leading to hallucinations.",
      solution: "Implemented a Hybrid Search architecture that fuses dense vector retrieval with sparse keyword search (BM25), re-ranked by a Cross-Encoder model. Improved top-5 retrieval accuracy by 40%."
    },
    {
      title: "Agentic Code Studio",
      description: "Developed an autonomous multi-agent coding assistant capable of planning, writing, and reviewing code with human-in-the-loop oversight.",
      tags: ["AI Agents", "Anthropic", "Python", "Tool Use"],
      link: "/posts/mastering-agentic-workflows-taking-your-ai-development-to-the-next-level",
      techStackDetailed: [
        "Anthropic Claude 3.5 Sonnet", "Custom Tool Defs (MCP)", "Next.js 14", "Python Backend", "WebSockets"
      ],
      challenge: "Single-turn LLM interactions were insufficient for complex, multi-file software engineering tasks.",
      solution: "Designed a Planner-Executor-Reviewer agent workflow. The Planner decomposes tasks, the Executor uses file system tools to write code, and the Reviewer runs lint/test checks before committing."
    },
    {
      title: "Databricks Migration Suite",
      description: "Led the architectural migration of legacy on-demand clusters and EMR workloads to optimized Databricks Unity Catalog environments.",
      tags: ["Databricks", "Spark", "Cloud Migration", "Scala"],
      link: "#", 
      techStackDetailed: [
        "Scala 2.12", "Apache Spark 3.3", "Delta Lake", "Unity Catalog", "AWS EMR", "Terraform"
      ],
      challenge: "Client was facing 4-hour SLA breaches daily due to unoptimized legacy Hive jobs running on transient EMR clusters.",
      solution: "Re-architected the pipeline to use Databricks Photon engine and Delta Lake. Implemented Z-Ordering for faster data skipping, reducing runtime by 65% and costs by 40%."
    },
    {
      title: "CDC Framework",
      description: "Pioneered a Change Data Capture (CDC) framework for event-driven architectures using Apache Kafka and Spark Structured Streaming.",
      tags: ["Kafka", "Streaming", "Event-Driven", "Java"],
      link: "#",
      techStackDetailed: [
        "Apache Kafka", "Spark Structured Streaming", "Java 11", "Debezium", "Avro Schema Registry"
      ],
      challenge: "Batch ETL jobs were delivering data with T-1 latency, making real-time fraud detection impossible.",
      solution: "Built a real-time CDC pipeline using Debezium and Kafka. Consumed streams via Spark Structured Streaming with micro-batch processing (500ms trigger), enabling sub-second data freshness."
    }
  ];

  const experience = [
    {
      role: "Principal Software Engineer",
      company: "Red Hat",
      period: "Apr 2024 - Present",
      description: "Leading data engineering initiatives and architectural patterns for enterprise hybrid cloud solutions. Driving technical strategy for scalable data platforms.",
    },
    {
      role: "Lead Data Engineer",
      company: "Databricks",
      period: "2021 - 2024",
      description: "Specialized in migrating Fortune 500 clients from legacy Hadoop/EMR to the Databricks Lakehouse. expert in Spark optimization, Unity Catalog, and Delta Lake implementations.",
    },
    {
      role: "Data Engineer",
      company: "JPMorgan Chase & Co.",
      period: "2019 - 2021",
      description: "Engineered robust financial data pipelines handling petabyte-scale transactions. Implemented strict governance and security controls for banking data.",
    },
    {
      role: "Application Development Analyst",
      company: "Accenture",
      period: "2016 - 2019",
      description: "Delivered big data solutions for Nordic financial institutions. Focused on KYC application development and real-time customer analytics using Hadoop ecosystem.",
    },
  ];

  return (
    <main className="pb-20 pt-10">
      <Container>
        {/* HERO SECTION */}
        <section className="mb-20 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 space-y-6">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent pb-2">
              Engineering Intelligence.
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
              I'm Sunando, a <strong>Principal Software Engineer at Red Hat</strong>. I define the architecture for massive data systems and build the next generation of AI-powered applications.
            </p>
            <div className="flex gap-4 pt-4">
              <a
                href="https://www.linkedin.com/in/sb1994/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-[#0077b5] hover:bg-[#006097] text-white rounded-full font-bold transition-all shadow-lg hover:shadow-blue-500/25 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                Connect on LinkedIn
              </a>
              <Link
                href="/posts"
                className="px-8 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-full font-bold transition-all"
              >
                Read My Engineering Blog
              </Link>
            </div>
          </div>
        </section>

        <hr className="border-neutral-200 dark:border-slate-800 mb-20" />

        {/* SKILLS */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <span className="w-8 h-1 bg-blue-600 rounded-full"></span>
            Technical Expertise
          </h2>
          <div className="flex flex-wrap gap-3">
            {skills.map((skill) => (
              <span
                key={skill}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-semibold border border-transparent hover:border-blue-500 transition-colors cursor-default"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>

        {/* PROJECTS */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <span className="w-8 h-1 bg-purple-600 rounded-full"></span>
            Engineering Highlights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {projects.map((project, idx) => (
              <ProjectCard key={idx} project={project} />
            ))}
          </div>
        </section>

        {/* EXPERIENCE */}
        <section>
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <span className="w-8 h-1 bg-pink-600 rounded-full"></span>
            Career History
          </h2>
          <div className="space-y-12 max-w-4xl">
            {experience.map((exp, idx) => (
              <div key={idx} className="relative pl-8 md:pl-0">
                
                <div className="md:grid md:grid-cols-[200px_1fr] md:gap-8">
                  <div className="hidden md:block text-right pt-1">
                     <div className="text-sm font-extrabold text-blue-600 uppercase tracking-widest">{exp.period}</div>
                     <div className="text-xs font-bold text-gray-400 mt-1">{exp.company}</div>
                  </div>

                  <div className="relative pl-8 md:pl-8 border-l-2 border-gray-200 dark:border-slate-800 pb-2">
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-950 border-2 border-blue-600"></div>
                    
                    {/* Mobile Only Header */}
                    <div className="md:hidden mb-2">
                      <div className="text-sm font-extrabold text-blue-600 uppercase tracking-widest">{exp.period}</div>
                      <div className="text-xs font-bold text-gray-400">{exp.company}</div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{exp.role}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                      {exp.description}
                    </p>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
