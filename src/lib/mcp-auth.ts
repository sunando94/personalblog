import { createClient } from "redis";
import { put, list, del } from "@vercel/blob";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "mcp_fallback_secret_32_chars_long");
const MASTER_TOKEN = process.env.MCP_MASTER_TOKEN;
// Support both REDIS_URL (local) and storage_REDIS_URL (Railway production)
const REDIS_URL = process.env.storage_REDIS_URL || process.env.REDIS_URL;

// Singleton Redis Client
let redisClient: any = null;
let redisAvailable = true;

// Data Prefixes for Delta Storage (One file per item)
const BLOB_PREFIXES = {
  USERS: "db/users/",
  REFRESH_TOKENS: "db/refresh/",
  AUDIT_LOGS: "db/audit/",
  DELTA_LOG: "db/_delta_log/"
};

export interface ExternalProfile {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  provider: "linkedin" | "github";
  role?: "guest" | "writer" | "admin";
  lastLogin?: string;
}

// --- REDIS HELPERS ---

async function getRedis() {
  if (!redisAvailable) return null;

  if (!redisClient && REDIS_URL) {
    try {
      redisClient = createClient({ url: REDIS_URL });
      redisClient.on("error", (err: any) => {
        console.error("Redis Client Error", err);
        redisAvailable = false;
      });
      await redisClient.connect();
      console.log("✅ Redis connected successfully");
    } catch (err) {
      console.warn("⚠️ Redis unavailable, falling back to Blob-only");
      redisAvailable = false;
      redisClient = null;
    }
  }
  return redisClient;
}

// --- BLOB HELPERS (DELTA MODE) ---

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// Get a single item by ID
async function getBlobItem<T>(prefix: string, id: string): Promise<T | null> {
  const key = `${prefix}${id}`;
  try {
    const { blobs } = await list({ prefix: key, limit: 1, token: BLOB_TOKEN });
    if (blobs.length > 0) {
      const match = blobs[0]; 
      const res = await fetch(match.url);
      if (res.ok) return await res.json();
    }
  } catch (error) {
    console.error(`Failed to fetch blob item ${key}:`, error);
  }
  return null;
}

// Get ALL items in a prefix (Expensive, usage should be limited)
async function getAllBlobItems<T>(prefix: string): Promise<T[]> {
  try {
    const { blobs } = await list({ prefix: prefix, token: BLOB_TOKEN });
    // Fetch in parallel
    const promises = blobs.map(async (b) => {
      const res = await fetch(b.url);
      return res.ok ? await res.json() : null;
    });
    const results = await Promise.all(promises);
    return results.filter(r => r !== null) as T[];
  } catch (error) {
    console.error(`Failed to list blob items ${prefix}:`, error);
    return [];
  }
}

// Save a single item
async function saveBlobItem(prefix: string, id: string, data: any) {
  const key = `${prefix}${id}`;
  console.log(`Writing Blob: ${key}`);
  
  // Fire and forget upload
  put(key, JSON.stringify(data), { access: 'public', addRandomSuffix: false, token: BLOB_TOKEN })
    .catch(err => console.error(`Failed to save blob ${key}:`, err));
    
  // Transaction Log (Delta Lake Pattern)
  if (prefix !== BLOB_PREFIXES.DELTA_LOG) {
      const txId = Date.now().toString().padStart(20, '0'); // Sortable timestamp
      const txData = {
          timestamp: Date.now(),
          operation: 'WRITE',
          path: key,
          id: id
      };
      // Write log entry
      put(`${BLOB_PREFIXES.DELTA_LOG}${txId}.json`, JSON.stringify(txData), { access: 'public', addRandomSuffix: false, token: BLOB_TOKEN })
        .catch(e => console.error("Failed to write delta log", e));
  }
}

// Delete a single item
async function deleteBlobItem(prefix: string, id: string) {
  const key = `${prefix}${id}`;
  try {
    await del(key, { token: BLOB_TOKEN });
    
    // Transaction Log (Delta Lake Pattern)
    if (prefix !== BLOB_PREFIXES.DELTA_LOG) {
        const txId = Date.now().toString().padStart(20, '0');
        const txData = {
            timestamp: Date.now(),
            operation: 'DELETE',
            path: key,
            id: id
        };
        put(`${BLOB_PREFIXES.DELTA_LOG}${txId}.json`, JSON.stringify(txData), { access: 'public', addRandomSuffix: false, token: BLOB_TOKEN })
            .catch(e => console.error("Failed to write delta log", e));
    }
  } catch (err) {
    console.error(`Failed to delete blob - ${key}`, err);
  }
}

