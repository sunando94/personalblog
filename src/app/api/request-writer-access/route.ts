import { NextResponse } from "next/server";
import { getTokenPayload, getAllUsers, setPendingRole } from "@/lib/mcp-auth";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  console.log("🚀 [API] /request-writer-access Hit");
  const authHeader = request.headers.get("authorization");
  const payload = await getTokenPayload(authHeader);

  console.log("👤 [API] Payload:", payload);

  if (!payload) {
    console.error("❌ [API] Unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentRole = payload.role || 'guest';

  if (currentRole === "admin") {
    console.log("ℹ️ [API] User is already admin");
    return NextResponse.json({ message: "You already have administrative access." });
  }

  // Determine requested role
  const requestedRole = currentRole === 'guest' ? 'writer' : 'admin';

  try {
    await setPendingRole(payload.sub, requestedRole);

    const allUsers = await getAllUsers();
    console.log(`📋 [API] Total Users Found: ${allUsers.length}`);
    
    // Debug: Log roles of all users to see if "admin" matches
    allUsers.forEach(u => console.log(`User: ${u.name} [${u.id}] - Role: ${u.role}`));

    const admins = allUsers.filter(u => u.role === "admin");
    console.log(`👑 [API] Admins Found: ${admins.length}`);

    if (admins.length === 0) {
        // Fallback or log if no admins exist to approve
        console.warn("⚠️ No admins found to approve request from", payload.id);
        return NextResponse.json({ message: "Request received, but no admins are currently active to approve it." });
    }

    const notificationPromises = admins.map(admin => 
      createNotification({
        userId: admin.id,
        type: "info",
        title: "Role Upgrade Request",
        message: `${payload.name} (${currentRole}) requests promotion to ${requestedRole}.`,
        read: false,
        action: {
          label: "Review Request",
          href: `/admin?search=${payload.sub}`
        },
        primaryAction: {
          label: `Approve as ${requestedRole}`,
          endpoint: "/api/admin/users",
          method: "PATCH",
          body: { userId: payload.sub, role: requestedRole },
          successMessage: `User ${payload.name} promoted to ${requestedRole}.`
        }
      })
    );

    await Promise.all(notificationPromises);
    console.log("✅ [API] Notifications sent");

    return NextResponse.json({ success: true, message: `Request for ${requestedRole} access sent to administrators.` });

  } catch (error: any) {
    console.error("💥 [API] Access Request Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
