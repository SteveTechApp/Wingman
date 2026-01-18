# tools/implement-options-1-5.ps1
# Implements:
# 1) Pin Primary tools even when searching
# 2) Start here banner (Project Setup)
# 3) Usage-aware ordering within bands
# 4) Internal tools gating (hidden by default, toggle to show)
# 5) Optional commit (-Commit)

[CmdletBinding()]
param(
  [switch]$Commit
)

$ErrorActionPreference = "Stop"

function Require-RepoRoot() {
  if (!(Test-Path -LiteralPath "package.json")) {
    throw "Run from repo root (where package.json exists). Current: $((Get-Location).Path)"
  }
}

function Backup-File([string]$path) {
  if (Test-Path -LiteralPath $path) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item -LiteralPath $path -Destination ($path + ".bak_" + $stamp) -Force
    Write-Host ("Backup: {0}.bak_{1}" -f $path, $stamp)
  }
}

function WriteUtf8NoBom([string]$path, [string]$content) {
  $dir = Split-Path -Parent $path
  if ($dir -and !(Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("Wrote: {0}" -f $path)
}

function Ensure-Dir([string]$dir) {
  if ($dir -and !(Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
}

Require-RepoRoot

# -----------------------------
# Files we will write (full replacements)
# -----------------------------
$paths = @(
  "src\data\toolCategories.ts",
  "src\components\tools\recentTools.ts",
  "src\components\tools\ToolGrid.tsx",
  "src\pages\ToolHubPage.tsx",
  "src\pages\WelcomeScreen.tsx",
  "src\components\nav\CategoryMenu.tsx"
)

foreach ($p in $paths) { Ensure-Dir (Split-Path -Parent $p); Backup-File $p }

# -----------------------------
# 1) toolCategories.ts (adds internal flag + helpers)
# -----------------------------
$toolCategories = @'
export type ToolPriority = "primary" | "common" | "advanced";

export type ToolLink = {
  label: string;
  path: string;
  description?: string;
  priority?: ToolPriority;   // defaults to "common"
  internal?: boolean;        // hidden by default unless enabled
  category?: string;         // derived at runtime
};

export type ToolCategory = {
  id: string;
  label: string;
  items: ToolLink[];
};

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: "project",
    label: "Project",
    items: [
      { label: "Project Setup", path: "/setup", description: "Create a project brief and starting context.", priority: "primary" },
      { label: "Customer Discovery", path: "/discovery", description: "Capture room requirements and constraints.", priority: "primary" },
      { label: "Survey Import", path: "/survey", description: "Bring in survey/site data for a project.", priority: "common" }
    ]
  },
  {
    id: "design",
    label: "Design Tools",
    items: [
      { label: "Room Templates", path: "/templates", description: "Pick a close-fit room type and adapt it.", priority: "primary" },
      { label: "Video Wall Tool", path: "/videowall", description: "Plan a video wall and supporting hardware.", priority: "common" }
    ]
  },
  {
    id: "sales",
    label: "Sales Tools",
    items: [
      { label: "Competitor Compare", path: "/compare", description: "Map competitor SKUs to WyreStorm equivalents.", priority: "common" },
      { label: "Ask Guru", path: "/ask", description: "Quick questions and guided decisions.", priority: "common" }
    ]
  },
  {
    id: "training",
    label: "Training",
    items: [
      { label: "Training Hub", path: "/training", description: "Sales enablement and product knowledge.", priority: "primary" }
    ]
  },
  {
    id: "internal",
    label: "Internal",
    items: [
      { label: "Analytics", path: "/analytics", description: "Internal usage/performance insights.", priority: "advanced", internal: true },
      { label: "Agent Input", path: "/agent", description: "Advanced/internal entry.", priority: "advanced", internal: true }
    ]
  }
];

export function getAllTools(): ToolLink[] {
  const out: ToolLink[] = [];
  for (const c of TOOL_CATEGORIES) {
    for (const it of c.items) {
      out.push({
        ...it,
        category: c.label,
        priority: it.priority ?? "common",
        internal: !!it.internal,
      });
    }
  }
  return out;
}

export function getToolByPath(path: string): ToolLink | undefined {
  return getAllTools().find((t) => t.path === path);
}

export function getCategoryLabels(): string[] {
  return TOOL_CATEGORIES.map((c) => c.label);
}
'@
WriteUtf8NoBom "src\data\toolCategories.ts" $toolCategories

# -----------------------------
# 2) recentTools.ts (recent list + usage counts)
# -----------------------------
$recentTools = @'
import { useEffect, useMemo, useState } from "react";
import { getAllTools, type ToolLink } from "@/data/toolCategories";

const KEY_RECENT = "wingman_recent_tools_v1";
const KEY_COUNTS = "wingman_tool_counts_v1";
const MAX = 8;

type Stored = { path: string; ts: number };
type Counts = Record<string, number>;

function safeParseRecent(raw: string | null): Stored[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => ({ path: String(x?.path ?? ""), ts: Number(x?.ts ?? 0) }))
      .filter((x) => x.path && !isNaN(x.ts));
  } catch {
    return [];
  }
}

