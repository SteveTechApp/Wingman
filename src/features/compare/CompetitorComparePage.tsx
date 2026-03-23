import * as React from "react";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Mail,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wand2,
  XCircle,
} from "lucide-react";

import CompetitorMatchFinderPanel from "@/components/competitor/CompetitorMatchFinderPanel";
import CompetitorLookupStatusPanel from "@/components/competitor/CompetitorLookupStatusPanel";
import CompetitorManualComparisonPanel from "@/components/competitor/CompetitorManualComparisonPanel";
import { mainCategoryLabelForComparison } from "@/competitor/mainCategory";
import type { CompetitorLookupTrace } from "@/competitor/types";
import type {
  CompetitorCompareCoverageLevel,
  CompetitorCompareDecisionStatus,
  CompetitorCompareMatrixRow,
  CompetitorCompareMatrixStatus,
  CompetitorCompareMatchMethod,
  CompetitorCompareOption,
  CompetitorComparePortDelta,
} from "@/services/competitorCompareFit";
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
import { captureManualCompetitorProduct } from "@/services/liveProductDataStore";

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
  if (running) return "Looking up live";
  if (liveResult?.record) return "Live lookup captured";
  if (searchResult.status === "ambiguous") return "Clarify local SKU";
  if (searchResult.status === "resolved") {
    return searchResult.bestCandidate?.exactSku
      ? "Stored local match"
      : "Closest local shortlist";
  }
  if (searchResult.status === "no-match") return "SKU not in local library";
  return "Ready";
}

function feedbackSummaryText(summary: CompetitorCompareFeedbackSummary): string {
  if (summary.total === 0) {
    return "Feedback loop is empty. Unmatched searches and manual saves will be logged locally to help expand the comparison library.";
  }

  return `Feedback loop: ${summary.noMatch} no-match search${summary.noMatch === 1 ? "" : "es"}, ${summary.ambiguous} ambiguous shortlist${summary.ambiguous === 1 ? "" : "s"}, ${summary.manualSave} manual save${summary.manualSave === 1 ? "" : "s"}, ${summary.liveVerified} live lookup${summary.liveVerified === 1 ? "" : "s"}.`;
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
        ? `Live lookup captured ${liveResult.record.competitorSku}; the scraped candidate is shown at the top of the shortlist.`
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
      sourceLabel: liveResult?.sourceLabel || "Live lookup",
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

function formatPercent(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  if (value > 100) return "100%+";
  return `${Math.round(value)}%`;
}

function confidenceLabel(value: number | undefined): "High" | "Medium" | "Low" {
  const score = value ?? 0;
  if (score >= 85) return "High";
  if (score >= 65) return "Medium";
  return "Low";
}

function matrixTone(status: CompetitorCompareMatrixStatus): React.CSSProperties {
  switch (status) {
    case "better":
      return {
        color: "#bbf7d0",
        background: "rgba(34,197,94,0.10)",
        border: "1px solid rgba(34,197,94,0.22)",
      };
    case "match":
      return {
        color: "#bfdbfe",
        background: "rgba(59,130,246,0.10)",
        border: "1px solid rgba(59,130,246,0.22)",
      };
    case "gap":
      return {
        color: "#fecaca",
        background: "rgba(239,68,68,0.10)",
        border: "1px solid rgba(239,68,68,0.22)",
      };
    default:
      return {
        color: "#e2e8f0",
        background: "rgba(148,163,184,0.10)",
        border: "1px solid rgba(148,163,184,0.20)",
      };
  }
}

function matchMethodLabel(
  value: CompetitorCompareMatchMethod | undefined,
): string {
  switch (value) {
    case "direct-replacement":
      return "Direct replacement";
    case "covers-brief":
      return "Covers the brief";
    case "functional-alternative":
      return "Functional alternative";
    case "manual-review":
      return "Manual review";
    default:
      return "Candidate";
  }
}

function matchMethodTone(
  value: CompetitorCompareMatchMethod | undefined,
): React.CSSProperties {
  switch (value) {
    case "direct-replacement":
      return {
        color: "#bbf7d0",
        background: "rgba(34,197,94,0.12)",
        border: "1px solid rgba(34,197,94,0.26)",
      };
    case "covers-brief":
      return {
        color: "#bfdbfe",
        background: "rgba(59,130,246,0.12)",
        border: "1px solid rgba(59,130,246,0.26)",
      };
    case "functional-alternative":
      return {
        color: "#fde68a",
        background: "rgba(245,158,11,0.12)",
        border: "1px solid rgba(245,158,11,0.26)",
      };
    default:
      return {
        color: "#fecaca",
        background: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.26)",
      };
  }
}

function coverageLevelLabel(
  value: CompetitorCompareCoverageLevel | undefined,
): string {
  switch (value) {
    case "exact":
      return "Exact";
    case "covers":
      return "Covers";
    case "partial":
      return "Partial";
    case "missing":
      return "Missing";
    case "unknown":
      return "Unknown";
    default:
      return "Unknown";
  }
}

function coverageLevelTone(
  value: CompetitorCompareCoverageLevel | undefined,
): React.CSSProperties {
  switch (value) {
    case "exact":
      return {
        color: "#bbf7d0",
        background: "rgba(34,197,94,0.12)",
        border: "1px solid rgba(34,197,94,0.26)",
      };
    case "covers":
      return {
        color: "#bfdbfe",
        background: "rgba(59,130,246,0.12)",
        border: "1px solid rgba(59,130,246,0.26)",
      };
    case "partial":
      return {
        color: "#fde68a",
        background: "rgba(245,158,11,0.12)",
        border: "1px solid rgba(245,158,11,0.26)",
      };
    case "missing":
      return {
        color: "#fecaca",
        background: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.26)",
      };
    default:
      return {
        color: "#cbd5e1",
        background: "rgba(148,163,184,0.10)",
        border: "1px solid rgba(148,163,184,0.22)",
      };
  }
}

