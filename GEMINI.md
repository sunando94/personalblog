# GEMINI.md - Project Context

## Project Overview
This is a personal blog project built with **Next.js**, **TypeScript**, and **Tailwind CSS**. It uses a statically generated approach, where blog posts are written in **Markdown** and stored in the `/_posts` directory.

### Key Technologies:
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Content**: Markdown (processed with `remark`, `remark-html`, and `gray-matter`)
- **AI Integration**: Custom LLM title generation (Gemini, OpenAI, or Anthropic) for header and intro sections.
- **Social Integration**: LinkedIn profile fetching and display.

## Building and Running
- **Development**: `npm run dev` - Starts the development server at [http://localhost:3000](http://localhost:3000).
- **Build**: `npm run build` - Creates an optimized production build.
- **Start**: `npm run start` - Runs the built application in production mode.

## Project Structure
- `/_posts`: Contains the Markdown files for blog posts.
- `/src/app`: Next.js App Router directory.
  - `/_components`: Reusable UI components (Intro, Header, PostPreview, etc.).
  - `/api`: API routes for dynamic functionality (LinkedIn profile, LLM title generation).
  - `/posts/[slug]`: Dynamic route for individual blog post pages.
  - `/posts`: Page listing all blog posts in a list view.
- `/src/lib`: Utility functions and shared logic (API clients, markdown processing).
- `/src/interfaces`: TypeScript interfaces for core data structures (Post, Author).
- `/public`: Static assets (images, favicons).

## Custom Features & Configurations
- **LLM Title Generation**: Dynamic title generation for the header and intro section with a 25-hour cache.
- **LinkedIn Integration**: Fetches profile information via API or scraping fallbacks.
- **Dark Mode Support**: Styled with Tailwind's dark mode capabilities.
- **List View**: A dedicated "All Posts" page (`/posts`) that displays posts in a horizontal list format on larger screens.

## Development Conventions
- **Naming**: Uses PascalCase for components and camelCase for functions/variables.
- **Styling**: Utility-first approach using Tailwind CSS.
- **Data Fetching**: Prefers server-side fetching for static content and client-side fetching for dynamic AI features.
- **Caching**: API responses for LLM titles include `Cache-Control` headers for browser/CDN caching.
