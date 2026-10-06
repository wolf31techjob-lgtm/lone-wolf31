import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, hasPrivilege, hashPassword } from "@/lib/auth";

/**
 * DELETE /api/users/[id] — delete a user. SA only.
 * Cannot delete self or the last remaining SA.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const me = await getSessionUser(token);
    if (!me || !hasPrivilege(me, "delete-users")) {
      return NextResponse.json(
        { ok: false, error: "Only the SA can delete user accounts." },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (id === me.id) {
      return NextResponse.json(
        { ok: false, error: "You cannot delete your own account while signed in." },
        { status: 400 }
      );
    }

    const target = await db.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
    }

    // Prevent deleting the last SA
    if (target.role === "sa") {
      const saCount = await db.user.count({ where: { role: "sa" } });
      if (saCount <= 1) {
        return NextResponse.json(
          { ok: false, error: "Cannot delete the last remaining SA account." },
          { status: 400 }
        );
      }
    }

    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[users DELETE] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[id]
 *
 * Two operations (identified by the body field):
 *   - { password }          → reset password (SA + Admin). Admins can reset any non-SA user's password.
 *   - { role }              → change role (SA only).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const me = await getSessionUser(token);
    if (!me) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const target = await db.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
    }

    // --- Change role (SA only) ---
    if (body?.role !== undefined) {
      if (!hasPrivilege(me, "change-roles")) {
        return NextResponse.json(
          { ok: false, error: "Only the SA can change user roles." },
          { status: 403 }
        );
      }
      const newRole = String(body.role).toLowerCase();
      if (!["sa", "admin", "sd"].includes(newRole)) {
        return NextResponse.json(
          { ok: false, error: "Role must be one of: sa, admin, sd." },
          { status: 400 }
        );
      }
      // Prevent demoting the last SA
      if (target.role === "sa" && newRole !== "sa") {
        const saCount = await db.user.count({ where: { role: "sa" } });
        if (saCount <= 1) {
          return NextResponse.json(
            { ok: false, error: "Cannot demote the last remaining SA account." },
            { status: 400 }
          );
        }
      }
      const updated = await db.user.update({
        where: { id },
        data: { role: newRole },
        select: { id: true, username: true, fullName: true, role: true },
      });
      // Invalidate all of this user's sessions so they re-login with the new role
      await db.session.deleteMany({ where: { userId: id } });
      return NextResponse.json({ ok: true, user: updated });
    }

    // --- Reset password (SA + Admin) ---
    if (body?.password !== undefined) {
      if (!hasPrivilege(me, "add-users")) {
        // Admins who can add users can also reset passwords; SA always can
        return NextResponse.json(
          { ok: false, error: "Only SA or Admin can reset user passwords." },
          { status: 403 }
        );
      }
      // Admins cannot reset an SA's password (only SA can do that)
      if (target.role === "sa" && me.role !== "sa") {
        return NextResponse.json(
          { ok: false, error: "Only the SA can reset another SA's password." },
          { status: 403 }
        );
      }
      const newPassword = String(body.password);
      if (newPassword.length < 6) {
        return NextResponse.json(
          { ok: false, error: "Password must be at least 6 characters." },
          { status: 400 }
        );
      }
      await db.user.update({
        where: { id },
        data: { password: hashPassword(newPassword) },
      });
      // Invalidate all of this user's existing sessions so they have to sign in again
      await db.session.deleteMany({ where: { userId: id } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "Provide either 'password' or 'role' in the body." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[users PATCH] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
