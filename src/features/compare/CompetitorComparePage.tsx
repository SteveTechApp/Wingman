import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, Scale, Search } from "lucide-react";

import {
  applyCompareToProject,
  createProject,
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  type CompareConfidence,
} from "@/features/projects/projectStore";
import {
  type CompetitorComparisonRecord,
  findComparisonRecordById,
  getComparisonRecords,
  lookupAndCompare,
  mergeComparisonRecords,
  searchComparisonRecords,
  toProjectCompareRecord,
} from "@/services/competitorComparisonService";

type LookupUiState = {
  status: "idle" | "loading" | "ready" | "empty" | "failed";
  message: string;
  warnings: string[];
};

type SimpleComparisonSummary = {
  answer: string;
  matchPercent: number;
  positives: string[];
  negatives: string[];
};

function recordId(item: CompetitorComparisonRecord): string {
  return `${item.brand}::${item.competitorSku}`.toLowerCase();
}

function lookupStateClass(status: LookupUiState["status"]): string {
  return `wm-compare-lookup-state is-${status}`;
}

function createIdleLookupState(message = "Enter a competitor SKU or model, then compare it to the closest WyreStorm fit."): LookupUiState {
  return {
    status: "idle",
    message,
    warnings: [],
  };
}

function fallbackMatchFromConfidence(confidence: CompareConfidence): number {
  if (confidence === "High") return 82;
  if (confidence === "Medium") return 62;
  return 38;
}

function buildSimpleComparisonSummary(record: CompetitorComparisonRecord): SimpleComparisonSummary {
  const matchPercent = Math.max(
    0,
    Math.min(
      100,
      typeof record.matchScore === "number"
        ? record.matchScore
        : typeof record.intelligence?.score === "number"
          ? record.intelligence.score
          : fallbackMatchFromConfidence(record.confidence),
    ),
  );

  const positives = Array.from(
    new Set(
      [
        record.wyrestormVerified === false
          ? ""
          : `Verified WyreStorm SKU: ${record.wyrestormSku}${record.wyrestormName ? ` (${record.wyrestormName})` : ""}.`,
        record.ioComparison ? `I/O comparison: ${record.ioComparison}.` : "",
        record.rationale,
        record.features.length > 0 ? `Relevant capabilities: ${record.features.slice(0, 3).join(", ")}.` : "",
      ].filter(Boolean),
    ),
  ).slice(0, 5);

  const negatives = Array.from(
    new Set(
      [
        ...(record.wyrestormVerified === false
          ? ["No verified WyreStorm catalog SKU is confirmed yet. Manual review is required before customer-facing use."]
          : []),
        ...record.notes,
        ...(record.intelligence?.warnings ?? []),
        ...(record.intelligence?.escalationReasons ?? []),
      ].filter(Boolean),
    ),
  ).slice(0, 6);

  if (negatives.length === 0) {
    negatives.push("No major gaps were flagged in the available comparison data. Confirm against current datasheets before quoting.");
  }

  return {
    answer: `${record.wyrestormSku} (${record.wyrestormCategory})`,
    matchPercent,
    positives,
    negatives,
  };
}

function confidenceTone(confidence: CompareConfidence) {
  if (confidence === "High") {
    return {
      borderColor: "rgba(92, 214, 148, 0.38)",
      background: "rgba(38, 142, 89, 0.18)",
      color: "rgba(226, 255, 238, 0.96)",
    };
  }

  if (confidence === "Medium") {
    return {
      borderColor: "rgba(94, 190, 255, 0.34)",
      background: "rgba(52, 112, 190, 0.16)",
      color: "rgba(229, 242, 255, 0.96)",
    };
  }

  return {
    borderColor: "rgba(255, 184, 107, 0.38)",
    background: "rgba(185, 110, 41, 0.18)",
    color: "rgba(255, 235, 208, 0.96)",
  };
}

