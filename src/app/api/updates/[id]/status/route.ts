import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { autoClearLockIfComplete } from "../../route";

/**
 * Change the status of an update (e.g. mark an in-progress update as "completed").
 *
 * Rules:
 *   - Only the creator (or SA) can change the status.
 *   - Must respect the store lock (only the locker or SA can change).
 *   - Cannot change the status of an undone update.
 *   - After a transition to "completed", auto-clear the store lock if BOTH
 *     CFC Refresh AND AOO Manual Import are now completed.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const me = await getSessionUser(token);
    if (!me) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const newStatus = String(body?.status ?? "").trim();
    const notes = body?.notes ? String(body.notes) : null;

    const allowedStatuses = [
      "completed",
      "in-progress",
      "alerting",
      "boh-offline",
      "cfc-error",
      "network-down",
      "power-outage",
      "other-issues",
    ];
    if (!allowedStatuses.includes(newStatus)) {
      return NextResponse.json(
        { ok: false, error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const update = await db.update.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!update) {
      return NextResponse.json({ ok: false, error: "Update not found." }, { status: 404 });
    }
    if (update.undoneAt) {
      return NextResponse.json(
        { ok: false, error: "Cannot change the status of an undone update." },
        { status: 400 }
      );
    }

    // Authorization: creator or SA only
    const isSA = me.role === "sa";
    if (update.userId !== me.id && !isSA) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "You can only change the status of updates you created. Only the SA can override others.",
        },
        { status: 403 }
      );
    }

    // Respect store lock: only the locker or SA can mutate state on a locked store
    if (update.store.lockedById && update.store.lockedById !== me.id && !isSA) {
      return NextResponse.json(
        { ok: false, error: "This store is currently locked by another user." },
        { status: 423 }
      );
    }

    // Active flag-issue check for per-store CFC/AOO updates.
    // If the update type is cfc-refresh or aoo-manual-import and the store has
    // an active flag, block the status change (user must clear the flag first).
    // Menu Pull and Deliverect MenuPull are NOT affected by flags.
    if (update.type === "cfc-refresh" || update.type === "aoo-manual-import") {
      const activeFlag = await db.storeStatus.findFirst({
        where: { storeId: update.storeId, clearedAt: null },
        orderBy: { createdAt: "desc" },
      });
      if (activeFlag) {
        return NextResponse.json(
          {
            ok: false,
            error: `This store has an active issue flag (${activeFlag.status}). Please clear it before changing CFC/AOO update status.`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await db.update.update({
      where: { id },
      data: {
        status: newStatus,
        notes: notes ?? update.notes,
        completedAt: ["completed"].includes(newStatus)
          ? new Date()
          : update.completedAt,
      },
    });

    // Auto-clear the lock if both CFC and AOO are now completed
    await autoClearLockIfComplete(update.storeId);

    return NextResponse.json({ ok: true, update: updated });
  } catch (err) {
    console.error("[updates/status] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
