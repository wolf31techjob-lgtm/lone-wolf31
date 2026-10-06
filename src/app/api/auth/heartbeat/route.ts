import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, touchSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    await touchSession(token);
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (err) {
    console.error("[auth/heartbeat] error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
