import { remark } from "remark";
import gfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";

export default async function markdownToHtml(markdown: string) {
  const result = await remark()
    .use(gfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeHighlight, { ignoreMissing: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);
  return result.toString();
}
