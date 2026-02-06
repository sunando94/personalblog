import { createClient } from "redis";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "mcp_fallback_secret_32_chars_long");
const MASTER_TOKEN = process.env.MCP_MASTER_TOKEN;
const REDIS_URL = process.env.REDIS_URL;

// Singleton Redis Client
let redisClient: any = null;

export interface ExternalProfile {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  provider: "linkedin" | "github";
  role?: "guest" | "writer" | "admin";
  lastLogin?: string;
}

async function getRedis() {
  if (!redisClient) {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on("error", (err: any) => console.error("Redis Client Error", err));
    await redisClient.connect();
  }
  return redisClient;
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
  // Guests tokens expire in 1 hour (no refresh), Writers in 7 days
  const expirySeconds = scope === "guest" ? 3600 : 7 * 24 * 60 * 60;
  const expiresAt = Date.now() + expirySeconds * 1000;
  
  await redis.set(`mcp_refresh:${refreshToken}`, JSON.stringify({ clientId, scope }), { EX: expirySeconds });

  const tokenData = {
    clientId,
    scope,
    issueDate: new Date().toISOString(),
    refreshToken,
    expiresAt: new Date(expiresAt).toISOString(),
    status: "active"
  };

  // 1. Audit Log Tracking (capped at 100)
  await redis.lPush("mcp_audit_logs", JSON.stringify({
    type: "TOKEN_GENERATED",
    clientId,
    timestamp: new Date().toISOString(),
    details: "New OAuth2 pair issued"
  }));
  await redis.lTrim("mcp_audit_logs", 0, 99);

  // 2. Map of Active Tokens
  await redis.hSet("mcp_active_tokens", clientId, JSON.stringify(tokenData));

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: 3600
  };
}

/**
 * Creates a token for a social login (LinkedIn)
 */
export async function createSocialTokenPair(profile: ExternalProfile) {
  const redis = await getRedis();
  
  // 1. Fetch existing profile to preserve role, or bootstrap initial admin
  const storedProfileRaw = await redis.hGet("mcp_social_profiles", profile.id);
  const storedProfile = storedProfileRaw ? JSON.parse(storedProfileRaw) : null;
  
  // Bootstrap Admin: if name/id matches the user's specific requirement
  let role: "guest" | "writer" | "admin" = "guest";
  const searchName = profile.name.toLowerCase();
  const searchId = profile.id.toLowerCase();
  
  if (storedProfile?.role) {
    role = storedProfile.role;
  } else if (
    searchName.includes("sunando") || 
    searchName.includes("bhattacharya") || 
    searchId.includes("sunandobhattacharya")
  ) {
    role = "admin";
  }

  const completeProfile: ExternalProfile = { ...profile, role, lastLogin: new Date().toISOString() };

  // Create token with role in payload
  const accessToken = await new SignJWT({ 
    sub: profile.id, 
    type: "access", 
    scope: role === "admin" ? "writer" : role, // Writers/Admins both get writer scope for API
    name: profile.name,
    picture: profile.picture,
    provider: profile.provider,
    role: role
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);

  // Store profile in Redis for persistence
  await redis.hSet("mcp_social_profiles", profile.id, JSON.stringify(completeProfile));
  
  // Log the login
  await redis.lPush("mcp_audit_logs", JSON.stringify({
    type: "SOCIAL_LOGIN",
    provider: profile.provider,
    name: profile.name,
    role: role,
    timestamp: new Date().toISOString()
  }));

  return {
    access_token: accessToken,
    name: profile.name,
    picture: profile.picture,
    role: role,
    scope: role === "admin" ? "writer" : role
  };
}

/**
 * Get all registered social users from Redis
 */
export async function getAllUsers(): Promise<ExternalProfile[]> {
  const redis = await getRedis();
  const allProfiles = await redis.hGetAll("mcp_social_profiles");
  return Object.values(allProfiles).map((p: any) => JSON.parse(p));
}

/**
 * Update user role in Redis
 */
export async function updateUserRole(userId: string, role: "guest" | "writer" | "admin") {
  const redis = await getRedis();
  const profileRaw = await redis.hGet("mcp_social_profiles", userId);
  if (!profileRaw) throw new Error("User not found");
  
  const profile = JSON.parse(profileRaw);
  profile.role = role;
  await redis.hSet("mcp_social_profiles", userId, JSON.stringify(profile));
  
  // Audit the change
  await redis.lPush("mcp_audit_logs", JSON.stringify({
    type: "ROLE_UPDATE",
    userId,
    newRole: role,
    timestamp: new Date().toISOString()
  }));
}

/**
 * Remove user from Redis
 */
export async function deleteUser(userId: string) {
  const redis = await getRedis();
  await redis.hDel("mcp_social_profiles", userId);
  
  // Audit the deletion
  await redis.lPush("mcp_audit_logs", JSON.stringify({
    type: "USER_DELETED",
    userId,
    timestamp: new Date().toISOString()
  }));
}

/**
 * Access the Audit logs and Active tokens for Admin Dashboard
 */
export async function getAdminMetrics() {
  const redis = await getRedis();
  const logs = await redis.lRange("mcp_audit_logs", 0, -1);
  const activeTokens = await redis.hGetAll("mcp_active_tokens");
  
  return {
    logs: logs.map((l: string) => JSON.parse(l)),
    activeTokens: Object.values(activeTokens).map((t: any) => JSON.parse(t))
  };
}

/**
 * Validates a JWT Access Token or a Master Token
 * Returns the token payload (including scope) if valid
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
 * Compatibility wrapper for existing boolean checks
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
  const raw = await redis.get(`mcp_refresh:${refreshToken}`);
  if (!raw) throw new Error("Invalid or expired refresh token");
  
  const { clientId, scope } = JSON.parse(raw);
  return createTokenPair(clientId, scope);
}