function decisionTone(
  status: CompetitorCompareDecisionStatus,
): React.CSSProperties {
  if (status === "pass") {
    return {
      color: "#bbf7d0",
      background: "rgba(34,197,94,0.10)",
      border: "1px solid rgba(34,197,94,0.22)",
    };
  }
  if (status === "warn") {
    return {
      color: "#fde68a",
      background: "rgba(245,158,11,0.10)",
      border: "1px solid rgba(245,158,11,0.22)",
    };
  }
  return {
    color: "#fecaca",
    background: "rgba(239,68,68,0.10)",
    border: "1px solid rgba(239,68,68,0.22)",
  };
}

function portDeltaTone(state: CompetitorComparePortDelta["state"]): React.CSSProperties {
  switch (state) {
    case "match":
      return {
        color: "#bbf7d0",
        background: "rgba(34,197,94,0.10)",
        border: "1px solid rgba(34,197,94,0.22)",
      };
    case "extra":
      return {
        color: "#bfdbfe",
        background: "rgba(59,130,246,0.10)",
        border: "1px solid rgba(59,130,246,0.22)",
      };
    case "short":
      return {
        color: "#fecaca",
        background: "rgba(239,68,68,0.10)",
        border: "1px solid rgba(239,68,68,0.22)",
      };
    default:
      return {
        color: "#cbd5e1",
        background: "rgba(148,163,184,0.10)",
        border: "1px solid rgba(148,163,184,0.22)",
      };
  }
}

function pillStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    height: 26,
    padding: "0 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
  };
}

function labelForComparisonDomain(value?: string): string {
  switch (value) {
    case "AVOIP":
      return "AVoIP";
    case "MATRIX":
      return "Matrix";
    case "PRESENTATION":
      return "Presentation";
    case "EXTENDER":
      return "Extender";
    case "VIDEO_WALL":
      return "Video wall";
    case "CONTROL":
      return "Control";
    default:
      return "Unknown";
  }
}

function labelForComparisonUseCase(value?: string): string {
  switch (value) {
    case "DISTRIBUTION":
      return "Distribution";
    case "COLLABORATION":
      return "Collaboration";
    case "ROUTING":
      return "Routing";
    case "MULTIVIEW":
      return "Multiview";
    case "WALL_PROCESSING":
      return "Wall processing";
    case "EXTENSION":
      return "Extension";
    case "CONTROL":
      return "Control";
    default:
      return "Unknown";
  }
}