/**
 * Industry Standard OAuth2 Token Generation with Audit Tracking
 */
export async function createTokenPair(clientId: string, scope: "guest" | "writer" = "guest") {
  const redis = await getRedis();
  
  const accessToken = await new SignJWT({ sub: clientId, type: "access", scope })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(scope === "guest" ? "1h" : "2h")
    .sign(JWT_SECRET);

  const refreshToken = crypto.randomUUID();
  const expirySeconds = scope === "guest" ? 3600 : 7 * 24 * 60 * 60;
  const expiresAt = Date.now() + expirySeconds * 1000;
  
  // 1. Write to Redis
  if (redis) {
    await redis.set(`mcp_refresh:${refreshToken}`, JSON.stringify({ clientId, scope }), { EX: expirySeconds });
  }

  // 2. Write to Blob (Delta)
  saveBlobItem(BLOB_PREFIXES.REFRESH_TOKENS, refreshToken, { clientId, scope, expiresAt });

  // 3. Audit Log (Delta - use timestamp + random for ID to append)
  const logId = `${Date.now()}-${crypto.randomUUID().slice(0, 4)}`;
  saveBlobItem(BLOB_PREFIXES.AUDIT_LOGS, logId, {
    type: "TOKEN_ISSUED",
    clientId,
    scope,
    timestamp: new Date().toISOString()
  });

  return { accessToken, refreshToken, expiresAt };
}

/**
 * Creates a token for a social login (LinkedIn)
 */
export async function createSocialTokenPair(profile: ExternalProfile) {
  const redis = await getRedis();
  
  // Strategy: Try Redis -> Fallback to Blob (Delta) -> Hydrate Redis
  let storedProfileRaw: string | null = null;
  
  if (redis) {
    storedProfileRaw = await redis.hGet("mcp_social_profiles", profile.id);
  }
  
  // Cache Miss? Check Blob
  if (!storedProfileRaw) {
    console.log(`🔍 Cache miss for ${profile.id}, checking Blob...`);
    const blobProfile = await getBlobItem<ExternalProfile>(BLOB_PREFIXES.USERS, profile.id);
    if (blobProfile) {
      storedProfileRaw = JSON.stringify(blobProfile);
      if (redis) await redis.hSet("mcp_social_profiles", profile.id, storedProfileRaw);
    }
  }

  const storedProfile = storedProfileRaw ? JSON.parse(storedProfileRaw) : null;
  
  // Bootstrap Admin Logic
  let role: "guest" | "writer" | "admin" = "guest";
  const searchName = profile.name.toLowerCase();
  const searchId = profile.id.toLowerCase();
  
  if (storedProfile?.role) {
    role = storedProfile.role;
  } else {
    // Check global admin existence
    let hasAdmin = false;
    
    // Check Redis
    if (redis) {
       const allRaw = await redis.hGetAll("mcp_social_profiles");
       hasAdmin = Object.values(allRaw).some((p: any) => JSON.parse(p).role === 'admin');
    }
    
    // Check Blob (Expensive Scan - only do if Redis miss & bootstrapping)
    if (!hasAdmin) {
       // We have to list all users to know if admin exists. 
       // Optimization: Assume if we are here and redis is empty, it's a fresh start.
       const allUsers = await getAllBlobItems<ExternalProfile>(BLOB_PREFIXES.USERS);
       hasAdmin = allUsers.some(u => u.role === 'admin');
    }

    if (!hasAdmin) {
       console.log(`🚀 Bootstrapping First Admin: ${profile.name}`);
       role = "admin";
    } else if (
      searchName.includes("sunando") || 
      searchName.includes("bhattacharya") || 
      searchId.includes("sunandobhattacharya")
    ) {
      role = "admin";
    }
  }

  const completeProfile: ExternalProfile = { ...profile, role, lastLogin: new Date().toISOString() };

  // Generate Token
  const accessToken = await new SignJWT({ 
    sub: profile.id, 
    type: "access", 
    scope: role === "admin" ? "writer" : role, 
    name: profile.name,
    picture: profile.picture,
    provider: profile.provider,
    role: role
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);

  // Persistence: Save to BOTH
  if (redis) {
    await redis.hSet("mcp_social_profiles", profile.id, JSON.stringify(completeProfile));
  }
  
  // Async update Blob (Delta)
  saveBlobItem(BLOB_PREFIXES.USERS, profile.id, completeProfile);
  
  const refreshToken = crypto.randomUUID();
  const expirySeconds = 7 * 24 * 60 * 60; // 7 days
  const expiresAt = Date.now() + expirySeconds * 1000;
  
  if (redis) {
    await redis.set(`mcp_refresh:${refreshToken}`, JSON.stringify({ clientId: profile.id, scope: role }), { EX: expirySeconds });
  }

  // Update Blob (Delta)
  saveBlobItem(BLOB_PREFIXES.REFRESH_TOKENS, refreshToken, { clientId: profile.id, scope: role, expiresAt });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    name: profile.name,
    picture: profile.picture,
    role: role,
    scope: role === "admin" ? "writer" : role
  };
}

