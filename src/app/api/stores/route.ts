import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, hasPrivilege } from "@/lib/auth";

/**
 * GET /api/stores
 *
 * Returns the list of stores (optionally filtered by search and status) along
 * with each store's:
 *   - latestUpdate         — the most recent non-undone Update (any type)
 *   - latestByType         — latest per-type (cfc / aoo / menu / deliverect)
 *   - activeStatus         — the most recent non-cleared StoreStatus (issue flag)
 *   - lockedBy             — info about the user currently holding the store lock
 *   - canPush / canMarkDone / canUndo — derived from the lock & privilege
 *
 * Search is case-insensitive and searches across: storeId, hashCode, storeNumber,
 * name, region, area, branch, address, brand.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const search = (url.searchParams.get("search") || "").trim();
    const includeDisabled = url.searchParams.get("includeDisabled") === "true";
    const statusFilter = url.searchParams.get("status") || "all";

    // Build where clause
    const where: any = {};
    if (!includeDisabled) {
      where.disabled = false;
    }

         if (search) {
      where.OR = [
        { storeId: { contains: search, mode: "insensitive" } },
        { hashCode: { contains: search, mode: "insensitive" } },
        { storeNumber: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { region: { contains: search, mode: "insensitive" } },
        { area: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { operationHours: { contains: search, mode: "insensitive" } },
      ];
    }
    const stores = await db.store.findMany({
      where,
      orderBy: [{ disabled: "asc" }, { storeId: "asc" }],
    });

    const storeIds = stores.map((s) => s.id);

    // All non-undone updates for these stores, ordered by startedAt desc
    const recentUpdates = await db.update.findMany({
      where: {
        storeId: { in: storeIds },
        undoneAt: null,
      },
      orderBy: { startedAt: "desc" },
      include: { user: true },
    });

    // Build per-store maps: latest (any type) and latest-by-type
    const latestByStore = new Map<string, (typeof recentUpdates)[number]>();
    const latestByTypeByStore = new Map<
      string,
      Record<string, (typeof recentUpdates)[number]>
    >();
    for (const u of recentUpdates) {
      if (!latestByStore.has(u.storeId)) {
        latestByStore.set(u.storeId, u);
      }
      const byType = latestByTypeByStore.get(u.storeId) ?? {};
      if (!byType[u.type]) {
        byType[u.type] = u;
      }
      latestByTypeByStore.set(u.storeId, byType);
    }

    // Active (non-cleared) issue flags
    const activeStatuses = await db.storeStatus.findMany({
      where: { storeId: { in: storeIds }, clearedAt: null },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });
    const activeStatusByStore = new Map<string, (typeof activeStatuses)[number]>();
    for (const s of activeStatuses) {
      if (!activeStatusByStore.has(s.storeId)) {
        activeStatusByStore.set(s.storeId, s);
      }
    }

    // Resolve lockedBy user info in one query
    const lockedByIds = Array.from(
      new Set(
        stores
          .map((s) => s.lockedById)
          .filter((x): x is string => Boolean(x))
      )
    );
    const lockedByUsers = lockedByIds.length
      ? await db.user.findMany({
          where: { id: { in: lockedByIds } },
          select: { id: true, username: true, fullName: true, role: true },
        })
      : [];
    const lockedByMap = new Map(lockedByUsers.map((u) => [u.id, u]));

    // Always fetch the total disabled count (independent of the search/filter)
    const totalDisabled = await db.store.count({ where: { disabled: true } });
    const totalActive = await db.store.count({ where: { disabled: false } });
    const totalStores = await db.store.count();

    const isSA = user.role === "sa";

    function statusSummary(s: (typeof stores)[number]) {
      const byType = latestByTypeByStore.get(s.id) ?? {};
      const cfc = byType["cfc-refresh"];
      const aoo = byType["aoo-manual-import"];
      const menu = byType["menu-pull"];
      const deliverect = byType["deliverect-menu-pull"];
      // A store is "fully completed" when BOTH CFC and AOO are completed
      const cfcDone = cfc?.status === "completed";
      const aooDone = aoo?.status === "completed";
      const bothDone = cfcDone && aooDone;
      const anyInProgress =
        cfc?.status === "in-progress" ||
        aoo?.status === "in-progress" ||
        menu?.status === "in-progress" ||
        deliverect?.status === "in-progress";
      return { cfc, aoo, menu, deliverect, cfcDone, aooDone, bothDone, anyInProgress };
    }

    let result = stores.map((s) => {
      const latest = latestByStore.get(s.id);
      const byType = latestByTypeByStore.get(s.id) ?? {};
      const activeStatus = activeStatusByStore.get(s.id);
      const lockedBy = s.lockedById ? lockedByMap.get(s.lockedById) ?? null : null;
      const summary = statusSummary(s);
      const isLocker = lockedBy?.id === user.id;

      // effective status: activeStatus takes priority, otherwise latest update
      const effectiveStatus = activeStatus
        ? activeStatus.status
        : latest
        ? latest.status
        : null;

      return {
        id: s.id,
        storeId: s.storeId,
        hashCode: s.hashCode,
        storeNumber: s.storeNumber,
        name: s.name,
        region: s.region,
        area: s.area,
        branch: s.branch,
        address: s.address,
        brand: s.brand,
        operationHours: s.operationHours,
        disabled: s.disabled,
        disabledReason: s.disabledReason,
        disabledAt: s.disabledAt?.toISOString() ?? null,
        lockedById: s.lockedById,
        lockedAt: s.lockedAt?.toISOString() ?? null,
        lockedBy: lockedBy
          ? {
              id: lockedBy.id,
              username: lockedBy.username,
              fullName: lockedBy.fullName,
              role: lockedBy.role,
            }
          : null,
        // Summary flags for the UI
        cfcDone: summary.cfcDone,
        aooDone: summary.aooDone,
        bothDone: summary.bothDone,
        // Permission flags derived from store lock + role
        canPush: !s.disabled && (!s.lockedById || isLocker || isSA),
        canMarkDone: !s.disabled && (!s.lockedById || isLocker || isSA),
        canUndo: !s.disabled && (!s.lockedById || isLocker || isSA),
        canFlag: !s.disabled && (!s.lockedById || isLocker || isSA),
        // Latest update (any type)
        latestUpdate: latest
          ? {
              id: latest.id,
              type: latest.type,
              status: latest.status,
              notes: latest.notes,
              startedAt: latest.startedAt.toISOString(),
              completedAt: latest.completedAt?.toISOString() ?? null,
              undoneAt: latest.undoneAt?.toISOString() ?? null,
              userId: latest.userId,
              username: latest.user.username,
              fullName: latest.user.fullName,
              canUndo: latest.userId === user.id || isSA,
              canChangeStatus: latest.userId === user.id || isSA,
            }
          : null,
        // Latest per-type
        latestByType: {
          "cfc-refresh": byType["cfc-refresh"]
            ? {
                id: byType["cfc-refresh"].id,
                type: byType["cfc-refresh"].type,
                status: byType["cfc-refresh"].status,
                notes: byType["cfc-refresh"].notes,
                startedAt: byType["cfc-refresh"].startedAt.toISOString(),
                completedAt: byType["cfc-refresh"].completedAt?.toISOString() ?? null,
                userId: byType["cfc-refresh"].userId,
                username: byType["cfc-refresh"].user.username,
                fullName: byType["cfc-refresh"].user.fullName,
              }
            : null,
          "aoo-manual-import": byType["aoo-manual-import"]
            ? {
                id: byType["aoo-manual-import"].id,
                type: byType["aoo-manual-import"].type,
                status: byType["aoo-manual-import"].status,
                notes: byType["aoo-manual-import"].notes,
                startedAt: byType["aoo-manual-import"].startedAt.toISOString(),
                completedAt: byType["aoo-manual-import"].completedAt?.toISOString() ?? null,
                userId: byType["aoo-manual-import"].userId,
                username: byType["aoo-manual-import"].user.username,
                fullName: byType["aoo-manual-import"].user.fullName,
              }
            : null,
          "menu-pull": byType["menu-pull"]
            ? {
                id: byType["menu-pull"].id,
                type: byType["menu-pull"].type,
                status: byType["menu-pull"].status,
                notes: byType["menu-pull"].notes,
                startedAt: byType["menu-pull"].startedAt.toISOString(),
                completedAt: byType["menu-pull"].completedAt?.toISOString() ?? null,
                userId: byType["menu-pull"].userId,
                username: byType["menu-pull"].user.username,
                fullName: byType["menu-pull"].user.fullName,
              }
            : null,
          "deliverect-menu-pull": byType["deliverect-menu-pull"]
            ? {
                id: byType["deliverect-menu-pull"].id,
                type: byType["deliverect-menu-pull"].type,
                status: byType["deliverect-menu-pull"].status,
                notes: byType["deliverect-menu-pull"].notes,
                startedAt: byType["deliverect-menu-pull"].startedAt.toISOString(),
                completedAt: byType["deliverect-menu-pull"].completedAt?.toISOString() ?? null,
                userId: byType["deliverect-menu-pull"].userId,
                username: byType["deliverect-menu-pull"].user.username,
                fullName: byType["deliverect-menu-pull"].user.fullName,
              }
            : null,
        },
        activeStatus: activeStatus
          ? {
              id: activeStatus.id,
              status: activeStatus.status,
              description: activeStatus.description,
              createdAt: activeStatus.createdAt.toISOString(),
              userId: activeStatus.userId,
              username: activeStatus.user.username,
              fullName: activeStatus.user.fullName,
            }
          : null,
        effectiveStatus,
      };
    });

    // Apply status filter on the effective status
    if (statusFilter !== "all") {
      result = result.filter((s) => {
        if (statusFilter === "completed") return s.bothDone;
        if (statusFilter === "in-progress") return !s.bothDone && s.anyInProgress;
        // alert-ish statuses match the effectiveStatus (which prioritises activeStatus)
        return s.effectiveStatus === statusFilter;
      });
    }

    return NextResponse.json({
      ok: true,
      stores: result,
      totalDisabled,
      totalActive,
      totalStores,
    });
  } catch (err) {
    console.error("[stores GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stores — create a store (admin+ only).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const user = await getSessionUser(token);
    if (!user || !hasPrivilege(user, "upload-excel")) {
      return NextResponse.json(
        { ok: false, error: "Admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      storeId,
      hashCode,
      storeNumber,
      name,
      region,
      area,
      branch,
      address,
      brand,
      operationHours,
    } = body;
    if (!storeId || !hashCode || !name) {
      return NextResponse.json(
        { ok: false, error: "storeId, hashCode, and name are required." },
        { status: 400 }
      );
    }

    const created = await db.store.create({
      data: {
        storeId: String(storeId),
        hashCode: String(hashCode),
        storeNumber: storeNumber ? String(storeNumber) : null,
        name: String(name),
        region: String(region || "Manitoba"),
        area: area ? String(area) : null,
        branch: branch ? String(branch) : null,
        address: address ? String(address) : null,
        brand: brand ? String(brand) : null,
        operationHours: operationHours ? String(operationHours) : null,
      },
    });

    return NextResponse.json({ ok: true, store: created });
  } catch (err) {
    console.error("[stores POST] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
