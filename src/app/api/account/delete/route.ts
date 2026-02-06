import { NextResponse } from "next/server";
import { getTokenPayload, deleteUser } from "@/lib/mcp-auth";
import { AuditStore } from "@/lib/stores/audit-store";

export async function DELETE(request: Request) {
  const authHeader = request.headers.get("authorization");
  const payload = await getTokenPayload(authHeader);

  if (!payload || !payload.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = payload.sub;

  try {
    // 1. Log the deletion before the user is gone
    await AuditStore.log("ACCOUNT_DELETE", userId, { reason: "USER_REQUESTED" });

    // 2. Perform deletion (Cascade handles tokens/notifications in PG)
    // Redis cleanup is handled by UserStore.delete
    await deleteUser(userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Account deletion failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
