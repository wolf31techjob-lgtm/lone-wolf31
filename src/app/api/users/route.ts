import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, hasPrivilege, hashPassword } from "@/lib/auth";

/**
 * GET /api/users — list all users. Requires the manage-users-panel privilege
 * (SA and Admin).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const me = await getSessionUser(token);
    if (!me || !hasPrivilege(me, "manage-users-panel")) {
      return NextResponse.json(
        { ok: false, error: "Admin access required." },
        { status: 403 }
      );
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, users });
  } catch (err) {
    console.error("[users GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users — create a user. Requires the add-users privilege (SA, Admin).
 *
 * Role escalation rules:
 *   - SA can create accounts of any role (sa, admin, sd).
 *   - Admin can only create sd accounts.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const me = await getSessionUser(token);
    if (!me || !hasPrivilege(me, "add-users")) {
      return NextResponse.json(
        { ok: false, error: "Only SA or Admin can create user accounts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const username = String(body?.username ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const fullName = String(body?.fullName ?? "").trim() || null;
    const role = String(body?.role ?? "sd").toLowerCase();

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "Username and password are required." },
        { status: 400 }
      );
    }
    if (!["sa", "admin", "sd"].includes(role)) {
      return NextResponse.json(
        { ok: false, error: "Role must be one of: sa, admin, sd." },
        { status: 400 }
      );
    }
    // Admin can only create sd accounts
    if (me.role !== "sa" && role !== "sd") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Admin accounts can only create Service Desk (sd) users. Only the SA can create admin or sa accounts.",
        },
        { status: 403 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: `User '${username}' already exists.` },
        { status: 409 }
      );
    }

    const created = await db.user.create({
      data: {
        username,
        password: hashPassword(password),
        fullName,
        role,
      },
      select: { id: true, username: true, fullName: true, role: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, user: created });
  } catch (err) {
    console.error("[users POST] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
