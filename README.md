# ✍️ Personal Blog - AI-Enhanced & Statically Generated

A modern, high-performance personal blog built with **Next.js 15**, **TypeScript**, and **Tailwind CSS**. This blog leverages static generation for speed while incorporating dynamic AI features for a personalized touch.

## ✨ Key Features

- **🚀 Performance-First**: Built with Next.js App Router and Static Site Generation (SSG) for near-instant page loads.
- **🤖 AI Title Generation**: Dynamically generates catchy headers and intros using Gemini, OpenAI, or Anthropic (with 25-hour caching).
- **🔗 LinkedIn Integration**: Automatically fetches and displays professional profile data.
- **📝 Markdown-Powered**: Write posts in standard Markdown with support for:
  - Syntax highlighting via `rehype-highlight`.
  - GitHub Flavored Markdown (GFM).
  - Mermaid diagrams for technical illustrations.
- **🌓 Dark Mode**: Fully responsive design with seamless dark mode support.
- **📱 List View**: Dedicated horizontal list view for browsing all posts efficiently.

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Content**: Markdown (processed with `remark`, `rehype`, and `gray-matter`)
- **Icons**: [Heroicons](https://heroicons.com/)

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone <repository-url>
cd personalblog
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and configure your API keys:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SITE_URL`: Your blog's URL (e.g., `http://localhost:3000`).
- (Optional) `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for AI title generation.

### 3. Run Locally

```bash
npm run dev
```

The blog will be available at [http://localhost:3000](http://localhost:3000).

## 📁 Project Structure

```text
├── _posts/           # Blog posts in Markdown (.md)
├── public/           # Static assets (images, favicons)
├── src/
│   ├── app/          # Next.js App Router (pages and API routes)
│   ├── _components/  # Reusable UI components
│   ├── lib/          # Shared utility logic (markdown, API clients)
│   ├── interfaces/   # TypeScript type definitions
│   └── styles/       # Global CSS and Tailwind styles
├── scripts/          # Helper scripts for automation
└── .agent/           # AI Assistant workflows and documentation
```

## 🛠 Automation Scripts

- **Fetch LinkedIn Picture**: You can automatically update your profile picture from LinkedIn using:
  ```bash
  node scripts/fetch-linkedin-picture.js
  ```
  *(Requires `LINKPREVIEW_API_KEY` in `.env.local` for best results, or fallback to public scraping).*

## ✍️ Writing Posts

New posts are stored in the `/_posts` directory. Each file requires a specific frontmatter format:

```markdown
---
title: "Your Post Title"
excerpt: "A brief summary of your post"
coverImage: "/assets/blog/your-image.jpg"
date: "2024-03-20T05:35:07.322Z"
author:
  name: "Your Name"
  picture: "/assets/blog/authors/your-pic.jpg"
ogImage:
  url: "/assets/blog/your-image.jpg"
---
Your markdown content here...
```

> **Tip**: If you're using Antigravity, you can use the `/create-post` workflow to quickly scaffold a new post.

## 🚢 Deployment

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub.
2. Import the project in Vercel.
3. Configure your Environment Variables.
4. Deploy!

---

Built with ❤️ by [Sunando](https://github.com/sunando94)
