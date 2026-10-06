import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, hasPrivilege } from "@/lib/auth";

/**
 * Re-enable a disabled store. SA and Admin only.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPrivilege(user, "enable-stores")) {
      return NextResponse.json(
        { ok: false, error: "Only SA or Admin can re-enable stores." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const store = await db.store.update({
      where: { id },
      data: {
        disabled: false,
        disabledReason: null,
        disabledAt: null,
        disabledById: null,
      },
    });

    return NextResponse.json({ ok: true, store });
  } catch (err) {
    console.error("[stores/enable] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
