# Project Context: Personal Blog

This project is a high-performance, aesthetically pleasing personal blog built with the modern Next.js stack.

## Tech Stack
- **Framework**: [Next.js 14+ (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Content Management**: Sub-directory based Markdown (`/_posts`)
- **Markdown Processing**: `remark`, `remark-rehype`, `rehype-highlight`, `rehype-stringify`, `gray-matter`
- **Dynamic AI Features**: 
  - Dynamic Title/Intro generation using Gemini/OpenAI/Anthropic.
  - 25-hour caching for AI-generated content.
- **Social Integration**: LinkedIn profile fetching.

## Project Structure
- `/_posts/`: Markdown files for blog posts.
- `/src/app/`: App router pages and components.
  - `/_components/`: UI components (Intro, Header, PostPreview, etc.).
  - `/api/`: API routes for LinkedIn and AI generation.
  - `/posts/[slug]/`: Individual post pages.
  - `/posts/`: Vertical/Horizontal list view of all posts.
- `/src/lib/`: Core logic, API clients, and Markdown utilities.
- `/src/interfaces/`: TypeScript types and interfaces.
- `/public/`: Static assets (images, fonts).

## Key Workflows
- **Writing Posts**: Add a new `.md` file to `/_posts/` with the required frontmatter.
- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Deploy**: Static generation (SSG) supported.

## Design & Writing Philosophy
- **Rich Aesthetics**: Dark mode support, modern typography (Inter/system), and subtle animations.
- **Human-Centric Content**: Every post must read as though it was written by a human expert, not an AI. This means using personal analogies, varying sentence structure, and avoiding robotic transition phrases.
- **Performance**: Static generation ensures lightning-fast load times.
- **AI-Enhanced**: The blog is not just static; it feels "alive" with AI-driven headers.
