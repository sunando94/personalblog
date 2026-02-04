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
releaseDate: "YYYY-MM-DD" or "DD/MM/YYYY" # Optional: Post remains hidden until this date
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
- **Header Hierarchy**: Use `#` for the main title at the top of the body (must match the frontmatter title). Use `##` for main sections and `###` for sub-sections. Do not use `####` unless absolutely necessary, as it can look flat.
- **No Bullet Points**: Avoid using `*` or `-` for lists. If a list is required, use numbered lists (`1.`, `2.`, `3.`) or integrate the points into the narrative text.
- **Nested Code Blocks**: If you need to show code that contains other code blocks (common in prompt engineering posts), use quadruple backticks (````) for the outer block and triple backticks (```) for the inner blocks.
- **Syntax Highlighting**: Always specify the language for syntax highlighting (e.g., ` ```typescript ` or ` ```python `).
- **Images**: Reference images stored in `/public/assets/blog/SLUG/`.
- **Mermaid Diagrams**: Support for Mermaid diagrams is available (used for technical explanations).
- **Internal Links**: Use relative paths for linking to other posts.
- **Audience & Complexity Ramping**:
  - **Implicit Technical Target**: While the target audience remains experienced senior technical leaders (Architects, Staff/Principal Engineers), **do not explicitly mention these roles in the text**. Let the depth of the content, code, and diagrams speak for themselves.
  - **Progressive Difficulty (Zero to Hero)**: Every post must follow a "Zero to Hero" mental model. Start the post with a simple, high-level introduction accessible to a new graduate (e.g., using broad analogies). As the reader progresses through the document, the complexity must steadily ramp up, ending with deep technical rigor.
  - **Technical Depth**: By the middle and end of the post, include rigorous technical details, complex Mermaid charts, and mathematical formulas (using proper formatting) to satisfy senior technical leadership.
- **Word Count & Comprehensiveness**:
  - **Length**: Each post must be between **500 and 1500 lines** long. Should not include code in the linecount.
  - **Extreme Detail**: Posts must be as detailed as possible. Do not skip steps or gloss over complexities. Principal engineers value the "how" and "why" behind every decision.
  - **Code Mandatory**: Always include code blocks showing actual, production-ready implementations for the concepts discussed. Use these code blocks to ground the theoretical discussion in reality.

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
6. [ ] Header hierarchy followed (# for title, ## for sections).
7. [ ] No bullet points (use 1, 2, 3 instead).
