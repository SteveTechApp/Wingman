/* __WM_WORKSPACE_NAV_MODEL_V2__
   Persistent nav state + pinned tools + recent activity.
   LocalStorage-backed, safe defaults, and legacy path migration.
*/

export type SalesStage =
  | "Discover"
  | "Qualify"
  | "Design"
  | "Propose"
  | "Review"
  | "Close"
  | "Deliver";

export const SALES_STAGES: SalesStage[] = [
  "Discover",
  "Qualify",
  "Design",
  "Propose",
  "Review",
  "Close",
  "Deliver",
];

export type ToolGroup = "Tools" | "Workspace" | "Other";

export type PinnedTool = {
  id: string;
  label: string;
  path: string;
  group: ToolGroup;
};

export type RecentItem = {
  label: string;
  path: string;
  ts: number;
};

const LS = {
  stage: "wm_stage_v1",
  pinned: "wm_pinned_tools_v2",
  recent: "wm_recent_v2",
};

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function safeGetItem(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}

function safeSetItem(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch {}
}

function normalizePath(p: string): string {
  if (!p) return p;
  if (p === "/app/toolhub" || p.startsWith("/app/toolhub/")) return "/app/tools/catalog";
  if (p === "/app/guru" || p.startsWith("/app/guru")) return "/app/tools/guru";
  if (p === "/tools" || p.startsWith("/tools/")) return "/app/tools/catalog";
  if (p.includes("/app/tools/roomwizard") || p.includes("/app/tools/room-wizard")) return "/app/tools/room";
  return p;
}

/* Sales stage */
export function getStage(): SalesStage {
  const raw = safeGetItem(LS.stage);
  if (raw && SALES_STAGES.includes(raw as SalesStage)) return raw as SalesStage;
  return "Discover";
}
export function setStage(s: SalesStage) {
  if (!SALES_STAGES.includes(s)) return;
  safeSetItem(LS.stage, s);
}

/* Pinned tools */
function defaultPinned(): PinnedTool[] {
  return [
    { id: "catalog", label: "Product Catalog", path: "/app/tools/catalog", group: "Tools" },
    { id: "proposal", label: "Proposal Builder", path: "/app/tools/proposal", group: "Tools" },
    { id: "room", label: "Room Wizard", path: "/app/tools/room", group: "Tools" },
    { id: "competitor", label: "Competitor Compare", path: "/app/tools/competitor", group: "Tools" },
  ];
}

function sanitizePinned(list: unknown): PinnedTool[] {
  if (!Array.isArray(list)) return defaultPinned();
  const out: PinnedTool[] = [];
  for (const x of list) {
    if (!x || typeof x !== "object") continue;
    const o = x as Partial<PinnedTool>;
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : "";
    const label = typeof o.label === "string" && o.label.trim() ? o.label.trim() : "";
    const path = typeof o.path === "string" && o.path.trim() ? normalizePath(o.path.trim()) : "";
    const group: ToolGroup =
      o.group === "Tools" || o.group === "Workspace" || o.group === "Other" ? o.group : "Tools";
    if (!id || !label || !path) continue;
    if (out.some((p) => p.id === id)) continue;
    out.push({ id, label, path, group });
  }
  return out.length ? out : defaultPinned();
}

export function getPinnedTools(): PinnedTool[] {
  const parsed = safeParseJson<unknown>(safeGetItem(LS.pinned));
  const pinned = sanitizePinned(parsed);
  safeSetItem(LS.pinned, JSON.stringify(pinned));
  return pinned;
}

export function setPinnedTools(pinned: PinnedTool[]) {
  const clean = sanitizePinned(pinned);
  safeSetItem(LS.pinned, JSON.stringify(clean));
}

/* Recent */
const RECENT_MAX = 12;

function sanitizeRecent(list: unknown): RecentItem[] {
  if (!Array.isArray(list)) return [];
  const out: RecentItem[] = [];
  for (const x of list) {
    if (!x || typeof x !== "object") continue;
    const o = x as Partial<RecentItem>;
    const label = typeof o.label === "string" && o.label.trim() ? o.label.trim() : "";
    const path = typeof o.path === "string" && o.path.trim() ? normalizePath(o.path.trim()) : "";
    const ts = typeof o.ts === "number" && Number.isFinite(o.ts) ? o.ts : Date.now();
    if (!label || !path) continue;
    const existing = out.findIndex((r) => r.path === path);
    if (existing >= 0) out.splice(existing, 1);
    out.push({ label, path, ts });
    if (out.length >= RECENT_MAX) break;
  }
  return out;
}

export function getRecent(): RecentItem[] {
  const parsed = safeParseJson<unknown>(safeGetItem(LS.recent));
  const recent = sanitizeRecent(parsed);
  safeSetItem(LS.recent, JSON.stringify(recent));
  return recent;
}

export function addRecent(label: string, path: string) {
  const l = (label || "").trim();
  const p = normalizePath((path || "").trim());
  if (!l || !p) return;
  const cur = getRecent();
  const next = [{ label: l, path: p, ts: Date.now() }, ...cur.filter((r) => r.path !== p)].slice(0, RECENT_MAX);
  safeSetItem(LS.recent, JSON.stringify(next));
}
