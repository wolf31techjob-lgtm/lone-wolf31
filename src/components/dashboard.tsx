"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Store,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  Server,
  Database,
  ShieldCheck,
  Search,
  Upload,
  Download,
  Undo2,
  Power,
  PowerOff,
  Bell,
  Megaphone,
  Users,
  WifiOff,
  Zap,
  AlertCircle,
  KeyRound,
  MapPin,
  Lock,
  Flag,
  ExternalLink,
  UserCog,
  RotateCcw,
  Plus,
  Headphones,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuthedFetch } from "@/hooks/use-authed-fetch";
import { UserManagement } from "@/components/user-management";
import {
  UPDATE_TYPES,
  STATUSES,
  ALERT_STATUSES,
  AREA_COLUMNS,
  isAlertStatus,
  isMenuPullEligible,
  statusLabel,
  updateTypeMeta,
  classifyOperationHours,
} from "@/lib/constants";

/* ============================================================ *
 * Types
 * ============================================================ */

interface DashboardProps {
  user: {
    id: string;
    username: string;
    fullName: string | null;
    role: string;
  };
  token: string;
  onSignOut: () => void;
}

interface LatestUpdateLite {
  id: string;
  type: string;
  status: string;
  notes: string | null;
  startedAt: string;
  completedAt: string | null;
  undoneAt: string | null;
  userId: string;
  username: string;
  fullName: string | null;
  canUndo: boolean;
  canChangeStatus: boolean;
}

interface LatestByType {
  "cfc-refresh": LatestUpdateLite | null;
  "aoo-manual-import": LatestUpdateLite | null;
  "menu-pull": LatestUpdateLite | null;
  "deliverect-menu-pull": LatestUpdateLite | null;
}

interface ActiveStatusLite {
  id: string;
  status: string;
  description: string | null;
  createdAt: string;
  userId: string;
  username: string;
  fullName: string | null;
}

interface StoreRow {
  id: string;
  storeId: string;
  hashCode: string;
  storeNumber: string | null;
  name: string;
  region: string;
  area: string | null;
  branch: string | null;
  address: string | null;
  brand: string | null;
  operationHours: string | null;
  disabled: boolean;
  disabledReason: string | null;
  disabledAt: string | null;
  lockedById: string | null;
  lockedAt: string | null;
  lockedBy: {
    id: string;
    username: string;
    fullName: string | null;
    role: string;
  } | null;
  cfcDone: boolean;
  aooDone: boolean;
  bothDone: boolean;
  canPush: boolean;
  canMarkDone: boolean;
  canUndo: boolean;
  canFlag: boolean;
  latestUpdate: LatestUpdateLite | null;
  latestByType: LatestByType;
  activeStatus: ActiveStatusLite | null;
  effectiveStatus: string | null;
}

interface PushUpdateData {
  ok: boolean;
  pushUpdate: {
    id: string;
    title: string;
    subject: string;
    content: string;
    createdAt: string;
  } | null;
}

interface StoresData {
  ok: boolean;
  stores: StoreRow[];
  totalDisabled: number;
  totalActive: number;
  totalStores: number;
}

interface OnlineUsersData {
  ok: boolean;
  users: Array<{
    id: string;
    username: string;
    fullName: string | null;
    role: string;
    lastActive: string;
  }>;
  count: number;
}

/* ============================================================ *
 * Tone / icon helpers
 * ============================================================ */

const STATUS_TONE: Record<
  string,
  { badge: string; dot: string; ring: string; text: string }
> = {
  completed: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
    text: "text-emerald-700",
  },
  "in-progress": {
    badge: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
    dot: "bg-amber-500",
    ring: "ring-amber-200",
    text: "text-amber-700",
  },
  alerting: {
    badge: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50",
    dot: "bg-rose-500",
    ring: "ring-rose-300",
    text: "text-rose-700",
  },
  "boh-offline": {
    badge: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
    dot: "bg-red-500",
    ring: "ring-red-300",
    text: "text-red-700",
  },
  "cfc-error": {
    badge: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
    dot: "bg-red-500",
    ring: "ring-red-300",
    text: "text-red-700",
  },
  "network-down": {
    badge: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
    dot: "bg-red-500",
    ring: "ring-red-300",
    text: "text-red-700",
  },
  "power-outage": {
    badge: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
    dot: "bg-red-500",
    ring: "ring-red-300",
    text: "text-red-700",
  },
  "other-issues": {
    badge: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
    dot: "bg-amber-500",
    ring: "ring-amber-300",
    text: "text-amber-700",
  },
};

function toneFor(status: string) {
  return STATUS_TONE[status] || STATUS_TONE.alerting;
}

function alertIconFor(status: string) {
  switch (status) {
    case "boh-offline":
      return Server;
    case "cfc-error":
      return AlertCircle;
    case "network-down":
      return WifiOff;
    case "power-outage":
      return Zap;
    case "alerting":
      return AlertTriangle;
    case "other-issues":
      return AlertCircle;
    case "in-progress":
      return RefreshCw;
    case "completed":
      return CheckCircle2;
    default:
      return Bell;
  }
}