/**
 * Get all registered social users
 */
export async function getAllUsers(): Promise<ExternalProfile[]> {
  const redis = await getRedis();
  let users: ExternalProfile[] = [];

  // Try Redis
  if (redis) {
    try {
      const allProfiles = await redis.hGetAll("mcp_social_profiles");
      users = Object.values(allProfiles).map((p: any) => JSON.parse(p));
    } catch (e) {
      console.warn("Redis hGetAll failed");
    }
  }

  // Fallback to Blob (Delta Scan)
  if (users.length === 0) {
    users = await getAllBlobItems<ExternalProfile>(BLOB_PREFIXES.USERS);
    
    // Self-healing
    if (redis && users.length > 0) {
      console.log("🩹 Self-healing: Re-hydrating Redis from Blob Deltas...");
      for (const u of users) {
        await redis.hSet("mcp_social_profiles", u.id, JSON.stringify(u));
      }
    }
  }
  
  return users;
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, role: "guest" | "writer" | "admin") {
  const redis = await getRedis();
  
  // Update Redis
  let profileRaw: string | null = null;
  if (redis) {
    profileRaw = await redis.hGet("mcp_social_profiles", userId);
  }

  // Fallback
  let profile: ExternalProfile | null = profileRaw ? JSON.parse(profileRaw) : null;
  if (!profile) {
    profile = await getBlobItem<ExternalProfile>(BLOB_PREFIXES.USERS, userId);
  }
  
  if (!profile) throw new Error("User not found");
  
  profile.role = role;
  
  // Write
  if (redis) {
    await redis.hSet("mcp_social_profiles", userId, JSON.stringify(profile));
  }
  
  // Write Delta
  saveBlobItem(BLOB_PREFIXES.USERS, userId, profile);
  
  // Audit (Delta)
  const logId = `${Date.now()}-role-update`;
  saveBlobItem(BLOB_PREFIXES.AUDIT_LOGS, logId, {
    type: "ROLE_UPDATE",
    userId,
    newRole: role,
    timestamp: new Date().toISOString()
  });
}

/**
 * Remove user
 */
export async function deleteUser(userId: string) {
  const redis = await getRedis();
  
  if (redis) {
    await redis.hDel("mcp_social_profiles", userId);
  }
  
  // Delete Delta
  deleteBlobItem(BLOB_PREFIXES.USERS, userId);
}

/**
 * Access the Audit logs for Admin Dashboard
 */
export async function getAdminMetrics() {
  const logs = await getAllBlobItems<any>(BLOB_PREFIXES.AUDIT_LOGS);
  // Sort by timestamp desc
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return {
    logs: logs.slice(0, 100), // Limit to recent 100
    activeTokens: [] 
  };
}

/**
 * Validates a JWT Access Token or a Master Token
 */
export async function getTokenPayload(authHeader: string | null): Promise<any | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);

  if (MASTER_TOKEN && token === MASTER_TOKEN) {
    return { sub: "admin", scope: "writer" };
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * Compatibility wrapper
 */
export async function isValidToken(authHeader: string | null): Promise<boolean> {
  const payload = await getTokenPayload(authHeader);
  return !!payload;
}

/**
 * Exchange a Refresh Token for a new Access Token
 */
export async function refreshAccessToken(refreshToken: string) {
  const redis = await getRedis();
  let tokenData: any = null;

  // Try Redis
  if (redis) {
    const raw = await redis.get(`mcp_refresh:${refreshToken}`);
    if (raw) tokenData = JSON.parse(raw);
  }

  // Fallback to Blob (Delta)
  if (!tokenData) {
     tokenData = await getBlobItem(BLOB_PREFIXES.REFRESH_TOKENS, refreshToken);
  }

  if (!tokenData) throw new Error("Invalid or expired refresh token");
  
  // Check Expiry
  const expiry = tokenData.expiresAt || 0; 
  if (Date.now() > expiry) {
     if (redis) await redis.del(`mcp_refresh:${refreshToken}`);
     deleteBlobItem(BLOB_PREFIXES.REFRESH_TOKENS, refreshToken);
     throw new Error("Expired refresh token");
  }
  
  return createTokenPair(tokenData.clientId, tokenData.scope);
}
