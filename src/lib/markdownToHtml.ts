import { remark } from "remark";
import html from "remark-html";
import gfm from "remark-gfm";

export default async function markdownToHtml(markdown: string) {
  const result = await remark()
    .use(gfm)
    .use(html, { sanitize: false }) // Sanitize false is needed for mermaid divs if they aren't standard 
    .process(markdown);
  return result.toString();
}
