import { useEffect, useMemo, useState } from "react";

import { Shield, Swords, ExternalLink, ChevronDown, ChevronRight, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { getAllBattleCards, type BattleCardEntry, type BattleCardGroup } from "../lib/battleCards";

import {
  ProductFilterPanel,
  ProductSearchField,
  ProductWorkspaceHeader,
  ProductWorkspaceNav,
} from "../components/ProductWorkspaceChrome";
import { useDebouncedValue } from "../lib/useDebouncedValue";

type BattleCardsLoadState = "loading" | "ready" | "error";

const BRAND_COLORS: { [key: string]: string } = {
  Crestron: "text-orange-400",
  Extron: "text-blue-400",
  AMX: "text-purple-400",
  Kramer: "text-green-400",
  "Just Add Power": "text-yellow-400",
  "Q-SYS": "text-cyan-400",
  Poly: "text-pink-400",
  Logitech: "text-teal-400",
  Barco: "text-red-400",
  "AVPro Edge": "text-indigo-400",
  Blustream: "text-emerald-400",
  CYP: "text-amber-400",
  "HDANYWHERE": "text-rose-400",
  Atlona: "text-violet-400",
  Lightware: "text-lime-400",
  Datapath: "text-fuchsia-400",
  Mersive: "text-sky-400",
  BirdDog: "text-orange-300",
  "SY Electronics": "text-cyan-300",
  Turtle: "text-green-300",
  Visionary: "text-blue-300",
  ZeeVee: "text-red-300",
  "Black Box": "text-gray-300",
  Binary: "text-gray-400",
  Marshall: "text-yellow-300",
  "Matrox Video": "text-purple-300",
  Sony: "text-blue-500",
};

function brandColor(brand: string): string {
  return BRAND_COLORS[brand] ?? "text-slate-300";
}

export default function BattleCardsPage() {

  const [groups, setGroups] = useState<BattleCardGroup[]>([]);
  const [loadState, setLoadState] = useState<BattleCardsLoadState>("loading");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    getAllBattleCards()
      .then((result) => {
        if (!active) return;
        setGroups(result);
        setLoadState("ready");
      })
      .catch(() => {
        if (!active) return;
        setLoadState("error");
      });
    return () => { active = false; };
  }, []);

  const filteredGroups = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return groups;

    return groups
      .map((group) => ({
        ...group,
        entries: group.entries.filter((entry) => {
          const haystack = [
            entry.competitorSku,
            entry.competitorName,
            entry.brand,
            entry.category,
            entry.summary,
            entry.wyrestormEquivalent,
            ...entry.differentiators,
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        }),
      }))
      .filter((group) => group.entries.length > 0);
  }, [groups, debouncedQuery]);

  const totalEntries = filteredGroups.reduce((sum, g) => sum + g.entries.length, 0);

  function toggleBrand(brand: string) {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  }

  function toggleCard(key: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <section className="wm-bc-shell wm-ui-section">
      <ProductWorkspaceHeader
        eyebrow="Competitive intelligence"
        title="Battle cards"
        description="WyreStorm equivalents, differentiators and objection handling for every logged competitor product."
      />
      <ProductWorkspaceNav />

      <ProductFilterPanel>
        <ProductSearchField
          value={query}
          onChange={setQuery}
          label="Search competitors"
          placeholder="Search brand, SKU, product type or WyreStorm equivalent..."
        />
      </ProductFilterPanel>

      {loadState === "loading" && (
        <div className="wm-bc-status">Loading battle cards...</div>
      )}

      {loadState === "error" && (
        <div className="wm-bc-status wm-bc-error">Failed to load competitor data.</div>
      )}

      {loadState === "ready" && (
        <div className="wm-bc-summary">
          <span>{totalEntries} competitor products across {filteredGroups.length} brands</span>
          <span className="opacity-50">
            {groups.length > filteredGroups.length ? ` (filtered from ${groups.length} brands)` : ""}
          </span>
        </div>
      )}

      {loadState === "ready" && filteredGroups.map((group) => (
        <div key={group.brand} className="wm-bc-brand-group">
          <button
            type="button"
            className="wm-bc-brand-header"
            onClick={() => toggleBrand(group.brand)}
          >
            {expandedBrands.has(group.brand) ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
            <span className={`font-black ${brandColor(group.brand)}`}>{group.brand}</span>
            <span className="opacity-50 text-xs">{group.entries.length} product{group.entries.length !== 1 ? "s" : ""}</span>
            {group.escalated && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 font-bold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                ESCALATED — {group.lostDealCount} losses
              </span>
            )}
            {!group.escalated && group.lostDealCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/40 text-red-400">
                {group.lostDealCount} lost deal{group.lostDealCount !== 1 ? "s" : ""}
              </span>
            )}
            {group.wonDealCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400">
                {group.wonDealCount} won deal{group.wonDealCount !== 1 ? "s" : ""}
              </span>
            )}
          </button>

          {expandedBrands.has(group.brand) && (
            <>
            {group.escalated && group.migrationTalkingPoints.length > 0 && (
              <div className="wm-bc-migration-panel">
                <div className="wm-bc-migration-header">
                  <ArrowRightLeft className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  <span className="font-bold text-amber-300 text-xs">Migration Strategy — {group.brand}</span>
                </div>
                <ul className="wm-bc-migration-points">
                  {group.migrationTalkingPoints.map((point, idx) => (
                    <li key={idx} className="wm-bc-migration-point">
                      <span className="text-xs text-[#cfe6f7] leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="wm-bc-cards">
              {group.entries.map((entry) => {
                const cardKey = `${entry.brand}-${entry.competitorSku}`;
                const isExpanded = expandedCards.has(cardKey);

                return (
                  <div key={cardKey} className="wm-bc-card">
                    <button
                      type="button"
                      className="wm-bc-card-header"
                      onClick={() => toggleCard(cardKey)}
                    >
                      <div className="wm-bc-card-title">
                        <Swords className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        <span className="font-bold">{entry.competitorSku}</span>
                        <span className="opacity-60 text-xs">{entry.category}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          entry.confidence === "high"
                            ? "bg-green-900/40 text-green-400"
                            : entry.confidence === "medium"
                            ? "bg-amber-900/40 text-amber-400"
                            : "bg-slate-800/60 text-slate-400"
                        }`}>
                          {entry.confidence}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                      )}
                    </button>

                    {!isExpanded && (
                      <p className="wm-bc-card-preview">{entry.summary}</p>
                    )}

                    {isExpanded && (
                      <div className="wm-bc-card-body">
                        <p className="wm-bc-card-summary">{entry.summary}</p>

                        <div className="wm-bc-section">
                          <p className="wm-bc-label">WyreStorm equivalent</p>
                          <p className="wm-bc-value font-bold text-cyan-300">{entry.wyrestormEquivalent || "Compare via the Compare workflow"}</p>
                        </div>

                        <div className="wm-bc-section">
                          <p className="wm-bc-label">Why WyreStorm wins</p>
                          <ul className="wm-bc-list">
                            {entry.differentiators.map((diff) => (
                              <li key={diff} className="wm-bc-list-item">
                                <Shield className="h-3 w-3 shrink-0 text-cyan-400 mt-0.5" aria-hidden="true" />
                                <span>{diff}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="wm-bc-section">
                          <p className="wm-bc-label">Objection handling</p>
                          <div className="wm-bc-objections">
                            {entry.objectionHandling.map((obj) => (
                              <div key={obj.objection} className="wm-bc-objection">
                                <p className="wm-bc-objection-q">"{obj.objection}"</p>
                                <p className="wm-bc-objection-a">{obj.response}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="wm-bc-section">
                          <p className="wm-bc-label">Talk track</p>
                          <p className="wm-bc-talk">{entry.talkTrack}</p>
                        </div>

                        {entry.knownLimitations && (
                          <div className="wm-bc-section">
                            <p className="wm-bc-label">Known limitations</p>
                            <p className="wm-bc-limitations">{entry.knownLimitations}</p>
                          </div>
                        )}

                        {entry.sourceUrl && (
                          <a
                            href={entry.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="wm-bc-source"
                          >
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            Source datasheet
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>
      ))}
    </section>
  );
}
