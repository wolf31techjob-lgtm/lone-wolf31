import { NextRequest, NextResponse } from "next/server";
import { getOnlineUsers } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const users = await getOnlineUsers();
    return NextResponse.json({ ok: true, users, count: users.length });
  } catch (err) {
    console.error("[users/online] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
