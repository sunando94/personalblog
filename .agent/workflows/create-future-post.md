---
description: Create a future-dated blog post that stays hidden until its release date
---

1. Ask the user for the title, a brief summary, and a **Release Date** (`DD/MM/YYYY` or `YYYY-MM-DD`). 
2. If the user doesn't provide a release date, prompt them again, explaining that this date determines when the post becomes visible on the site.
3. Generate a URL-friendly slug based on the title.
4. Determine the current creation date in `YYYY-MM-DD` format.
5. Create a new markdown file in `/_posts/[slug].md`.
6. Populate the file with the template below. Ensure the content follows the **Human-Centric Tone** and **Complexity Ramping** rules in `.agent/docs/blog_post_guidelines.md`.

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
releaseDate: "[Release Date]"
---

# [Post Title]

Start writing your post here...
```

7. Open the newly created file for the user to edit.
8. Remind the user:
   - The post will be **hidden** from the UI until the `releaseDate` is reached.
   - Add a cover image to `/public/assets/blog/[slug]/cover.png` (exact resolution: **1300x731**).
   - Follow the **Zero to Hero** complexity rule.
   - Use numbered lists instead of bullet points.
