import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, hasPrivilege } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const push = await db.pushUpdate.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, pushUpdate: push });
  } catch (err) {
    console.error("[push-update GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const user = await getSessionUser(token);
    if (!user || !hasPrivilege(user, "edit-banner")) {
      return NextResponse.json(
        { ok: false, error: "Only SA or Admin can publish push update banners." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, subject, content } = body;
    if (!title || !subject || !content) {
      return NextResponse.json(
        { ok: false, error: "title, subject, and content are required." },
        { status: 400 }
      );
    }

    // Mark all previous push updates as inactive
    await db.pushUpdate.updateMany({
      where: { active: true },
      data: { active: false },
    });

    const created = await db.pushUpdate.create({
      data: {
        title: String(title),
        subject: String(subject),
        content: String(content),
        createdById: user.id,
        active: true,
      },
    });

    return NextResponse.json({ ok: true, pushUpdate: created });
  } catch (err) {
    console.error("[push-update POST] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
