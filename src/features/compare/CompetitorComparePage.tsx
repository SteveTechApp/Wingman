import * as React from "react";

import CompetitorMatchFinderPanel from "@/components/competitor/CompetitorMatchFinderPanel";
import CompetitorLookupStatusPanel from "@/components/competitor/CompetitorLookupStatusPanel";
import CompetitorCompareResultsPanel from "@/components/competitor/CompetitorCompareResultsPanel";
import CompetitorManualComparisonPanel from "@/components/competitor/CompetitorManualComparisonPanel";
import type { CompetitorLookupTrace } from "@/competitor/types";
import {
  searchCompetitorComparisons,
  verifyCompetitorComparisonLive,
  type CompetitorCompareCandidate,
  type CompetitorCompareLiveResult,
  type CompetitorCompareSearchResult,
} from "@/services/competitorCompareSearch";
import {
  deleteManualCompetitorComparison,
  upsertManualCompetitorComparison,
  type ManualCompetitorComparisonInput,
} from "@/services/manualCompetitorComparisonStore";

const DEFAULT_BRAND = "";
const DEFAULT_SKU = "";

type FinderSuggestion = {
  sku: string;
  name?: string;
  type?: string;
  score?: number;
};

function modeLabelFor(
  searchResult: CompetitorCompareSearchResult,
  liveResult: CompetitorCompareLiveResult | null,
  running: boolean,
): string {
  if (running) return "Checking live";
  if (liveResult?.record) return "Live verified";
  if (searchResult.status === "ambiguous") return "Clarify match";
  if (searchResult.status === "resolved") return "Local match found";
  if (searchResult.status === "no-match") return "No local match";
  return "Ready";
}

function traceFor(
  searchResult: CompetitorCompareSearchResult,
  liveResult: CompetitorCompareLiveResult | null,
): CompetitorLookupTrace[] {
  const trace: CompetitorLookupTrace[] = [];

  if (searchResult.status !== "idle") {
    trace.push({
      stage: "dataset",
      message: searchResult.summary,
      sourceLabel: "Comparison library",
      usedLiveData: false,
      updatedAt: new Date().toISOString(),
      confidence: searchResult.bestCandidate?.searchScore,
    });
  }

  if (searchResult.bestCandidate) {
    trace.push({
      stage: "match",
      message: `${searchResult.bestCandidate.comparison.competitorSku} -> ${searchResult.bestCandidate.comparison.wyrestormSku}`,
      sourceLabel: searchResult.bestCandidate.sourceLabel,
      usedLiveData: false,
      updatedAt: new Date().toISOString(),
    });
  }

  if (liveResult?.record) {
    trace.push({
      stage: "web",
      message: `${liveResult.record.competitorSku} live-verified against ${liveResult.record.wyrestormSku}`,
      sourceLabel: liveResult.sourceLabel,
      checkedUrl: liveResult.sourceUrl,
      usedLiveData: true,
      updatedAt: new Date().toISOString(),
      confidence: liveResult.record.matchScore,
    });
  }

  for (const warning of liveResult?.warnings ?? []) {
    trace.push({
      stage: "web",
      message: warning,
      sourceLabel: liveResult?.sourceLabel || "Live verification",
      checkedUrl: liveResult?.sourceUrl,
      usedLiveData: Boolean(liveResult?.record),
      updatedAt: new Date().toISOString(),
    });
  }

  return trace;
}

function finderSuggestions(searchResult: CompetitorCompareSearchResult): FinderSuggestion[] {
  return searchResult.candidates.map((candidate) => ({
    sku: candidate.comparison.competitorSku,
    name: candidate.comparison.competitorName || candidate.comparison.wyrestormSku,
    type: candidate.comparison.category,
    score: candidate.searchScore,
  }));
}

