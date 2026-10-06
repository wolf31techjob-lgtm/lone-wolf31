import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, hasPrivilege } from "@/lib/auth";

/**
 * Disable a store. SA and Admin only.
 * Disabling a store also clears any active issue flags and unlocks it
 * (so a disabled store never lingers as "locked").
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
    if (!hasPrivilege(user, "disable-stores")) {
      return NextResponse.json(
        { ok: false, error: "Only SA or Admin can disable stores." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = String(body?.reason ?? "").trim();
    if (!reason) {
      return NextResponse.json(
        { ok: false, error: "A reason is required to disable a store." },
        { status: 400 }
      );
    }

    const store = await db.store.update({
      where: { id },
      data: {
        disabled: true,
        disabledReason: reason,
        disabledAt: new Date(),
        disabledById: user.id,
        lockedById: null,
        lockedAt: null,
      },
    });

    // Clear any active issue flags on this store
    await db.storeStatus.updateMany({
      where: { storeId: id, clearedAt: null },
      data: { clearedAt: new Date() },
    });

    return NextResponse.json({ ok: true, store });
  } catch (err) {
    console.error("[stores/disable] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
