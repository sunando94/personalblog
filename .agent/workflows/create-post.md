---
description: Create a new blog post with standard frontmatter
---

1. Ask the user for the title and a brief summary of the new post.
2. Generate a URL-friendly slug based on the title.
3. Determine the current date in `YYYY-MM-DD` format.
4. Create a new markdown file in `/_posts/[slug].md`.
5. Populate the file with the template below, ensuring any generated content (like the excerpt or initial paragraphs) follows the **Human-Centric Tone** defined in `.agent/docs/blog_post_guidelines.md`.

```markdown
---
title: "[Post Title]"
date: "[Current Date]"
excerpt: "[Brief Summary]"
coverImage: "/assets/blog/[slug]/cover.png"
author:
  name: Sunando Bhattacharya
  picture: "/assets/blog/authors/sunando-bhattacharya.jpeg"
ogImage:
  url: "/assets/blog/[slug]/cover.png"
---

# [Post Title]

Start writing your post here...
```

6. Open the newly created file for the user to edit.
7. Remind the user of the following:
   - Add a cover image to `/public/assets/blog/[slug]/cover.png`.
   - The image MUST be exactly **1300x731** pixels.
   - Use numbered lists (`1, 2, 3`) instead of bullet points (`*` or `-`).
   - Use `#` for the main title in the post body.
