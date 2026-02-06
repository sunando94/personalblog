import { NextResponse } from "next/server";
import { getTokenPayload, getAllUsers, updateUserRole, approveUserRole, deleteUser, clearPendingRole } from "@/lib/mcp-auth";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const payload = await getTokenPayload(authHeader);

  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authHeader = request.headers.get("authorization");
  const payload = await getTokenPayload(authHeader);

  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, role, action } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (action === "reject") {
      await clearPendingRole(userId);
      return NextResponse.json({ success: true });
    }

    if (!role) {
      return NextResponse.json({ error: "Missing role for update" }, { status: 400 });
    }

    if (action === "approve") {
      await approveUserRole(userId, role);
    } else {
      await updateUserRole(userId, role);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authHeader = request.headers.get("authorization");
  const payload = await getTokenPayload(authHeader);

  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    await deleteUser(userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
