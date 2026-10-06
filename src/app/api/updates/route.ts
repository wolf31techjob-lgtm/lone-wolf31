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

    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId");
    const limit = Number(url.searchParams.get("limit") || "20");

    const where: any = {};
    if (storeId) where.storeId = storeId;

    const updates = await db.update.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: limit,
      include: { user: true, store: true },
    });

    return NextResponse.json({
      ok: true,
      updates: updates.map((u) => ({
        id: u.id,
        type: u.type,
        status: u.status,
        notes: u.notes,
        startedAt: u.startedAt.toISOString(),
        completedAt: u.completedAt?.toISOString() ?? null,
        undoneAt: u.undoneAt?.toISOString() ?? null,
        undoneById: u.undoneById,
        user: { id: u.user.id, username: u.user.username, fullName: u.user.fullName },
        store: { id: u.store.id, storeId: u.store.storeId, name: u.store.name, hashCode: u.store.hashCode },
        canUndo: u.userId === user.id || user.role === "sa",
      })),
    });
  } catch (err) {
    console.error("[updates GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/updates
 *
 * Push a per-store update (cfc-refresh or aoo-manual-import).
 *
 * Enforced rules:
 *  - Only users with push-updates privilege can push (sa, admin, sd).
 *  - Store must exist and not be disabled.
 *  - Store lock: if locked by someone else, only that user (or SA) can push.
 *  - Active flag-issue: cannot push while the store has a non-cleared issue flag.
 *  - Sequential gating: AOO Manual Import requires CFC Refresh to be completed first.
 *  - On push, the store is locked to the pushing user.
 *  - When BOTH CFC Refresh AND AOO Manual Import are completed, the store lock is
 *    automatically cleared.
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
        { ok: false, error: "You do not have permission to push updates." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { storeId, type, status, notes } = body;
    if (!storeId || !type || !status) {
      return NextResponse.json(
        { ok: false, error: "storeId, type, and status are required." },
        { status: 400 }
      );
    }

    // Only per-store update types are pushable here (menu-pull & deliverect are bulk)
    if (!["cfc-refresh", "aoo-manual-import"].includes(type)) {
      return NextResponse.json(
        { ok: false, error: "Only CFC Refresh and AOO Manual Import can be pushed per-store." },
        { status: 400 }
      );
    }

    const store = await db.store.findUnique({ where: { id: String(storeId) } });
    if (!store) {
      return NextResponse.json({ ok: false, error: "Store not found." }, { status: 404 });
    }
    if (store.disabled) {
      return NextResponse.json(
        { ok: false, error: "Cannot push updates to a disabled store. Please enable it first." },
        { status: 400 }
      );
    }

    // Store lock check
    const isSA = user.role === "sa";
    const isLocker = store.lockedById === user.id;
    if (store.lockedById && !isLocker && !isSA) {
      return NextResponse.json(
        { ok: false, error: "This store is currently locked by another user." },
        { status: 423 }
      );
    }

    // Active flag-issue check — per-store CFC/AOO execution is blocked while
    // there is an uncleared issue flag. The user must clear the flag first.
    // (Bulk Menu Pull and Deliverect are NOT affected by flags.)
    const activeFlag = await db.storeStatus.findFirst({
      where: { storeId: store.id, clearedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (activeFlag) {
      return NextResponse.json(
        {
          ok: false,
          error: `This store has an active issue flag (${activeFlag.status}). Please clear it before pushing CFC/AOO updates.`,
        },
        { status: 400 }
      );
    }

    // Sequential gating: AOO Manual Import requires CFC Refresh to be completed
    if (type === "aoo-manual-import") {
      const latestCfc = await db.update.findFirst({
        where: { storeId: store.id, type: "cfc-refresh", undoneAt: null },
        orderBy: { startedAt: "desc" },
      });
      if (latestCfc?.status !== "completed") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "AOO Manual Import can only be pushed after CFC Refresh is marked completed.",
          },
          { status: 400 }
        );
      }
    }

    // Permanent lock check: once a CFC or AOO is completed for this store,
    // it cannot be pushed again — only a Reset can clear it.
    const existingUpdate = await db.update.findFirst({
      where: { storeId: store.id, type, undoneAt: null, status: "completed" },
      orderBy: { startedAt: "desc" },
    });
    if (existingUpdate) {
      return NextResponse.json(
        {
          ok: false,
          error: `${type === "cfc-refresh" ? "CFC Refresh" : "AOO Manual Import"} has already been completed for this store. Use Reset to start a new cycle.`,
        },
        { status: 400 }
      );
    }

    const update = await db.update.create({
      data: {
        storeId: store.id,
        userId: user.id,
        type: String(type),
        status: String(status),
        notes: notes ? String(notes) : null,
        startedAt: new Date(),
        completedAt: ["completed"].includes(status) ? new Date() : null,
      },
      include: { user: true, store: true },
    });

    // Lock the store to the pushing user (if not already locked to them)
    if (!store.lockedById || store.lockedById !== user.id) {
      await db.store.update({
        where: { id: store.id },
        data: { lockedById: user.id, lockedAt: new Date() },
      });
    }

    // Auto-clear the lock if both CFC and AOO are now completed
    await autoClearLockIfComplete(store.id);

    return NextResponse.json({
      ok: true,
      update: {
        id: update.id,
        type: update.type,
        status: update.status,
        notes: update.notes,
        startedAt: update.startedAt.toISOString(),
        completedAt: update.completedAt?.toISOString() ?? null,
        undoneAt: update.undoneAt?.toISOString() ?? null,
        user: { id: update.user.id, username: update.user.username, fullName: update.user.fullName },
        store: { id: update.store.id, storeId: update.store.storeId, name: update.store.name, hashCode: update.store.hashCode },
        canUndo: true,
      },
    });
  } catch (err) {
    console.error("[updates POST] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * Helper — auto-clear the store lock when both CFC Refresh AND AOO Manual Import
 * are completed for the given store. Called after every push / status-change /
 * undo to keep the lock state consistent.
 */
export async function autoClearLockIfComplete(storeId: string) {
  const [latestCfc, latestAoo] = await Promise.all([
    db.update.findFirst({
      where: { storeId, type: "cfc-refresh", undoneAt: null },
      orderBy: { startedAt: "desc" },
    }),
    db.update.findFirst({
      where: { storeId, type: "aoo-manual-import", undoneAt: null },
      orderBy: { startedAt: "desc" },
    }),
  ]);
  if (latestCfc?.status === "completed" && latestAoo?.status === "completed") {
    await db.store.update({
      where: { id: storeId },
      data: { lockedById: null, lockedAt: null },
    });
  }
}

/**
 * Helper — auto-clear the store lock when the user undoes their last remaining
 * active update on the store. Called from /api/updates/[id]/undo.
 */
export async function autoClearLockIfNoActiveUpdates(
  storeId: string,
  lockerUserId: string | null
) {
  if (!lockerUserId) return;
  const remaining = await db.update.findFirst({
    where: { storeId, userId: lockerUserId, undoneAt: null },
  });
  if (!remaining) {
    await db.store.update({
      where: { id: storeId },
      data: { lockedById: null, lockedAt: null },
    });
  }
}
