import { db } from "./db";
import * as crypto from "crypto";

/**
 * Hash a password using SHA-256. Simple and good enough for this monitoring tool.
 * In production you'd use bcrypt/argon2, but those require native bindings that
 * may not be available in the sandbox.
 */
export function hashPassword(plain: string): string {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return hashPassword(plain) === hashed;
}

export async function createSession(userId: string): Promise<string> {
  // Clean up old expired sessions for this user first
  await db.session.deleteMany({
    where: {
      userId,
      expiresAt: { lt: new Date() },
    },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.session.create({
    data: {
      userId,
      token,
      createdAt: now,
      lastActive: now,
      expiresAt,
    },
  });

  return token;
}

export async function getSessionUser(token: string | undefined | null) {
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

export async function touchSession(token: string | undefined | null) {
  if (!token) return;
  try {
    await db.session.update({
      where: { token },
      data: { lastActive: new Date() },
    });
  } catch {
    // session may have been deleted — non-fatal
  }
}

export async function destroySession(token: string | undefined | null) {
  if (!token) return;
  try {
    await db.session.delete({ where: { token } });
  } catch {
    // already deleted — non-fatal
  }
}

/**
 * Privilege system: three roles with cascading permissions.
 *  - sa    : System Admin — highest level. Can delete users, change roles, everything.
 *  - admin : Admin — can add users, upload Excel, edit banner, disable/enable stores.
 *  - sd    : ServiceDesk — store manipulation and updates only.
 */
export type Privilege =
  | "delete-users"
  | "change-roles"
  | "add-users"
  | "upload-excel"
  | "edit-banner"
  | "disable-stores"
  | "enable-stores"
  | "push-updates"
  | "flag-issues"
  | "manage-users-panel";

const PRIVILEGE_MATRIX: Record<string, Privilege[]> = {
  sa: [
    "delete-users",
    "change-roles",
    "add-users",
    "upload-excel",
    "edit-banner",
    "disable-stores",
    "enable-stores",
    "push-updates",
    "flag-issues",
    "manage-users-panel",
  ],
  admin: [
    "add-users",
    "upload-excel",
    "edit-banner",
    "disable-stores",
    "enable-stores",
    "push-updates",
    "flag-issues",
    "manage-users-panel",
  ],
  sd: ["push-updates", "flag-issues"],
};

/**
 * Check if a user has a specific privilege. SA always has every privilege.
 */
export function hasPrivilege(
  user: { role: string } | null | undefined,
  privilege: Privilege
): boolean {
  if (!user) return false;
  const role = user.role?.toLowerCase() ?? "";
  if (role === "sa") return true;
  const allowed = PRIVILEGE_MATRIX[role] ?? [];
  return allowed.includes(privilege);
}

/** Alias for hasPrivilege — friendlier at call sites that read like English. */
export const canUser = hasPrivilege;

/**
 * Returns the human-readable label for a role.
 */
export function roleLabel(role: string): string {
  switch ((role || "").toLowerCase()) {
    case "sa":
      return "SA";
    case "admin":
      return "Admin";
    case "sd":
      return "ServiceDesk";
    default:
      return role || "User";
  }
}

/**
 * Users whose session was active within the last 90 seconds are considered online.
 */
export async function getOnlineUsers() {
  const cutoff = new Date(Date.now() - 90 * 1000);
  const sessions = await db.session.findMany({
    where: {
      lastActive: { gte: cutoff },
      expiresAt: { gte: new Date() },
    },
    include: { user: true },
    orderBy: { lastActive: "desc" },
  });
  // Deduplicate by user (in case of multiple sessions)
  const byUser = new Map<string, { user: any; lastActive: Date }>();
  for (const s of sessions) {
    const existing = byUser.get(s.userId);
    if (!existing || s.lastActive > existing.lastActive) {
      byUser.set(s.userId, { user: s.user, lastActive: s.lastActive });
    }
  }
  return Array.from(byUser.values()).map((x) => ({
    id: x.user.id,
    username: x.user.username,
    fullName: x.user.fullName,
    role: x.user.role,
    lastActive: x.lastActive.toISOString(),
  }));
}