export default function CompetitorComparePage() {
  const [brand, setBrand] = React.useState(DEFAULT_BRAND);
  const [sku, setSku] = React.useState(DEFAULT_SKU);
  const [running, setRunning] = React.useState(false);
  const [searchResult, setSearchResult] = React.useState<CompetitorCompareSearchResult>(() =>
    searchCompetitorComparisons("", ""),
  );
  const [selectedCandidateId, setSelectedCandidateId] = React.useState<string | undefined>();
  const [liveResult, setLiveResult] = React.useState<CompetitorCompareLiveResult | null>(null);
  const [saveMessage, setSaveMessage] = React.useState("");
  const localLookupTimer = React.useRef<number | null>(null);

  const selectedCandidate = React.useMemo(
    () =>
      searchResult.candidates.find((candidate) => candidate.id === selectedCandidateId) ||
      searchResult.bestCandidate,
    [searchResult, selectedCandidateId],
  );

  const trace = React.useMemo(
    () => traceFor(searchResult, liveResult),
    [searchResult, liveResult],
  );

  const modeLabel = React.useMemo(
    () => modeLabelFor(searchResult, liveResult, running),
    [searchResult, liveResult, running],
  );

  const localMatches = React.useMemo(
    () => finderSuggestions(searchResult),
    [searchResult],
  );

  const refreshSearch = React.useCallback(
    (nextBrand: string, nextSku: string) => {
      const result = searchCompetitorComparisons(nextBrand, nextSku);
      setSearchResult(result);
      setSelectedCandidateId((current) =>
        result.candidates.some((candidate) => candidate.id === current)
          ? current
          : result.bestCandidate?.id,
      );
      return result;
    },
    [],
  );

  const verifyLive = React.useCallback(
    async (targetSku?: string) => {
      const nextBrand = brand.trim();
      const nextSku = (targetSku || sku).trim();
      if (!nextBrand || !nextSku) return;

      setRunning(true);
      setSaveMessage("");

      try {
        const result = await verifyCompetitorComparisonLive(nextBrand, nextSku);
        setLiveResult(result);
        if (result.record?.competitorSku) {
          setSku(result.record.competitorSku);
          const refreshed = refreshSearch(nextBrand, result.record.competitorSku);
          setSelectedCandidateId(
            refreshed.candidates.find(
              (candidate) =>
                candidate.comparison.competitorSku === result.record?.competitorSku,
            )?.id || refreshed.bestCandidate?.id,
          );
        }
      } finally {
        setRunning(false);
      }
    },
    [brand, sku, refreshSearch],
  );

  React.useEffect(() => {
    const nextBrand = brand.trim();
    const nextSku = sku.trim();

    if (localLookupTimer.current) {
      window.clearTimeout(localLookupTimer.current);
      localLookupTimer.current = null;
    }

    if (!nextBrand || !nextSku) {
      setSearchResult(searchCompetitorComparisons("", ""));
      setSelectedCandidateId(undefined);
      setLiveResult(null);
      return;
    }

    localLookupTimer.current = window.setTimeout(() => {
      refreshSearch(nextBrand, nextSku);
      setLiveResult(null);
    }, 180);

    return () => {
      if (localLookupTimer.current) {
        window.clearTimeout(localLookupTimer.current);
        localLookupTimer.current = null;
      }
    };
  }, [brand, sku, refreshSearch]);

  function handleSelectCandidate(candidate: CompetitorCompareCandidate) {
    setSelectedCandidateId(candidate.id);
    setSku(candidate.comparison.competitorSku);
    setSaveMessage("");
  }

  function handleSaveManual(input: ManualCompetitorComparisonInput) {
    const saved = upsertManualCompetitorComparison(input);
    setSaveMessage(`Saved ${saved.brand} ${saved.competitorSku} into the local comparison library.`);
    setSku(saved.competitorSku);
    const refreshed = refreshSearch(saved.brand, saved.competitorSku);
    setSelectedCandidateId(refreshed.bestCandidate?.id);
  }

  function handleDeleteManual(nextBrand: string, competitorSku: string) {
    deleteManualCompetitorComparison(nextBrand, competitorSku);
    setSaveMessage(`Removed ${nextBrand} ${competitorSku} from the local comparison library.`);
    const refreshed = refreshSearch(nextBrand, competitorSku);
    setSelectedCandidateId(refreshed.bestCandidate?.id);
    setLiveResult(null);
  }

  return (
    <div className="wm-page">
      <div className="wm-page-header">
        <div>
          <div className="wm-page-title">Competitor Comparison</div>
          <div className="wm-page-sub">
            Search partial competitor SKUs, shortlist the nearest WyreStorm fit, verify the latest match live, and save manual fallback mappings for future use.
          </div>
        </div>
      </div>

      <div className="wm-page-body" style={{ display: "grid", gap: 18 }}>
        <div className="wm-card">
          <CompetitorMatchFinderPanel
            brand={brand}
            sku={sku}
            running={running}
            hasLocalMatch={searchResult.candidates.length > 0}
            localMatches={localMatches}
            onBrandChange={setBrand}
            onSkuChange={setSku}
            onRun={(mode) => {
              if (mode === "web") {
                void verifyLive(selectedCandidate?.comparison.competitorSku);
                return;
              }
              refreshSearch(brand.trim(), sku.trim());
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gap: 18,
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(360px, 1fr)",
            alignItems: "start",
          }}
        >
          <div className="wm-card">
            <CompetitorCompareResultsPanel
              result={searchResult}
              selectedCandidateId={selectedCandidate?.id}
              liveResult={liveResult}
              onSelectCandidate={handleSelectCandidate}
              onVerifyCandidate={(candidate) => void verifyLive(candidate.comparison.competitorSku)}
            />
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <CompetitorLookupStatusPanel
              trace={trace}
              modeLabel={modeLabel}
              running={running}
              title="Lookup status"
              subtitle="See what came from the local comparison library, what was verified live, and whether the match still needs clarification."
              emptyText="No compare activity yet."
            />

            <div className="wm-card">
              <CompetitorManualComparisonPanel
                brand={brand}
                query={sku}
                selectedCandidate={selectedCandidate}
                saveMessage={saveMessage}
                onSave={handleSaveManual}
                onDelete={handleDeleteManual}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