function fallbackComparisonClass(candidate: CompetitorCompareCandidate): {
  state: string;
  label: string;
  warning: string;
} {
  const text = [
    candidate.comparison.category,
    candidate.comparison.summary,
    ...(candidate.comparison.features ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (text.includes("distribution") || text.includes("splitter")) {
    return {
      state: "Distribution path",
      label: "Distribution · Splitter",
      warning:
        "Treat this as a splitter/distribution product: one source to multiple local outputs is the primary job.",
    };
  }

  if (text.includes("presentation") || text.includes("switcher") || text.includes("switch")) {
    return {
      state: "Presentation system",
      label: "Presentation · Routing",
      warning:
        "Treat this as a presentation-routing product: source selection comes before any secondary features.",
    };
  }

  if (text.includes("matrix")) {
    return {
      state: "Matrix system",
      label: "Matrix · Routing",
      warning:
        "Treat this as a matrix-routing product: route count and signal path come before bonus features.",
    };
  }

  if (text.includes("extender") || text.includes("hdbaset")) {
    return {
      state: "Extender path",
      label: "Extender · Point to point",
      warning:
        "Treat this as an extender path: point-to-point signal reach matters more than extra local features.",
    };
  }

  return {
    state: "Core AV product",
    label: candidate.comparison.category || "Core AV product",
    warning:
      "Treat this as a core AV product and compare the primary signal-routing job before any bonus capability.",
  };
}

function stateLabelForCandidate(candidate: CompetitorCompareCandidate): string {
  const domain = candidate.comparison.comparisonDomain;
  const useCase = candidate.comparison.comparisonUseCase;

  switch (domain) {
    case "PRESENTATION":
      return useCase === "COLLABORATION" ? "Presentation system" : "Presentation matrix";
    case "AVOIP":
      return useCase === "MULTIVIEW" ? "AVoIP multiview" : "AVoIP family";
    case "MATRIX":
      return "Matrix system";
    case "EXTENDER":
      return "Extender path";
    case "VIDEO_WALL":
      return useCase === "MULTIVIEW" ? "Video wall compositor" : "Video wall system";
    case "CONTROL":
      return "Control appliance";
    default:
      return fallbackComparisonClass(candidate).state;
  }
}

function comparisonClassWarning(candidate: CompetitorCompareCandidate): string {
  const domain = candidate.comparison.comparisonDomain;
  const useCase = candidate.comparison.comparisonUseCase;
  if (!domain || domain === "UNKNOWN") {
    return fallbackComparisonClass(candidate).warning;
  }

  if (domain === "PRESENTATION") {
    return `Treat this as a presentation system: ${labelForComparisonUseCase(useCase).toLowerCase()} comes first, not plain matrix routing.`;
  }

  if (domain === "EXTENDER") {
    return "Treat this as an extender path: point-to-point reach matters more than distribution or routing.";
  }

  if (domain === "VIDEO_WALL") {
    return "Treat this as a video wall system: wall processing or multiview composition is the real job.";
  }

  if (domain === "CONTROL") {
    return "Treat this as a control appliance: management and orchestration matter more than signal routing.";
  }

  if (domain === "AVOIP") {
    return `Treat this as an AVoIP family: compare like-for-like against ${labelForComparisonUseCase(useCase).toLowerCase()} endpoints.`;
  }

  return `${labelForComparisonDomain(domain)} class: ${labelForComparisonUseCase(useCase)} workflow.`;
}

function comparisonClassLabel(candidate: CompetitorCompareCandidate): string {
  const domain = labelForComparisonDomain(candidate.comparison.comparisonDomain);
  const useCase = labelForComparisonUseCase(candidate.comparison.comparisonUseCase);
  if (domain === "Unknown" && useCase === "Unknown") {
    return fallbackComparisonClass(candidate).label;
  }
  return `${domain} · ${useCase}`;
}

function decisionSummaryFor(
  candidate: CompetitorCompareCandidate,
  selectedOption: CompetitorCompareOption | undefined,
  liveResult: CompetitorCompareLiveResult | null,
): { headline: string; bullets: string[]; caution?: string } {
  const sku =
    selectedOption?.wyrestormSku ||
    candidate.comparison.wyrestormSku ||
    "This WyreStorm option";
  const workflow = selectedOption?.decisionWorkflow ?? [];
  const positiveSteps = workflow
    .filter((step) => step.status === "pass")
    .map((step) => step.summary);
  const headline =
    selectedOption?.matchBasis.summary ||
    `${sku} is the current WyreStorm candidate.`;

  const bullets = [
    liveResult?.record ? "Competitor record captured from live lookup." : "",
    ...positiveSteps,
    ...(selectedOption?.highlights.matches ?? []),
    ...(selectedOption?.highlights.extras ?? []),
    selectedOption?.positioningSummary || "",
  ]
    .filter(Boolean)
    .slice(0, 4);

  const caution =
    selectedOption?.highlights.gaps[0] ||
    selectedOption?.highlights.reviews[0] ||
    selectedOption?.cautions[0];

  return { headline, bullets, caution };
}

function buildAskWyreStormEmail(input: {
  brand: string;
  sku: string;
  candidate?: CompetitorCompareCandidate;
  option?: CompetitorCompareOption;
  liveResult?: CompetitorCompareLiveResult | null;
}): { subject: string; body: string } {
  const { brand, sku, candidate, option, liveResult } = input;
  const competitorSku = candidate?.comparison.competitorSku || sku.trim();
  const competitorName = candidate?.comparison.competitorName || liveResult?.record?.competitorName;
  const suggestedSku = option?.wyrestormSku || candidate?.comparison.wyrestormSku || "";
  const subject = `Wingman compare help: ${brand} ${competitorSku}`.trim();

  const lines = [
    "Hi,",
    "",
    "Wingman could not identify an obvious WyreStorm replacement and I would like guidance on the best match.",
    "",
    `Competitor brand: ${brand || "-"}`,
    `Competitor SKU: ${competitorSku || "-"}`,
    `Competitor product: ${competitorName || "-"}`,
    `Wingman suggested SKU: ${suggestedSku || "No qualified automatic match"}`,
    `Live source: ${liveResult?.sourceUrl || "-"}`,
    "",
    "Application / room type:",
    "Required inputs / outputs:",
    "Required transport / connection type:",
    "Special features needed:",
    "",
    "Thanks,",
  ];

  return {
    subject,
    body: lines.join("\n"),
  };
}

function openAskWyreStormEmail(input: {
  brand: string;
  sku: string;
  candidate?: CompetitorCompareCandidate;
  option?: CompetitorCompareOption;
  liveResult?: CompetitorCompareLiveResult | null;
}) {
  if (typeof window === "undefined") return;
  const draft = buildAskWyreStormEmail(input);
  const query = new URLSearchParams({
    subject: draft.subject,
    body: draft.body,
  });
  const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?${query.toString()}`;
  window.open(outlookUrl, "_blank", "noopener,noreferrer");
}

function metricCard(
  label: string,
  value: string,
  hint: string,
  tone?: React.CSSProperties,
) {
  return (
    <div
      className="wm-compare-page__metric-card"
      style={{
        padding: 11,
        borderRadius: 16,
        border: tone?.border || "1px solid rgba(255,255,255,0.08)",
        background: tone?.background || "rgba(255,255,255,0.04)",
        display: "grid",
        gap: 3,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.52)",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 17, fontWeight: 900, color: tone?.color || "#f8fafc" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.4, color: "rgba(255,255,255,0.66)" }}>
        {hint}
      </div>
    </div>
  );
}

function optionRowsForMatrix(
  candidate: CompetitorCompareCandidate,
  selectedOption: CompetitorCompareOption | undefined,
): CompetitorCompareOption[] {
  if (!selectedOption) return candidate.options.slice(0, 3);

  const ordered = [
    selectedOption,
    ...candidate.options.filter((option) => option.id !== selectedOption.id),
  ];
  return ordered.slice(0, 3);
}

function matrixHasSignal(value: string | undefined): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return !["", "-", "0", "no"].includes(normalized);
}

function matrixRowsForOptions(
  options: CompetitorCompareOption[],
): CompetitorCompareMatrixRow[] {
  const orderedRows: CompetitorCompareMatrixRow[] = [];
  const seen = new Set<string>();

  for (const option of options) {
    for (const row of option.matrix) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      orderedRows.push(row);
    }
  }

  const alwaysVisible = new Set(["primary-role", "transport", "inputs", "outputs"]);
  return orderedRows.filter((row) => {
    if (alwaysVisible.has(row.id)) return true;
    const values = [
      row.competitorValue,
      ...options.map(
        (option) =>
          option.matrix.find((matrixRow) => matrixRow.id === row.id)?.wyrestormValue || "",
      ),
    ];
    return values.some((value) => matrixHasSignal(value));
  });
}

function ComparisonOptionMatrix(props: {
  candidate: CompetitorCompareCandidate;
  options: CompetitorCompareOption[];
  selectedOptionId?: string;
  onSelectOption: (
    candidate: CompetitorCompareCandidate,
    option: CompetitorCompareOption,
  ) => void;
}) {
  const { candidate, options, selectedOptionId, onSelectOption } = props;
  if (!options.length) return null;

  const activeOption =
    options.find((option) => option.id === selectedOptionId) || options[0];
  const baseRows = matrixRowsForOptions(options);
  const positiveItems = Array.from(
    new Set([
      ...(activeOption?.highlights.matches ?? []),
      ...(activeOption?.highlights.extras ?? []),
    ]),
  ).slice(0, 6);
  const negativeItems = Array.from(
    new Set([
      ...(activeOption?.highlights.gaps ?? []),
      ...(activeOption?.highlights.reviews ?? []),
      ...(activeOption?.cautions ?? []),
    ]),
  ).slice(0, 6);
  const template = `minmax(160px, 0.95fr) minmax(96px, 0.55fr) repeat(${options.length}, minmax(120px, 0.7fr))`;

  return (
    <div className="wm-compare-page__matrix" style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.52)" }}>
            Comparison matrix
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.45 }}>
            Compare the competitor baseline against the closest WyreStorm options side by side.
          </div>
        </div>

        <span
          style={{
            ...pillStyle(),
            color: "#cbd5e1",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {options.length} close match{options.length === 1 ? "" : "es"}
        </span>
      </div>

      <div className="wm-compare-page__matrix-scroll" style={{ overflowX: "auto" }}>
        <div className="wm-compare-page__matrix-grid" style={{ minWidth: 760, display: "grid", gap: 8 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: template,
              gap: 8,
            }}
          >
            <div
              style={{
                padding: 10,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.03)",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.52)",
              }}
            >
              Feature
            </div>
            <div
              style={{
                padding: 10,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.03)",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.52)",
              }}
            >
              Competitor baseline
            </div>
            {options.map((option) => {
              const active = option.id === selectedOptionId;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectOption(candidate, option)}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: active
                      ? "1px solid rgba(74,222,128,0.28)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: active
                      ? "linear-gradient(180deg, rgba(8,26,20,0.96), rgba(5,18,15,0.96))"
                      : "rgba(255,255,255,0.04)",
                    color: "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.52)" }}>
                        {option.label}
                      </div>
                      <div style={{ fontSize: 18, lineHeight: 1.1, fontWeight: 900 }}>
                        {option.wyrestormSku}
                      </div>
                    </div>
                    <div style={{ fontSize: 20, lineHeight: 1, fontWeight: 900 }}>
                      {formatPercent(option.fitScore)}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ ...pillStyle(), ...matchMethodTone(option.matchBasis.method), height: 26 }}>
                      {matchMethodLabel(option.matchBasis.method)}
                    </span>
                    <span
                      style={{
                        ...pillStyle(),
                        color: "#cbd5e1",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        height: 26,
                      }}
                    >
                      I/O {coverageLevelLabel(option.ioBreakdown.overallParity)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {baseRows.map((baseRow) => (
            <div
              key={baseRow.id}
              style={{
                display: "grid",
                gridTemplateColumns: template,
                gap: 8,
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  padding: "12px 10px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.03)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800 }}>{baseRow.label}</div>
              </div>

              <div
                style={{
                  padding: "12px 10px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.03)",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#f8fafc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                {baseRow.competitorValue}
              </div>

              {options.map((option) => {
                const row =
                  option.matrix.find((matrixRow) => matrixRow.id === baseRow.id) ||
                  baseRow;
                return (
                  <div
                    key={`${option.id}:${baseRow.id}`}
                    style={{
                      padding: "12px 10px",
                      borderRadius: 14,
                      ...matrixTone(row.status),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>
                      {row.wyrestormValue}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        <div
          style={{
            padding: 12,
            borderRadius: 14,
            color: "#bbf7d0",
            background: "rgba(34,197,94,0.10)",
            border: "1px solid rgba(34,197,94,0.22)",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Positive differences
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {(positiveItems.length > 0
              ? positiveItems
              : ["No major positive differences were captured for this option."]).map((item) => (
              <div key={item} style={{ fontSize: 13, lineHeight: 1.45 }}>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 14,
            color: "#fecaca",
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.22)",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Negative differences
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {(negativeItems.length > 0
              ? negativeItems
              : ["No major negative differences were captured for this option."]).map((item) => (
              <div key={item} style={{ fontSize: 13, lineHeight: 1.45 }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IoDeltaGroup(props: {
  title: string;
  coverage: number;
  parity: CompetitorCompareCoverageLevel;
  competitorTotal: number;
  wyrestormTotal: number;
  deltas: CompetitorComparePortDelta[];
}) {
  const { title, coverage, parity, competitorTotal, wyrestormTotal, deltas } = props;
  const visibleDeltas = deltas.filter(
    (delta) => delta.competitorCount > 0 || delta.wyrestormCount > 0,
  );

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 900 }}>{title}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)" }}>
            Competitor {competitorTotal} · WyreStorm {wyrestormTotal}
          </div>
        </div>
        <span style={{ ...pillStyle(), ...coverageLevelTone(parity), height: 26 }}>
          {coverage}% · {coverageLevelLabel(parity)}
        </span>
      </div>

      {visibleDeltas.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {visibleDeltas.map((delta) => (
            <div
              key={`${title}:${delta.type}`}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto auto",
                gap: 8,
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: 12,
                ...portDeltaTone(delta.state),
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700 }}>{delta.type.toUpperCase()}</div>
              <div style={{ fontSize: 12 }}>Competitor {delta.competitorCount}</div>
              <div style={{ fontSize: 12 }}>WyreStorm {delta.wyrestormCount}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.62)", lineHeight: 1.45 }}>
          No explicit {title.toLowerCase()} were captured on the competitor record.
        </div>
      )}
    </div>
  );
}

function ResultCard(props: {
  candidate: CompetitorCompareCandidate;
  selected: boolean;
  selectedOptionId?: string;
  liveResult: CompetitorCompareLiveResult | null;
  showAskWyreStorm?: boolean;
  onSelectCandidate: (candidate: CompetitorCompareCandidate) => void;
  onSelectOption: (
    candidate: CompetitorCompareCandidate,
    option: CompetitorCompareOption,
  ) => void;
  onAskWyreStorm?: (
    candidate: CompetitorCompareCandidate,
    option: CompetitorCompareOption | undefined,
  ) => void;
}) {
  const {
    candidate,
    selected,
    selectedOptionId,
    liveResult,
    showAskWyreStorm,
    onSelectCandidate,
    onSelectOption,
    onAskWyreStorm,
  } = props;

  const selectedOption =
    candidate.options.find((option) => option.id === selectedOptionId) ||
    candidate.primaryOption ||
    candidate.options[0];
  const matrixOptions = optionRowsForMatrix(candidate, selectedOption);

  const score =
    selectedOption?.fitScore ??
    candidate.searchScore ??
    liveResult?.record?.matchScore ??
    0;

  const decisionSummary = decisionSummaryFor(candidate, selectedOption, liveResult);
  const transportStep = selectedOption?.decisionWorkflow.find(
    (step) => step.id === "transport",
  );
  const workflowStep = selectedOption?.decisionWorkflow.find(
    (step) => step.id === "workflow",
  );
  const specStep = selectedOption?.decisionWorkflow.find((step) => step.id === "specs");

  return (
    <div
      className={selected ? "wm-card wm-compare-page__result-card is-selected" : "wm-card wm-compare-page__result-card"}
      style={{
        padding: 14,
        display: "grid",
        gap: 12,
        border: selected
          ? "1px solid rgba(74,222,128,0.28)"
          : "1px solid rgba(255,255,255,0.08)",
        background: selected
          ? "linear-gradient(180deg, rgba(8,26,20,0.96), rgba(5,18,15,0.96))"
          : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span style={{ ...pillStyle(), ...matchMethodTone(selectedOption?.matchBasis.method) }}>
              {matchMethodLabel(selectedOption?.matchBasis.method)}
            </span>
            <span
              style={{
                ...pillStyle(),
                color: "#cbd5e1",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              >
                Confidence {confidenceLabel(score)}
            </span>
            <span
              style={{
                ...pillStyle(),
                color: "#e0f2fe",
                background: "rgba(14,165,233,0.12)",
                border: "1px solid rgba(14,165,233,0.24)",
              }}
            >
              {stateLabelForCandidate(candidate)}
            </span>
            {liveResult?.record &&
            liveResult.record.competitorSku === candidate.comparison.competitorSku ? (
              <span
                style={{
                  ...pillStyle(),
                  color: "#a7f3d0",
                  background: "rgba(16,185,129,0.10)",
                  border: "1px solid rgba(16,185,129,0.22)",
                }}
              >
                <ShieldCheck size={13} style={{ marginRight: 6 }} />
                Live lookup
              </span>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.52)", fontWeight: 800 }}>
              Competitor SKU
            </div>
            <div style={{ fontSize: 16, lineHeight: 1.2, fontWeight: 900 }}>
              {candidate.comparison.brand} {candidate.comparison.competitorSku}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.68)", lineHeight: 1.45 }}>
              {candidate.comparison.competitorName || candidate.comparison.summary || "Competitor baseline selected for comparison."}
            </div>
          </div>

	          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
	            <span
	              style={{
	                ...pillStyle(),
	                color: "#fef3c7",
	                background: "rgba(180,83,9,0.18)",
	                border: "1px solid rgba(251,191,36,0.24)",
	              }}
	            >
	              Main category: {candidate.mainCategory || mainCategoryLabelForComparison(candidate.comparison)}
	            </span>
	            <span
	              style={{
	                ...pillStyle(),
	                color: "#fde68a",
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.22)",
              }}
            >
              {comparisonClassLabel(candidate)}
            </span>
          </div>

          <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.52)", fontWeight: 800 }}>
            Selected WyreStorm option
          </div>
          <div style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 900 }}>
            {selectedOption?.wyrestormSku || candidate.comparison.wyrestormSku || "No mapped SKU"}
          </div>

          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.45 }}>
            {selectedOption?.wyrestormName || selectedOption?.label || "Best WyreStorm fit"}
          </div>
        </div>

          <div
            className="wm-compare-page__score-chip"
            style={{
              minWidth: 92,
              textAlign: "right",
            padding: "8px 10px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 900 }}>{formatPercent(score)}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.62)", fontWeight: 800, marginTop: 4 }}>
            Match
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.52)", fontWeight: 800 }}>
          Summary
        </div>
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ fontSize: 15, lineHeight: 1.4, color: "#f8fafc", fontWeight: 800 }}>
            {decisionSummary.headline}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {decisionSummary.bullets.map((note) => (
              <div
                key={note}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  color: "rgba(255,255,255,0.80)",
                  lineHeight: 1.45,
                  fontSize: 13,
                }}
              >
                <CheckCircle2 size={15} style={{ marginTop: 2, flexShrink: 0, color: "#86efac" }} />
                <span>{note}</span>
              </div>
            ))}
          </div>
          {decisionSummary.caution ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                color: "#fde68a",
                lineHeight: 1.45,
                fontSize: 13,
                paddingTop: 2,
              }}
            >
              <ShieldAlert size={15} style={{ marginTop: 2, flexShrink: 0, color: "#fbbf24" }} />
              <span>{decisionSummary.caution}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        }}
      >
        {metricCard(
          "Method",
          matchMethodLabel(selectedOption?.matchBasis.method),
          selectedOption?.label || "Current candidate label",
          matchMethodTone(selectedOption?.matchBasis.method),
        )}
        {metricCard(
          "Transport",
          selectedOption?.matchBasis.transportAlignment ? "Aligned" : "Review",
          transportStep?.summary || "Transport not fully captured",
          decisionTone(transportStep?.status || "warn"),
        )}
        {metricCard(
          "I/O parity",
          coverageLevelLabel(selectedOption?.ioBreakdown.overallParity),
          `${selectedOption?.ioBreakdown.ioCoveragePercent ?? 0}% of captured I/O covered`,
          coverageLevelTone(selectedOption?.ioBreakdown.overallParity),
        )}
        {metricCard(
          "Workflow",
          `${selectedOption?.matchBasis.workflowCoveragePercent ?? 0}%`,
          workflowStep?.summary || "Workflow baseline not fully captured",
          decisionTone(workflowStep?.status || "warn"),
        )}
        {metricCard(
          "Specs",
          `${selectedOption?.matchBasis.specCoveragePercent ?? 0}%`,
          specStep?.summary || "Spec baseline not fully captured",
          decisionTone(specStep?.status || "warn"),
        )}
      </div>

      <div
        style={{
          display: "grid",
          gap: 8,
          padding: 12,
          borderRadius: 14,
          border: "1px solid rgba(245,158,11,0.18)",
          background: "rgba(245,158,11,0.07)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span
            style={{
              ...pillStyle(),
              color: "#fde68a",
              background: "rgba(245,158,11,0.14)",
              border: "1px solid rgba(245,158,11,0.26)",
            }}
          >
            {labelForComparisonDomain(candidate.comparison.comparisonDomain)}
          </span>
          <span
            style={{
              ...pillStyle(),
              color: "#fcd34d",
              background: "rgba(251,191,36,0.10)",
              border: "1px solid rgba(251,191,36,0.20)",
            }}
          >
            {labelForComparisonUseCase(candidate.comparison.comparisonUseCase)}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "#fde68a", lineHeight: 1.45, fontWeight: 700 }}>
          {comparisonClassWarning(candidate)}
        </div>
      </div>

      <ComparisonOptionMatrix
        candidate={candidate}
        options={matrixOptions}
        selectedOptionId={selectedOption?.id}
        onSelectOption={onSelectOption}
      />

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 10,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.52)", fontWeight: 800 }}>
            Decision workflow
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {(selectedOption?.decisionWorkflow ?? []).map((step) => (
              <div
                key={step.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.03)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 900 }}>{step.title}</div>
                    <span style={{ ...pillStyle(), ...decisionTone(step.status), height: 24 }}>
                      {step.status}
                    </span>
                  </div>
                  <span
                    style={{
                      ...pillStyle(),
                      color: "#cbd5e1",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      height: 24,
                    }}
                  >
                    {step.weight}% weight
                  </span>
                </div>

                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.84)", lineHeight: 1.45 }}>
                  {step.summary}
                </div>
                {step.detail ? (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", lineHeight: 1.45 }}>
                    {step.detail}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              display: "grid",
              gap: 10,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.52)", fontWeight: 800 }}>
              I/O parity
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.74)", lineHeight: 1.45 }}>
              {selectedOption?.ioBreakdown.summary}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <IoDeltaGroup
                title="Inputs"
                coverage={selectedOption?.ioBreakdown.inputCoveragePercent ?? 0}
                parity={selectedOption?.ioBreakdown.inputParity || "unknown"}
                competitorTotal={selectedOption?.ioBreakdown.competitorInputTotal ?? 0}
                wyrestormTotal={selectedOption?.ioBreakdown.wyrestormInputTotal ?? 0}
                deltas={selectedOption?.ioBreakdown.inputs ?? []}
              />
              <IoDeltaGroup
                title="Outputs"
                coverage={selectedOption?.ioBreakdown.outputCoveragePercent ?? 0}
                parity={selectedOption?.ioBreakdown.outputParity || "unknown"}
                competitorTotal={selectedOption?.ioBreakdown.competitorOutputTotal ?? 0}
                wyrestormTotal={selectedOption?.ioBreakdown.wyrestormOutputTotal ?? 0}
                deltas={selectedOption?.ioBreakdown.outputs ?? []}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          onClick={() => onSelectCandidate(candidate)}
          style={{
            height: 36,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background: selected ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)",
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {selected ? "Selected" : "Use this result"}
        </button>

        {showAskWyreStorm && onAskWyreStorm ? (
          <button
            type="button"
            onClick={() => onAskWyreStorm(candidate, selectedOption)}
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid rgba(245,158,11,0.24)",
              background: "rgba(245,158,11,0.10)",
              color: "#fde68a",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Mail size={14} />
            Ask WyreStorm
          </button>
        ) : null}
      </div>
    </div>
  );
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
    () => traceFor(searchResult, selectedCandidate, selectedOption, liveResult),
    [searchResult, selectedCandidate, selectedOption, liveResult],
  );

  const modeLabel = React.useMemo(
    () => modeLabelFor(searchResult, liveResult, running),
    [searchResult, liveResult, running],
  );

  const localMatches = React.useMemo(
    () => finderSuggestions(searchResult),
    [searchResult],
  );
  const hasExactLocalMatch = React.useMemo(
    () =>
      searchResult.candidates.some(
        (candidate) =>
          candidate.exactSku &&
          candidate.comparison.brand.trim().toLowerCase() === brand.trim().toLowerCase() &&
          candidate.comparison.competitorSku.trim().toUpperCase() ===
            sku.trim().toUpperCase(),
      ),
    [brand, searchResult, sku],
  );

  const hasCompareActivity =
    running ||
    effectiveResult.status !== "idle" ||
    Boolean(liveResult) ||
    trace.length > 0 ||
    Boolean(saveMessage) ||
    manualPanelOpen;
  const askWyreStormVisible =
    Boolean(brand.trim() && sku.trim()) &&
    (effectiveResult.status !== "resolved" || !selectedOption || (selectedOption.fitScore ?? 0) < 75);

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
    async (nextSku: string) => {
      const nextBrand = brand.trim();
      const targetSku = nextSku.trim();
      if (!nextBrand || !targetSku) return;

      setRunning(true);
      setSaveMessage("");

      try {
        const result = await verifyCompetitorComparisonLive(nextBrand, targetSku);
        setLiveResult(result);

        if (result.record) {
          logCompetitorCompareFeedback({
            type: "live-verified",
            brand: nextBrand,
            query: targetSku,
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
    [brand, refreshFeedback],
  );

  const handleAskWyreStorm = React.useCallback(
    (
      candidate?: CompetitorCompareCandidate,
      option?: CompetitorCompareOption,
    ) => {
      openAskWyreStormEmail({
        brand: brand.trim(),
        sku: sku.trim(),
        candidate,
        option,
        liveResult,
      });
    },
    [brand, sku, liveResult],
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
    if (effectiveResult.status === "no-match" && liveResult?.record) {
      setManualPanelOpen(true);
    }
  }, [effectiveResult.status, liveResult]);

  function handleSelectCandidate(candidate: CompetitorCompareCandidate) {
    setSelectedCandidateId(candidate.id);
    setSelectedOptionId(candidate.primaryOption?.id);
    setSku(candidate.comparison.competitorSku);
    setSaveMessage("");
    if (candidate.sourceType !== "lookup") {
      setLiveResult(null);
    }
  }

  function handleSelectOption(
    candidate: CompetitorCompareCandidate,
    option: CompetitorCompareOption,
  ) {
    setSelectedCandidateId(candidate.id);
    setSelectedOptionId(option.id);
    setSaveMessage("");
  }

  async function handleSaveManual(input: ManualCompetitorComparisonInput) {
    const saved = upsertManualCompetitorComparison(input);
    await captureManualCompetitorProduct({
      brand: saved.brand,
      competitorSku: saved.competitorSku,
      competitorName: saved.competitorName,
      category: saved.category,
      summary: saved.summary,
      features: saved.features,
    });
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
    <div className="wm-page wm-compare-page">
      <div className="wm-compare-page__canvas">
        <section className="wm-hero wm-page-header wm-compare-page__hero">
          <div>
            <div className="wm-page-title">Competitor Comparison</div>
            <div className="wm-page-sub wm-compare-page__subtitle">
              Compare stored competitor SKUs locally, and only use live lookup when the exact SKU is missing from Wingman's library.
            </div>
          </div>
        </section>

        <div className="wm-page-body wm-compare-page__body" style={{ display: "grid", gap: 12 }}>
          <div
            className="wm-card wm-compare-page__finder-card"
            style={{ padding: 10, overflow: "visible", position: "relative", zIndex: 40 }}
          >
            <CompetitorMatchFinderPanel
              brand={brand}
              sku={sku}
              running={running}
              hasLocalMatch={hasExactLocalMatch}
              localMatches={localMatches}
              onBrandChange={setBrand}
              onSkuChange={setSku}
              onRun={(mode) => {
                if (mode === "web") {
                  void verifyLive(sku.trim());
                  return;
                }
                refreshSearch(brand.trim(), sku.trim());
              }}
            />
          </div>

          {hasCompareActivity ? (
            <div
              className="wm-compare-page__workspace"
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "minmax(0, 1.6fr) minmax(320px, 0.9fr)",
                alignItems: "start",
              }}
            >
              <div className="wm-compare-page__results-stack" style={{ display: "grid", gap: 12 }}>
                <div
                  className="wm-card wm-compare-page__summary-card"
                  style={{
                    padding: 14,
                    display: "grid",
                    gap: 10,
                    border:
                      effectiveResult.status === "no-match"
                        ? "1px solid rgba(239,68,68,0.18)"
                        : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <span
                      style={{
                        ...pillStyle(),
                        color: "#dbeafe",
                        background: "rgba(59,130,246,0.10)",
                        border: "1px solid rgba(59,130,246,0.22)",
                      }}
                    >
                      <Search size={13} style={{ marginRight: 6 }} />
                      {modeLabel}
                    </span>

                    {liveResult?.record ? (
                      <span
                        style={{
                          ...pillStyle(),
                          color: "#bbf7d0",
                          background: "rgba(34,197,94,0.10)",
                          border: "1px solid rgba(34,197,94,0.22)",
                        }}
                      >
                        <ShieldCheck size={13} style={{ marginRight: 6 }} />
                        Live lookup
                      </span>
                    ) : null}

                    {effectiveResult.status === "ambiguous" ? (
                      <span
                        style={{
                          ...pillStyle(),
                          color: "#fde68a",
                          background: "rgba(245,158,11,0.10)",
                          border: "1px solid rgba(245,158,11,0.22)",
                        }}
                      >
                        <ShieldAlert size={13} style={{ marginRight: 6 }} />
                        Clarify shortlist
                      </span>
                    ) : null}
                  </div>

                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.55 }}>
                    {effectiveResult.summary}
                  </div>
                </div>

                {effectiveResult.candidates.length > 0 ? (
                  <div className="wm-compare-page__candidate-stack" style={{ display: "grid", gap: 12 }}>
                    {effectiveResult.candidates.map((candidate) => (
                      <ResultCard
                        key={candidate.id}
                        candidate={candidate}
                        selected={candidate.id === selectedCandidate?.id}
                        selectedOptionId={
                          candidate.id === selectedCandidate?.id
                            ? selectedOption?.id
                            : candidate.primaryOption?.id
                        }
                      liveResult={liveResult}
                        showAskWyreStorm={
                          askWyreStormVisible &&
                          candidate.id === selectedCandidate?.id
                        }
                        onSelectCandidate={handleSelectCandidate}
                        onSelectOption={handleSelectOption}
                        onAskWyreStorm={handleAskWyreStorm}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div
                className="wm-compare-page__inspector"
                style={{
                  display: "grid",
                  gap: 10,
                  alignContent: "start",
                  position: "sticky",
                  top: 20,
                }}
              >
                <div style={{ opacity: 0.92 }}>
                  <CompetitorLookupStatusPanel
                    trace={trace}
                    modeLabel={modeLabel}
                    running={running}
                    title="Lookup status"
                    subtitle="See what came from the local comparison library, what was pulled in by live lookup, and whether the match still needs clarification."
                    insight={
                      selectedCandidate
                        ? `${stateLabelForCandidate(selectedCandidate)}. ${comparisonClassWarning(selectedCandidate)}`
                        : ""
                    }
                    emptyText="No compare activity yet."
                  />
                </div>

                <div className="wm-card wm-compare-page__manual-card" style={{ padding: 12, opacity: 0.96, display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 900 }}>Manual overrides</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)", lineHeight: 1.45 }}>
                        Save or remove local override mappings when the automatic match needs help.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setManualPanelOpen((current) => !current)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.04)",
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer",
                      }}
                      title={manualPanelOpen ? "Collapse" : "Expand"}
                    >
                      <ChevronDown
                        size={16}
                        style={{
                          transform: manualPanelOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 140ms ease",
                        }}
                      />
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      color: "rgba(255,255,255,0.70)",
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        ...pillStyle(),
                        color: "#ddd6fe",
                        background: "rgba(139,92,246,0.10)",
                        border: "1px solid rgba(139,92,246,0.22)",
                      }}
                    >
                      <Wand2 size={13} style={{ marginRight: 6 }} />
                      Manual mapping
                    </span>

                    <span
                      style={{
                        ...pillStyle(),
                        color: "#cbd5e1",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {feedbackSummary}
                    </span>
                  </div>

                  {saveMessage ? (
                    <div
                      style={{
                        borderRadius: 12,
                        padding: "10px 12px",
                        background: "rgba(34,197,94,0.10)",
                        border: "1px solid rgba(34,197,94,0.22)",
                        color: "#bbf7d0",
                        fontSize: 13,
                        lineHeight: 1.45,
                      }}
                    >
                      {saveMessage}
                    </div>
                  ) : null}

                  {manualPanelOpen ? (
                    <div style={{ marginTop: 2 }}>
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

                {liveResult?.sourceUrl ? (
                  <a
                    href={liveResult.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="wm-card wm-compare-page__source-card"
                    style={{
                      padding: 12,
                      textDecoration: "none",
                      color: "inherit",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 900 }}>Lookup source</div>
                      <ExternalLink size={15} />
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)", lineHeight: 1.45 }}>
                      {liveResult.sourceLabel || "Live lookup source"}
                    </div>
                  </a>
                ) : null}

                {searchResult.status === "no-match" && !liveResult?.record ? (
                  <div
                    className="wm-card wm-compare-page__missing-card"
                    style={{
                      padding: 12,
                      display: "grid",
                      gap: 8,
                      border: "1px solid rgba(239,68,68,0.18)",
                      background: "rgba(127,29,29,0.18)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#fecaca", fontWeight: 900 }}>
                      <XCircle size={16} />
                      SKU not stored locally
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.5 }}>
                      Use Look up SKU to scrape the live product page, then save a local override if this is a repeat comparison.
                    </div>
                    {askWyreStormVisible ? (
                      <button
                        type="button"
                        onClick={() => handleAskWyreStorm(selectedCandidate, selectedOption)}
                        style={{
                          height: 36,
                          padding: "0 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(245,158,11,0.24)",
                          background: "rgba(245,158,11,0.10)",
                          color: "#fde68a",
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          justifySelf: "start",
                        }}
                      >
                        <Mail size={14} />
                        Ask WyreStorm
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div
              className="wm-card wm-compare-page__ready-card"
              style={{
                padding: 14,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 12,
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span
                  style={{
                    ...pillStyle(),
                    color: "#dbeafe",
                    background: "rgba(59,130,246,0.10)",
                    border: "1px solid rgba(59,130,246,0.22)",
                  }}
                >
                  <Search size={13} style={{ marginRight: 6 }} />
                  Ready
                </span>

                <span style={{ color: "rgba(255,255,255,0.78)", lineHeight: 1.5 }}>
                  Pick a stored competitor SKU to compare locally, or type a missing SKU and use Look up SKU to pull live specs into the matrix.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