function matchTone(score: number) {
  const fillGradient =
    "linear-gradient(90deg, rgba(141,149,163,0.96) 0%, rgba(96,162,255,0.98) 22%, rgba(61,210,145,0.98) 44%, rgba(245,223,92,0.98) 66%, rgba(255,156,67,0.98) 84%, rgba(255,92,76,1) 100%)";

  if (score >= 90) {
    return {
      borderColor: "rgba(255, 92, 76, 0.48)",
      glow: "radial-gradient(circle at top, rgba(255, 92, 76, 0.28), rgba(10, 18, 30, 0.9) 70%)",
      text: "rgba(255, 238, 234, 0.99)",
      accent: "rgba(255, 117, 92, 0.98)",
      fillGradient,
      label: "Red hot",
      labelBorder: "rgba(255, 92, 76, 0.42)",
      labelBackground: "rgba(182, 57, 42, 0.18)",
      shadow: "rgba(255, 92, 76, 0.3)",
    };
  }

  if (score >= 75) {
    return {
      borderColor: "rgba(255, 156, 67, 0.44)",
      glow: "radial-gradient(circle at top, rgba(255, 156, 67, 0.26), rgba(10, 18, 30, 0.9) 70%)",
      text: "rgba(255, 244, 231, 0.98)",
      accent: "rgba(255, 173, 84, 0.98)",
      fillGradient,
      label: "Hot",
      labelBorder: "rgba(255, 156, 67, 0.36)",
      labelBackground: "rgba(168, 100, 36, 0.18)",
      shadow: "rgba(255, 156, 67, 0.28)",
    };
  }

  if (score >= 60) {
    return {
      borderColor: "rgba(245, 223, 92, 0.42)",
      glow: "radial-gradient(circle at top, rgba(245, 223, 92, 0.24), rgba(10, 18, 30, 0.9) 70%)",
      text: "rgba(255, 251, 226, 0.98)",
      accent: "rgba(245, 223, 92, 0.98)",
      fillGradient,
      label: "Warm",
      labelBorder: "rgba(245, 223, 92, 0.34)",
      labelBackground: "rgba(159, 141, 35, 0.18)",
      shadow: "rgba(245, 223, 92, 0.26)",
    };
  }

  if (score >= 45) {
    return {
      borderColor: "rgba(61, 210, 145, 0.42)",
      glow: "radial-gradient(circle at top, rgba(61, 210, 145, 0.24), rgba(10, 18, 30, 0.9) 70%)",
      text: "rgba(231, 255, 241, 0.98)",
      accent: "rgba(61, 210, 145, 0.98)",
      fillGradient,
      label: "Balanced",
      labelBorder: "rgba(61, 210, 145, 0.34)",
      labelBackground: "rgba(38, 142, 89, 0.18)",
      shadow: "rgba(61, 210, 145, 0.26)",
    };
  }

  if (score >= 20) {
    return {
      borderColor: "rgba(96, 162, 255, 0.42)",
      glow: "radial-gradient(circle at top, rgba(96, 162, 255, 0.24), rgba(10, 18, 30, 0.9) 70%)",
      text: "rgba(232, 243, 255, 0.98)",
      accent: "rgba(96, 162, 255, 0.98)",
      fillGradient,
      label: "Cool",
      labelBorder: "rgba(96, 162, 255, 0.34)",
      labelBackground: "rgba(44, 97, 178, 0.18)",
      shadow: "rgba(96, 162, 255, 0.26)",
    };
  }

  return {
    borderColor: "rgba(141, 149, 163, 0.42)",
    glow: "radial-gradient(circle at top, rgba(141, 149, 163, 0.22), rgba(10, 18, 30, 0.9) 70%)",
    text: "rgba(237, 240, 246, 0.96)",
    accent: "rgba(176, 183, 194, 0.96)",
    fillGradient,
    label: "Cold",
    labelBorder: "rgba(141, 149, 163, 0.34)",
    labelBackground: "rgba(78, 85, 96, 0.2)",
    shadow: "rgba(141, 149, 163, 0.2)",
  };
}

function pickQuickExamples(records: CompetitorComparisonRecord[]): CompetitorComparisonRecord[] {
  const picks: CompetitorComparisonRecord[] = [];
  const seenBrands = new Set<string>();

  for (const record of records) {
    if (seenBrands.has(record.brand.toLowerCase())) continue;
    picks.push(record);
    seenBrands.add(record.brand.toLowerCase());
    if (picks.length === 4) break;
  }

  return picks;
}

function QuickChoiceButton({
  item,
  detail,
  active,
  onSelect,
}: {
  item: CompetitorComparisonRecord;
  detail?: string;
  active: boolean;
  onSelect: (item: CompetitorComparisonRecord) => void;
}) {
  return (
    <button
      type="button"
      className={`wm-compare-simple__choice-button${active ? " is-active" : ""}`}
      onClick={() => onSelect(item)}
    >
      {item.brand} {item.competitorSku}
      {detail ? <span className="wm-compare-simple__choice-detail">{detail}</span> : null}
    </button>
  );
}

