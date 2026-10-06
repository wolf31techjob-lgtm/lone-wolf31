import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, hasPrivilege } from "@/lib/auth";

/**
 * Bulk Deliverect MenuPull — pushes a "deliverect-menu-pull" update to ALL
 * active KT brand stores. Allowed when all KT stores have BOTH CFC Refresh
 * AND AOO Manual Import completed. Does NOT require Menu Pull to be completed
 * first.
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

    const ktStores = await db.store.findMany({
      where: { disabled: false, brand: "KT" },
    });
    if (ktStores.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No active KT brand stores found. Deliverect MenuPull is only for KT stores." },
        { status: 400 }
      );
    }

    const storeIds = ktStores.map((s) => s.id);
    const allUpdates = await db.update.findMany({
      where: { storeId: { in: storeIds }, undoneAt: null },
      orderBy: { startedAt: "desc" },
    });

    // Check that ALL KT stores have both CFC and AOO completed
    // (Menu Pull is NOT required)
    const notReady: string[] = [];
    for (const store of ktStores) {
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
          error: `Cannot run bulk Deliverect MenuPull. The following KT stores need CFC + AOO completed: ${notReady.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Note: Active flag issues do NOT block bulk Deliverect MenuPull — they are for monitoring only.

    const isSA = user.role === "sa";
    let pushed = 0;
    const now = new Date();
    for (const store of ktStores) {
      if (store.lockedById && store.lockedById !== user.id && !isSA) continue;
      await db.update.create({
        data: {
          storeId: store.id,
          userId: user.id,
          type: "deliverect-menu-pull",
          status: "in-progress",
          notes: "Bulk Deliverect MenuPull — Deliverect menu synchronization",
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

    return NextResponse.json({ ok: true, summary: { pushed, total: ktStores.length } });
  } catch (err) {
    console.error("[admin/bulk-deliverect] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
