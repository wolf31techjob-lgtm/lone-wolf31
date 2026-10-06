import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    await destroySession(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/logout] error:", err);
    return NextResponse.json({ ok: true });
  }
}
