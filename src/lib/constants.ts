// Shared constants for store update types, statuses, brands, and operation hours.

/**
 * Per-store update types. Menu Pull and Deliverect are bulk operations
 * (driven from the dashboard's bulk action bar), so they are NOT in this
 * list of per-store update types.
 */
export const UPDATE_TYPES = [
  {
    id: "cfc-refresh",
    label: "CFC Refresh",
    short: "CFC",
    tooltip: "Pushing data in POS",
    color: "emerald",
  },
  {
    id: "aoo-manual-import",
    label: "AOO Manual Import",
    short: "AOO",
    tooltip: "Completing data export for AOO",
    color: "amber",
  },
] as const;

/**
 * Bulk update types — not per-store. Listed here so the dashboard can
 * display history entries for these operations without offering them as
 * per-store action buttons.
 */
export const BULK_UPDATE_TYPES = [
  {
    id: "menu-pull",
    label: "Menu Pull",
    short: "Menu",
    tooltip:
      "Bulk operation: synchronization of Online Ordering and Kiosks Menu (opens adminportal.kfc.ca)",
    color: "amber",
  },
  {
    id: "deliverect-menu-pull",
    label: "Deliverect MenuPull",
    short: "Deliverect",
    tooltip:
      "Bulk operation (KT only): Deliverect menu synchronization (opens frontend.deliverect.com)",
    color: "rose",
  },
] as const;

/**
 * Statuses used for the status-filter buttons and for "latest status" badges.
 * Note: queued and failed are NOT included.
 */
export const STATUSES = [
  { id: "all", label: "All", tone: "neutral" },
  { id: "completed", label: "Completed", tone: "emerald" },
  { id: "in-progress", label: "In Progress", tone: "blue" },
  { id: "alerting", label: "Alerting", tone: "rose" },
  { id: "boh-offline", label: "BOH Offline", tone: "red" },
  { id: "cfc-error", label: "CFC Refresh Error", tone: "red" },
  { id: "network-down", label: "Network Down", tone: "red" },
  { id: "power-outage", label: "Power Outage", tone: "red" },
  { id: "other-issues", label: "Other Issues", tone: "amber" },
] as const;

/**
 * Alert statuses — these pulse/animate when present on the dashboard.
 * Mirrors the user-reported issue flags available in the flag-issue selector.
 */
export const ALERT_STATUSES = [
  "alerting",
  "boh-offline",
  "cfc-error",
  "network-down",
  "power-outage",
  "other-issues",
] as const;

/** The three fixed AREA columns on the dashboard. */
export const AREA_COLUMNS = ["Manitoba", "Edmonton", "Calgary"] as const;

/** Brands. */
export const BRANDS = [
  { id: "KFC", label: "KFC" },
  { id: "KT", label: "KT (KFC/TacoBell)" },
] as const;

/**
 * Menu Pull is only eligible for KT stores. KFC-only stores are skipped
 * during bulk Menu Pull (the dashboard still lets the operator click the
 * button, but the bulk action only targets KT stores).
 *
 * Wait — re-reading the spec: "Menu Pull button with KFC logo image".
 * Menu Pull applies to ALL stores (per admin/bulk-menu-pull), and Deliverect
 * applies only to KT stores. But isMenuPullEligible is a brand-level helper
 * the UI can use to show whether a store should participate in Menu Pull.
 *
 * Per the spec: "isMenuPullEligible(brand) — returns true only for KT".
 */
export function isMenuPullEligible(brand: string | null | undefined): boolean {
  return (brand || "").toUpperCase() === "KT";
}

export function isAlertStatus(status: string): boolean {
  return (ALERT_STATUSES as readonly string[]).includes(status);
}

export function statusLabel(status: string): string {
  return STATUSES.find((s) => s.id === status)?.label ?? status;
}

export function updateTypeMeta(type: string) {
  return (
    UPDATE_TYPES.find((t) => t.id === type) ??
    BULK_UPDATE_TYPES.find((t) => t.id === type)
  );
}

/**
 * Classify an "Operation Hours" string into one of three buckets:
 *   - "24/7"     → red background (always-open stores)
 *   - "late"     → green background (closes late, e.g. ≥ 23:00 or "24")
 *   - "standard" → white background (regular hours)
 *
 * The classifier is intentionally simple and forgiving: it looks for
 * obvious "24/7" / "24 hours" tokens first, then parses the latest
 * closing hour in the string.
 */
export function classifyOperationHours(
  hours: string | null | undefined
): "24/7" | "late" | "standard" {
  if (!hours) return "standard";
  const text = String(hours).toLowerCase().trim();

  // Explicit 24/7 markers
  if (
    text.includes("24/7") ||
    text.includes("24 hours") ||
    text.includes("24hrs") ||
    text.includes("24hr") ||
    text.includes("open 24") ||
    text.includes("always open")
  ) {
    return "24/7";
  }

  // Pull every "HH:MM" or "HHMM" token and look at the hour part to find
  // the latest closing hour. e.g. "Mon-Sun 07:00-23:00" → 23 → late.
  const matches = text.match(/(\d{1,2})(?::\d{2})?\s*(?:am|pm)?/g) || [];
  let maxHour = -1;
  for (const raw of matches) {
    let token = raw.trim();
    const ampmMatch = token.match(/(am|pm)$/);
    let ampm: "am" | "pm" | null = ampmMatch ? (ampmMatch[1] as "am" | "pm") : null;
    token = token.replace(/(am|pm)$/i, "").trim();
    const num = parseInt(token, 10);
    if (Number.isNaN(num)) continue;
    let hour = num;
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    // Handle bare "24" as midnight-of-next-day for comparison
    if (hour === 24) hour = 24;
    if (hour > maxHour) maxHour = hour;
  }

  if (maxHour >= 23) return "late";
  return "standard";
}