function safeParseCounts(raw: string | null): Counts {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Counts = {};
    for (const k of Object.keys(v)) {
      const n = Number((v as any)[k]);
      if (!isNaN(n) && n >= 0) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}

export function getUsageCounts(): Counts {
  return safeParseCounts(localStorage.getItem(KEY_COUNTS));
}

export function getUsageCount(path: string): number {
  const c = getUsageCounts();
  return Number(c[path] ?? 0) || 0;
}

export function recordToolUse(path: string) {
  const all = getAllTools();
  const exists = all.some((t) => t.path === path);
  if (!exists) return;

  // recent
  const now = Date.now();
  const cur = safeParseRecent(localStorage.getItem(KEY_RECENT));
  const next: Stored[] = [{ path, ts: now }, ...cur.filter((x) => x.path !== path)].slice(0, MAX);
  localStorage.setItem(KEY_RECENT, JSON.stringify(next));

  // counts
  const counts = safeParseCounts(localStorage.getItem(KEY_COUNTS));
  counts[path] = (Number(counts[path] ?? 0) || 0) + 1;
  localStorage.setItem(KEY_COUNTS, JSON.stringify(counts));

  // best-effort notify same-tab
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: KEY_RECENT }));
    window.dispatchEvent(new StorageEvent("storage", { key: KEY_COUNTS }));
  } catch {
    // ignore
  }
}

export function useRecentTools(): ToolLink[] {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY_RECENT || e.key === KEY_COUNTS) setTick((x) => x + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return useMemo(() => {
    const all = getAllTools();
    const map = new Map(all.map((t) => [t.path, t]));
    const cur = safeParseRecent(localStorage.getItem(KEY_RECENT));
    return cur.map((x) => map.get(x.path)).filter(Boolean) as ToolLink[];
  }, [tick]);
}

export function useUsageCounts(): Counts {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY_COUNTS) setTick((x) => x + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return useMemo(() => getUsageCounts(), [tick]);
}
'@
WriteUtf8NoBom "src\components\tools\recentTools.ts" $recentTools

# -----------------------------
# 3) ToolGrid.tsx
#   - pinned Primary (ignores search)
#   - recent section
#   - usage-aware ordering within each band
#   - internal gating
# -----------------------------
$toolGrid = @'
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { getAllTools, type ToolLink, type ToolPriority } from "@/data/toolCategories";
import { useRecentTools, useUsageCounts } from "@/components/tools/recentTools";

const INTERNAL_FLAG_KEY = "wingman_enable_internal_tools_v1";

type Props = {
  search?: string;
  category?: string;   // category label match; "All" or empty = all
  showInternalOverride?: boolean; // optional override
  pinPrimary?: boolean; // defaults true
};