function InsightList({
  items,
  tone,
}: {
  items: string[];
  tone: "good" | "warn";
}) {
  const isGood = tone === "good";
  const Icon = isGood ? CheckCircle2 : AlertTriangle;

  return (
    <div className="wm-compare-simple__insight-list">
      {items.map((item) => (
        <div
          key={item}
          className={`wm-compare-simple__insight-item wm-compare-simple__insight-item--${tone}`}
        >
          <span className="wm-compare-simple__insight-icon">
            <Icon size={15} />
          </span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  meta,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const panelId = React.useId();

  return (
    <article className="wm-card wm-compare-simple__fold-card">
      <button
        type="button"
        className="wm-compare-simple__fold-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="wm-compare-simple__fold-copy">
          <span className="wm-card__title">{title}</span>
          <span className="wm-card__subtitle">{subtitle}</span>
        </span>

        <span className="wm-compare-simple__fold-actions">
          {meta ? <span className="wm-chip">{meta}</span> : null}
          <span className={`wm-compare-simple__fold-chevron${open ? " is-open" : ""}`}>
            <ChevronDown size={16} />
          </span>
        </span>
      </button>

      {open ? (
        <div id={panelId} className="wm-compare-simple__fold-body">
          {children}
        </div>
      ) : null}
    </article>
  );
}

export default function CompetitorComparePage() {
  const nav = useNavigate();
  const activeProject = getActiveProject();

  const curatedRecords = React.useMemo(() => getComparisonRecords(), []);
  const quickExamples = React.useMemo(() => pickQuickExamples(curatedRecords), [curatedRecords]);

  const [records, setRecords] = React.useState<CompetitorComparisonRecord[]>(curatedRecords);
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState("");
  const [lookupState, setLookupState] = React.useState<LookupUiState>(() => createIdleLookupState());

  const hasQuery = query.trim().length > 0;
  const savedMatches = React.useMemo(
    () => (hasQuery ? searchComparisonRecords(records, query).slice(0, 4) : []),
    [hasQuery, query, records],
  );

  const selected = React.useMemo(
    () => (selectedId ? findComparisonRecordById(records, selectedId) : null),
    [records, selectedId],
  );
  const simpleSummary = React.useMemo(
    () => (selected ? buildSimpleComparisonSummary(selected) : null),
    [selected],
  );

  const compareFactors = React.useMemo(() => {
    if (!selected) return [];

    return [
      `Category mapped as ${selected.category}.`,
      selected.ioComparison || "I/O alignment scored from published inputs and outputs.",
      selected.features.length > 0
        ? `Feature overlap based on ${selected.features.slice(0, 4).join(", ")}.`
        : "Feature overlap based on the available catalog record.",
      selected.provenance
        ? `Source: ${selected.provenance.label}${selected.provenance.cacheHit ? " (cached)" : ""}.`
        : "Source: curated comparison catalog.",
    ];
  }, [selected]);

  const resetSelection = (value: string) => {
    setQuery(value);
    setSelectedId("");
    setLookupState(
      value.trim()
        ? createIdleLookupState("Press Compare to run a fresh lookup, or choose a saved match below.")
        : createIdleLookupState(),
    );
  };

  const selectRecord = (item: CompetitorComparisonRecord, message = "Showing saved comparison record.") => {
    setQuery(`${item.brand} ${item.competitorSku}`);
    setSelectedId(recordId(item));
    setLookupState({
      status: "ready",
      message,
      warnings: [],
    });
  };

  const applyToActiveProject = () => {
    if (!selected) return;

    const active = ensureActiveProject({
      customer: activeProject?.customer || "Sample customer",
      site: activeProject?.site || "",
      roomName: activeProject?.roomName || "Replacement Opportunity",
      stage: "Specify",
      status: activeProject?.status || "Draft",
    });

    applyCompareToProject(active.id, toProjectCompareRecord(selected));
    setActiveProjectId(active.id);
    nav(`/app/projects/${encodeURIComponent(active.id)}`);
  };

  const createReplacementProject = () => {
    if (!selected) return;

    const payload = toProjectCompareRecord(selected);
    const created = createProject({
      name: `${selected.brand} ${selected.competitorSku} replacement`,
      customer: activeProject?.customer || "Sample customer",
      site: activeProject?.site || "",
      roomName: "Replacement Opportunity",
      stage: "Specify",
      status: "Draft",
      notes: `${selected.summary}\n\nRationale: ${selected.rationale}`,
      compare: payload,
      discovery: {
        customer: activeProject?.customer || "Sample customer",
        site: activeProject?.site || "",
        roomName: "Replacement Opportunity",
        applicationType: selected.category,
        notes: `${selected.summary}\n\nRationale: ${selected.rationale}`,
        recommendedFamilies: selected.recommendedFamilies,
        createdAt: new Date().toISOString(),
      },
    });

    setActiveProjectId(created.id);
    nav(`/app/projects/${encodeURIComponent(created.id)}`);
  };

  const runLookup = async () => {
    const lookupQuery = query.trim();
    if (!lookupQuery) {
      setLookupState({
        status: "empty",
        message: "Enter a competitor brand, model number, or SKU first.",
        warnings: [],
      });
      return;
    }

    setLookupState({
      status: "loading",
      message: `Comparing ${lookupQuery}...`,
      warnings: [],
    });

    try {
      const result = await lookupAndCompare(lookupQuery);
      if (result.records.length === 0) {
        setSelectedId("");
        setLookupState({
          status: "empty",
          message:
            savedMatches.length > 0
              ? `No live lookup result returned for ${lookupQuery}. A few saved comparison records are listed below.`
              : `No match returned for ${lookupQuery}.`,
          warnings: result.lookup.warnings,
        });
        return;
      }

      setRecords((current) => mergeComparisonRecords(result.records, current));
      setSelectedId(recordId(result.records[0]));

      const cacheSuffix = result.lookup.provenance.cacheHit ? " (cached)" : "";
      setLookupState({
        status: "ready",
        message: `Comparison complete via ${result.lookup.provenance.label}${cacheSuffix}.`,
        warnings: result.lookup.warnings,
      });
    } catch {
      setSelectedId("");
      setLookupState({
        status: "failed",
        message: "Lookup failed unexpectedly. You can still use saved comparison records.",
        warnings: [],
      });
    }
  };

  const matchScore = simpleSummary?.matchPercent ?? 0;
  const matchVisual = matchTone(matchScore);

  return (
    <div className="wm-page wm-compare-simple">
      <section className="wm-section wm-section--tone-cyan">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Compare a competitor SKU</h2>
            <p>
              Enter a competitor model and get the closest WyreStorm fit plus the main trade-offs.
            </p>
          </div>
        </div>

        <div className="wm-compare-simple__lookup-panel">
          <div className="wm-compare-simple__lookup-grid">
            <label className="wm-field-wrap">
              <span className="wm-label wm-compare-simple__input-label">Competitor SKU or brand / model</span>
              <div className="wm-compare-simple__search-shell">
                <Search size={20} />
                <input
                  className="wm-field wm-compare-simple__search-input"
                  value={query}
                  onChange={(e) => resetSelection(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void runLookup();
                    }
                  }}
                  placeholder="e.g. AT-OME-MS42, DM-NVX-360, Extron DTP"
                />
              </div>
            </label>

            <button
              type="button"
              className="wm-btn wm-btn--primary wm-compare-simple__compare-button"
              onClick={() => {
                void runLookup();
              }}
              disabled={lookupState.status === "loading"}
            >
              <Scale size={16} />
              {lookupState.status === "loading" ? "Comparing..." : "Compare SKU"}
            </button>
          </div>
        </div>

        <div className={lookupStateClass(lookupState.status)}>{lookupState.message}</div>
        {lookupState.warnings.length > 0 ? (
          <div className="wm-compare-warning-list">
            {lookupState.warnings.map((warning) => (
              <div key={warning} className="wm-compare-warning-item">
                {warning}
              </div>
            ))}
          </div>
        ) : null}

        {!selected ? (
          <div className="wm-compare-simple__assist-row">
            <div className="wm-compare-simple__assist-group">
              <span className="wm-compare-simple__assist-label">Try</span>
              {quickExamples.map((item) => (
                <QuickChoiceButton
                  key={recordId(item)}
                  item={item}
                  active={selected ? recordId(selected) === recordId(item) : false}
                  onSelect={(choice) => selectRecord(choice, "Showing a saved comparison example.")}
                />
              ))}
            </div>

            {hasQuery && savedMatches.length > 0 ? (
              <div className="wm-compare-simple__assist-group">
                <span className="wm-compare-simple__assist-label">Similar</span>
                {savedMatches.map((item) => (
                  <QuickChoiceButton
                    key={recordId(item)}
                    item={item}
                    detail={`${buildSimpleComparisonSummary(item).matchPercent}%`}
                    active={false}
                    onSelect={(choice) => selectRecord(choice)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {selected && simpleSummary ? (
        <section className="wm-section wm-section--tone-indigo">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Result</h2>
              <p>
                The fit score is calculated from available product data, not a manual sales
                preference.
              </p>
            </div>
          </div>

          <article className="wm-card wm-compare-simple__result-card">
            <div className="wm-compare-simple__result-main">
              <div className="wm-compare-simple__result-pair">
                <div className="wm-compare-simple__result-endpoint">
                  <div className="wm-card__title">Competitor</div>
                  <div className="wm-title-lg">
                    {selected.brand} {selected.competitorSku}
                  </div>
                  <div className="wm-card__subtitle">
                    {selected.competitorName || selected.category}
                  </div>
                </div>

                <div className="wm-compare-simple__result-arrow" aria-hidden="true">
                  <ArrowRight size={18} />
                </div>

                <div className="wm-compare-simple__result-endpoint">
                  <div className="wm-card__title">WyreStorm</div>
                  <div className="wm-title-lg">{selected.wyrestormSku}</div>
                  <div className="wm-card__subtitle">
                    {selected.wyrestormVerified === false
                      ? "Manual review required"
                      : [selected.wyrestormName, selected.wyrestormCategory].filter(Boolean).join(" • ")}
                  </div>
                </div>
              </div>

              <div className="wm-compare-simple__result-score">
                <div
                  className="wm-compare-simple__score-ring"
                  style={{
                    borderColor: matchVisual.borderColor,
                    background: matchVisual.glow,
                    color: matchVisual.text,
                  }}
                >
                  <div className="wm-compare-simple__score-value">{matchScore}%</div>
                  <div className="wm-compare-simple__score-copy">Fit</div>
                </div>

                <span
                  className="wm-compare-simple__heat-label"
                  style={{
                    borderColor: matchVisual.labelBorder,
                    background: matchVisual.labelBackground,
                    color: matchVisual.accent,
                  }}
                >
                  {matchVisual.label}
                </span>

                <div className="wm-compare-simple__heat-track" aria-hidden="true">
                  <div
                    className="wm-compare-simple__heat-fill"
                    style={{
                      width: `${Math.max(8, matchScore)}%`,
                      background: matchVisual.fillGradient,
                      boxShadow: `0 0 22px ${matchVisual.shadow}`,
                    }}
                  />
                </div>

                <div className="wm-compare-simple__score-tags">
                  <span className={selected.wyrestormVerified === false ? "wm-chip wm-chip--warn" : "wm-chip"}>
                    {selected.wyrestormVerified === false ? "Catalog SKU not verified" : "Verified catalog SKU"}
                  </span>
                  <span className="wm-compare-confidence" style={confidenceTone(selected.confidence)}>
                    Confidence: {selected.confidence}
                  </span>
                  {selected.ioComparison ? <span className="wm-chip">{selected.ioComparison}</span> : null}
                </div>
              </div>
            </div>

            <div className="wm-compare-simple__result-summary">
              <div className="wm-body-sm">{selected.rationale}</div>
            </div>
          </article>

          <div className="wm-compare-simple__detail-stack">
            <CollapsibleSection
              title="Comparison notes"
              subtitle="Key fit signals and trade-offs."
              meta={`${simpleSummary.positives.length + simpleSummary.negatives.length} items`}
            >
              <div className="wm-compare-simple__signal-groups">
                <div className="wm-compare-simple__signal-group">
                  <div className="wm-compare-simple__subhead">Fit signals</div>
                  <InsightList items={simpleSummary.positives} tone="good" />
                </div>

                <div className="wm-compare-simple__signal-group">
                  <div className="wm-compare-simple__subhead">Trade-offs</div>
                  <InsightList items={simpleSummary.negatives} tone="warn" />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="More detail"
              subtitle="Scoring inputs and project actions."
              meta={`${compareFactors.length} inputs`}
            >
              <div className="wm-compare-simple__detail-grid">
                <div className="wm-compare-simple__signal-group">
                  <div className="wm-compare-simple__subhead">Scoring inputs</div>
                  <div className="wm-compare-simple__result-caption">{selected.summary}</div>
                  <div className="wm-compare-simple__factor-list">
                    {compareFactors.map((item) => (
                      <div key={item} className="wm-compare-simple__factor-row">
                        <ArrowRight size={14} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="wm-inline-actions">
                    {selected.recommendedFamilies.map((family) => (
                      <span key={family} className="wm-chip">
                        {family}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="wm-compare-simple__signal-group">
                  <div className="wm-compare-simple__subhead">Use in project</div>
                  <div className="wm-card__subtitle">
                    {activeProject
                      ? `Apply this comparison to ${activeProject.name}.`
                      : "No active project yet. You can create one from this comparison."}
                  </div>

                  <div className="wm-compare-simple__project-actions">
                    <button type="button" className="wm-btn wm-btn--primary" onClick={applyToActiveProject}>
                      Apply to active project
                    </button>
                    <button type="button" className="wm-btn wm-btn--ghost" onClick={createReplacementProject}>
                      Create replacement project
                    </button>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </section>
      ) : null}
    </div>
  );
}
