import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "redis";

async function listKeys() {
  const redis = createClient({ url: process.env.storage_REDIS_URL || process.env.REDIS_URL || "" });
  await redis.connect();
  const keys = await redis.keys("*notification*");
  console.log("Notification Keys:", keys);
  const mcpKeys = await redis.keys("mcp_*");
  console.log("MCP Keys:", mcpKeys);
  await redis.disconnect();
}
listKeys().catch(console.error);
