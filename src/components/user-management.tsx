"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  UserPlus,
  Trash2,
  KeyRound,
  Users,
  ShieldCheck,
  Headphones,
  UserCog,
  User as UserIcon,
  RefreshCw,
  Crown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserRow {
  id: string;
  username: string;
  fullName: string | null;
  role: string; // "sa" | "admin" | "sd"
  createdAt: string;
}

interface UserManagementProps {
  token: string;
  currentUserId: string;
  currentUserRole: string;
  onUsersChanged?: () => void;
}

const ROLE_META: Record<
  string,
  { label: string; badge: string; icon: typeof UserIcon }
> = {
  sa: {
    label: "SA",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: ShieldCheck,
  },
  admin: {
    label: "Admin",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: UserCog,
  },
  sd: {
    label: "ServiceDesk",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    icon: Headphones,
  },
  user: {
    label: "User",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    icon: UserIcon,
  },
};

function roleMeta(role: string) {
  return ROLE_META[role] || ROLE_META.user;
}

export function UserManagement({
  token,
  currentUserId,
  currentUserRole,
  onUsersChanged,
}: UserManagementProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [roleTarget, setRoleTarget] = useState<UserRow | null>(null);

  // New user form state
  const [nuUsername, setNuUsername] = useState("");
  const [nuPassword, setNuPassword] = useState("");
  const [nuFullName, setNuFullName] = useState("");
  const [nuRole, setNuRole] = useState<string>("sd");
  const [adding, setAdding] = useState(false);

  // Reset password form
  const [rpPassword, setRpPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Delete confirmation
  const [deleting, setDeleting] = useState(false);

  // Change role form
  const [crRole, setCrRole] = useState<string>("sd");
  const [changingRole, setChangingRole] = useState(false);

  const isSA = currentUserRole === "sa";

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setUsers(data.users);
      } else {
        toast({
          title: "Failed to load users",
          description: data?.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Failed to load users",
        description: "Network error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [token]);

  async function handleAddUser() {
    if (adding) return;
    const u = nuUsername.trim().toLowerCase();
    const p = nuPassword;
    const fn = nuFullName.trim() || null;
    if (!u || !p) {
      toast({
        title: "Missing fields",
        description: "Username and password are required.",
        variant: "destructive",
      });
      return;
    }
    if (p.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    // Admin can only create sd users
    if (!isSA && nuRole !== "sd") {
      toast({
        title: "Permission denied",
        description: "Admins can only create ServiceDesk (sd) accounts.",
        variant: "destructive",
      });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: u, password: p, fullName: fn, role: nuRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Failed to create user",
          description: data?.error || "Unknown error",
          variant: "destructive",
        });
      } else {
        toast({
          title: "User created",
          description: `${data.user.username} (${roleMeta(data.user.role).label}) is ready to sign in.`,
        });
        setNuUsername("");
        setNuPassword("");
        setNuFullName("");
        setNuRole("sd");
        setAddOpen(false);
        loadUsers();
        onUsersChanged?.();
      }
    } catch (e) {
      toast({
        title: "Failed to create user",
        description: "Network error",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleResetPassword() {
    if (!resetTarget || resetting) return;
    if (rpPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`/api/users/${resetTarget.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: rpPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Failed to reset password",
          description: data?.error || "Unknown error",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password reset",
          description: `${resetTarget.username}'s password was reset. Their existing sessions were signed out.`,
        });
        setRpPassword("");
        setResetTarget(null);
      }
    } catch (e) {
      toast({
        title: "Failed to reset password",
        description: "Network error",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  }

  async function handleChangeRole() {
    if (!roleTarget || changingRole) return;
    setChangingRole(true);
    try {
      const res = await fetch(`/api/users/${roleTarget.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: crRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Failed to change role",
          description: data?.error || "Unknown error",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Role updated",
          description: `${roleTarget.username} is now ${roleMeta(crRole).label}. Their sessions were signed out.`,
        });
        setRoleTarget(null);
        loadUsers();
        onUsersChanged?.();
      }
    } catch (e) {
      toast({
        title: "Failed to change role",
        description: "Network error",
        variant: "destructive",
      });
    } finally {
      setChangingRole(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Failed to delete user",
          description: data?.error || "Unknown error",
          variant: "destructive",
        });
      } else {
        toast({
          title: "User deleted",
          description: `${deleteTarget.username} was removed.`,
        });
        setDeleteTarget(null);
        loadUsers();
        onUsersChanged?.();
      }
    } catch (e) {
      toast({
        title: "Failed to delete user",
        description: "Network error",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  const saCount = users.filter((u) => u.role === "sa").length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const sdCount = users.filter((u) => u.role === "sd").length;

  // Admins cannot reset an SA's password (only SA can)
  const canResetPasswordOf = (target: UserRow) =>
    isSA || target.role !== "sa";

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-semibold text-gray-900">
              User Management
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {isSA
              ? "As System Admin, you can add users, change roles, reset passwords, and delete accounts."
              : "As Admin, you can add ServiceDesk (sd) users and reset non-SA passwords. Only the SA can change roles or delete accounts."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            {saCount} SA
          </Badge>
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
            {adminCount} Admin
          </Badge>
          <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100">
            {sdCount} ServiceDesk
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={loadUsers}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Reload
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <UserPlus className="w-3.5 h-3.5" />
                Add user
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new user account</DialogTitle>
                <DialogDescription>
                  Choose the role carefully.{" "}
                  <span className="font-semibold">SA</span> can do everything
                  (delete users, change roles, etc.).{" "}
                  <span className="font-semibold">Admin</span> can add users,
                  upload Excel, edit banners, and disable/enable stores.{" "}
                  <span className="font-semibold">ServiceDesk (SD)</span> can
                  push and undo updates and flag issues only.
                  {!isSA && (
                    <>
                      {" "}
                      As an <span className="font-semibold">Admin</span>, you
                      can only create{" "}
                      <span className="font-semibold">ServiceDesk</span>{" "}
                      accounts.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nu-username" className="text-[13px] font-semibold">
                      UserID
                    </Label>
                    <Input
                      id="nu-username"
                      value={nuUsername}
                      onChange={(e) => setNuUsername(e.target.value)}
                      placeholder="e.g. jsmith"
                      className="h-9"
                      autoCapitalize="off"
                      autoCorrect="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nu-fullname" className="text-[13px] font-semibold">
                      Full name (optional)
                    </Label>
                    <Input
                      id="nu-fullname"
                      value={nuFullName}
                      onChange={(e) => setNuFullName(e.target.value)}
                      placeholder="e.g. Jane Smith"
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nu-password" className="text-[13px] font-semibold">
                    Password
                  </Label>
                  <Input
                    id="nu-password"
                    type="password"
                    value={nuPassword}
                    onChange={(e) => setNuPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nu-role" className="text-[13px] font-semibold">
                    Role
                  </Label>
                  <Select
                    value={nuRole}
                    onValueChange={setNuRole}
                    disabled={!isSA}
                  >
                    <SelectTrigger id="nu-role" className="h-9">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {isSA && (
                        <SelectItem value="sa">
                          <span className="flex items-center gap-2">
                            <Crown className="w-3.5 h-3.5 text-emerald-600" />
                            SA (System Admin)
                          </span>
                        </SelectItem>
                      )}
                      {isSA && (
                        <SelectItem value="admin">
                          <span className="flex items-center gap-2">
                            <UserCog className="w-3.5 h-3.5 text-amber-600" />
                            Admin
                          </span>
                        </SelectItem>
                      )}
                      <SelectItem value="sd">
                        <span className="flex items-center gap-2">
                          <Headphones className="w-3.5 h-3.5 text-gray-500" />
                          ServiceDesk (SD)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {!isSA && (
                    <p className="text-[11.5px] text-amber-700">
                      Admins can only create ServiceDesk users. Ask the SA to
                      create admin or SA accounts.
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={handleAddUser}
                  disabled={adding}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {adding ? "Creating…" : "Create user"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* User table */}
      <ul className="divide-y divide-gray-100">
        {loading && users.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-gray-500">
            Loading users…
          </li>
        )}
        {!loading && users.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-gray-500">
            No users found.
          </li>
        )}
        {users.map((u) => {
          const meta = roleMeta(u.role);
          const Icon = meta.icon;
          const isMe = u.id === currentUserId;
          const isLastSA = u.role === "sa" && saCount <= 1;
          const canReset = canResetPasswordOf(u);
          return (
            <li
              key={u.id}
              className="px-5 py-3 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-center hover:bg-emerald-50/30 transition-colors"
            >
              <div className="sm:col-span-5 flex items-center gap-2.5 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 shrink-0">
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {u.fullName || u.username}
                    {isMe && (
                      <span className="ml-1.5 text-[11px] text-emerald-600 font-semibold">
                        (you)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">
                    UserID: <span className="font-mono">{u.username}</span>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-3">
                <Badge variant="outline" className={`gap-1.5 font-medium ${meta.badge}`}>
                  <Icon className="w-3 h-3" />
                  {meta.label}
                </Badge>
              </div>

              <div className="sm:col-span-1 text-[11px] text-gray-500">
                Created{" "}
                {new Date(u.createdAt).toLocaleString("en-CA", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>

              <div className="sm:col-span-3 flex items-center gap-1.5 sm:justify-end">
                <TooltipProvider delayDuration={200}>
                  {/* Change role — SA only */}
                  {isSA && !isMe && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            setRoleTarget(u);
                            setCrRole(u.role);
                          }}
                          disabled={isLastSA}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Change role"
                        >
                          <UserCog className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="font-semibold">Change role</p>
                        <p className="text-[12px] text-gray-500 mt-0.5">
                          {isLastSA
                            ? "Cannot change the last SA's role"
                            : "Promote or demote this user"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Reset password — SA + Admin (not for SA if Admin) */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setResetTarget(u);
                          setRpPassword("");
                        }}
                        disabled={!canReset}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Reset password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="font-semibold">Reset password</p>
                      <p className="text-[12px] text-gray-500 mt-0.5">
                        {canReset
                          ? "Sets a new password & signs out all their sessions"
                          : "Only the SA can reset an SA's password"}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Delete — SA only */}
                  {isSA && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          disabled={isMe || isLastSA}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="font-semibold">
                          {isMe
                            ? "Cannot delete your own account"
                            : isLastSA
                            ? "Cannot delete the last SA"
                            : "Delete user"}
                        </p>
                        {!isMe && !isLastSA && (
                          <p className="text-[12px] text-gray-500 mt-0.5">
                            Permanently removes this account
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Reset password dialog */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(o) => {
          if (!o) setResetTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password for {resetTarget?.username}?</DialogTitle>
            <DialogDescription>
              Set a new password for this account. All of their existing sessions
              will be immediately signed out, and they'll need to sign in again
              with the new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rp-password" className="text-[13px] font-semibold">
              New password
            </Label>
            <Input
              id="rp-password"
              type="password"
              value={rpPassword}
              onChange={(e) => setRpPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="h-9"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleResetPassword}
              disabled={resetting || rpPassword.length < 6}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {resetting ? "Resetting…" : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change role dialog — SA only */}
      <Dialog
        open={!!roleTarget}
        onOpenChange={(o) => {
          if (!o) setRoleTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role for {roleTarget?.username}?</DialogTitle>
            <DialogDescription>
              Pick a new role. Their existing sessions will be signed out so they
              have to sign in again with the new role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cr-role" className="text-[13px] font-semibold">
              New role
            </Label>
            <Select value={crRole} onValueChange={setCrRole}>
              <SelectTrigger id="cr-role" className="h-9">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sa">
                  <span className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-emerald-600" />
                    SA (System Admin)
                  </span>
                </SelectItem>
                <SelectItem value="admin">
                  <span className="flex items-center gap-2">
                    <UserCog className="w-3.5 h-3.5 text-amber-600" />
                    Admin
                  </span>
                </SelectItem>
                <SelectItem value="sd">
                  <span className="flex items-center gap-2">
                    <Headphones className="w-3.5 h-3.5 text-gray-500" />
                    ServiceDesk (SD)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {roleTarget?.role === "sa" && saCount <= 1 && crRole !== "sa" && (
              <p className="text-[11.5px] text-red-700">
                Cannot demote the last remaining SA.
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleChangeRole}
              disabled={
                changingRole ||
                (roleTarget?.role === "sa" && saCount <= 1 && crRole !== "sa")
              }
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {changingRole ? "Changing…" : "Change role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.username}?</DialogTitle>
            <DialogDescription>
              This permanently removes the account. Their pushed updates remain
              in the audit log (attributed to their username), but they will no
              longer be able to sign in. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
