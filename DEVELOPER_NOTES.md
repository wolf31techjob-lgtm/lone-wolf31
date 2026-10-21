# Developer Notes — Area Tracking Backend Extension (Optional)

This document is for the **developer** of the `lone-wolf31` repository. The
frontend already supports an optional backend-side "current area" feature —
if you implement the simple changes below, online users will see each
other's *actually-viewed area page* (Manitoba / Edmonton / Calgary / Other
/ All) instead of the client-side proxy based on in-progress updates.

> **Important:** If you skip these changes, the frontend still works — it
> just falls back to the proxy (which uses each user's in-progress store
> updates to guess their current area). The frontend gracefully handles
> both cases.

---

## What the frontend already does

1. The Dashboard sends a `POST /api/auth/heartbeat` every 25 seconds and on
   every area switch, with JSON body:

   ```json
   { "currentArea": "manitoba" }
   ```

   `currentArea` is one of: `"manitoba"`, `"edmonton"`, `"calgary"`,
   `"other"`, `"all"`.

2. The Dashboard reads `/api/users/online` and, for each user, checks for an
   optional `currentArea` field on the user object. If present, the
   frontend uses that. If absent, it falls back to the in-progress proxy.

---

## What you need to add (backend)

### 1. Add a column to the `User` table

```prisma
model User {
  // …existing fields…
  currentArea String? @db.VarChar(32)
  areaUpdatedAt DateTime?
}
```

Then run:

```bash
npx prisma migrate dev --name add_user_current_area
```

### 2. Modify the heartbeat endpoint

File: `app/api/auth/heartbeat/route.ts` (your path may differ).

Inside the existing handler that already marks the user "online", also read
and persist the optional body field:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // your prisma client import
import { verifyToken } from "@/lib/auth"; // your existing auth helper

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const payload = await verifyToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Read optional body — never throws if missing/invalid
  let currentArea: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.currentArea === "string") {
      currentArea = body.currentArea;
    }
  } catch {
    // body is empty or not JSON — that's fine, just skip
  }

  await prisma.user.update({
    where: { id: payload.userId },
    data: {
      // existing heartbeat fields (lastActive, isOnline, etc.)
      lastActive: new Date(),
      ...(currentArea
        ? { currentArea, areaUpdatedAt: new Date() }
        : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
```

### 3. Modify the online-users endpoint

File: `app/api/users/online/route.ts` (your path may differ).

Just include `currentArea` in the user object you return:

```ts
const users = await prisma.user.findMany({
  where: { /* your existing "online within last X seconds" filter */ },
  select: {
    id: true,
    username: true,
    fullName: true,
    role: true,
    lastActive: true,
    currentArea: true, // ← add this
  },
});

return NextResponse.json({
  ok: true,
  users, // each user now has { …, currentArea: "manitoba" | null }
  count: users.length,
});
```

### 4. (Optional) Auto-clear stale area

Add a cleanup that sets `currentArea = null` when `lastActive` is older than
~60 seconds — so the dashboard won't keep showing a user "still on Manitoba"
after they closed their tab.

---

## Test it

1. Open the app in two browser windows (different accounts).
2. In window A, switch to the Edmonton page.
3. In window B, the Online Users card should show A's badge as
   "Edmonton" within ~10–25 seconds (the polling interval).
4. If you do NOT implement the backend changes, the badge still updates —
   but only based on which area has A's in-progress store updates.
