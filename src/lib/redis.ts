import { createClient } from "redis";

const REDIS_URL = process.env.storage_REDIS_URL || process.env.REDIS_URL;

let redisClient: any = null;
let redisAvailable = true;

/**
 * Singleton Redis connection
 */
export async function getRedis() {
  if (!redisAvailable) return null;
  if (!redisClient && REDIS_URL) {
    try {
      redisClient = createClient({ url: REDIS_URL });
      redisClient.on("error", (err: any) => {
        console.error("Redis Client Error", err);
        redisAvailable = false;
        redisClient = null;
      });
      await redisClient.connect();
    } catch (err) {
      console.error("Failed to connect to Redis", err);
      redisAvailable = false;
      redisClient = null;
    }
  }
  return redisClient;
}
