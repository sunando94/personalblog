import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
// @ts-ignore
import { pushToGithub } from "../../../../scripts/generate-post.mjs";
import { getTokenPayload } from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const payload = await getTokenPayload(authHeader);

  if (!payload || payload.scope !== "writer") {
    return NextResponse.json({ 
      error: "FORBIDDEN", 
      message: "You do not have permission to commit to the repository. Only Authorized Writers can perform this action." 
    }, { status: 403 });
  }

  try {
    const { content, fileName } = await req.json();

    if (!content || !fileName) {
      return NextResponse.json({ error: "Content and fileName are required" }, { status: 400 });
    }

    const postsDir = path.join(process.cwd(), "_posts");
    const filePath = path.join(postsDir, fileName);

    // Save locally
    try {
      await fs.writeFile(filePath, content);
      console.log(`Committed post locally: ${filePath}`);
    } catch (e: any) {
      if (e.code === 'EROFS' || e.message.includes('read-only')) {
        console.warn("Local filesystem is read-only. Relying on GitHub push.");
      } else {
        throw e;
      }
    }

    // Push to GitHub if token available
    if (process.env.GITHUB_TOKEN) {
      await pushToGithub(content, `_posts/${fileName}`);
    }

    return NextResponse.json({ success: true, message: "Changes committed to repository." });
  } catch (err: any) {
    console.error("Commit Error:", err);
    return NextResponse.json({ error: "COMMIT_FAILED", message: err.message }, { status: 500 });
  }
}
