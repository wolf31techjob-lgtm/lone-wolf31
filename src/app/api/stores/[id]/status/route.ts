import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/**
 * POST /api/stores/[id]/status
 *
 * Set or clear a user-reported issue flag on a store (the "Flag issue" button).
 *
 * Body:
 *   - action: "set" | "clear"
 *   - status: one of alerting | boh-offline | cfc-error | network-down | power-outage | other-issues
 *   - description: optional / required for "other-issues" when action=set
 *
 * Any signed-in user can flag/clear, BUT they must respect the store lock —
 * only the lock owner (or SA) can flag issues on a locked store.
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

    const { id } = await params;
    const body = await req.json();
    const action = String(body?.action ?? "").toLowerCase();
    const status = String(body?.status ?? "").toLowerCase();
    const description = body?.description ? String(body.description).trim() : null;

    const store = await db.store.findUnique({ where: { id } });
    if (!store) {
      return NextResponse.json({ ok: false, error: "Store not found." }, { status: 404 });
    }
    if (store.disabled) {
      return NextResponse.json(
        { ok: false, error: "Cannot flag issues on a disabled store." },
        { status: 400 }
      );
    }

    // Respect store lock: only the locker or SA can flag/clear on a locked store
    const isLocker = store.lockedById === user.id;
    const isSA = user.role === "sa";
    if (store.lockedById && !isLocker && !isSA) {
      return NextResponse.json(
        {
          ok: false,
          error: `This store is currently locked by another user. You cannot flag issues on it.`,
        },
        { status: 423 }
      );
    }

    const ALLOWED_STATUSES = [
      "alerting",
      "boh-offline",
      "cfc-error",
      "network-down",
      "power-outage",
      "other-issues",
    ];

    if (action === "set") {
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json(
          { ok: false, error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      if (status === "other-issues" && !description) {
        return NextResponse.json(
          { ok: false, error: "A description is required when flagging 'Other Issues'." },
          { status: 400 }
        );
      }
      // Clear any prior active flag on this store first (one active flag at a time)
      await db.storeStatus.updateMany({
        where: { storeId: id, clearedAt: null },
        data: { clearedAt: new Date() },
      });
      const created = await db.storeStatus.create({
        data: {
          storeId: id,
          status,
          description,
          userId: user.id,
        },
      });
      return NextResponse.json({ ok: true, status: created });
    }

    if (action === "clear") {
      const result = await db.storeStatus.updateMany({
        where: { storeId: id, clearedAt: null },
        data: { clearedAt: new Date() },
      });
      // Clearing the issue flag does NOT clear the store lock (lock is owned by
      // the update pusher, not the issue flagger).
      return NextResponse.json({ ok: true, cleared: result.count });
    }

    return NextResponse.json(
      { ok: false, error: "Action must be 'set' or 'clear'." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[stores/status] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
