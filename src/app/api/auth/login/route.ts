import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body?.username ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "UserID and password are required." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { username } });
    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json(
        { ok: false, error: "Invalid UserID or password." },
        { status: 401 }
      );
    }

    const token = await createSession(user.id);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error("[auth/login] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