function isInternalEnabled(): boolean {
  return (localStorage.getItem(INTERNAL_FLAG_KEY) || "").toLowerCase() === "true";
}

function priorityLabel(p: ToolPriority) {
  return p === "primary" ? "Primary" : p === "advanced" ? "Advanced" : "Common";
}

function matches(t: ToolLink, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    (t.label ?? "").toLowerCase().includes(q) ||
    (t.description ?? "").toLowerCase().includes(q) ||
    (t.category ?? "").toLowerCase().includes(q) ||
    (t.path ?? "").toLowerCase().includes(q)
  );
}

function badge(text: string) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">
      {text}
    </span>
  );
}

function ToolCard({ t, usage }: { t: ToolLink; usage: number }) {
  return (
    <Link
      to={t.path}
      className="rounded-2xl border border-white/10 bg-black/10 p-4 hover:bg-emerald-950/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-white font-semibold">{t.label}</div>
        <div className="flex items-center gap-2">
          {t.internal ? badge("Internal") : null}
          {t.category ? badge(t.category) : null}
        </div>
      </div>

      {t.description ? (
        <div className="mt-1 text-xs text-emerald-100/60">{t.description}</div>
      ) : (
        <div className="mt-1 text-xs text-emerald-100/50">Open</div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-[11px] text-emerald-100/50 font-mono">{t.path}</div>
        {usage > 0 ? (
          <div className="text-[10px] text-emerald-100/60 font-mono">Used: {usage}</div>
        ) : null}
      </div>
    </Link>
  );
}

function Section({ title, items, usage }: { title: string; items: ToolLink[]; usage: Record<string, number> }) {
  if (!items.length) return null;
  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-sm font-bold uppercase tracking-widest text-emerald-100/70">{title}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <ToolCard key={t.path} t={t} usage={Number(usage[t.path] ?? 0) || 0} />
        ))}
      </div>
    </section>
  );
}

function sortWithinBand(items: ToolLink[], usage: Record<string, number>) {
  return [...items].sort((a, b) => {
    const ua = Number(usage[a.path] ?? 0) || 0;
    const ub = Number(usage[b.path] ?? 0) || 0;
    if (ub !== ua) return ub - ua;
    return (a.label ?? "").localeCompare(b.label ?? "");
  });
}

export default function ToolGrid({
  search = "",
  category = "",
  showInternalOverride,
  pinPrimary = true,
}: Props) {
  const recent = useRecentTools();
  const usage = useUsageCounts();

  const includeInternal = showInternalOverride ?? isInternalEnabled();

  const all = useMemo(() => {
    const cat = (category || "").trim();
    const allowAll = !cat || cat.toLowerCase() === "all";
    return getAllTools()
      .filter((t) => includeInternal || !t.internal)
      .filter((t) => allowAll || (t.category ?? "").toLowerCase() === cat.toLowerCase());
  }, [category, includeInternal]);

  // Primary pinned: ignores search (still respects category/internal filter)
  const primaryPinned = useMemo(() => {
    const prim = all.filter((t) => (t.priority ?? "common") === "primary");
    return sortWithinBand(prim, usage);
  }, [all, usage]);

  // Non-primary sections respect search
  const filtered = useMemo(() => {
    return all.filter((t) => matches(t, search));
  }, [all, search]);

  const common = useMemo(() => {
    const x = filtered.filter((t) => (t.priority ?? "common") === "common");
    return sortWithinBand(x, usage);
  }, [filtered, usage]);

  const advanced = useMemo(() => {
    const x = filtered.filter((t) => (t.priority ?? "common") === "advanced");
    return sortWithinBand(x, usage);
  }, [filtered, usage]);

  const recentFiltered = useMemo(() => {
    const allowed = new Set(filtered.map((t) => t.path));
    return recent.filter((t) => allowed.has(t.path)).slice(0, 6);
  }, [recent, filtered]);

  return (
    <div className="space-y-6">
      <Section title="Recently Used" items={recentFiltered} usage={usage} />
      <Section title={priorityLabel("primary")} items={pinPrimary ? primaryPinned : primaryPinned.filter((t) => matches(t, search))} usage={usage} />
      <Section title={priorityLabel("common")} items={common} usage={usage} />
      <Section title={priorityLabel("advanced")} items={advanced} usage={usage} />
    </div>
  );
}
'@
WriteUtf8NoBom "src\components\tools\ToolGrid.tsx" $toolGrid

