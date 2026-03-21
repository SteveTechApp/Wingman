import * as React from "react";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wand2,
  XCircle,
} from "lucide-react";

import CompetitorMatchFinderPanel from "@/components/competitor/CompetitorMatchFinderPanel";
import CompetitorLookupStatusPanel from "@/components/competitor/CompetitorLookupStatusPanel";
import CompetitorManualComparisonPanel from "@/components/competitor/CompetitorManualComparisonPanel";
import type { CompetitorLookupTrace } from "@/competitor/types";
import type {
  CompetitorCompareMatrixRow,
  CompetitorCompareOption,
  CompetitorCompareMatrixStatus,
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

function formatPercent(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

function confidenceLabel(value: number | undefined): "High" | "Medium" | "Low" {
  const score = value ?? 0;
  if (score >= 85) return "High";
  if (score >= 65) return "Medium";
  return "Low";
}

function bandLabel(
  value: number | undefined,
): "Strong fit" | "Good fit" | "Functional alternative" | "Weak fit" {
  const score = value ?? 0;
  if (score >= 85) return "Strong fit";
  if (score >= 70) return "Good fit";
  if (score >= 55) return "Functional alternative";
  return "Weak fit";
}

function bandTone(value: number | undefined): React.CSSProperties {
  const score = value ?? 0;
  if (score >= 85) {
    return {
      color: "#bbf7d0",
      background: "rgba(34,197,94,0.12)",
      border: "1px solid rgba(34,197,94,0.26)",
    };
  }
  if (score >= 70) {
    return {
      color: "#bfdbfe",
      background: "rgba(59,130,246,0.12)",
      border: "1px solid rgba(59,130,246,0.26)",
    };
  }
  if (score >= 55) {
    return {
      color: "#fde68a",
      background: "rgba(245,158,11,0.12)",
      border: "1px solid rgba(245,158,11,0.26)",
    };
  }
  return {
    color: "#fecaca",
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.26)",
  };
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

function pillStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    height: 28,
    padding: "0 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
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
      return "Unknown state";
  }
}

