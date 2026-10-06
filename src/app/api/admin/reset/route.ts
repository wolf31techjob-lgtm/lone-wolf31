import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, hasPrivilege } from "@/lib/auth";

/**
 * Reset all results on the site — clears all updates, store statuses,
 * and store locks. Stores themselves are kept (not deleted).
 * Available to SA and Admin only.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const user = await getSessionUser(token);
    if (!user || !hasPrivilege(user, "upload-excel")) {
      return NextResponse.json(
        { ok: false, error: "Only SA or Admin can reset the site." },
        { status: 403 }
      );
    }

    const delUpdates = await db.update.deleteMany({});
    const delStatuses = await db.storeStatus.deleteMany({});
    const unlockStores = await db.store.updateMany({
      where: { lockedById: { not: null } },
      data: { lockedById: null, lockedAt: null },
    });

    return NextResponse.json({
      ok: true,
      summary: {
        updatesDeleted: delUpdates.count,
        statusesDeleted: delStatuses.count,
        storesUnlocked: unlockStores.count,
      },
    });
  } catch (err) {
    console.error("[admin/reset] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