# -----------------------------
# 4) ToolHubPage.tsx
#   - search + category filter
#   - internal toggle (localStorage)
#   - primary pinned by default
# -----------------------------
$toolHubPage = @'
import React, { useMemo, useState } from "react";
import ToolGrid from "@/components/tools/ToolGrid";
import { TOOL_CATEGORIES } from "@/data/toolCategories";

const INTERNAL_FLAG_KEY = "wingman_enable_internal_tools_v1";

function getInternalEnabled(): boolean {
  return (localStorage.getItem(INTERNAL_FLAG_KEY) || "").toLowerCase() === "true";
}

export default function ToolHubPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showInternal, setShowInternal] = useState<boolean>(() => getInternalEnabled());

  const categories = useMemo(() => {
    return ["All", ...TOOL_CATEGORIES.map((c) => c.label)];
  }, []);

  const toggleInternal = (v: boolean) => {
    setShowInternal(v);
    localStorage.setItem(INTERNAL_FLAG_KEY, v ? "true" : "false");
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: INTERNAL_FLAG_KEY }));
    } catch {
      // ignore
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-2xl font-semibold tracking-tight text-white">Tools</div>
        <div className="mt-1 text-sm text-emerald-100/70">
          Find features quickly by category or search. Primary tools stay visible.
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-emerald-100/70 mb-2">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to filter tools…"
              className="w-full h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-white placeholder:text-emerald-100/40 outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-emerald-100/70 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="w-full h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-white outline-none focus:ring-2 focus:ring-emerald-300"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-slate-950 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-emerald-100/70">
            <input
              type="checkbox"
              checked={showInternal}
              onChange={(e) => toggleInternal(e.target.checked)}
              className="h-4 w-4"
            />
            Show internal tools
          </label>
          <div className="text-xs text-emerald-100/50">
            Internal tools are hidden by default to keep the UI clean for partners and distributors.
          </div>
        </div>
      </div>

      <ToolGrid search={search} category={category} showInternalOverride={showInternal} pinPrimary />
    </div>
  );
}
'@
WriteUtf8NoBom "src\pages\ToolHubPage.tsx" $toolHubPage

# -----------------------------
# 5) WelcomeScreen.tsx
#   - fixes single-root return
#   - adds "Start here" banner above ToolGrid
# -----------------------------
$welcomeScreen = @'
import React from "react";
import { Link } from "react-router-dom";

import DefaultWelcome from "../components/welcome/DefaultWelcome";
import ToolGrid from "@/components/tools/ToolGrid";

const WelcomeScreen: React.FC = () => {
  return (
    <>
      <DefaultWelcome />

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-100/70">
              Start here
            </div>
            <div className="mt-1 text-white font-semibold">
              New to Wingman? Begin with Project Setup.
            </div>
            <div className="mt-1 text-xs text-emerald-100/60">
              Capture the project basics first, then use templates and tools to refine the design.
            </div>
          </div>

          <Link
            to="/setup"
            className="h-11 inline-flex items-center justify-center rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-emerald-950 hover:bg-emerald-300"
          >
            Start Project Setup
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <ToolGrid pinPrimary />
      </div>
    </>
  );
};

export default WelcomeScreen;
'@
WriteUtf8NoBom "src\pages\WelcomeScreen.tsx" $welcomeScreen

