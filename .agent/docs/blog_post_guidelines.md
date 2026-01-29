# Blog Post Guidelines

When writing or editing blog posts for this project, follow these standards to maintain consistency and quality.

## File Location
- All posts must be stored in `/_posts/` as `.md` files.
- The filename should be the slug (e.g., `my-awesome-post.md`).

## Frontmatter Requirements
Each post must contain a YAML frontmatter block with the following fields:

```yaml
---
title: "The Main Title of the Post"
date: "YYYY-MM-DD"
excerpt: "A brief 1-2 sentence summary of the post."
coverImage: "/assets/blog/SLUG/cover.png"
author:
  name: Sunando Bhattacharya
  picture: "/assets/blog/authors/sunando-bhattacharya.jpeg"
ogImage:
  url: "/assets/blog/SLUG/cover.png"
---
```

## Content Standards & Tone
- **Human-Centric Tone**: The writing must sound like a human expert sharing knowledge, not an AI summarizing facts.
- **Conversational & Relatable**: Use a first-person perspective ("I", "we"). Incorporate relatable analogies and real-world examples (e.g., the "pizza vs. sushi" analogy for streaming).
- **Sentence Variety**: Mix short, punchy sentences with longer, descriptive ones to create a natural reading rhythm.
- **Avoid "AI-isms"**: Do not use common AI transition words or structural clichés (e.g., "In the rapidly evolving landscape...", "It is important to note...", "In conclusion").
- **No Emojis**: Do not use emojis anywhere in the post content or frontmatter. They often signal AI-generated text and can distract from the technical depth.
- **No `<em>` or Excessive Italics**: Do not use `*italics*` or `_italics_` for emphasis (the `em` tag). Use bolding sparsely or let the sentence structure provide the emphasis.
- **Direct Engagement**: Address the reader as "you" and pose occasional rhetorical questions to maintain interest.
- **Formatting**: Use Markdown headers (`##`, `###`) for structure.
- **Code Snippets**: Always specify the language for syntax highlighting (e.g., ` ```typescript `).
- **Images**: Reference images stored in `/public/assets/blog/SLUG/`.
- **Mermaid Diagrams**: Support for Mermaid diagrams is available (used for technical explanations).
- **Internal Links**: Use relative paths for linking to other posts.

## AI & Image Generation
### Header Images
When generating cover images for blog posts, follow these strict rules:
- **Exact Size**: Images must be generated at exactly **1300x731** pixels (to match the 16:9 aspect-video container perfectly).
- **Natural Aesthetic**: Avoid the "polished AI" look. Images should look like professional photography, hand-drawn illustrations, or realistic digital art.
- **Style Constraints**: 
  - **No Futuristic Overload**: Do not default to neon, sci-fi, or "high-tech" futuristic themes unless explicitly requested.
  - **Realistic Textures**: Favor organic textures, real-world lighting, and natural settings. 
  - **Human Feel**: The imagery should complement the "human-centric" writing tone—warm, relatable, and grounded.

### Post Content
The blog uses an API to generate dynamic intros and titles. Ensure the main title in the frontmatter is descriptive enough for the AI to understand the context and generate a catchy header.

## Checklist before finishing
1. [ ] Correct date format (YYYY-MM-DD).
2. [ ] Excerpt is concise.
3. [ ] All images have correct paths.
4. [ ] Code blocks have language tags.
5. [ ] Mermaid diagrams (if any) are valid.