function comparisonClassWarning(candidate: CompetitorCompareCandidate): string {
  const domain = candidate.comparison.comparisonDomain;
  const useCase = candidate.comparison.comparisonUseCase;
  if (!domain || domain === "UNKNOWN") {
    return "Product class is not fully captured yet, so treat the shortlist carefully.";
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
  if (domain === "Unknown" && useCase === "Unknown") return "Class unknown";
  return `${domain} · ${useCase}`;
}

function summaryLineForMatrixRow(row: CompetitorCompareMatrixRow): string {
  if (row.status === "better") {
    return `${row.label} is stronger on the WyreStorm side.`;
  }
  if (row.status === "match") {
    return `${row.label} is aligned between the competitor and WyreStorm option.`;
  }
  if (row.status === "review") {
    return row.note || `${row.label} needs a closer check before final sign-off.`;
  }
  return row.note || `${row.label} trails the captured competitor baseline.`;
}

function decisionSummaryFor(
  candidate: CompetitorCompareCandidate,
  selectedOption: CompetitorCompareOption | undefined,
  liveResult: CompetitorCompareLiveResult | null,
  score: number,
): { headline: string; bullets: string[]; caution?: string } {
  const sku = selectedOption?.wyrestormSku || candidate.comparison.wyrestormSku || "This WyreStorm option";
  const matrix = selectedOption?.matrix ?? [];
  const positiveRows = matrix.filter((row) => row.id !== "category" && (row.status === "better" || row.status === "match"));
  const cautionRow = matrix.find((row) => row.id !== "category" && (row.status === "gap" || row.status === "review"));

  let headline = `${sku} is the closest current WyreStorm fit.`;
  if (score >= 85) {
    headline = `${sku} wins on core fit and key capability coverage.`;
  } else if (score >= 70) {
    headline = `${sku} is the clearest fit on I/O, transport, and workflow alignment.`;
  }

  const bullets: string[] = [];
  bullets.push(...(selectedOption?.reasons ?? []).slice(0, 2));
  bullets.push(...positiveRows.slice(0, 2).map(summaryLineForMatrixRow));
  if (selectedOption?.positioningSummary) bullets.push(selectedOption.positioningSummary);
  if (liveResult?.record) bullets.push("Competitor record live verified.");

  const seen = new Set<string>();
  const compactBullets = bullets
    .filter((line) => {
      const key = line.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);

  const caution =
    score >= 85
      ? undefined
      : cautionRow
        ? summaryLineForMatrixRow(cautionRow)
        : (selectedOption?.cautions ?? [])[0];

  return { headline, bullets: compactBullets, caution };
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

function MatrixTable({ rows }: { rows: CompetitorCompareMatrixRow[] }) {
  if (!rows.length) return null;

  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingTop: 12,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr 1fr auto",
          gap: 8,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.52)",
        }}
      >
        <div>Feature</div>
        <div>Competitor</div>
        <div>WyreStorm</div>
        <div>Status</div>
      </div>

      {rows.map((row) => (
        <div
          key={row.id}
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 1fr auto",
            gap: 8,
            alignItems: "start",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>{row.label}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.84)" }}>{row.competitorValue}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.84)" }}>{row.wyrestormValue}</div>
          <div>
            <span style={{ ...pillStyle(), ...matrixTone(row.status), height: 26 }}>
              {row.status}
            </span>
          </div>
          {row.note ? (
            <div
              style={{
                gridColumn: "1 / -1",
                fontSize: 12,
                color: "rgba(255,255,255,0.62)",
                lineHeight: 1.45,
                marginTop: 2,
              }}
            >
              {row.note}
            </div>
          ) : null}
        </div>
      ))}
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
  onVerifyCandidate: (candidate: CompetitorCompareCandidate) => void;
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
    onVerifyCandidate,
    onAskWyreStorm,
  } = props;

  const selectedOption =
    candidate.options.find((option) => option.id === selectedOptionId) ||
    candidate.primaryOption ||
    candidate.options[0];

  const score =
    selectedOption?.fitScore ??
    candidate.searchScore ??
    liveResult?.record?.matchScore ??
    0;

  const decisionSummary = decisionSummaryFor(candidate, selectedOption, liveResult, score);

  return (
    <div
      className="wm-card"
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
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span style={{ ...pillStyle(), ...bandTone(score) }}>{bandLabel(score)}</span>
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
                Live verified
              </span>
            ) : null}
          </div>

          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.68)", fontWeight: 700 }}>
            {candidate.comparison.brand} {candidate.comparison.competitorSku}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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

          <div style={{ fontSize: 22, lineHeight: 1.1, fontWeight: 900 }}>
            {selectedOption?.wyrestormSku || candidate.comparison.wyrestormSku || "No mapped SKU"}
          </div>

          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.45 }}>
            {selectedOption?.label || "Best WyreStorm fit"}
          </div>
        </div>

        <div
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
          Why this won
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

      <MatrixTable rows={selectedOption?.matrix ?? []} />

      {candidate.options.length > 1 ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.52)", fontWeight: 800 }}>
            Other WyreStorm options
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {candidate.options.map((option) => {
              const isActive = option.id === selectedOption?.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectOption(candidate, option)}
                  style={{
                    height: 34,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: isActive
                      ? "1px solid rgba(74,222,128,0.26)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: isActive
                      ? "rgba(34,197,94,0.10)"
                      : "rgba(255,255,255,0.04)",
                    color: "#fff",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {option.wyrestormSku} · {formatPercent(option.fitScore)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

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

        <button
          type="button"
          onClick={() => onVerifyCandidate(candidate)}
          style={{
            height: 36,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid rgba(96,165,250,0.22)",
            background: "rgba(59,130,246,0.10)",
            color: "#bfdbfe",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <RefreshCw size={14} />
          Verify live
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
              Live lookup, scored WyreStorm fit, and a clearer side-by-side feature matrix.
            </div>
          </div>
        </section>

        <div className="wm-page-body wm-compare-page__body" style={{ display: "grid", gap: 12 }}>
          <div
            className="wm-card"
            style={{ padding: 10, overflow: "visible", position: "relative", zIndex: 40 }}
          >
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

          {hasCompareActivity ? (
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "minmax(0, 1.6fr) minmax(320px, 0.9fr)",
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <div
                  className="wm-card"
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
                        Live verified
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
                  <div style={{ display: "grid", gap: 12 }}>
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
                      onVerifyCandidate={(nextCandidate) =>
                        void verifyLive(nextCandidate.comparison.competitorSku)
                      }
                      onAskWyreStorm={handleAskWyreStorm}
                    />
                  ))}
                </div>
                ) : null}
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
                <div style={{ opacity: 0.92 }}>
                  <CompetitorLookupStatusPanel
                    trace={trace}
                    modeLabel={modeLabel}
                    running={running}
                    title="Lookup status"
                    subtitle="See what came from the local comparison library, what was verified live, and whether the match still needs clarification."
                    insight={
                      selectedCandidate
                        ? `${stateLabelForCandidate(selectedCandidate)}. ${comparisonClassWarning(selectedCandidate)}`
                        : ""
                    }
                    emptyText="No compare activity yet."
                  />
                </div>

                <div className="wm-card" style={{ padding: 12, opacity: 0.96, display: "grid", gap: 10 }}>
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
                    className="wm-card"
                    style={{
                      padding: 12,
                      textDecoration: "none",
                      color: "inherit",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 900 }}>Verified source</div>
                      <ExternalLink size={15} />
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)", lineHeight: 1.45 }}>
                      {liveResult.sourceLabel || "Live lookup source"}
                    </div>
                  </a>
                ) : null}

                {effectiveResult.status === "no-match" ? (
                  <div
                    className="wm-card"
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
                      No clean local match
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.5 }}>
                      Use manual override to save a known replacement or run live verification again after refining the SKU.
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
              className="wm-card"
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
                  Start typing a competitor SKU or model to shortlist likely WyreStorm fits.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
