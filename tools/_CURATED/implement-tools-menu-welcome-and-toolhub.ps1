# tools/implement-tools-menu-welcome-and-toolhub.ps1
# Implements:
# - Prioritised ToolGrid (Primary/Common/Advanced)
# - Recently Used (localStorage + route tracker)
# - Tool Hub page (/tools) with search/filter
# - Adds /tools route to AppRoutes.tsx
# - Adds Tools link to flat navigation.ts (label + path only)

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

function Slurp([string]$path) {
  if (!(Test-Path -LiteralPath $path)) { return "" }
  return [IO.File]::ReadAllText($path)
}

Require-RepoRoot

# -----------------------------
# 1) Data model: tool categories + priority
# -----------------------------
$categoriesPath = "src\data\toolCategories.ts"
Backup-File $categoriesPath

$categories = @'
export type ToolPriority = "primary" | "common" | "advanced";

export type ToolLink = {
  label: string;
  path: string;
  description?: string;
  category?: string;      // derived at runtime (optional)
  priority?: ToolPriority; // optional; defaults to "common"
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
      { label: "Analytics", path: "/analytics", description: "Internal usage/performance insights.", priority: "advanced" },
      { label: "Agent Input", path: "/agent", description: "Advanced/internal entry.", priority: "advanced" }
    ]
  }
];

export function getAllTools(): ToolLink[] {
  const out: ToolLink[] = [];
  for (const c of TOOL_CATEGORIES) {
    for (const it of c.items) out.push({ ...it, category: c.label, priority: it.priority ?? "common" });
  }
  return out;
}

export function getToolByPath(path: string): ToolLink | undefined {
  return getAllTools().find((t) => t.path === path);
}
'@

WriteUtf8NoBom $categoriesPath $categories

# -----------------------------
# 2) Recently used storage + route tracker
# -----------------------------
$recentPath = "src\components\tools\recentTools.ts"
Backup-File $recentPath

$recent = @'
import { useEffect, useMemo, useState } from "react";
import { getAllTools, type ToolLink } from "@/data/toolCategories";

const KEY = "wingman_recent_tools_v1";
const MAX = 8;

type Stored = { path: string; ts: number };

function safeParse(raw: string | null): Stored[] {
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

export function recordRecentTool(path: string) {
  const all = getAllTools();
  const exists = all.some((t) => t.path === path);
  if (!exists) return;

  const now = Date.now();
  const cur = safeParse(localStorage.getItem(KEY));
  const next: Stored[] = [{ path, ts: now }, ...cur.filter((x) => x.path !== path)].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function useRecentTools(): ToolLink[] {
  const [tick, setTick] = useState(0);

  // Allow other components to force a refresh by calling recordRecentTool then dispatching a storage event.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setTick((x) => x + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return useMemo(() => {
    const all = getAllTools();
    const map = new Map(all.map((t) => [t.path, t]));
    const cur = safeParse(localStorage.getItem(KEY));
    return cur.map((x) => map.get(x.path)).filter(Boolean) as ToolLink[];
  }, [tick]);
}
'@

WriteUtf8NoBom $recentPath $recent

$trackerPath = "src\components\tools\RecentRouteTracker.tsx"
Backup-File $trackerPath

$tracker = @'
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { recordRecentTool } from "@/components/tools/recentTools";
import { getToolByPath } from "@/data/toolCategories";

export default function RecentRouteTracker() {
  const loc = useLocation();

  useEffect(() => {
    const p = loc.pathname;
    if (!p) return;

    // Record only known tool paths (avoid recording project-specific routes like /design/:id)
    if (getToolByPath(p)) {
      recordRecentTool(p);
      // best-effort: notify same-tab listeners too
      window.dispatchEvent(new StorageEvent("storage", { key: "wingman_recent_tools_v1" }));
    }
  }, [loc.pathname]);

  return null;
}
'@

WriteUtf8NoBom $trackerPath $tracker

