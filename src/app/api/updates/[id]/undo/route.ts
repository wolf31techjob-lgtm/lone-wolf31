import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  autoClearLockIfComplete,
  autoClearLockIfNoActiveUpdates,
} from "../../route";

/**
 * Undo an update. Soft-deletes it (sets undoneAt). Only the creator (or SA)
 * can undo. Must respect the store lock.
 *
 * After undoing:
 *   - Auto-clear the store lock if both CFC + AOO are now completed.
 *   - Auto-clear the store lock if the user undoes their last remaining active
 *     update on the store.
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
    const update = await db.update.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!update) {
      return NextResponse.json({ ok: false, error: "Update not found." }, { status: 404 });
    }
    if (update.undoneAt) {
      return NextResponse.json(
        { ok: false, error: "This update has already been undone." },
        { status: 400 }
      );
    }

    const isSA = user.role === "sa";
    // Authorization: creator or SA only
    if (update.userId !== user.id && !isSA) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "You can only undo updates that you created. Only the SA can undo other users' updates.",
        },
        { status: 403 }
      );
    }

    // Respect store lock
    if (update.store.lockedById && update.store.lockedById !== user.id && !isSA) {
      return NextResponse.json(
        { ok: false, error: "This store is currently locked by another user." },
        { status: 423 }
      );
    }

    const undone = await db.update.update({
      where: { id },
      data: {
        undoneAt: new Date(),
        undoneById: user.id,
      },
    });

    // Auto-clear the lock if both CFC and AOO are now completed (in case the
    // undone update was the only thing keeping the store from being "complete")
    await autoClearLockIfComplete(update.storeId);

    // Auto-clear the lock if the user undid their last remaining active update
    await autoClearLockIfNoActiveUpdates(update.storeId, update.store.lockedById);

    return NextResponse.json({ ok: true, update: undone });
  } catch (err) {
    console.error("[updates/undo] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
