import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, verifyPassword, hashPassword } from "@/lib/auth";

/**
 * Change the signed-in user's own password. Requires current password + new password.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const me = await getSessionUser(token);
    if (!me) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const currentPassword = String(body?.currentPassword ?? "");
    const newPassword = String(body?.newPassword ?? "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { ok: false, error: "Current password and new password are required." },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: "New password must be at least 6 characters." },
        { status: 400 }
      );
    }
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { ok: false, error: "New password must be different from your current password." },
        { status: 400 }
      );
    }

    // Re-fetch with password hash
    const user = await db.user.findUnique({ where: { id: me.id } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
    }
    if (!verifyPassword(currentPassword, user.password)) {
      return NextResponse.json(
        { ok: false, error: "Current password is incorrect." },
        { status: 401 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: { password: hashPassword(newPassword) },
    });

    return NextResponse.json({
      ok: true,
      message: "Password changed successfully.",
    });
  } catch (err) {
    console.error("[auth/change-password] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
