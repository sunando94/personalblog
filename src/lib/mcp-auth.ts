import { SignJWT, jwtVerify } from "jose";
import { UserStore } from "./stores/user-store";
import { TokenStore } from "./stores/token-store";
import { AuditStore } from "./stores/audit-store";
import { createNotification } from "./notifications";
import { NotificationStore } from "./stores/notification-store";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "mcp_fallback_secret_32_chars_long");
const MASTER_TOKEN = process.env.MCP_MASTER_TOKEN;

export interface ExternalProfile {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  provider: "linkedin" | "github";
  role?: "guest" | "writer" | "admin";
  pendingRole?: "guest" | "writer" | "admin";
  lastLogin?: string;
}

/**
 * Industry Standard OAuth2 Token Generation with PostgreSQL Store + Cache Aside
 */
export async function createTokenPair(clientId: string, scope: "guest" | "writer" = "guest") {
  const accessToken = await new SignJWT({ sub: clientId, type: "access", scope })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(scope === "guest" ? "1h" : "2h")
    .sign(JWT_SECRET);

  const refreshToken = crypto.randomUUID();
  const expirySeconds = scope === "guest" ? 3600 : 7 * 24 * 60 * 60;
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);
  
  // 1. Persistent Store (Handles its own caching)
  await TokenStore.save(refreshToken, clientId, scope, expiresAt);

  // 2. Audit Logging
  await AuditStore.log("TOKEN_ISSUED", clientId, { scope });

  return { accessToken, refreshToken, expiresAt: expiresAt.getTime() };
}

/**
 * Creates a token for a social login (LinkedIn) - Store + Cache Aside
 */
export async function createSocialTokenPair(profile: ExternalProfile) {
  // Fetch existing profile from Store (Automatic Cache-Aside)
  const existingUser = await UserStore.getById(profile.id);

  let role: "guest" | "writer" | "admin" = "guest";
  if (existingUser?.role) {
    role = existingUser.role;
  } else {
    // Bootstrap first admin
    const hasAdmin = await UserStore.hasAdmin();
    
    if (!hasAdmin) {
      role = "admin";
    } else if (
      profile.name.toLowerCase().includes("sunando") || 
      profile.name.toLowerCase().includes("bhattacharya")
    ) {
      role = "admin";
    }
  }

  const completeProfile: ExternalProfile = { 
    ...profile, 
    role, 
    pendingRole: existingUser?.pendingRole || undefined,
    lastLogin: new Date().toISOString() 
  };

  // Persist to PostgreSQL Store (Handles cache update)
  await UserStore.upsert(completeProfile);

  // Audit Log
  await AuditStore.log("SOCIAL_LOGIN", profile.id, { provider: profile.provider, name: profile.name });

  // Generate Access Token
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

  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  // Store Refresh Token in Store (Handles cache population)
  await TokenStore.save(refreshToken, profile.id, role, expiresAt);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    name: profile.name,
    picture: profile.picture,
    role: role,
    scope: role === "admin" ? "writer" : role
  };
}

export async function getAllUsers(): Promise<ExternalProfile[]> {
  return UserStore.getAll();
}

export async function updateUserRole(userId: string, role: "guest" | "writer" | "admin") {
  const success = await UserStore.updateRole(userId, role, true, false);
  if (!success) {
    throw new Error("User not found.");
  }

  await AuditStore.log("ROLE_UPDATE", userId, { newRole: role, action: "MANUAL_UPDATE" });
  
  // Clean up all admin notifications for this user's requests if it was manual too
  await NotificationStore.resolveRoleRequest(userId);

  // Notify User
  await createNotification({
    userId,
    type: "info",
    title: "Account Updated",
    message: `An administrator has updated your role to ${role}.`,
    read: false
  });
}

export async function approveUserRole(userId: string, role: "guest" | "writer" | "admin") {
  const success = await UserStore.updateRole(userId, role, true, true);
  if (!success) {
    throw new Error("This request has already been handled or the user no longer has a pending request.");
  }

  await AuditStore.log("ROLE_UPDATE", userId, { newRole: role, action: "APPROVED_REQUEST" });
  
  // Clean up all admin notifications for this request
  await NotificationStore.resolveRoleRequest(userId);

  // Notify User
  await createNotification({
    userId,
    type: "success",
    title: "Privileges Updated",
    message: `Your requested role has been approved. You are now a ${role}.`,
    read: false,
    action: role === "writer" ? { label: "Go to Browser Writer", href: "/browser-writer" } : undefined
  });
}

export async function setPendingRole(userId: string, requestedRole: "guest" | "writer" | "admin") {
  await UserStore.setPendingRole(userId, requestedRole);
}

export async function clearPendingRole(userId: string) {
  const success = await UserStore.clearPendingRole(userId);
  if (!success) {
     throw new Error("This request has already been handled or the user no longer has a pending request.");
  }

  await AuditStore.log("ROLE_REJECT", userId, { action: "REJECTED_PENDING_ROLE" });

  // Clean up all admin notifications for this request
  await NotificationStore.resolveRoleRequest(userId);

  // Notify User
  await createNotification({
    userId,
    type: "warning",
    title: "Membership Request",
    message: "Your request for elevated privileges was reviewed and could not be approved at this time.",
    read: false
  });
}

export async function deleteUser(userId: string) {
  await UserStore.delete(userId);
}

export async function getAdminMetrics() {
  const logs = await AuditStore.getRecent(100);
  return {
    logs,
    activeTokens: []
  };
}

export async function getTokenPayload(authHeader: string | null): Promise<any | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);

  if (MASTER_TOKEN && token === MASTER_TOKEN) {
    return { sub: "admin", scope: "writer", role: "admin" };
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (e) {
    return null;
  }
}

export async function isValidToken(authHeader: string | null): Promise<boolean> {
  const payload = await getTokenPayload(authHeader);
  return !!payload;
}

export async function refreshAccessToken(refreshToken: string) {
  const tokenData = await TokenStore.get(refreshToken);

  if (!tokenData) throw new Error("Invalid or expired refresh token");
  
  // tokenData here already contains expiration check if we fetch it from Store
  const expiresAt = tokenData.expiresAt ? new Date(tokenData.expiresAt) : new Date(tokenData.expires_at);
  if (expiresAt < new Date()) {
    await TokenStore.delete(refreshToken);
    throw new Error("Expired refresh token");
  }
  
  return createTokenPair(tokenData.userId || tokenData.user_id, tokenData.scope);
}