function roleLabel(role: string): string {
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

function roleBadgeClass(role: string): string {
  switch ((role || "").toLowerCase()) {
    case "sa":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "admin":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "sd":
      return "bg-gray-100 text-gray-700 border-gray-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function roleIcon(role: string) {
  switch ((role || "").toLowerCase()) {
    case "sa":
      return ShieldCheck;
    case "admin":
      return UserCog;
    case "sd":
      return Headphones;
    default:
      return Users;
  }
}

// Importing Headphones for the SD role icon
// (kept here intentionally — lucide-react re-exports all icons from the root)

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

/* ============================================================ *
 * Main Dashboard
 * ============================================================ */

export function Dashboard({ user, token, onSignOut }: DashboardProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDisabled, setShowDisabled] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyStoreId, setBusyStoreId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const [pushEditOpen, setPushEditOpen] = useState(false);
  const [pushTitle, setPushTitle] = useState("");
  const [pushSubject, setPushSubject] = useState("");
  const [pushContent, setPushContent] = useState("");
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpSubmitting, setCpSubmitting] = useState(false);
  const [userMgmtOpen, setUserMgmtOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [disableTarget, setDisableTarget] = useState<StoreRow | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [flagTarget, setFlagTarget] = useState<StoreRow | null>(null);
  const [flagStatus, setFlagStatus] = useState<string>("");
  const [flagDescription, setFlagDescription] = useState("");
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  // Privilege flags derived from role
  const isSA = user.role === "sa";
  const canManageUsersPanel =
    isSA || user.role === "admin"; // manage-users-panel
  const canUploadExcel = isSA || user.role === "admin";
  const canEditBanner = isSA || user.role === "admin";
  const canDisableStores = isSA || user.role === "admin";
  const canEnableStores = isSA || user.role === "admin";

  // Build the stores URL with query params
  const storesUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (showDisabled) params.set("includeDisabled", "true");
    if (statusFilter !== "all") params.set("status", statusFilter);
    const q = params.toString();
    return `/api/stores${q ? `?${q}` : ""}`;
  }, [search, showDisabled, statusFilter]);

  const {
    data: storesData,
    loading: storesLoading,
    error: storesError,
    refresh: refreshStores,
  } = useAuthedFetch<StoresData>(storesUrl, token, { intervalMs: 10000 });

  const {
    data: pushData,
    refresh: refreshPush,
  } = useAuthedFetch<PushUpdateData>(`/api/push-update`, token, {
    intervalMs: 30000,
  });

  const {
    data: onlineData,
    refresh: refreshOnline,
  } = useAuthedFetch<OnlineUsersData>(`/api/users/online`, token, {
    intervalMs: 10000,
  });

  // Initialize push-edit form when opening
  useEffect(() => {
    if (pushEditOpen && pushData?.pushUpdate) {
      setPushTitle(pushData.pushUpdate.title);
      setPushSubject(pushData.pushUpdate.subject);
      setPushContent(pushData.pushUpdate.content);
    } else if (pushEditOpen && !pushData?.pushUpdate) {
      setPushTitle("");
      setPushSubject("");
      setPushContent("");
    }
  }, [pushEditOpen, pushData]);

  const stores = storesData?.stores ?? [];
  const onlineUsers = onlineData?.users ?? [];
  const pushUpdate = pushData?.pushUpdate ?? null;

  /* ---------------- KPI stats ---------------- */
  const stats = useMemo(() => {
    // For "completed" / "in-progress" counts we look at all ACTIVE stores, not
    // just the ones in the current filter view, so KPIs stay accurate.
    const allActive = stores;
    const total = storesData?.totalActive ?? allActive.length;
    // Completed = both CFC + AOO done
    const completed = allActive.filter((s) => s.bothDone).length;
    // In Progress = has at least one in-progress update, but not fully completed
    const inProgress = allActive.filter((s) => {
      if (s.bothDone) return false;
      const t = s.latestByType;
      return (
        t["cfc-refresh"]?.status === "in-progress" ||
        t["aoo-manual-import"]?.status === "in-progress" ||
        t["menu-pull"]?.status === "in-progress" ||
        t["deliverect-menu-pull"]?.status === "in-progress"
      );
    }).length;
    // Alerting = has an active issue flag OR an alert-status latest update
    const alerting = allActive.filter((s) => {
      if (s.activeStatus) return true;
      if (s.latestUpdate && isAlertStatus(s.latestUpdate.status)) return true;
      return false;
    }).length;
    const disabled = storesData?.totalDisabled ?? 0;
    return { total, completed, inProgress, alerting, disabled };
  }, [stores, storesData]);

  /* ---------------- status filter counts ---------------- */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: stores.length };
    for (const s of STATUSES) {
      if (s.id === "all") continue;
      if (s.id === "completed") {
        counts[s.id] = stores.filter((s) => s.bothDone).length;
      } else if (s.id === "in-progress") {
        counts[s.id] = stores.filter((s) => {
          if (s.bothDone) return false;
          const t = s.latestByType;
          return (
            t["cfc-refresh"]?.status === "in-progress" ||
            t["aoo-manual-import"]?.status === "in-progress" ||
            t["menu-pull"]?.status === "in-progress" ||
            t["deliverect-menu-pull"]?.status === "in-progress"
          );
        }).length;
      } else {
        counts[s.id] = stores.filter(
          (r) => r.effectiveStatus === s.id
        ).length;
      }
    }
    return counts;
  }, [stores]);

  /* ---------------- bulk operations readiness ---------------- */
  // IMPORTANT: bulk readiness checks must use ALL stores (unfiltered),
  // not the search-filtered `stores` array. We fetch a separate unfiltered
  // store list that ignores search/statusFilter so the bulk button states
  // are always based on the complete picture.
  // The `all=1` param is a no-op on the server but ensures this URL is
  // always different from the filtered storesUrl, so React doesn't
  // share state between the two fetches.
  const {
    data: allStoresData,
  } = useAuthedFetch<StoresData>("/api/stores?all=1", token, { intervalMs: 10000 });

  const allActiveStores = useMemo(
    () => (allStoresData?.stores ?? []).filter((s) => !s.disabled),
    [allStoresData]
  );

  const activeStores = useMemo(
    () => stores.filter((s) => !s.disabled),
    [stores]
  );

  const allStoresReady = useMemo(() => {
    return allActiveStores.length > 0 && allActiveStores.every((s) => s.bothDone);
  }, [allActiveStores]);

  const ktStores = useMemo(
    () => allActiveStores.filter((s) => (s.brand || "").toUpperCase() === "KT"),
    [allActiveStores]
  );
  const allKtReady = useMemo(() => {
    return ktStores.length > 0 && ktStores.every((s) => s.bothDone);
  }, [ktStores]);

  // Bulk menu pull in-progress = there's at least one menu-pull in-progress across stores
  const menuPullInProgress = useMemo(() => {
    return allActiveStores.some(
      (s) => s.latestByType["menu-pull"]?.status === "in-progress"
    );
  }, [allActiveStores]);
  const deliverectInProgress = useMemo(() => {
    return allActiveStores.some(
      (s) => s.latestByType["deliverect-menu-pull"]?.status === "in-progress"
    );
  }, [allActiveStores]);

  // Who is working on the bulk ops?
  const menuPullWorker = useMemo(() => {
    const w = allActiveStores.find(
      (s) => s.latestByType["menu-pull"]?.status === "in-progress"
    );
    const u = w?.latestByType["menu-pull"];
    return u ? { username: u.username, fullName: u.fullName, userId: u.userId } : null;
  }, [allActiveStores]);
  const deliverectWorker = useMemo(() => {
    const w = allActiveStores.find(
      (s) => s.latestByType["deliverect-menu-pull"]?.status === "in-progress"
    );
    const u = w?.latestByType["deliverect-menu-pull"];
    return u ? { username: u.username, fullName: u.fullName, userId: u.userId } : null;
  }, [allActiveStores]);

  // Completed state — once all stores have menu-pull/deliverect completed,
  // the button shows as "Completed" and cannot be pressed again until Reset.
  const menuPullAllDone = useMemo(() => {
    return allActiveStores.length > 0 && allActiveStores.every(
      (s) => s.latestByType["menu-pull"]?.status === "completed"
    );
  }, [allActiveStores]);
  const deliverectAllDone = useMemo(() => {
    return ktStores.length > 0 && ktStores.every(
      (s) => s.latestByType["deliverect-menu-pull"]?.status === "completed"
    );
  }, [ktStores]);

  /* ---------------- area grouping ---------------- */
  const storesByArea = useMemo(() => {
    const map: Record<string, StoreRow[]> = {
      Manitoba: [],
      Edmonton: [],
      Calgary: [],
    };
    const others: StoreRow[] = [];
    for (const s of stores) {
      // Case-insensitive matching — trim and lowercase before comparing
      const area = (s.area || s.region || "").trim().toLowerCase();
      if (area === "manitoba") map.Manitoba.push(s);
      else if (area === "edmonton") map.Edmonton.push(s);
      else if (area === "calgary") map.Calgary.push(s);
      else others.push(s);
    }
    return { map, others };
  }, [stores]);

  /* ---------------- handlers ---------------- */
  function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    Promise.all([refreshStores(), refreshPush(), refreshOnline()]).finally(() => {
      window.setTimeout(() => setRefreshing(false), 400);
      toast({
        title: "Data refreshed",
        description: "Latest store statuses and online users have been synced.",
      });
    });
  }

  async function pushStoreUpdate(
    store: StoreRow,
    type: string,
    status: string = "in-progress",
    notes?: string
  ) {
    setBusyStoreId(store.id);
    try {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: store.id,
          type,
          status,
          notes: notes || updateTypeMeta(type)?.tooltip,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Update failed",
          description: data?.error || "Could not push the update.",
          variant: "destructive",
        });
      } else {
        toast({
          title: `${updateTypeMeta(type)?.label} pushed`,
          description: `${store.name} → ${statusLabel(status)}.`,
        });
        refreshStores();
      }
    } catch (e) {
      toast({
        title: "Update failed",
        description: "Network error.",
        variant: "destructive",
      });
    } finally {
      setBusyStoreId(null);
    }
  }

  async function markUpdateDone(store: StoreRow, update: LatestUpdateLite) {
    setBusyStoreId(store.id);
    try {
      const res = await fetch(`/api/updates/${update.id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "completed" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Could not mark as done",
          description: data?.error || "Failed.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Marked as completed",
          description: `${store.name} → ${updateTypeMeta(update.type)?.label} completed.`,
        });
        refreshStores();
      }
    } catch (e) {
      toast({
        title: "Could not mark as done",
        description: "Network error.",
        variant: "destructive",
      });
    } finally {
      setBusyStoreId(null);
    }
  }

  async function undoUpdate(store: StoreRow, update: LatestUpdateLite) {
    setBusyStoreId(store.id);
    try {
      const res = await fetch(`/api/updates/${update.id}/undo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Undo failed",
          description: data?.error || "Could not undo the update.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Update undone",
          description: `Rolled back ${updateTypeMeta(update.type)?.label} on ${store.name}.`,
        });
        refreshStores();
      }
    } catch (e) {
      toast({
        title: "Undo failed",
        description: "Network error.",
        variant: "destructive",
      });
    } finally {
      setBusyStoreId(null);
    }
  }

  async function flagIssue(
    store: StoreRow,
    status: string,
    description: string | null
  ) {
    setFlagSubmitting(true);
    try {
      const res = await fetch(`/api/stores/${store.id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "set", status, description }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Flag issue failed",
          description: data?.error || "Could not flag the issue.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Issue flagged",
          description: `${store.name} → ${statusLabel(status)}.`,
        });
        setFlagTarget(null);
        setFlagStatus("");
        setFlagDescription("");
        refreshStores();
      }
    } catch (e) {
      toast({
        title: "Flag issue failed",
        description: "Network error.",
        variant: "destructive",
      });
    } finally {
      setFlagSubmitting(false);
    }
  }

  async function clearFlag(store: StoreRow) {
    setBusyStoreId(store.id);
    try {
      const res = await fetch(`/api/stores/${store.id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "clear" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Clear flag failed",
          description: data?.error || "Could not clear the issue.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Issue cleared",
          description: `${store.name} is back to normal monitoring.`,
        });
        refreshStores();
      }
    } catch (e) {
      toast({
        title: "Clear flag failed",
        description: "Network error.",
        variant: "destructive",
      });
    } finally {
      setBusyStoreId(null);
    }
  }

  async function handleChangePassword() {
    if (cpSubmitting) return;
    if (cpNew !== cpConfirm) {
      toast({
        title: "Passwords don't match",
        description: "Please re-enter the same password in both fields.",
        variant: "destructive",
      });
      return;
    }
    if (cpNew.length < 6) {
      toast({
        title: "Password too short",
        description: "New password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    setCpSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword: cpCurrent, newPassword: cpNew }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Change password failed",
          description: data?.error || "Could not change the password.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password changed",
          description:
            "Your password has been updated. Use the new one next time you sign in.",
        });
        setChangePasswordOpen(false);
        setCpCurrent("");
        setCpNew("");
        setCpConfirm("");
      }
    } catch (e) {
      toast({
        title: "Change password failed",
        description: "Network error.",
        variant: "destructive",
      });
    } finally {
      setCpSubmitting(false);
    }
  }

  async function disableStore(store: StoreRow, reason: string) {
    setBusyStoreId(store.id);
    try {
      const res = await fetch(`/api/stores/${store.id}/disable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Disable failed",
          description: data?.error || "Could not disable the store.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Store disabled",
          description: `${store.name} has been removed from the active list.`,
        });
        setDisableTarget(null);
        setDisableReason("");
        refreshStores();
      }
    } catch (e) {
      toast({
        title: "Disable failed",
        description: "Network error.",
        variant: "destructive",
      });
    } finally {
      setBusyStoreId(null);
    }
  }

  async function enableStore(store: StoreRow) {
    setBusyStoreId(store.id);
    try {
      const res = await fetch(`/api/stores/${store.id}/enable`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Enable failed",
          description: data?.error || "Could not re-enable the store.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Store re-enabled",
          description: `${store.name} is back in the active list.`,
        });
        refreshStores();
      }
    } catch (e) {
      toast({
        title: "Enable failed",
        description: "Network error.",
        variant: "destructive",
      });
    } finally {
      setBusyStoreId(null);
    }
  }

  async function handleExcelUpload(file: File) {
    setUploading(true);
    setUploadResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (replaceMode) fd.append("replace", "true");
      const res = await fetch("/api/excel/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Upload failed",
          description: data?.error || "Could not process the Excel file.",
          variant: "destructive",
        });
        setUploadResult({ ok: false, error: data?.error });
      } else {
        toast({
          title: "Excel uploaded",
          description: `Created ${data.summary.created}, updated ${data.summary.updated}, skipped ${data.summary.skipped}.`,
        });
        setUploadResult({ ok: true, summary: data.summary, errors: data.errors });
        refreshStores();
      }
    } catch (e) {
      toast({
        title: "Upload failed",
        description: "Network error.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleSavePush() {
    if (!pushTitle.trim() || !pushSubject.trim() || !pushContent.trim()) {
      toast({
        title: "Missing fields",
        description: "Title, Subject, and Content are all required.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await fetch("/api/push-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: pushTitle,
          subject: pushSubject,
          content: pushContent,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Publish failed",
          description: data?.error || "Could not publish the push update.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Push update published",
          description: "The information banner is now visible to all users.",
        });
        setPushEditOpen(false);
        refreshPush();
      }
    } catch (e) {
      toast({
        title: "Publish failed",
        description: "Network error.",
        variant: "destructive",
      });
    }
  }

  async function handleResetAll() {
    if (resetting) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Reset failed",
          description: data?.error || "Could not reset the site.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Site reset",
          description: `Cleared ${data.summary.updatesDeleted} updates, ${data.summary.statusesDeleted} statuses, unlocked ${data.summary.storesUnlocked} stores.`,
        });
        setResetConfirmOpen(false);
        refreshStores();
      }
    } catch (e) {
      toast({
        title: "Reset failed",
        description: "Network error.",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  }

  async function handleBulkMenuPullClick() {
    if (!allStoresReady) {
      toast({
        title: "Cannot start Menu Pull",
        description:
          "All active stores must have CFC Refresh AND AOO Manual Import completed first.",
        variant: "destructive",
      });
      return;
    }
    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/bulk-menu-pull", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Menu Pull failed",
          description: data?.error || "Could not start the bulk Menu Pull.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Menu Pull started",
          description: `Pushed menu-pull to ${data.summary.pushed} of ${data.summary.total} stores. Opening KFC Admin Portal…`,
        });
        // Open KFC admin portal in a new tab
        window.open("https://adminportal.kfc.ca", "_blank", "noopener,noreferrer");
        refreshStores();
      }
    } catch (e) {
      toast({
        title: "Menu Pull failed",
        description: "Network error.",
        variant: "destructive",
      });
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkDeliverectClick() {
    if (!allKtReady) {
      toast({
        title: "Cannot start Deliverect MenuPull",
        description:
          "All active KT stores must have CFC Refresh AND AOO Manual Import completed first.",
        variant: "destructive",
      });
      return;
    }
    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/bulk-deliverect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          title: "Deliverect MenuPull failed",
          description: data?.error || "Could not start the bulk Deliverect MenuPull.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deliverect MenuPull started",
          description: `Pushed deliverect-menu-pull to ${data.summary.pushed} of ${data.summary.total} KT stores. Opening Deliverect…`,
        });
        // Open Deliverect in a new tab
        window.open(
          "https://frontend.deliverect.com/locations",
          "_blank",
          "noopener,noreferrer"
        );
        refreshStores();
      }
    } catch (e) {
      toast({
        title: "Deliverect MenuPull failed",
        description: "Network error.",
        variant: "destructive",
      });
    } finally {
      setBulkBusy(false);
    }
  }

  /**
   * "Done" button handler — mark all in-progress menu-pull (or deliverect)
   * updates as completed across all stores. Uses the per-update status
   * endpoint for each, then refreshes.
   */
  async function handleBulkDone(type: "menu-pull" | "deliverect-menu-pull") {
    setBulkBusy(true);
    try {
      const targets = activeStores
        .map((s) => s.latestByType[type])
        .filter(
          (u): u is LatestUpdateLite =>
            !!u && u.status === "in-progress"
        );
      if (targets.length === 0) {
        toast({
          title: "Nothing to mark done",
          description: "No in-progress updates found for this operation.",
        });
        return;
      }
      let ok = 0;
      let failed = 0;
      await Promise.all(
        targets.map(async (u) => {
          try {
            const res = await fetch(`/api/updates/${u.id}/status`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ status: "completed" }),
            });
            const data = await res.json();
            if (res.ok && data.ok) ok++;
            else failed++;
          } catch {
            failed++;
          }
        })
      );
      toast({
        title: `Bulk done — ${type === "menu-pull" ? "Menu Pull" : "Deliverect MenuPull"}`,
        description: `${ok} marked completed${
          failed ? `, ${failed} failed` : ""
        }.`,
      });
      refreshStores();
    } finally {
      setBulkBusy(false);
    }
  }

  function downloadTemplate() {
    fetch("/api/excel/template", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "store-update-monitor-template.xlsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        toast({
          title: "Download failed",
          description: "Could not download the template.",
          variant: "destructive",
        });
      });
  }

  /* ---------------- render ---------------- */
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/40 via-gray-50 to-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 shadow-sm shadow-emerald-500/30">
              <Store className="w-4.5 h-4.5 text-white" strokeWidth={2.1} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-gray-900">
                Store Update Monitor
              </span>
              <span className="text-[11px] text-gray-500">
                Operations Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Signed in as</span>
              <span className="font-semibold text-gray-800">
                {user.fullName || user.username}
              </span>
              <Badge variant="outline" className={`ml-1 ${roleBadgeClass(user.role)}`}>
                {roleLabel(user.role)}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChangePasswordOpen(true)}
              className="h-8 gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Change password</span>
              <span className="sm:hidden">Password</span>
            </Button>
            {canManageUsersPanel && (
              <Button
                variant={userMgmtOpen ? "secondary" : "outline"}
                size="sm"
                onClick={() => setUserMgmtOpen((v) => !v)}
                className="h-8 gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Users</span>
              </Button>
            )}
            {canUploadExcel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetConfirmOpen(true)}
                className="h-8 gap-1.5 text-red-700 hover:text-red-800 hover:bg-red-50 border-red-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignOut}
              className="h-8 gap-1.5 text-gray-700 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Greeting + GIF */}
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-stretch">
          {/* Greeting (left, 2 cols) */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Welcome back,{" "}
              <span className="text-emerald-600">
                {user.fullName || user.username}
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Real-time visibility into store update execution across Manitoba,
              Edmonton, and Calgary. Last synced{" "}
              <span className="font-medium text-gray-700">
                {new Date().toLocaleString("en-CA", {
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              .
            </p>
            {canUploadExcel && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={downloadTemplate}
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel template
                </Button>
                <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload Excel
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Store Excel File</DialogTitle>
                      <DialogDescription>
                        Upload an .xlsx file with columns:{" "}
                        <span className="font-semibold">
                          ID#, Hashcode, Store Number, Store Name, Region, Area,
                          Branch, Address, Brand, Operation Hours
                        </span>
                        . Existing stores (matched by ID#) will be updated; new
                        ones will be created. Tick "Replace all" to wipe the
                        store list before importing.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={replaceMode}
                          onCheckedChange={(v) => setReplaceMode(v === true)}
                          id="replace-mode"
                        />
                        <span className="font-medium text-gray-800">
                          Replace all stores (wipe existing list before import)
                        </span>
                      </label>
                      <ExcelDropzone
                        uploading={uploading}
                        onFile={handleExcelUpload}
                      />
                      {uploadResult?.ok && (
                        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm">
                          <p className="font-semibold text-emerald-800">
                            Upload successful
                          </p>
                          <p className="text-emerald-700 mt-0.5">
                            Created:{" "}
                            <span className="font-mono font-bold">
                              {uploadResult.summary.created}
                            </span>{" "}
                            · Updated:{" "}
                            <span className="font-mono font-bold">
                              {uploadResult.summary.updated}
                            </span>{" "}
                            · Skipped:{" "}
                            <span className="font-mono font-bold">
                              {uploadResult.summary.skipped}
                            </span>
                            {uploadResult.summary.replaceAll && (
                              <span className="ml-2 text-amber-700">
                                (replace mode)
                              </span>
                            )}
                          </p>
                          {uploadResult.errors?.length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-[12px] text-emerald-700">
                                View {uploadResult.errors.length} warnings
                              </summary>
                              <ul className="mt-1 text-[12px] text-emerald-700/80 list-disc list-inside space-y-0.5 max-h-40 overflow-y-auto">
                                {uploadResult.errors.map(
                                  (e: string, i: number) => (
                                    <li key={i}>{e}</li>
                                  )
                                )}
                              </ul>
                            </details>
                          )}
                        </div>
                      )}
                      {uploadResult && !uploadResult.ok && (
                        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                          {uploadResult.error || "Upload failed."}
                        </div>
                      )}
                    </div>

                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* GIF + Attribution (right, 1 col) */}
          <div className="lg:col-span-1 flex flex-col gap-2">
            <div
              className="relative rounded-2xl overflow-hidden ring-1 ring-emerald-100 shadow-sm h-32 sm:h-36 lg:h-40 bg-emerald-50"
              style={{
                backgroundImage: "url('/store-monitor.gif')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              aria-label="Store Update Monitor animation"
              role="img"
            >
              <div
                className="absolute inset-0 pointer-events-none select-none"
                style={{ userSelect: "none" }}
              />
            </div>
            <p className="text-[11px] leading-relaxed text-gray-500">
              This Online App is officially developed by{" "}
              <span className="font-semibold text-gray-700">
                Mr. Raymond M. Reintegrado
              </span>
              . For any questions or suggestions, please contact him at{" "}
              <a
                href="mailto:raymond.reintegrado@hiflyer.ca"
                className="text-emerald-700 hover:underline font-medium"
              >
                raymond.reintegrado@hiflyer.ca
              </a>
              .
            </p>
          </div>
        </div>

        {/* Push update banner */}
        <section className="mb-6">
          <div className="rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-600/20 overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white" />
              <div className="absolute top-10 right-32 w-24 h-24 rounded-full bg-white" />
            </div>
            <div className="relative px-5 py-5 md:px-7 md:py-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-xl bg-white/15 shrink-0">
                  <Megaphone className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-white/20 text-white border-0 hover:bg-white/20">
                      CURRENT PUSH UPDATE
                    </Badge>
                    <span className="text-[11px] text-emerald-50/80">
                      {pushUpdate
                        ? `Published ${new Date(pushUpdate.createdAt).toLocaleString("en-CA", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : "No active push update"}
                    </span>
                    {canEditBanner && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="ml-auto h-7 bg-white/15 text-white hover:bg-white/25 border-0"
                        onClick={() => setPushEditOpen(true)}
                      >
                        {pushUpdate ? "Edit" : "Publish"}
                      </Button>
                    )}
                  </div>
                  {pushUpdate ? (
                    <>
                      <h2 className="mt-2 text-xl md:text-2xl font-bold tracking-tight leading-tight">
                        {pushUpdate.title}
                      </h2>
                      <p className="mt-1 text-sm md:text-[15px] text-emerald-50/95 font-medium">
                        {pushUpdate.subject}
                      </p>
                      <p className="mt-2 text-[13px] md:text-sm text-emerald-50/90 leading-relaxed max-w-4xl whitespace-pre-wrap">
                        {pushUpdate.content}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-emerald-50/80">
                      No active push update. The System Admin can publish one to
                      inform all users of the current rollout.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KPI cards (5) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
          <KpiCard
            icon={Activity}
            iconClass="bg-emerald-100 text-emerald-700"
            label="Total Stores"
            value={stats.total.toString()}
            sub="Active stores"
          />
          <KpiCard
            icon={CheckCircle2}
            iconClass="bg-emerald-100 text-emerald-700"
            label="Completed"
            value={stats.completed.toString()}
            sub="CFC + AOO done"
          />
          <KpiCard
            icon={RefreshCw}
            iconClass="bg-amber-100 text-amber-700"
            label="In Progress"
            value={stats.inProgress.toString()}
            sub="Live deployments"
          />
          <KpiCard
            icon={AlertTriangle}
            iconClass="bg-rose-100 text-rose-700"
            label="Alerting"
            value={stats.alerting.toString()}
            sub="Needs attention"
            pulse={stats.alerting > 0}
          />
          <KpiCard
            icon={PowerOff}
            iconClass="bg-gray-200 text-gray-700"
            label="Disabled"
            value={stats.disabled.toString()}
            sub="Search to view"
          />
        </div>

        {/* Online users */}
        <div className="mb-6">
          <OnlineUsersCard users={onlineUsers} currentUserId={user.id} />
        </div>

        {/* Bulk operations bar */}
        {activeStores.length > 0 && (
          <section className="mb-6">
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-gray-800">
                  Bulk operations
                </h2>
                <span className="text-[11px] text-gray-400">
                  · apply to ALL stores at once
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Menu Pull button (KFC logo) */}
                <BulkOpCard
                  title="Menu Pull"
                  subtitle="Online Ordering & Kiosks Menu sync"
                  logoSrc="/kfc-logo.png"
                  logoAlt="KFC"
                  ready={allStoresReady && !menuPullAllDone && !deliverectInProgress}
                  readyTone="amber"
                  inProgress={menuPullInProgress}
                  completed={menuPullAllDone}
                  worker={menuPullWorker}
                  disabledReason={
                    activeStores.length === 0
                      ? "No active stores."
                      : deliverectInProgress
                      ? "Deliverect MenuPull is in progress. Complete it first."
                      : !allStoresReady
                      ? "All active stores need CFC + AOO completed before Menu Pull can run."
                      : "Menu Pull is not available right now."
                  }
                  externalHref="https://adminportal.kfc.ca"
                  onStart={handleBulkMenuPullClick}
                  onDone={() => handleBulkDone("menu-pull")}
                  busy={bulkBusy}
                  badge={null}
                />

                {/* Deliverect MenuPull button (Deliverect logo) */}
                <BulkOpCard
                  title="Deliverect MenuPull"
                  subtitle="Deliverect menu sync (KT stores only)"
                  logoSrc="/deliverect-logo.png"
                  logoAlt="Deliverect"
                  ready={allKtReady && !deliverectAllDone}
                  readyTone="rose"
                  inProgress={deliverectInProgress}
                  completed={deliverectAllDone}
                  worker={deliverectWorker}
                  disabledReason={
                    ktStores.length === 0
                      ? "No active KT brand stores."
                      : "All active KT stores need CFC + AOO completed before Deliverect MenuPull can run."
                  }
                  externalHref="https://frontend.deliverect.com/locations"
                  onStart={handleBulkDeliverectClick}
                  onDone={() => handleBulkDone("deliverect-menu-pull")}
                  busy={bulkBusy}
                  badge={{ label: "KT only", tone: "rose" }}
                />
              </div>
            </div>
          </section>
        )}

        {/* Status filter buttons */}
        <section className="mb-4">
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-3 md:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-800">
                Filter by status
              </span>
              <span className="text-[11px] text-gray-400">
                · click a status to query stores
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const count = statusCounts[s.id] ?? 0;
                const active = statusFilter === s.id;
                const alerting = isAlertStatus(s.id);
                const Icon = alerting
                  ? alertIconFor(s.id)
                  : s.id === "all"
                  ? Activity
                  : s.id === "completed"
                  ? CheckCircle2
                  : s.id === "in-progress"
                  ? RefreshCw
                  : Bell;
                return (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(active ? "all" : s.id)}
                    className={`group relative inline-flex items-center gap-2 h-9 px-3.5 rounded-full border text-[13px] font-medium transition-all
                      ${
                        active
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                          : "bg-white border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/40"
                      }
                      ${alerting && count > 0 && !active ? "ring-2 ring-rose-300 ring-offset-1 animate-pulse" : ""}
                    `}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        alerting && count > 0 && !active
                          ? "text-rose-500 animate-pulse"
                          : active
                          ? "text-white"
                          : "text-gray-500"
                      }`}
                    />
                    <span>{s.label}</span>
                    <span
                      className={`ml-0.5 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums
                        ${
                          active
                            ? "bg-white/25 text-white"
                            : count > 0 && alerting
                            ? "bg-rose-100 text-rose-700"
                            : count > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Search + show-disabled bar */}
        <section className="mb-4">
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                placeholder="Search ID#, hashcode, store, region, area, address, brand…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 bg-gray-50 border-gray-200 text-sm"
              />
            </div>
            <Button
              variant={showDisabled ? "secondary" : "outline"}
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setShowDisabled((v) => !v)}
            >
              <PowerOff className="w-3.5 h-3.5" />
              {showDisabled ? "Showing disabled" : "Show disabled"}
            </Button>
          </div>
        </section>

        {/* User management panel */}
        {canManageUsersPanel && userMgmtOpen && (
          <div className="mb-6">
            <UserManagement
              token={token}
              currentUserId={user.id}
              currentUserRole={user.role}
              onUsersChanged={refreshStores}
            />
          </div>
        )}

        {/* Stores by Area — 3 fixed columns */}
        {storesLoading && stores.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-10 text-center text-sm text-gray-500">
            Loading stores…
          </div>
        ) : storesError ? (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-red-100 p-10 text-center text-sm text-red-600">
            Error: {storesError}
          </div>
        ) : stores.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-10 text-center text-sm text-gray-500">
            No stores yet. {canUploadExcel
              ? "Click Upload Excel to import your store list."
              : "Ask an admin to upload the store list."}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              {AREA_COLUMNS.map((area) => (
                <AreaColumn
                  key={area}
                  area={area}
                  stores={storesByArea.map[area]}
                  busyStoreId={busyStoreId}
                  currentUserId={user.id}
                  isSA={isSA}
                  canDisableStores={canDisableStores}
                  canEnableStores={canEnableStores}
                  onPush={pushStoreUpdate}
                  onMarkDone={markUpdateDone}
                  onUndo={undoUpdate}
                  onFlag={(store) => {
                    setFlagTarget(store);
                    setFlagStatus("");
                    setFlagDescription("");
                  }}
                  onClearFlag={clearFlag}
                  onDisable={(store) => {
                    setDisableTarget(store);
                    setDisableReason("");
                  }}
                  onEnable={enableStore}
                />
              ))}
            </div>

            {/* Other Areas (stores that didn't match Manitoba/Edmonton/Calgary) */}
            {storesByArea.others.length > 0 && (
              <section className="mb-6">
                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <h2 className="text-sm font-semibold text-gray-800">
                      Other areas
                    </h2>
                    <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100">
                      {storesByArea.others.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {storesByArea.others.map((s) => (
                      <StoreCard
                        key={s.id}
                        store={s}
                        busy={busyStoreId === s.id}
                        currentUserId={user.id}
                        isSA={isSA}
                        canDisableStores={canDisableStores}
                        canEnableStores={canEnableStores}
                        onPush={pushStoreUpdate}
                        onMarkDone={markUpdateDone}
                        onUndo={undoUpdate}
                        onFlag={(store) => {
                          setFlagTarget(store);
                          setFlagStatus("");
                          setFlagDescription("");
                        }}
                        onClearFlag={clearFlag}
                        onDisable={(store) => {
                          setDisableTarget(store);
                          setDisableReason("");
                        }}
                        onEnable={enableStore}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        <footer className="mt-auto pt-6 text-center text-[11.5px] text-gray-400">
          Store Update Monitor · Operations Dashboard ·{" "}
          {new Date().getFullYear()} · Developed by Mr. Raymond M. Reintegrado
        </footer>
      </main>

      {/* Push-update editor dialog */}
      <Dialog open={pushEditOpen} onOpenChange={setPushEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {pushUpdate ? "Edit current Push Update" : "Publish a new Push Update"}
            </DialogTitle>
            <DialogDescription>
              This information banner is shown to{" "}
              <span className="font-semibold">all users</span> at the top of the
              dashboard. Use it to inform everyone of the current rollout title,
              subject, and details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="push-title" className="text-[13px] font-semibold">
                Update Title
              </Label>
              <Input
                id="push-title"
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="e.g. Q4 2026 POS Firmware Refresh — Batch 14"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="push-subject" className="text-[13px] font-semibold">
                Subject / Subtitle
              </Label>
              <Input
                id="push-subject"
                value={pushSubject}
                onChange={(e) => setPushSubject(e.target.value)}
                placeholder="One-line summary of what this update is doing"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="push-content" className="text-[13px] font-semibold">
                Full Content
              </Label>
              <textarea
                id="push-content"
                value={pushContent}
                onChange={(e) => setPushContent(e.target.value)}
                placeholder="Describe what this push contains, expected downtime, who is affected, and any instructions for branch admins."
                rows={6}
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSavePush}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {pushUpdate ? "Update banner" : "Publish banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change your password</DialogTitle>
            <DialogDescription>
              You're changing the password for your own account ({user.username}).
              You'll need to use the new password the next time you sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cp-current" className="text-[13px] font-semibold">
                Current password
              </Label>
              <Input
                id="cp-current"
                type="password"
                value={cpCurrent}
                onChange={(e) => setCpCurrent(e.target.value)}
                className="h-9"
                placeholder="enter your current password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-new" className="text-[13px] font-semibold">
                New password
              </Label>
              <Input
                id="cp-new"
                type="password"
                value={cpNew}
                onChange={(e) => setCpNew(e.target.value)}
                className="h-9"
                placeholder="minimum 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-confirm" className="text-[13px] font-semibold">
                Confirm new password
              </Label>
              <Input
                id="cp-confirm"
                type="password"
                value={cpConfirm}
                onChange={(e) => setCpConfirm(e.target.value)}
                className="h-9"
                placeholder="re-enter new password"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleChangePassword}
              disabled={
                cpSubmitting || !cpCurrent || cpNew.length < 6 || cpNew !== cpConfirm
              }
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {cpSubmitting ? "Changing…" : "Change password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset confirmation dialog */}
      <AlertDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all results?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear <span className="font-semibold">all updates</span>,{" "}
              <span className="font-semibold">all issue flags</span>, and{" "}
              <span className="font-semibold">unlock every store</span>. Stores
              themselves are kept. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetAll}
              disabled={resetting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {resetting ? "Resetting…" : "Yes, reset everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable store dialog */}
      <Dialog
        open={!!disableTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDisableTarget(null);
            setDisableReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable {disableTarget?.name}?</DialogTitle>
            <DialogDescription>
              Disabling a store removes it from the active list. You can search
              "Show disabled" later to find it again and re-enable it. A reason
              is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="disable-reason" className="text-[13px] font-semibold">
              Reason
            </Label>
            <Input
              id="disable-reason"
              value={disableReason}
              onChange={(e) => setDisableReason(e.target.value)}
              placeholder="e.g. Store closed for renovation"
              className="h-9"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={!disableReason.trim() || busyStoreId === disableTarget?.id}
              onClick={() => {
                if (disableTarget) disableStore(disableTarget, disableReason.trim());
              }}
            >
              {busyStoreId === disableTarget?.id ? "Disabling…" : "Disable store"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag issue selector dialog */}
      <Dialog
        open={!!flagTarget}
        onOpenChange={(o) => {
          if (!o) {
            setFlagTarget(null);
            setFlagStatus("");
            setFlagDescription("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag an issue on {flagTarget?.name}?</DialogTitle>
            <DialogDescription>
              Choose the type of issue. "Other Issues" requires a description.
              Flagging an issue does NOT push an update — it just signals that
              this store needs attention.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: "alerting", label: "Alerting", icon: AlertTriangle },
                { id: "boh-offline", label: "BOH Offline", icon: Server },
                { id: "cfc-error", label: "CFC Refresh Error", icon: AlertCircle },
                { id: "network-down", label: "Network Down", icon: WifiOff },
                { id: "power-outage", label: "Power Outage", icon: Zap },
                { id: "other-issues", label: "Other Issues", icon: Bell },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = flagStatus === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFlagStatus(opt.id)}
                    className={`flex items-center gap-2 px-3 h-10 rounded-md border text-sm font-medium transition-colors ${
                      active
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-white border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/40"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {flagStatus === "other-issues" && (
              <div className="space-y-1.5">
                <Label htmlFor="flag-desc" className="text-[13px] font-semibold">
                  Description (required)
                </Label>
                <textarea
                  id="flag-desc"
                  value={flagDescription}
                  onChange={(e) => setFlagDescription(e.target.value)}
                  placeholder="Describe the issue…"
                  rows={3}
                  className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={
                !flagStatus ||
                (flagStatus === "other-issues" && !flagDescription.trim()) ||
                flagSubmitting
              }
              onClick={() => {
                if (flagTarget && flagStatus) {
                  flagIssue(
                    flagTarget,
                    flagStatus,
                    flagStatus === "other-issues"
                      ? flagDescription.trim()
                      : null
                  );
                }
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {flagSubmitting ? "Flagging…" : "Flag issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================ *
 * Sub-components
 * ============================================================ */

function KpiCard({
  icon: Icon,
  iconClass,
  label,
  value,
  sub,
  pulse,
}: {
  icon: typeof Activity;
  iconClass: string;
  label: string;
  value: string;
  sub: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-sm ring-1 ${
        pulse ? "ring-rose-200" : "ring-gray-100"
      } p-4 md:p-5`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </span>
        <div className={`p-1.5 rounded-lg ${iconClass}`}>
          <Icon className={`w-3.5 h-3.5 ${pulse ? "animate-pulse" : ""}`} />
        </div>
      </div>
      <div className="text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">
        {value}
      </div>
      <div className="text-[11.5px] text-gray-500 mt-1">{sub}</div>
    </div>
  );
}

function OnlineUsersCard({
  users,
  currentUserId,
}: {
  users: OnlineUsersData["users"];
  currentUserId: string;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
            <Users className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Online now</span>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
          {users.length} active
        </Badge>
      </div>
      {users.length === 0 ? (
        <p className="text-xs text-gray-500">No other users online right now.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {users.map((u) => {
            const RIcon = roleIcon(u.role);
            const isMe = u.id === currentUserId;
            return (
              <li
                key={u.id}
                className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50/50 px-2.5 py-1.5"
              >
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-bold uppercase">
                    {(u.fullName || u.username || "?").charAt(0)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-gray-900 truncate">
                    {u.fullName || u.username}
                    {isMe && (
                      <span className="ml-1 text-[11px] text-emerald-600">
                        (you)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">
                    @{u.username}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-[10.5px] ${roleBadgeClass(u.role)}`}
                >
                  <RIcon className="w-3 h-3 mr-1" />
                  {roleLabel(u.role)}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BulkOpCard({
  title,
  subtitle,
  logoSrc,
  logoAlt,
  ready,
  readyTone,
  inProgress,
  completed,
  worker,
  disabledReason,
  externalHref,
  onStart,
  onDone,
  busy,
  badge,
}: {
  title: string;
  subtitle: string;
  logoSrc: string;
  logoAlt: string;
  ready: boolean;
  readyTone: "amber" | "rose";
  inProgress: boolean;
  completed: boolean;
  worker: { username: string; fullName: string | null; userId: string } | null;
  disabledReason: string;
  externalHref: string;
  onStart: () => void;
  onDone: () => void;
  busy: boolean;
  badge: { label: string; tone: "rose" | "amber" } | null;
}) {
  const ringClass = completed
    ? "ring-emerald-300 bg-emerald-50/50"
    : inProgress
    ? readyTone === "amber"
      ? "ring-amber-300 bg-amber-50/50"
      : "ring-rose-300 bg-rose-50/50"
    : ready
    ? readyTone === "amber"
      ? "ring-amber-200 bg-amber-50/30"
      : "ring-rose-200 bg-rose-50/30"
    : "ring-gray-200 bg-gray-50/40";

  return (
    <div className={`rounded-xl ring-1 ${ringClass} p-3.5 flex flex-col gap-2.5`}>
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-white ring-1 ring-gray-200 shrink-0 overflow-hidden">
          <img
            src={logoSrc}
            alt={logoAlt}
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
            {badge && (
              <Badge
                className={`text-[10.5px] ${
                  badge.tone === "rose"
                    ? "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100"
                    : "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100"
                }`}
              >
                {badge.label}
              </Badge>
            )}
            {inProgress && (
              <Badge className="text-[10.5px] bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 animate-pulse">
                in-progress
              </Badge>
            )}
            {completed && (
              <Badge className="text-[10.5px] bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                completed
              </Badge>
            )}
          </div>
          <p className="text-[11.5px] text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Worker info */}
      {inProgress && worker && (
        <div className="text-[11.5px] text-gray-700 bg-white/60 rounded-md px-2.5 py-1.5 border border-gray-200">
          <span className="font-semibold">{worker.fullName || worker.username}</span>{" "}
          is working on this.
        </div>
      )}

      {/* Completed message */}
      {completed && (
        <div className="text-[11.5px] text-emerald-700 bg-emerald-50 rounded-md px-2.5 py-1.5 border border-emerald-200 flex items-start gap-1.5">
          <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-500 shrink-0" />
          <span>Completed. Use Reset to clear all results and start a new cycle.</span>
        </div>
      )}

      {/* Lock reason when not ready and not in-progress and not completed */}
      {!ready && !inProgress && !completed && (
        <div className="text-[11.5px] text-gray-600 bg-white/60 rounded-md px-2.5 py-1.5 border border-gray-200 flex items-start gap-1.5">
          <Lock className="w-3 h-3 mt-0.5 text-gray-500 shrink-0" />
          <span>{disabledReason}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto">
        {completed ? (
          <Button
            size="sm"
            disabled
            className="h-8 gap-1.5 bg-emerald-100 text-emerald-700 border-emerald-200"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </Button>
        ) : !inProgress ? (
          <Button
            size="sm"
            disabled={!ready || busy}
            onClick={onStart}
            className={`h-8 gap-1.5 ${
              ready
                ? readyTone === "amber"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-rose-600 hover:bg-rose-700"
                : "bg-gray-300 text-gray-600 hover:bg-gray-300"
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {ready ? `Start ${title}` : "Locked"}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onDone}
            disabled={busy}
            className={`h-8 gap-1.5 ${
              readyTone === "amber"
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Done
          </Button>
        )}
        <a
          href={externalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11.5px] text-gray-500 hover:text-emerald-700 underline-offset-2 hover:underline ml-auto"
        >
          open portal ↗
        </a>
      </div>
    </div>
  );
}

function AreaColumn({
  area,
  stores,
  busyStoreId,
  currentUserId,
  isSA,
  canDisableStores,
  canEnableStores,
  onPush,
  onMarkDone,
  onUndo,
  onFlag,
  onClearFlag,
  onDisable,
  onEnable,
}: {
  area: string;
  stores: StoreRow[];
  busyStoreId: string | null;
  currentUserId: string;
  isSA: boolean;
  canDisableStores: boolean;
  canEnableStores: boolean;
  onPush: (store: StoreRow, type: string, status?: string, notes?: string) => void;
  onMarkDone: (store: StoreRow, update: LatestUpdateLite) => void;
  onUndo: (store: StoreRow, update: LatestUpdateLite) => void;
  onFlag: (store: StoreRow) => void;
  onClearFlag: (store: StoreRow) => void;
  onDisable: (store: StoreRow) => void;
  onEnable: (store: StoreRow) => void;
}) {
  // Mini status summary for this column
  const done = stores.filter((s) => s.bothDone).length;
  const live = stores.filter((s) => {
    if (s.bothDone) return false;
    const t = s.latestByType;
    return (
      t["cfc-refresh"]?.status === "in-progress" ||
      t["aoo-manual-import"]?.status === "in-progress" ||
      t["menu-pull"]?.status === "in-progress" ||
      t["deliverect-menu-pull"]?.status === "in-progress"
    );
  }).length;
  const alert = stores.filter(
    (s) => s.activeStatus || (s.latestUpdate && isAlertStatus(s.latestUpdate.status))
  ).length;

  // Header status dot: green if all done, amber if any in-progress, red if any alert
  const headerDot =
    alert > 0
      ? "bg-rose-500"
      : live > 0
      ? "bg-amber-500"
      : done === stores.length && stores.length > 0
      ? "bg-emerald-500"
      : "bg-gray-300";

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full ${headerDot}`} />
            <h3 className="text-sm font-bold text-gray-900 truncate">{area}</h3>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            {stores.length}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {done} done
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {live} live
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {alert} alert
          </span>
        </div>
      </div>
      <div className="p-3 flex-1 overflow-y-auto max-h-[640px] custom-scroll">
        {stores.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            No stores in this area.
          </p>
        ) : (
          <div className="space-y-2.5">
            {stores.map((s) => (
              <StoreCard
                key={s.id}
                store={s}
                busy={busyStoreId === s.id}
                currentUserId={currentUserId}
                isSA={isSA}
                canDisableStores={canDisableStores}
                canEnableStores={canEnableStores}
                onPush={onPush}
                onMarkDone={onMarkDone}
                onUndo={onUndo}
                onFlag={onFlag}
                onClearFlag={onClearFlag}
                onDisable={onDisable}
                onEnable={onEnable}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StoreCard({
  store,
  busy,
  currentUserId,
  isSA,
  canDisableStores,
  canEnableStores,
  onPush,
  onMarkDone,
  onUndo,
  onFlag,
  onClearFlag,
  onDisable,
  onEnable,
}: {
  store: StoreRow;
  busy: boolean;
  currentUserId: string;
  isSA: boolean;
  canDisableStores: boolean;
  canEnableStores: boolean;
  onPush: (store: StoreRow, type: string, status?: string, notes?: string) => void;
  onMarkDone: (store: StoreRow, update: LatestUpdateLite) => void;
  onUndo: (store: StoreRow, update: LatestUpdateLite) => void;
  onFlag: (store: StoreRow) => void;
  onClearFlag: (store: StoreRow) => void;
  onDisable: (store: StoreRow) => void;
  onEnable: (store: StoreRow) => void;
}) {
  const cfc = store.latestByType["cfc-refresh"];
  const aoo = store.latestByType["aoo-manual-import"];
  const menu = store.latestByType["menu-pull"];
  const deliverect = store.latestByType["deliverect-menu-pull"];
  const latest = store.latestUpdate;
  const activeStatus = store.activeStatus;
  const effectiveStatus = store.effectiveStatus;

  // Lock info
  const lockedByOther =
    store.lockedById && store.lockedById !== currentUserId;
  const lockedByMe = store.lockedById === currentUserId;

  // Per-store button gating
  // CFC: once completed, permanently locked — only Reset can clear it.
  //      Flag issues DO block CFC/AOO per-store execution (user must clear the flag first).
  // AOO: unlocked ONLY when CFC is completed (but AOO not yet completed).
  //      Once AOO is completed, ALL buttons in the store box are permanently locked.
  // NOTE: Flag issues do NOT block bulk Menu Pull or Deliverect — those are
  //       separate bulk operations that run regardless of per-store flags.
  const cfcCompleted = store.cfcDone;
  const aooCompleted = store.aooDone;
  const bothCompleted = cfcCompleted && aooCompleted;

  // Once both CFC + AOO are completed, ALL buttons in the store box are locked.
  const allButtonsLocked = bothCompleted;

  const cfcLocked =
    cfcCompleted ||
    allButtonsLocked ||
    store.disabled ||
    !!activeStatus ||      // flag issue blocks CFC per-store execution
    !store.canPush ||
    lockedByOther;

  const aooLocked =
    aooCompleted ||
    allButtonsLocked ||
    store.disabled ||
    !!activeStatus ||      // flag issue blocks AOO per-store execution
    !store.canPush ||
    lockedByOther ||
    !store.cfcDone;

  // Operation hours color coding
  const hoursClass = useMemo(() => {
    const cls = classifyOperationHours(store.operationHours);
    if (cls === "24/7") return "bg-red-50 text-red-700 border-red-200";
    if (cls === "late") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-white text-gray-700 border-gray-200";
  }, [store.operationHours]);

  // The "Done" button shows for any in-progress latest update (CFC/AOO/Menu/Deliverect)
  const inProgressUpdate =
    cfc?.status === "in-progress"
      ? cfc
      : aoo?.status === "in-progress"
      ? aoo
      : menu?.status === "in-progress"
      ? menu
      : deliverect?.status === "in-progress"
      ? deliverect
      : null;

  return (
    <div
      className={`rounded-xl bg-white ring-1 ${
        activeStatus ? "ring-rose-200" : "ring-gray-200"
      } shadow-sm overflow-hidden`}
    >
      {/* Top: store-number blue box + ID#/hash */}
      <div className="flex items-stretch">
        {/* Blue store-number box */}
        <div className="bg-blue-600 text-white px-3 py-2.5 flex flex-col justify-center min-w-[88px]">
          <div className="text-[10px] uppercase tracking-wide text-blue-100/90 font-semibold">
            Store No.
          </div>
          <div className="text-sm font-bold leading-tight">
            {store.storeNumber || "—"}
          </div>
          <div className="text-[10.5px] mt-1 text-blue-100/90">
            {store.region}
            {store.brand && (
              <span className="ml-1 px-1 py-0 rounded bg-white/15 font-semibold">
                {store.brand}
              </span>
            )}
          </div>
        </div>

        {/* ID# + hash + name + address */}
        <div className="flex-1 px-3 py-2.5 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-emerald-700 font-bold text-sm tabular-nums">
              ID# {store.storeId}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">
              <span className="font-mono">{store.hashCode}</span>
            </span>
          </div>
          <div className="text-[13px] font-semibold text-gray-900 mt-0.5 truncate">
            {store.name}
          </div>
          {store.address && (
            <div className="flex items-start gap-1 text-[11.5px] text-gray-500 mt-0.5">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-gray-400" />
              <span className="truncate">{store.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Lock / active-status indicator */}
      {(lockedByMe || lockedByOther || activeStatus) && (
        <div className="px-3 pb-2 space-y-1.5">
          {lockedByMe && (
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
              <Lock className="w-3 h-3" />
              You are working on this store
            </div>
          )}
          {lockedByOther && store.lockedBy && (
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
              <Lock className="w-3 h-3" />
              Locked by {store.lockedBy.fullName || store.lockedBy.username}
            </div>
          )}
          {activeStatus && (
            <div
              className={`flex items-start gap-1.5 text-[11.5px] font-semibold rounded-md px-2 py-1 ${
                activeStatus.status === "other-issues"
                  ? "bg-amber-50 border border-amber-200 text-amber-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                {statusLabel(activeStatus.status)}
                {activeStatus.description && (
                  <span className="block font-normal text-[11px] mt-0.5">
                    {activeStatus.description}
                  </span>
                )}
                <span className="block font-normal text-[10.5px] text-gray-600 mt-0.5">
                  Flagged by {activeStatus.fullName || activeStatus.username} ·{" "}
                  {timeAgo(activeStatus.createdAt)}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Disabled banner */}
      {store.disabled && (
        <div className="mx-3 mb-2 rounded-md bg-gray-100 border border-gray-200 px-2 py-1.5 text-[11.5px] text-gray-700">
          <div className="flex items-center gap-1.5 font-semibold">
            <PowerOff className="w-3 h-3" />
            Disabled
          </div>
          {store.disabledReason && (
            <div className="text-[11px] text-gray-600 mt-0.5">
              {store.disabledReason}
            </div>
          )}
        </div>
      )}

      {/* Status + operation hours */}
      <div className="px-3 pb-2 flex items-center justify-between gap-2 flex-wrap">
        {effectiveStatus ? (
          <Badge
            variant="outline"
            className={`gap-1 ${toneFor(effectiveStatus).badge}`}
          >
            <StatusBadgeIcon
              status={effectiveStatus}
              className="w-3 h-3"
            />
            {statusLabel(effectiveStatus)}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="gap-1 bg-gray-50 text-gray-500 border-gray-200"
          >
            <Clock className="w-3 h-3" />
            Awaiting start
          </Badge>
        )}
        {store.operationHours && (
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium ${hoursClass}`}
          >
            <Clock className="w-3 h-3" />
            {store.operationHours}
          </span>
        )}
      </div>

      {/* Latest update info */}
      {latest && !activeStatus && (
        <div className="mx-3 mb-2 rounded-md bg-gray-50 border border-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600">
          <div className="flex items-center gap-1.5 font-semibold text-gray-700">
            {updateTypeMeta(latest.type)?.label || latest.type}
            <span className="font-normal">·</span>
            <span>{statusLabel(latest.status)}</span>
          </div>
          <div className="mt-0.5">
            by {latest.fullName || latest.username} · {timeAgo(latest.startedAt)}
          </div>
          {latest.notes && (
            <div className="mt-0.5 text-gray-500 line-clamp-2">{latest.notes}</div>
          )}
        </div>
      )}

      {/* Per-store action buttons: CFC + AOO (when not disabled) */}
      {!store.disabled && (
        <div className="px-3 pb-2 grid grid-cols-2 gap-1.5">
          <UpdateActionButton
            label="CFC"
            sub={cfcCompleted ? "Completed" : cfc ? statusLabel(cfc.status) : "Push"}
            color="emerald"
            disabled={cfcLocked}
            inProgress={cfc?.status === "in-progress"}
            done={cfcCompleted}
            onClick={() =>
              cfc?.status === "in-progress"
                ? onMarkDone(store, cfc)
                : onPush(store, "cfc-refresh")
            }
            busy={busy}
          />
          <UpdateActionButton
            label="AOO"
            sub={
              aooCompleted
                ? "Completed"
                : !store.cfcDone
                ? "Locked"
                : aoo
                ? statusLabel(aoo.status)
                : "Push"
            }
            color="amber"
            disabled={aooLocked}
            inProgress={aoo?.status === "in-progress"}
            done={aooCompleted}
            onClick={() =>
              aoo?.status === "in-progress"
                ? onMarkDone(store, aoo)
                : onPush(store, "aoo-manual-import")
            }
            busy={busy}
          />
        </div>
      )}

      {/* Bottom action row: flag/clear, disable/enable.
          Once both CFC + AOO are completed, ALL buttons here are locked. */}
      {!store.disabled && !allButtonsLocked && (
        <div className="px-3 pb-3 flex items-center gap-1.5 flex-wrap">
          {activeStatus ? (
            <button
              onClick={() => onClearFlag(store)}
              disabled={busy || !store.canFlag || lockedByOther}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11.5px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-3 h-3" />
              Clear
            </button>
          ) : (
            !store.disabled && !lockedByOther && (
              <button
                onClick={() => onFlag(store)}
                disabled={busy || !store.canFlag}
                className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11.5px] font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Flag className="w-3 h-3" />
                Flag issue
              </button>
            )
          )}

          {canDisableStores && !store.disabled && (
            <button
              onClick={() => onDisable(store)}
              disabled={busy}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11.5px] font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              <PowerOff className="w-3 h-3" />
              Disable
            </button>
          )}
          {canEnableStores && store.disabled && (
            <button
              onClick={() => onEnable(store)}
              disabled={busy}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11.5px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              <Power className="w-3 h-3" />
              Enable
            </button>
          )}
        </div>
      )}

      {/* When both CFC + AOO are completed, show a "Completed" banner instead of buttons */}
      {allButtonsLocked && !store.disabled && (
        <div className="px-3 pb-3">
          <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center gap-1.5 text-[12px] text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Store fully completed — use Reset to start a new cycle.
          </div>
        </div>
      )}
    </div>
  );
}

function UpdateActionButton({
  label,
  sub,
  color,
  disabled,
  inProgress,
  done,
  onClick,
  busy,
}: {
  label: string;
  sub: string;
  color: "emerald" | "amber";
  disabled: boolean;
  inProgress: boolean;
  done: boolean;
  onClick: () => void;
  busy: boolean;
}) {
  const base =
    "h-9 rounded-md text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const cls = done
    ? color === "emerald"
      ? "bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-not-allowed"
      : "bg-amber-100 text-amber-800 border border-amber-200 cursor-not-allowed"
    : inProgress
    ? color === "emerald"
      ? "bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700"
      : "bg-amber-600 text-white border border-amber-600 hover:bg-amber-700"
    : disabled
    ? "bg-gray-50 text-gray-400 border border-gray-200"
    : color === "emerald"
    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
    : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100";
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy || done}
      className={`${base} ${cls}`}
    >
      {busy ? (
        <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      ) : done ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : inProgress ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <Plus className="w-3.5 h-3.5" />
      )}
      <span>{label}</span>
      <span className="text-[10.5px] opacity-80 font-normal">{sub}</span>
    </button>
  );
}

function StatusBadgeIcon({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  switch (status) {
    case "boh-offline":
      return <Server className={className} />;
    case "cfc-error":
      return <AlertCircle className={className} />;
    case "network-down":
      return <WifiOff className={className} />;
    case "power-outage":
      return <Zap className={className} />;
    case "alerting":
      return <AlertTriangle className={className} />;
    case "other-issues":
      return <AlertCircle className={className} />;
    case "in-progress":
      return <RefreshCw className={className} />;
    case "completed":
      return <CheckCircle2 className={className} />;
    default:
      return <Bell className={className} />;
  }
}

function ExcelDropzone({
  uploading,
  onFile,
}: {
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
        dragOver
          ? "border-emerald-400 bg-emerald-50/50"
          : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30"
      }`}
      onClick={() => {
        const el = document.createElement("input");
        el.type = "file";
        el.accept = ".xlsx,.xls";
        el.onchange = () => {
          const f = el.files?.[0];
          if (f) onFile(f);
        };
        el.click();
      }}
    >
      <Upload className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
      <p className="text-sm font-semibold text-gray-800">
        {uploading ? "Uploading…" : "Click to browse or drop .xlsx here"}
      </p>
      <p className="text-[11px] text-gray-500 mt-0.5">
        Accepted: .xlsx files with the 10-column template
      </p>
    </div>
  );
}
