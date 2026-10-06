import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, hasPrivilege } from "@/lib/auth";

/**
 * Bulk Menu Pull — pushes a "menu-pull" update to ALL active stores.
 * Allowed when ALL stores have BOTH CFC Refresh AND AOO Manual Import completed.
 *
 * On push:
 *  - Creates a "menu-pull" in-progress update on every active store.
 *  - Locks each store to the pushing user.
 *  - The dashboard's "Done" button calls /api/updates/[id]/status for each
 *    menu-pull update to mark them as completed (which auto-clears the locks).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPrivilege(user, "push-updates")) {
      return NextResponse.json(
        { ok: false, error: "You do not have permission to run bulk operations." },
        { status: 403 }
      );
    }

    const stores = await db.store.findMany({ where: { disabled: false } });
    if (stores.length === 0) {
      return NextResponse.json({ ok: false, error: "No active stores to process." }, { status: 400 });
    }

    const storeIds = stores.map((s) => s.id);
    const allUpdates = await db.update.findMany({
      where: { storeId: { in: storeIds }, undoneAt: null },
      orderBy: { startedAt: "desc" },
    });

    const notReady: string[] = [];
    for (const store of stores) {
      const storeUpdates = allUpdates.filter((u) => u.storeId === store.id);
      const latestCfc = storeUpdates.find((u) => u.type === "cfc-refresh");
      const latestAoo = storeUpdates.find((u) => u.type === "aoo-manual-import");
      if (latestCfc?.status !== "completed" || latestAoo?.status !== "completed") {
        notReady.push(store.name);
      }
    }

    if (notReady.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot run bulk Menu Pull. The following stores are not yet fully completed (need CFC + AOO done): ${notReady.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Note: Active flag issues do NOT block bulk Menu Pull — they are for monitoring only.

    const isSA = user.role === "sa";
    let pushed = 0;
    const now = new Date();
    for (const store of stores) {
      if (store.lockedById && store.lockedById !== user.id && !isSA) continue;
      await db.update.create({
        data: {
          storeId: store.id,
          userId: user.id,
          type: "menu-pull",
          status: "in-progress",
          notes: "Bulk Menu Pull — synchronization of Online Ordering and Kiosks Menu",
          startedAt: now,
        },
      });
      if (!store.lockedById || store.lockedById !== user.id) {
        await db.store.update({
          where: { id: store.id },
          data: { lockedById: user.id, lockedAt: now },
        });
      }
      pushed++;
    }

    return NextResponse.json({ ok: true, summary: { pushed, total: stores.length } });
  } catch (err) {
    console.error("[admin/bulk-menu-pull] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
