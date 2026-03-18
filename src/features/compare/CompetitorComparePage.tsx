import * as React from "react";

import CompetitorMatchFinderPanel from "@/components/competitor/CompetitorMatchFinderPanel";
import CompetitorLookupStatusPanel from "@/components/competitor/CompetitorLookupStatusPanel";
import CompetitorCompareResultsPanel from "@/components/competitor/CompetitorCompareResultsPanel";
import CompetitorManualComparisonPanel from "@/components/competitor/CompetitorManualComparisonPanel";
import type { CompetitorLookupTrace } from "@/competitor/types";
import type { CompetitorCompareOption } from "@/services/competitorCompareFit";
import {
  getCompetitorCompareFeedbackSummary,
  logCompetitorCompareFeedback,
  type CompetitorCompareFeedbackSummary,
} from "@/services/competitorCompareFeedbackStore";
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

function feedbackSummaryText(summary: CompetitorCompareFeedbackSummary): string {
  if (summary.total === 0) {
    return "Feedback loop is empty. Unmatched searches and manual saves will be logged locally to help expand the comparison library.";
  }

  return `Feedback loop: ${summary.noMatch} no-match search${summary.noMatch === 1 ? "" : "es"}, ${summary.ambiguous} ambiguous shortlist${summary.ambiguous === 1 ? "" : "s"}, ${summary.manualSave} manual save${summary.manualSave === 1 ? "" : "s"}, ${summary.liveVerified} live verification${summary.liveVerified === 1 ? "" : "s"}.`;
}

function ensureLiveCandidateInResult(
  searchResult: CompetitorCompareSearchResult,
  liveResult: CompetitorCompareLiveResult | null,
): CompetitorCompareSearchResult {
  if (!liveResult?.candidate) return searchResult;

  const existingIndex = searchResult.candidates.findIndex(
    (candidate) => candidate.id === liveResult.candidate?.id,
  );

  const candidates =
    existingIndex >= 0
      ? searchResult.candidates.map((candidate, index) =>
          index === existingIndex ? liveResult.candidate! : candidate,
        )
      : [liveResult.candidate, ...searchResult.candidates];

  return {
    ...searchResult,
    status: candidates.length > 0 ? "resolved" : searchResult.status,
    summary:
      liveResult.record && existingIndex < 0
        ? `Live verification resolved ${liveResult.record.competitorSku}; the verified candidate is shown at the top of the shortlist.`
        : searchResult.summary,
    candidates,
    bestCandidate:
      candidates.find((candidate) => candidate.id === searchResult.bestCandidate?.id) ||
      candidates[0],
    suggestedWyrestormSkus: Array.from(
      new Set([
        ...searchResult.suggestedWyrestormSkus,
        ...(liveResult.candidate.options ?? []).map((option) => option.wyrestormSku),
      ]),
    ).slice(0, 6),
  };
}