# -----------------------------
# 3) ToolGrid: Recently Used + priority grouping
# -----------------------------
$gridPath = "src\components\tools\ToolGrid.tsx"
Backup-File $gridPath

$grid = @'
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { getAllTools, type ToolLink, type ToolPriority } from "@/data/toolCategories";
import { useRecentTools } from "@/components/tools/recentTools";

type Props = {
  search?: string;
  category?: string; // category label match; "All" or empty = all
};

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

function badgeForCategory(cat?: string) {
  if (!cat) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">
      {cat}
    </span>
  );
}

function ToolCard({ t }: { t: ToolLink }) {
  return (
    <Link
      to={t.path}
      className="rounded-2xl border border-white/10 bg-black/10 p-4 hover:bg-emerald-950/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-white font-semibold">{t.label}</div>
        {badgeForCategory(t.category)}
      </div>
      {t.description ? (
        <div className="mt-1 text-xs text-emerald-100/60">{t.description}</div>
      ) : (
        <div className="mt-1 text-xs text-emerald-100/50">Open</div>
      )}
      <div className="mt-3 text-[11px] text-emerald-100/50 font-mono">{t.path}</div>
    </Link>
  );
}

function Section({ title, items }: { title: string; items: ToolLink[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-sm font-bold uppercase tracking-widest text-emerald-100/70">{title}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <ToolCard key={t.path} t={t} />
        ))}
      </div>
    </section>
  );
}

export default function ToolGrid({ search = "", category = "" }: Props) {
  const recent = useRecentTools();

  const all = useMemo(() => {
    const cat = (category || "").trim();
    const allowAll = !cat || cat.toLowerCase() === "all";
    return getAllTools()
      .filter((t) => allowAll || (t.category ?? "").toLowerCase() === cat.toLowerCase())
      .filter((t) => matches(t, search));
  }, [search, category]);

  const primary = all.filter((t) => (t.priority ?? "common") === "primary");
  const common = all.filter((t) => (t.priority ?? "common") === "common");
  const advanced = all.filter((t) => (t.priority ?? "common") === "advanced");

  const recentFiltered = useMemo(() => {
    // only show recent that match current filters/search
    const set = new Set(all.map((t) => t.path));
    return recent.filter((t) => set.has(t.path)).slice(0, 6);
  }, [recent, all]);

  return (
    <div className="space-y-6">
      <Section title="Recently Used" items={recentFiltered} />
      <Section title={priorityLabel("primary")} items={primary} />
      <Section title={priorityLabel("common")} items={common} />
      <Section title={priorityLabel("advanced")} items={advanced} />
    </div>
  );
}
'@

WriteUtf8NoBom $gridPath $grid

# -----------------------------
# 4) Tool Hub page: /tools
# -----------------------------
$toolHubPagePath = "src\pages\ToolHubPage.tsx"
Backup-File $toolHubPagePath

$toolHub = @'
import React, { useMemo, useState } from "react";
import ToolGrid from "@/components/tools/ToolGrid";
import { TOOL_CATEGORIES } from "@/data/toolCategories";

export default function ToolHubPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    return ["All", ...TOOL_CATEGORIES.map((c) => c.label)];
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-2xl font-semibold tracking-tight text-white">Tools</div>
        <div className="mt-1 text-sm text-emerald-100/70">
          Find features quickly by category or search.
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
      </div>

      <ToolGrid search={search} category={category} />
    </div>
  );
}
'@

WriteUtf8NoBom $toolHubPagePath $toolHub

# -----------------------------
# 5) Patch AppRoutes.tsx: add /tools route + RecentRouteTracker
# -----------------------------
$appRoutesPath = "src\AppRoutes.tsx"
if (!(Test-Path -LiteralPath $appRoutesPath)) { throw "Missing: $appRoutesPath" }

Backup-File $appRoutesPath
$ar = Slurp $appRoutesPath

