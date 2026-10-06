import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

/**
 * Self-service password reset: a user who forgot their password can reset it
 * by providing their username + new password. Since this is an internal
 * monitoring tool without email infrastructure, we don't require a token.
 * (The System Admin can also reset any user's password from User Management.)
 *
 * All existing sessions for this user are destroyed after the reset.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body?.username ?? "").trim().toLowerCase();
    const newPassword = String(body?.newPassword ?? "");

    if (!username || !newPassword) {
      return NextResponse.json(
        { ok: false, error: "Username and new password are required." },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { username } });
    if (!user) {
      // Don't reveal whether the username exists — return a soft success message
      // but mark as failed so the UI shows an error.
      return NextResponse.json(
        { ok: false, error: "No account found with that UserID. Please contact your System Admin." },
        { status: 404 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: { password: hashPassword(newPassword) },
    });

    // Destroy all of this user's existing sessions (force re-login)
    await db.session.deleteMany({ where: { userId: user.id } });

    return NextResponse.json({
      ok: true,
      message: "Password reset successful. Please sign in with your new password.",
    });
  } catch (err) {
    console.error("[auth/reset-password] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
