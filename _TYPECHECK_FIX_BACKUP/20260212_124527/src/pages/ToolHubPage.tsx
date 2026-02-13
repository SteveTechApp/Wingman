
import React, { useMemo, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import ToolGrid from "@/components/app/app/app/app/app/app/app/app/tools/ToolGrid";
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
    <PageShell>
      <div className="wm-page\ w-full\ px-4\ py-6\ space-y-6">
      <div className="rounded-2xl\ border\ border-white/10\ bg-black/20\ p-4">
        <div className="text-2xl\ font-semibold\ tracking-tight\ text-white">Tools</div>
        <div className="mt-1\ text-sm\ text-emerald-100/70">
          Find features quickly by category or search. Primary tools stay visible.
        </div>

        <div className="mt-4\ grid\ gap-3\ md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="block\ text-\[11px]\ font-bold\ uppercase\ tracking-widest\ text-emerald-100/70\ mb-2">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to filter tools…"
              className="w-full\ h-11\ rounded-xl\ border\ border-white/10\ bg-black/20\ px-3\ text-white\ placeholder:text-emerald-100/40\ outline-none\ focus:ring-2\ focus:ring-emerald-300"
            />
          </div>

          <div>
            <label className="block\ text-\[11px]\ font-bold\ uppercase\ tracking-widest\ text-emerald-100/70\ mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="w-full\ h-11\ rounded-xl\ border\ border-white/10\ bg-black/20\ px-3\ text-white\ outline-none\ focus:ring-2\ focus:ring-emerald-300"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-slate-950\ text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4\ flex\ flex-wrap\ items-center\ gap-3">
          <label className="inline-flex\ items-center\ gap-2\ text-sm\ text-emerald-100/70">
            <input
              type="checkbox"
              checked={showInternal}
              onChange={(e) => toggleInternal(e.target.checked)}
              className="h-4\ w-4"
            />
            Show internal tools
          </label>
          <div className="text-xs\ text-emerald-100/50">
            Internal tools are hidden by default to keep the UI clean for partners and distributors.
          </div>
        </div>
      </div>

      <ToolGrid search={search} category={category} showInternalOverride={showInternal} pinPrimary />
    </div>
    </PageShell>
  );
}



