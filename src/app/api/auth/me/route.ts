import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, touchSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json({ ok: false, user: null }, { status: 200 });
    }
    // bump lastActive
    await touchSession(token);
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[auth/me] error:", err);
    return NextResponse.json({ ok: false, user: null }, { status: 200 });
  }
}