# -----------------------------
# 6) CategoryMenu.tsx
#   - adds "Tools Hub" item
#   - keeps categories
#   - internal toggle surfaced (optional)
# -----------------------------
$categoryMenu = @'
import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { TOOL_CATEGORIES, type ToolCategory } from "@/data/toolCategories";

const INTERNAL_FLAG_KEY = "wingman_enable_internal_tools_v1";

function isActivePath(currentPath: string, target: string) {
  if (target === "/") return currentPath === "/";
  return currentPath === target || currentPath.startsWith(target + "/");
}

function getInternalEnabled(): boolean {
  return (localStorage.getItem(INTERNAL_FLAG_KEY) || "").toLowerCase() === "true";
}

export default function CategoryMenu() {
  const [open, setOpen] = useState(false);
  const [showInternal, setShowInternal] = useState<boolean>(() => getInternalEnabled());
  const loc = useLocation();

  const active = useMemo(() => {
    const current = loc.pathname;
    for (const c of TOOL_CATEGORIES) {
      for (const it of c.items) {
        if (isActivePath(current, it.path)) return { category: c, item: it };
      }
    }
    return null;
  }, [loc.pathname]);

  const toggleInternal = (v: boolean) => {
    setShowInternal(v);
    localStorage.setItem(INTERNAL_FLAG_KEY, v ? "true" : "false");
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: INTERNAL_FLAG_KEY }));
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white hover:bg-black/30"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-emerald-100/70">Menu</span>
        <span className="text-white">{active?.item?.label ?? "Tools"}</span>
        <span className="text-emerald-100/60">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-[380px] rounded-2xl border border-white/10 bg-slate-950 shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-100/60">
              Tools & Categories
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <Link
                to="/tools"
                onClick={() => setOpen(false)}
                className="text-xs text-emerald-100/70 hover:text-emerald-100 underline"
              >
                Open Tools Hub
              </Link>

              <label className="inline-flex items-center gap-2 text-xs text-emerald-100/60">
                <input
                  type="checkbox"
                  checked={showInternal}
                  onChange={(e) => toggleInternal(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Internal
              </label>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-auto">
            {TOOL_CATEGORIES.map((c: ToolCategory) => (
              <div key={c.id} className="border-b border-white/5">
                <div className="px-4 pt-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-emerald-100/60">
                  {c.label}
                </div>

                <div className="pb-2">
                  {c.items
                    .filter((it) => showInternal || !it.internal)
                    .map((it) => (
                      <Link
                        key={it.path}
                        to={it.path}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2 hover:bg-emerald-950/40"
                        role="menuitem"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-white">{it.label}</div>
                          {it.internal ? (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/50">
                              Internal
                            </span>
                          ) : null}
                        </div>
                        {it.description ? (
                          <div className="mt-0.5 text-xs text-emerald-100/60">{it.description}</div>
                        ) : null}
                      </Link>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 bg-black/20">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-emerald-100/60 hover:text-emerald-100"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
'@
WriteUtf8NoBom "src\components\nav\CategoryMenu.tsx" $categoryMenu

Write-Host ""
Write-Host "OK: Options 1-4 implemented (pinned Primary, Start Here, usage ordering, internal gating)."

# -----------------------------
# 7) Optional commit (Option 5)
# -----------------------------
if ($Commit) {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "git not found in PATH."
  }

  Write-Host ""
  Write-Host "== Git commit =="
  & git status

  & git add `
    src\data\toolCategories.ts `
    src\components\tools\recentTools.ts `
    src\components\tools\ToolGrid.tsx `
    src\pages\ToolHubPage.tsx `
    src\pages\WelcomeScreen.tsx `
    src\components\nav\CategoryMenu.tsx | Out-Null

  & git commit -m "Improve tool discovery: pinned primary, start banner, recent usage, internal gating" | Out-Null
  Write-Host "Committed."
}

Write-Host ""
Write-Host "Next:"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"