function traceFor(
  searchResult: CompetitorCompareSearchResult,
  selectedCandidate: CompetitorCompareCandidate | undefined,
  selectedOption: CompetitorCompareOption | undefined,
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

  if (selectedCandidate && selectedOption) {
    trace.push({
      stage: "match",
      message: `${selectedCandidate.comparison.competitorSku} -> ${selectedOption.wyrestormSku} (${selectedOption.label})`,
      sourceLabel: selectedCandidate.sourceLabel,
      usedLiveData: false,
      updatedAt: new Date().toISOString(),
      confidence: selectedOption.fitScore,
    });
  }

  if (liveResult?.record) {
    trace.push({
      stage: "web",
      message: `${liveResult.record.competitorSku} live-verified against ${liveResult.candidate?.primaryOption?.wyrestormSku || liveResult.record.wyrestormSku}`,
      sourceLabel: liveResult.sourceLabel,
      checkedUrl: liveResult.sourceUrl,
      usedLiveData: true,
      updatedAt: new Date().toISOString(),
      confidence:
        liveResult.candidate?.primaryOption?.fitScore || liveResult.record.matchScore,
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

function finderSuggestions(
  searchResult: CompetitorCompareSearchResult,
): FinderSuggestion[] {
  return searchResult.candidates.map((candidate) => ({
    sku: candidate.comparison.competitorSku,
    name:
      candidate.comparison.competitorName ||
      candidate.primaryOption?.wyrestormSku ||
      candidate.comparison.wyrestormSku,
    type: candidate.comparison.category,
    score: candidate.searchScore,
  }));
}

export default function CompetitorComparePage() {
  const [brand, setBrand] = React.useState(DEFAULT_BRAND);
  const [sku, setSku] = React.useState(DEFAULT_SKU);
  const [running, setRunning] = React.useState(false);
  const [searchResult, setSearchResult] =
    React.useState<CompetitorCompareSearchResult>(() =>
      searchCompetitorComparisons("", ""),
    );
  const [selectedCandidateId, setSelectedCandidateId] = React.useState<
    string | undefined
  >();
  const [selectedOptionId, setSelectedOptionId] = React.useState<
    string | undefined
  >();
  const [liveResult, setLiveResult] =
    React.useState<CompetitorCompareLiveResult | null>(null);
  const [saveMessage, setSaveMessage] = React.useState("");
  const [manualPanelOpen, setManualPanelOpen] = React.useState(false);
  const [feedbackSummary, setFeedbackSummary] = React.useState(() =>
    feedbackSummaryText(getCompetitorCompareFeedbackSummary()),
  );
  const localLookupTimer = React.useRef<number | null>(null);
  const autoVerifyKey = React.useRef("");

  const effectiveResult = React.useMemo(
    () => ensureLiveCandidateInResult(searchResult, liveResult),
    [searchResult, liveResult],
  );

  React.useEffect(() => {
    setSelectedCandidateId((current) =>
      effectiveResult.candidates.some((candidate) => candidate.id === current)
        ? current
        : effectiveResult.bestCandidate?.id,
    );
  }, [effectiveResult]);

  const selectedCandidate = React.useMemo(
    () =>
      effectiveResult.candidates.find(
        (candidate) => candidate.id === selectedCandidateId,
      ) || effectiveResult.bestCandidate,
    [effectiveResult, selectedCandidateId],
  );

  React.useEffect(() => {
    setSelectedOptionId((current) =>
      selectedCandidate?.options.some((option) => option.id === current)
        ? current
        : selectedCandidate?.primaryOption?.id,
    );
  }, [selectedCandidate]);

  const selectedOption = React.useMemo(
    () =>
      selectedCandidate?.options.find((option) => option.id === selectedOptionId) ||
      selectedCandidate?.primaryOption,
    [selectedCandidate, selectedOptionId],
  );

  const trace = React.useMemo(
    () => traceFor(effectiveResult, selectedCandidate, selectedOption, liveResult),
    [effectiveResult, selectedCandidate, selectedOption, liveResult],
  );

  const modeLabel = React.useMemo(
    () => modeLabelFor(effectiveResult, liveResult, running),
    [effectiveResult, liveResult, running],
  );

  const localMatches = React.useMemo(
    () => finderSuggestions(effectiveResult),
    [effectiveResult],
  );

  const refreshFeedback = React.useCallback(() => {
    setFeedbackSummary(feedbackSummaryText(getCompetitorCompareFeedbackSummary()));
  }, []);

  const refreshSearch = React.useCallback(
    (nextBrand: string, nextSku: string) => {
      const result = searchCompetitorComparisons(nextBrand, nextSku);
      setSearchResult(result);

      if (result.status === "no-match") {
        logCompetitorCompareFeedback({
          type: "no-match",
          brand: nextBrand,
          query: nextSku,
        });
      } else if (result.status === "ambiguous") {
        logCompetitorCompareFeedback({
          type: "ambiguous",
          brand: nextBrand,
          query: nextSku,
          competitorSku: result.bestCandidate?.comparison.competitorSku,
        });
      }

      refreshFeedback();
      return result;
    },
    [refreshFeedback],
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
          logCompetitorCompareFeedback({
            type: "live-verified",
            brand: nextBrand,
            query: nextSku,
            competitorSku: result.record.competitorSku,
            wyrestormSku:
              result.candidate?.primaryOption?.wyrestormSku ||
              result.record.wyrestormSku,
          });
          refreshFeedback();
        }
      } finally {
        setRunning(false);
      }
    },
    [brand, sku, refreshFeedback],
  );

  React.useEffect(() => {
    const nextBrand = brand.trim();
    const nextSku = sku.trim();

    if (localLookupTimer.current) {
      window.clearTimeout(localLookupTimer.current);
      localLookupTimer.current = null;
    }

    if (!nextBrand || !nextSku) {
      autoVerifyKey.current = "";
      setSearchResult(searchCompetitorComparisons("", ""));
      setSelectedCandidateId(undefined);
      setSelectedOptionId(undefined);
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

  React.useEffect(() => {
    const candidate = selectedCandidate;
    if (!candidate || running) return;
    if (!(candidate.exactSku || candidate.searchConfidence === "High")) return;

    const key = `${brand.trim()}::${candidate.comparison.competitorSku}`;
    if (!key.trim()) return;
    if (autoVerifyKey.current === key) return;

    const alreadyVerified =
      liveResult?.record &&
      liveResult.record.brand === candidate.comparison.brand &&
      liveResult.record.competitorSku === candidate.comparison.competitorSku;

    autoVerifyKey.current = key;
    if (!alreadyVerified) {
      void verifyLive(candidate.comparison.competitorSku);
    }
  }, [brand, selectedCandidate, running, liveResult, verifyLive]);

  function handleSelectCandidate(candidate: CompetitorCompareCandidate) {
    setSelectedCandidateId(candidate.id);
    setSelectedOptionId(candidate.primaryOption?.id);
    setSku(candidate.comparison.competitorSku);
    setSaveMessage("");
    void verifyLive(candidate.comparison.competitorSku);
  }

  function handleSelectOption(
    candidate: CompetitorCompareCandidate,
    option: CompetitorCompareOption,
  ) {
    setSelectedCandidateId(candidate.id);
    setSelectedOptionId(option.id);
    setSaveMessage("");
  }

  function handleSaveManual(input: ManualCompetitorComparisonInput) {
    const saved = upsertManualCompetitorComparison(input);
    logCompetitorCompareFeedback({
      type: "manual-save",
      brand: saved.brand,
      query: saved.competitorSku,
      competitorSku: saved.competitorSku,
      wyrestormSku: saved.wyrestormSku,
    });
    refreshFeedback();
    setSaveMessage(
      `Saved ${saved.brand} ${saved.competitorSku} into the local comparison library.`,
    );
    setSku(saved.competitorSku);
    const refreshed = refreshSearch(saved.brand, saved.competitorSku);
    setSelectedCandidateId(refreshed.bestCandidate?.id);
    setSelectedOptionId(refreshed.bestCandidate?.primaryOption?.id);
  }

  function handleDeleteManual(nextBrand: string, competitorSku: string) {
    deleteManualCompetitorComparison(nextBrand, competitorSku);
    logCompetitorCompareFeedback({
      type: "manual-delete",
      brand: nextBrand,
      query: competitorSku,
      competitorSku,
    });
    refreshFeedback();
    setSaveMessage(
      `Removed ${nextBrand} ${competitorSku} from the local comparison library.`,
    );
    const refreshed = refreshSearch(nextBrand, competitorSku);
    setSelectedCandidateId(refreshed.bestCandidate?.id);
    setSelectedOptionId(refreshed.bestCandidate?.primaryOption?.id);
    setLiveResult(null);
  }

  return (
    <div className="wm-page">
      <div style={{ maxWidth: 1480, margin: "0 auto", width: "100%" }}>
        <div className="wm-page-header">
          <div>
            <div className="wm-page-title">Competitor Comparison</div>
            <div className="wm-page-sub">
              Search partial competitor SKUs, shortlist the nearest WyreStorm fit,
              compare the top options side by side, verify the latest match live,
              and save manual fallback mappings for future use.
            </div>
          </div>
        </div>

        <div className="wm-page-body" style={{ display: "grid", gap: 10 }}>
          <div className="wm-card" style={{ padding: 10 }}>
            <CompetitorMatchFinderPanel
              brand={brand}
              sku={sku}
              running={running}
              hasLocalMatch={effectiveResult.candidates.length > 0}
              localMatches={localMatches}
              onBrandChange={setBrand}
              onSkuChange={setSku}
              onRun={(mode) => {
                if (mode === "web") {
                  void verifyLive(
                    selectedCandidate?.comparison.competitorSku || sku.trim(),
                  );
                  return;
                }
                refreshSearch(brand.trim(), sku.trim());
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "minmax(0, 1.6fr) 320px",
              alignItems: "start",
            }}
          >
            <div
              className="wm-card"
              style={{
                padding: 12,
                border: "1px solid rgba(92,225,230,0.18)",
                boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
              }}
            >
              <CompetitorCompareResultsPanel
                result={effectiveResult}
                selectedCandidateId={selectedCandidate?.id}
                selectedOptionId={selectedOption?.id}
                liveResult={liveResult}
                onSelectCandidate={handleSelectCandidate}
                onVerifyCandidate={(candidate) =>
                  void verifyLive(candidate.comparison.competitorSku)
                }
                onSelectOption={handleSelectOption}
              />
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
                alignContent: "start",
                position: "sticky",
                top: 20,
              }}
            >
              <div style={{ opacity: 0.85 }}>
                <CompetitorLookupStatusPanel
                  trace={trace}
                  modeLabel={modeLabel}
                  running={running}
                  title="Lookup status"
                  subtitle="See what came from the local comparison library, what was verified live, and whether the match still needs clarification."
                  emptyText="No compare activity yet."
                />
              </div>

              <div className="wm-card" style={{ padding: 10, opacity: 0.92 }}>
                <button
                  type="button"
                  onClick={() => setManualPanelOpen((current) => !current)}
                  aria-expanded={manualPanelOpen}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: 0,
                    margin: 0,
                    border: "none",
                    background: "transparent",
                    color: "#eef5ff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "grid", gap: 3 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      Manual fallback mapping
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.62)",
                        lineHeight: 1.35,
                      }}
                    >
                      Save or remove local override mappings when the automatic match needs help.
                    </div>
                  </div>

                  <div
                    aria-hidden="true"
                    style={{
                      minWidth: 28,
                      height: 28,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.80)",
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    {manualPanelOpen ? "-" : "+"}
                  </div>
                </button>

                {manualPanelOpen ? (
                  <div style={{ marginTop: 12 }}>
                    <CompetitorManualComparisonPanel
                      brand={brand}
                      query={sku}
                      selectedCandidate={selectedCandidate}
                      selectedOption={selectedOption}
                      saveMessage={saveMessage}
                      feedbackSummary={feedbackSummary}
                      onSave={handleSaveManual}
                      onDelete={handleDeleteManual}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}