# Ensure imports
if ($ar -notmatch 'ToolHubPage') {
  # Insert after last import
  $lines = $ar -split "(`r`n|`n)"
  $lastImport = -1
  for ($i=0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match '^\s*import\s') { $lastImport = $i } }
  if ($lastImport -ge 0) {
    $lines = $lines[0..$lastImport] + 'import ToolHubPage from "@/pages/ToolHubPage";' + $lines[($lastImport+1)..($lines.Count-1)]
    $ar = ($lines -join "`n")
  } else {
    $ar = 'import ToolHubPage from "@/pages/ToolHubPage";' + "`n" + $ar
  }
}

if ($ar -notmatch 'RecentRouteTracker') {
  $lines = $ar -split "(`r`n|`n)"
  $lastImport = -1
  for ($i=0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match '^\s*import\s') { $lastImport = $i } }
  if ($lastImport -ge 0) {
    $lines = $lines[0..$lastImport] + 'import RecentRouteTracker from "@/components/tools/RecentRouteTracker";' + $lines[($lastImport+1)..($lines.Count-1)]
    $ar = ($lines -join "`n")
  } else {
    $ar = 'import RecentRouteTracker from "@/components/tools/RecentRouteTracker";' + "`n" + $ar
  }
}

# Add tracker inside returned JSX: place right after the first opening tag of the top-level wrapper that contains <Routes>
# Conservative: insert immediately before <Routes if present
if ($ar -notmatch '<RecentRouteTracker\s*/>') {
  $ar2 = [regex]::Replace(
    $ar,
    '(?s)(<Routes\b)',
    '<RecentRouteTracker />' + "`n" + '$1',
    1
  )
  $ar = $ar2
}

# Add route if missing
if ($ar -notmatch 'path\s*=\s*"/tools"') {
  # Insert near other top-level routes: before catch-all "*" if present, else before </Routes>
  if ($ar -match '<Route\s+path\s*=\s*"\*"\s*') {
    $ar = [regex]::Replace(
      $ar,
      '(<Route\s+path\s*=\s*"\*"\s*[^>]*>)',
      '<Route path="/tools" element={<ToolHubPage />} />' + "`n      " + '$1',
      1
    )
  } else {
    $ar = [regex]::Replace(
      $ar,
      '(</Routes>)',
      '  <Route path="/tools" element={<ToolHubPage />} />' + "`n    " + '$1',
      1
    )
  }
}

WriteUtf8NoBom $appRoutesPath $ar

# -----------------------------
# 6) Patch flat navigation.ts: add Tools link (label + path only)
# -----------------------------
$navPath = "src\data\navigation.ts"
if (Test-Path -LiteralPath $navPath) {
  Backup-File $navPath
  $nav = Slurp $navPath

  if ($nav -notmatch 'path\s*:\s*"/tools"') {
    # Insert into first exported array open
    $rxOpen = [regex]::new('export\s+const\s+[A-Za-z0-9_]+\s*(?::[^=]+)?=\s*\[', 'Singleline')
    $mm = $rxOpen.Match($nav)
    if ($mm.Success) {
      $pos = $mm.Index + $mm.Length
      $insert = "`n  // Tools hub (generated by tools/implement-tools-menu-welcome-and-toolhub.ps1)`n  { label: `"Tools`", path: `"/tools`" },`n"
      $nav = $nav.Substring(0, $pos) + $insert + $nav.Substring($pos)
      WriteUtf8NoBom $navPath $nav
    } else {
      Write-Host "WARN: navigation.ts exported array not found; skipped adding /tools link."
    }
  } else {
    Write-Host "navigation.ts already contains /tools; no change."
  }
} else {
  Write-Host "WARN: src\data\navigation.ts not found; skipped."
}

Write-Host ""
Write-Host "OK: Implemented priority ToolGrid + Recently Used + Tool Hub (/tools) + route tracker."
Write-Host "Next:"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"
