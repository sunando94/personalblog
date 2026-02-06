import { GoogleGenerativeAI } from "@google/generative-ai";
import { getPool } from "./db";
import { getAllPostsIncludingScheduled } from "./api";
import crypto from "crypto";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "");
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

export class EmbeddingService {
  /**
   * Generates a hash for the post content to track changes
   */
  private static generateHash(content: string): string {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  /**
   * Returns the embedding status for all posts
   */
  static async getEmbeddingStatus(): Promise<Record<string, { exists: boolean; hash: string; updatedAt: string | null }>> {
    const pool = await getPool();
    const res = await pool.query("SELECT slug, content_hash, updated_at FROM post_embeddings");
    const status: Record<string, { exists: boolean; hash: string; updatedAt: string | null }> = {};
    
    res.rows.forEach(row => {
      status[row.slug] = {
        exists: true,
        hash: row.content_hash,
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
      };
    });
    
    return status;
  }

  /**
   * Chunks content with context awareness (prepends title and section context)
   */
  private static chunkContent(title: string, content: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    const sections = content.split(/\n(?=#{1,6}\s)/); // Split by headers
    let currentChunk = `DOCUMENT: ${title}\n\n`;
    
    for (const section of sections) {
      const sectionText = section.trim();
      if ((currentChunk.length + sectionText.length) <= chunkSize) {
        currentChunk += sectionText + "\n\n";
      } else {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        
        // Handle oversized sections by force splitting
        if (sectionText.length > chunkSize) {
          let remaining = sectionText;
          while (remaining.length > 0) {
            chunks.push(`DOCUMENT: ${title}\n\n${remaining.substring(0, chunkSize)}`);
            remaining = remaining.substring(chunkSize - overlap);
            if (remaining.length <= overlap) break;
          }
        } else {
          currentChunk = `DOCUMENT: ${title}\n\n${sectionText}\n\n`;
        }
      }
    }
    
    if (currentChunk.trim() && !chunks.includes(currentChunk.trim())) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Syncs a single post and its chunks by slug
   */
  static async syncSinglePost(slug: string): Promise<{ success: boolean; message: string }> {
    try {
      const { getPostBySlug } = await import("./api");
      const post = getPostBySlug(slug);
      if (!post) throw new Error("Post not found");

      const fullContent = `${post.title}\n${post.excerpt}\n${post.content}`;
      const contentHash = this.generateHash(fullContent);

      const pool = await getPool();
      const existing = await pool.query(
        "SELECT content_hash FROM post_embeddings WHERE slug = $1",
        [slug]
      );

      // Skip if hash matches
      // if (existing.rows.length > 0 && existing.rows[0].content_hash === contentHash) {
      //   return { success: true, message: `Skipped ${slug} (no changes)` };
      // }

      console.log(`🧠 [EmbeddingService] Generating global embedding for ${slug}...`);
      const globalResult = await embeddingModel.embedContent({
        content: { parts: [{ text: fullContent.substring(0, 5000) }] },
        outputDimensionality: 768
      } as any);
      const globalVectorStr = `[${globalResult.embedding.values.join(",")}]`;

      // Update global entry
      await pool.query(
        `INSERT INTO post_embeddings (slug, content_hash, embedding) 
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET 
         content_hash = $2, embedding = $3, updated_at = CURRENT_TIMESTAMP`,
        [slug, contentHash, globalVectorStr]
      );

      // Handle Chunks
      console.log(`✂️ [EmbeddingService] Chunking and embedding ${slug}...`);
      const chunks = this.chunkContent(post.title, post.content);
      
      // Clear old chunks
      await pool.query("DELETE FROM post_chunks WHERE slug = $1", [slug]);

      for (let i = 0; i < chunks.length; i++) {
        const chunkRes = await embeddingModel.embedContent({
          content: { parts: [{ text: chunks[i] }] },
          outputDimensionality: 768
        } as any);
        const chunkVectorStr = `[${chunkRes.embedding.values.join(",")}]`;
        
        await pool.query(
          "INSERT INTO post_chunks (slug, chunk_index, content, embedding, metadata) VALUES ($1, $2, $3, $4, $5)",
          [slug, i, chunks[i], chunkVectorStr, JSON.stringify({ title: post.title, slug: post.slug })]
        );
        
        // Rate limit protection
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 500));
      }

      return { success: true, message: `Successfully indexed ${slug} with ${chunks.length} chunks` };
    } catch (err: any) {
      console.error(`❌ [EmbeddingService] Error indexing ${slug}:`, err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * Syncs all blog posts to the vector database
   */
  static async syncAllPosts(): Promise<{ processed: number; updated: number; errors: number }> {
    const posts = getAllPostsIncludingScheduled();
    let processed = 0;
    let updated = 0;
    let errors = 0;

    console.log(`🚀 [EmbeddingService] Starting hybrid sync for ${posts.length} posts...`);

    for (const post of posts) {
      const res = await this.syncSinglePost(post.slug);
      processed++;
      if (res.success) {
        if (!res.message.includes("Skipped")) updated++;
      } else {
        errors++;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return { processed, updated, errors };
  }

  /**
   * Performs Hybrid Search (Semantic + BM25-like) with LLM Reranking
   */
  static async search(query: string, limit: number = 3): Promise<any[]> {
    try {
      console.log(`🔍 [EmbeddingService] Hybrid Search for: "${query}"`);
      
      // 1. Vector Search
      const result = await embeddingModel.embedContent({
        content: { parts: [{ text: query }] },
        outputDimensionality: 768
      } as any);
      const vectorStr = `[${result.embedding.values.join(",")}]`;

      const pool = await getPool();
      
      // Combine Vector and FTS results using a weighted score
      // Vector range: 0 (near) to 2 (far). Score: 1 - (dist/2) -> [0, 1]
      // FTS rank range: [0, inf]. Normalized rank: rank / (rank + 1) -> [0, 1]
      const searchRes = await pool.query(
        `WITH vector_matches AS (
           SELECT slug, content, 1 - (embedding <=> $1) as semantic_score, metadata
           FROM post_chunks
           ORDER BY embedding <=> $1 ASC
           LIMIT 15
         ),
         lexical_matches AS (
           SELECT slug, content, ts_rank_cd(fts, plainto_tsquery('english', $2)) as lexical_score, metadata
           FROM post_chunks
           WHERE fts @@ plainto_tsquery('english', $2)
           ORDER BY lexical_score DESC
           LIMIT 15
         )
         SELECT 
           COALESCE(v.slug, l.slug) as slug, 
           COALESCE(v.content, l.content) as content,
           COALESCE(v.metadata, l.metadata) as metadata,
           (COALESCE(v.semantic_score, 0) * 0.7 + COALESCE(l.lexical_score, 0) * 0.3) as combined_score
         FROM vector_matches v
         FULL OUTER JOIN lexical_matches l ON v.slug = l.slug AND v.content = l.content
         ORDER BY combined_score DESC
         LIMIT 10`,
        [vectorStr, query]
      );

      if (searchRes.rows.length === 0) return [];

      // 2. Reranking using LLM
      console.log(`⚖️ [EmbeddingService] Reranking ${searchRes.rows.length} candidates...`);
      const rerankerModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const candidates = searchRes.rows.map((r, i) => `ID: ${i}\nTITLE: ${r.metadata?.title}\nCONTENT: ${r.content.substring(0, 300)}...`).join("\n\n---\n\n");
      
      const rerankPrompt = `You are a specialized RAG Reranker.
Task: Evaluate the following chunks based on their relevance to the USER QUERY.
User Query: "${query}"

Candidates:
${candidates}

Respond with only a JSON array of IDs in order of relevance (most relevant first).
Example: [2, 0, 5]`;

      try {
        const rerankResult = await rerankerModel.generateContent(rerankPrompt);
        const text = rerankResult.response.text();
        const orderedIdsMatched = text.match(/\[(\d+,\s*)*\d+\]/);
        if (orderedIdsMatched) {
           const orderedIds = JSON.parse(orderedIdsMatched[0]);
           const reranked = orderedIds.slice(0, limit).map((id: number) => {
             const row = searchRes.rows[id];
             return {
               slug: row.slug,
               title: row.metadata?.title,
               content: row.content,
               score: row.combined_score
             };
           });
           return reranked;
        }
      } catch (rerankErr) {
        console.error("Reranking failed, falling back to hybrid scores", rerankErr);
      }

      // Fallback to top hybrid matches
      return searchRes.rows.slice(0, limit).map(row => ({
        slug: row.slug,
        title: row.metadata?.title,
        content: row.content,
        score: row.combined_score
      }));

    } catch (err: any) {
      console.error("❌ [EmbeddingService] Search error:", err.message);
      return [];
    }
  }
}
