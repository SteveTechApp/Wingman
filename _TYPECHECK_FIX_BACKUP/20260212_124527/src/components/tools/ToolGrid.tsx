
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { getAllTools, type ToolLink, type ToolPriority } from "@/data/toolCategories";
import { useRecentTools, useUsageCounts } from "@/components/app/app/app/app/app/app/app/app/tools/recentTools";

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
    <span className="inline-flex\ items-center\ rounded-full\ border\ border-white/10\ bg-black/20\ px-2\ py-0\.5\ text-\[10px]\ font-bold\ uppercase\ tracking-widest\ text-emerald-100/60">
      {text}
    </span>
  );
}

function ToolCard({ t, usage }: { t: ToolLink; usage: number }) {
  return (
    <Link
      to={t.path}
      className="rounded-2xl\ border\ border-white/10\ bg-black/10\ p-4\ hover:bg-emerald-950/30\ transition-colors"
    >
      <div className="flex\ items-start\ justify-between\ gap-3">
        <div className="text-white\ font-semibold">{t.label}</div>
        <div className="flex\ items-center\ gap-2">
          {t.internal ? badge("Internal") : null}
          {t.category ? badge(t.category) : null}
        </div>
      </div>

      {t.description ? (
        <div className="mt-1\ text-xs\ text-emerald-100/60">{t.description}</div>
      ) : (
        <div className="mt-1\ text-xs\ text-emerald-100/50">Open</div>
      )}

      <div className="mt-3\ flex\ items-center\ justify-between\ gap-3">
        <div className="text-\[11px]\ text-emerald-100/50\ font-mono">{t.path}</div>
        {usage > 0 ? (
          <div className="text-\[10px]\ text-emerald-100/60\ font-mono">Used: {usage}</div>
        ) : null}
      </div>
    </Link>
  );
}

function Section({ title, items, usage }: { title: string; items: ToolLink[]; usage: Record<string, number> }) {
  if (!items.length) return null;
  return (
    <section className="rounded-2xl\ border\ border-white/10\ bg-black/20\ p-4">
      <div className="text-sm\ font-bold\ uppercase\ tracking-widest\ text-emerald-100/70">{title}</div>
      <div className="mt-4\ grid\ gap-3\ sm:grid-cols-2\ lg:grid-cols-3">
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
    return recent.filter((t) => allowed.has(((t as any).path ?? (t as any).href ?? (t as any).route) as string)).slice(0, 6);
  }, [recent, filtered]);

  return (
    <div className="space-y-6">
      <Section title="Recently Used" items={recentFiltered.map((t: any) => ({ label: t.label ?? t.name ?? t.title ?? "Tool", path: t.path ?? t.href ?? t.route ?? "/" }))} usage={usage} />
      <Section title={priorityLabel("primary")} items={pinPrimary ? primaryPinned : primaryPinned.filter((t) => matches(t, search))} usage={usage} />
      <Section title={priorityLabel("common")} items={common} usage={usage} />
      <Section title={priorityLabel("advanced")} items={advanced} usage={usage} />
    </div>
  );
}



