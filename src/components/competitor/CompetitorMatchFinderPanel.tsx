
import React, { useMemo, useState } from "react";
import { findWyreStormMatches } from "@/services/app/tools/competitor-compareComparisonService";
import { useDemoRole } from "@/context/DemoRoleContext";

export default function CompetitorMatchFinderPanel() {
  const { role, setRole } = useDemoRole();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [matches, setMatches] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canAdmin = role === "ADMIN";

  const roleLabel = useMemo(() => role.replace("_", " "), [role]);

  async function runCompare() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await findWyreStormMatches(q as any);
      setCategory(((res as any).category ?? "") as any);
      setMatches(res.matches);
    } catch (e: any) {
      setError(e?.message ?? "Comparison failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wm-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Competitor Match Finder</div>
          <div className="text-sm opacity-70">Enter competitor SKU or a short description. Returns top 3 WyreStorm matches.</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs opacity-70">Demo Role</div>
          <select
            className="wm-input text-sm px-2 py-1"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            aria-label="Demo Role"
          >
            <option value="GUEST">GUEST</option>
            <option value="REGISTERED">REGISTERED</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <div className="text-xs opacity-70">{roleLabel}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          className="wm-input flex-1 px-3 py-2"
          placeholder="e.g. DTP2 T 211, DM-NVX-E30, '4K60 HDBaseT extender with USB and PoH'..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") runCompare(); }}
        />
        <button className="wm-btn px-4 py-2" onClick={runCompare} disabled={loading || !query.trim()}>
          {loading ? "Comparing..." : "Compare"}
        </button>
      </div>

      {error && <div className="text-sm text-red-300">{error}</div>}

      {category && (
        <div className="text-xs opacity-70">
          Category: <span className="font-medium">{category}</span>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {matches.map((m) => (
          <div key={m.wyrestormSku} className="wm-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{m.wyrestormSku}</div>
              <div className="text-sm font-semibold">{m.score}%</div>
            </div>

            {m.flags?.length ? (
              <ul className="text-xs space-y-1">
                {m.flags.slice(0, 3).map((x: string, i: number) => <li key={i} className="opacity-80">• {x}</li>)}
              </ul>
            ) : null}

            {m.why?.length ? (
              <>
                <div className="text-xs font-semibold opacity-80">Why</div>
                <ul className="text-xs space-y-1">
                  {m.why.slice(0, 3).map((x: string, i: number) => <li key={i} className="opacity-80">• {x}</li>)}
                </ul>
              </>
            ) : null}

            {m.differences?.length ? (
              <>
                <div className="text-xs font-semibold opacity-80">Differences</div>
                <ul className="text-xs space-y-1">
                  {m.differences.slice(0, 3).map((x: string, i: number) => <li key={i} className="opacity-80">• {x}</li>)}
                </ul>
              </>
            ) : null}

            {canAdmin && (
              <div className="pt-2 border-t border-white/10">
                <div className="text-xs opacity-70">Admin tools (Phase 2)</div>
                <div className="text-xs opacity-70">• Add competitor SKU • Edit specs • Create override</div>
              </div>
            )}

            {m.verify?.length ? (
              <div className="text-[11px] opacity-60">Verify: {m.verify.slice(0,2).join("; ")}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}


