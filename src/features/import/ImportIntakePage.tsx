import * as React from "react";

const importIntakeToneStyles = {
  hero: {
    border: "1px solid rgba(103, 232, 249, 0.16)",
    background: "linear-gradient(135deg, rgba(18,32,52,0.96), rgba(10,18,30,0.98))",
    boxShadow: "0 24px 60px rgba(0,0,0,0.24)",
  } satisfies React.CSSProperties,
  cyanCard: {
    border: "1px solid rgba(103, 232, 249, 0.22)",
    background: "linear-gradient(135deg, rgba(8,56,72,0.30), rgba(255,255,255,0.02))",
  } satisfies React.CSSProperties,
  amberCard: {
    border: "1px solid rgba(251, 191, 36, 0.22)",
    background: "linear-gradient(135deg, rgba(92,56,8,0.24), rgba(255,255,255,0.02))",
  } satisfies React.CSSProperties,
  greenCard: {
    border: "1px solid rgba(74, 222, 128, 0.22)",
    background: "linear-gradient(135deg, rgba(10,62,30,0.26), rgba(255,255,255,0.02))",
  } satisfies React.CSSProperties,
  pinkCard: {
    border: "1px solid rgba(244, 114, 182, 0.20)",
    background: "linear-gradient(135deg, rgba(76,18,48,0.22), rgba(255,255,255,0.02))",
  } satisfies React.CSSProperties,
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.88)",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.2,
  } satisfies React.CSSProperties,
  sectionPad: {
    padding: 16,
    borderRadius: 12,
  } satisfies React.CSSProperties,
};

function ImportIntakeFlashCard(props: {
  title: string;
  text?: string;
  tone?: "cyan" | "amber" | "green" | "pink";
  children?: React.ReactNode;
}) {
  const toneStyle =
    props.tone === "amber"
      ? importIntakeToneStyles.amberCard
      : props.tone === "green"
      ? importIntakeToneStyles.greenCard
      : props.tone === "pink"
      ? importIntakeToneStyles.pinkCard
      : importIntakeToneStyles.cyanCard;

  return (
    <div
      style={{
        ...importIntakeToneStyles.sectionPad,
        ...toneStyle,
        display: "grid",
        gap: 8,
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.3 }}>
        {props.title}
      </div>
      {props.text ? (
        <div style={importCopyReduceStyles.helperText}>
          {props.text}
        </div>
      ) : null}
      {props.children}
    </div>
  );
}


const importWizardStyles = {
  hero: {
    border: "1px solid rgba(96, 165, 250, 0.18)",
    background: "linear-gradient(135deg, rgba(16,24,40,0.98), rgba(10,18,32,0.96))",
    boxShadow: "0 14px 30px rgba(0,0,0,0.16)",
    borderRadius: 12,
    padding: 14,
  } satisfies React.CSSProperties,
  chipRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 8,
    marginTop: 10,
    marginBottom: 12,
  } satisfies React.CSSProperties,
  chip: {
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 800,
    color: "rgba(255,255,255,0.90)",
    textAlign: "center",
    letterSpacing: 0.2,
  } satisfies React.CSSProperties,
  flashGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    marginBottom: 12,
  } satisfies React.CSSProperties,
  flashCard: {
    borderRadius: 12,
    padding: 16,
    display: "grid",
    gap: 8,
  } satisfies React.CSSProperties,
  cyan: {
    border: "1px solid rgba(103,232,249,0.22)",
    background: "linear-gradient(135deg, rgba(10,56,72,0.32), rgba(255,255,255,0.02))",
  } satisfies React.CSSProperties,
  amber: {
    border: "1px solid rgba(251,191,36,0.22)",
    background: "linear-gradient(135deg, rgba(92,56,8,0.25), rgba(255,255,255,0.02))",
  } satisfies React.CSSProperties,
  green: {
    border: "1px solid rgba(74,222,128,0.22)",
    background: "linear-gradient(135deg, rgba(10,62,30,0.26), rgba(255,255,255,0.02))",
  } satisfies React.CSSProperties,
  dividerCyan: {
    height: 4,
    borderRadius: 999,
    background: "linear-gradient(90deg, rgba(103,232,249,0.90), rgba(59,130,246,0.65))",
    marginBottom: 10,
  } satisfies React.CSSProperties,
  dividerAmber: {
    height: 4,
    borderRadius: 999,
    background: "linear-gradient(90deg, rgba(251,191,36,0.92), rgba(245,158,11,0.66))",
    marginBottom: 10,
  } satisfies React.CSSProperties,
  dividerGreen: {
    height: 4,
    borderRadius: 999,
    background: "linear-gradient(90deg, rgba(74,222,128,0.92), rgba(16,185,129,0.66))",
    marginBottom: 10,
  } satisfies React.CSSProperties,
};

function ImportWizardFlashCard(props: {
  title: string;
  text: string;
  tone: "cyan" | "amber" | "green";
}) {
  const toneStyle =
    props.tone === "amber"
      ? importWizardStyles.amber
      : props.tone === "green"
      ? importWizardStyles.green
      : importWizardStyles.cyan;

  return (
    <div style={{ ...importWizardStyles.flashCard, ...toneStyle }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.25 }}>
        {props.title}
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.32, color: "rgba(255,255,255,0.68)" }}>
        {props.text}
      </div>
    </div>
  );
}


const importCopyReduceStyles = {
  helperText: {
    fontSize: 11,
    lineHeight: 1.32,
    color: "rgba(255,255,255,0.66)",
    maxWidth: 720,
  } satisfies React.CSSProperties,
  promptBlock: {
    padding: "9px 11px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    display: "grid",
    gap: 6,
  } satisfies React.CSSProperties,
  promptLabel: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.45,
    textTransform: "uppercase",
    color: "rgba(103,232,249,0.88)",
  } satisfies React.CSSProperties,
  promptText: {
    fontSize: 11,
    lineHeight: 1.32,
    color: "rgba(255,255,255,0.74)",
  } satisfies React.CSSProperties,
} as const;

function ImportPromptBlock(props: {
  label: string;
  text: string;
}) {
  return (
    <div style={importCopyReduceStyles.promptBlock}>
      <div style={importCopyReduceStyles.promptLabel}>{props.label}</div>
      <div style={importCopyReduceStyles.promptText}>{props.text}</div>
    </div>
  );
}

import { useNavigate, useSearchParams } from "react-router-dom";

import CollapsibleCard from "@/ui2/components/CollapsibleCard";
import RecentTextInput from "@/components/RecentTextInput";
import { recommendFamilies } from "@/features/discovery/discoveryStore";
import {
  RECENT_TEXT_HISTORY_KEYS,
  RECENT_TEXT_HISTORY_SCOPES,
  rememberRecentTextEntry,
} from "@/features/inputs/recentTextEntries";
import { buildFullInterpretation } from "@/features/intelligence/fullInterpretation";
import { parseCustomerRequest } from "@/features/intelligence/parser";
import { buildSalespersonResponse } from "@/features/intelligence/responseBuilder";
import {
  addProjectAttachment,
  ensureActiveProject,
  updateProject,
} from "@/features/projects/projectStore";
import {
  extractRequirements,
} from "@/import/extractRequirements";
import {
  recommendWyrestorm,
} from "@/import/recommendWyrestorm";
import {
  Field,
  PageHeader,
  cardStyle,
  inputStyle,
  pageWrapStyle,
  sectionTextStyle,
  sectionTitleStyle,
  stackStyle,
  textareaStyle,
} from "@/ui2/page/PageChrome";

import {
  importIntakeFile,
  mergeImportedFiles,
  type IntakeImportedFile,
} from "./intakeFileText";
import {
  CHECKLIST,
  buildAnalysisNotesBlock,
  buildCombinedBrief,
  buildInterrogationNotesBlock,
  buildQualificationSummary,
  buildSourceCoverageSummary,
  buildStoredSourceNotes,
  collectNarrative,
  deriveOpportunityName,
  distanceHintToMeters,
  getNextToolLabel,
  rankTopSkus,
  readChecklist,
  resolveWorkflowTrack,
  type IntakeAnalysis,
  type IntakeBriefInput,
  type IntakeChecklistState,
  type IntakeDestination,
  type IntakeInterrogation,
  writeChecklist,
} from "./importIntakeSupport";

type InsightPanel = "interrogation" | "solution";
type IntakeSourceMode = "document" | "diagram";
type TextGuidanceOption = {
  id: string;
  label: string;
  helper: string;
};

const TEXT_GUIDANCE_OPTIONS: TextGuidanceOption[] = [
  { id: "outcome", label: "Business outcome", helper: "Prioritise the commercial objective and success criteria." },
  { id: "room", label: "Room and application", helper: "Prioritise room type, use case, and user profile." },
  { id: "signal", label: "Display and source scope", helper: "Prioritise display count, source devices, and signal scope." },
  { id: "conferencing", label: "Conferencing needs", helper: "Prioritise Teams/Zoom/BYOM plus camera/audio needs." },
  { id: "control", label: "Control and user simplicity", helper: "Prioritise user journey, control, and ease of use." },
  { id: "commercial", label: "Budget and timeline", helper: "Prioritise budget, deadlines, and phasing constraints." },
];

function resolveIntakeSourceMode(value: string | null): IntakeSourceMode {
  return String(value ?? "").trim().toLowerCase() === "diagram" ? "diagram" : "document";
}

function toggleButtonStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    border: `1px solid ${active ? "rgba(120,208,189,0.44)" : "rgba(255,255,255,0.1)"}`,
    background: active
      ? "linear-gradient(180deg, rgba(27,96,82,0.24), rgba(15,50,42,0.18))"
      : "rgba(255,255,255,0.03)",
    color: active ? "rgba(226,255,248,0.98)" : "rgba(255,255,255,0.82)",
    padding: "8px 12px",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.02em",
  };
}

function heroMetricStyle(accent: string): React.CSSProperties {
  return {
    borderRadius: 18,
    border: `1px solid ${accent}`,
    background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
    padding: 13,
    display: "grid",
    gap: 6,
    alignContent: "start",
    minHeight: 0,
  };
}

function sourceCardStyle(tint: string): React.CSSProperties {
  return {
    borderRadius: 18,
    border: `1px solid ${tint}`,
    background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02))",
    padding: 14,
    display: "grid",
    gap: 8,
    alignContent: "start",
  };
}

function checklistItemStyle(active: boolean, tier: "required" | "recommended" | "optional"): React.CSSProperties {
  const tint =
    tier === "required"
      ? "120,208,189"
      : tier === "recommended"
        ? "244,196,114"
        : "129,163,255";

  return {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 14,
    border: active ? `1px solid rgba(${tint},0.34)` : "1px solid rgba(255,255,255,0.08)",
    background: active
      ? `linear-gradient(180deg, rgba(${tint},0.14), rgba(${tint},0.05))`
      : "rgba(255,255,255,0.03)",
  };
}

function launchPanelStyle(): React.CSSProperties {
  return {
    ...cardStyle(),
    background:
      "linear-gradient(160deg, rgba(var(--wm-page-accent-rgb, 108,196,255),0.18) 0%, rgba(18,20,27,0.96) 38%, rgba(95,223,194,0.12) 100%)",
  };
}

function miniCardStyle(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: 12,
    display: "grid",
    gap: 6,
  };
}

function reviewCardStyle(accent: string): React.CSSProperties {
  return {
    borderRadius: 18,
    border: `1px solid ${accent}`,
    background: "linear-gradient(180deg, rgba(19,22,30,0.94), rgba(13,16,23,0.96))",
    padding: 14,
    display: "grid",
    gap: 8,
  };
}

function smallLabelStyle(): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.6)",
  };
}

function drawerBackdropStyle(): React.CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    zIndex: 60,
    background: "rgba(4,10,18,0.76)",
    backdropFilter: "blur(10px)",
    display: "flex",
    justifyContent: "flex-end",
    padding: 12,
    overflow: "auto",
  };
}

function drawerPanelStyle(): React.CSSProperties {
  return {
    width: "min(760px, calc(100vw - 24px))",
    height: "min(960px, calc(100dvh - 24px))",
    maxHeight: "calc(100dvh - 24px)",
    borderRadius: 24,
    border: "1px solid rgba(120,208,189,0.18)",
    background: "linear-gradient(180deg, rgba(6,16,26,0.98), rgba(10,24,38,0.98))",
    boxShadow: "0 32px 80px rgba(0,0,0,0.45)",
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    overflow: "hidden",
    minHeight: 0,
  };
}

function helperTextStyle(): React.CSSProperties {
  return {
    fontSize: 11,
    lineHeight: 1.42,
    color: "rgba(255,255,255,0.68)",
  };
}

function statusPillStyle(status: IntakeImportedFile["status"]): React.CSSProperties {
  if (status === "ready") {
    return {
      borderRadius: 999,
      padding: "3px 8px",
      background: "rgba(39,132,98,0.24)",
      color: "rgba(198,255,232,0.95)",
      fontSize: 11,
      fontWeight: 700,
    };
  }

  if (status === "needs-summary") {
    return {
      borderRadius: 999,
      padding: "3px 8px",
      background: "rgba(152,107,24,0.24)",
      color: "rgba(255,226,167,0.95)",
      fontSize: 11,
      fontWeight: 700,
    };
  }

  return {
    borderRadius: 999,
    padding: "3px 8px",
    background: "rgba(126,64,64,0.24)",
    color: "rgba(255,205,205,0.95)",
    fontSize: 11,
    fontWeight: 700,
  };
}

function statusLabel(status: IntakeImportedFile["status"]): string {
  if (status === "ready") return "Ready";
  if (status === "needs-summary") return "Needs Summary";
  if (status === "unsupported") return "Reference Only";
  return "Read Error";
}

function renderList(lines: string[]): React.ReactNode {
  if (lines.length === 0) {
    return <div style={{ fontSize: 11, opacity: 0.72 }}>Nothing surfaced yet.</div>;
  }

  return (
    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, lineHeight: 1.32, opacity: 0.88 }}>
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function UploadedFileList({
  items,
  emptyText,
  onRemove,
}: {
  items: IntakeImportedFile[];
  emptyText: string;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) {
    return <div style={{ fontSize: 11, opacity: 0.68 }}>{emptyText}</div>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            padding: 12,
            display: "grid",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "start",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, wordBreak: "break-word" }}>{item.name}</div>
              <div style={{ fontSize: 11, opacity: 0.68, marginTop: 2 }}>
                {item.sizeBytes.toLocaleString()} bytes
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={statusPillStyle(item.status)}>{statusLabel(item.status)}</span>
              <button className="wm-btn" type="button" onClick={() => onRemove(item.id)}>
                Remove
              </button>
            </div>
          </div>

          <div style={{ fontSize: 11, lineHeight: 1.5, opacity: 0.82 }}>{item.statusMessage}</div>
          {item.excerpt ? (
            <div style={{ fontSize: 11, lineHeight: 1.5, opacity: 0.7 }}>
              <strong>Excerpt:</strong> {item.excerpt}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}...`;
}

function InsightDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={drawerBackdropStyle()}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div style={drawerPanelStyle()} onClick={(event) => event.stopPropagation()}>
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={smallLabelStyle()}>Review Panel</div>
            <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em" }}>
              {title}
            </div>
            <div style={{ ...helperTextStyle(), marginTop: 8 }}>{subtitle}</div>
          </div>

          <button className="wm-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ padding: 14, overflowY: "auto", display: "grid", gap: 14 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ImportIntakePage() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const intakeMode = resolveIntakeSourceMode(searchParams.get("mode"));
  const attachmentKind = intakeMode === "diagram" ? "diagram" : "document";

  const [projectName, setProjectName] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [site, setSite] = React.useState("");
  const [destination, setDestination] = React.useState<IntakeDestination>("project");
  const [documentNotes, setDocumentNotes] = React.useState("");
  const [sourceText, setSourceText] = React.useState("");
  const [textGuidance, setTextGuidance] = React.useState<string[]>([]);
  const [workingNotes, setWorkingNotes] = React.useState("");
  const [documentFiles, setDocumentFiles] = React.useState<IntakeImportedFile[]>([]);
  const [loadingLane, setLoadingLane] = React.useState<"documents" | null>(null);
  const [fileNotice, setFileNotice] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [checklist, setChecklist] = React.useState<IntakeChecklistState>(() => readChecklist());
  const [openPanel, setOpenPanel] = React.useState<InsightPanel | null>(null);

  React.useEffect(() => {
    writeChecklist(checklist);
  }, [checklist]);

  const required = CHECKLIST.filter((item) => item.tier === "required");
  const requiredComplete = required.filter((item) => checklist[item.id]).length;
  const recommended = CHECKLIST.filter((item) => item.tier === "recommended");
  const recommendedComplete = recommended.filter((item) => checklist[item.id]).length;
  const selectedGuidancePrompts = React.useMemo(
    () => TEXT_GUIDANCE_OPTIONS.filter((option) => textGuidance.includes(option.id)).map((option) => option.label),
    [textGuidance],
  );

  const briefInput = React.useMemo<IntakeBriefInput>(() => ({
    destination,
    projectName,
    customer,
    site,
    documentNotes,
    sourceText,
    guidancePrompts: selectedGuidancePrompts,
    workingNotes,
    documentFiles,
  }), [
    customer,
    destination,
    documentFiles,
    documentNotes,
    projectName,
    selectedGuidancePrompts,
    site,
    sourceText,
    workingNotes,
  ]);

  const briefText = React.useMemo(
    () => buildCombinedBrief(briefInput),
    [briefInput],
  );

  const sourceCoverage = React.useMemo(
    () => buildSourceCoverageSummary(briefInput),
    [briefInput],
  );

  const interrogation = React.useMemo<IntakeInterrogation | null>(() => {
    if (!briefText.trim()) return null;

    const parsed = parseCustomerRequest(briefText);
    const fullInterpretation = buildFullInterpretation(parsed);

    return {
      parsed,
      recommendation: fullInterpretation.recommendation,
      designDirection: fullInterpretation.designDirection,
      salesperson: buildSalespersonResponse(
        parsed,
        fullInterpretation.recommendation,
        fullInterpretation.designDirection,
      ),
    };
  }, [briefText]);

  const analysis = React.useMemo<IntakeAnalysis | null>(() => {
    if (!briefText.trim()) return null;

    const extracted = extractRequirements(briefText);
    const recommendation = recommendWyrestorm(extracted, briefText);
    const parsed = interrogation?.parsed;

    const familyRecommendation = recommendFamilies({
      applicationType: [
        parsed?.roomType && parsed.roomType !== "General AV Space" ? parsed.roomType : "",
        parsed?.vertical && parsed.vertical !== "Unknown" ? parsed.vertical : "",
        extracted.roomType ?? "",
        extracted.intent === "room" ? "room" : "product",
      ]
        .filter(Boolean)
        .join(" "),
      displayCount:
        parsed?.displayCount != null
          ? String(parsed.displayCount)
          : extracted.displays != null
            ? String(extracted.displays)
            : "",
      cableDistanceM:
        parsed?.rackDistanceM != null
          ? String(parsed.rackDistanceM)
          : distanceHintToMeters(extracted.distanceHint),
      usbNeeds: parsed?.conferencing.byom || extracted.byodUsbC ? "USB-C / BYOD" : "",
      controlNeeds:
        parsed?.control.controlRequired || extracted.switchingNeeded
          ? "Switching / control required"
          : "",
    });

    return {
      extracted,
      recommendation,
      families: familyRecommendation.families,
      nextToolPath: familyRecommendation.nextTool,
      nextToolLabel: getNextToolLabel(familyRecommendation.nextTool),
      topSkus: rankTopSkus(recommendation, 8),
    };
  }, [briefText, interrogation]);

  const analysisNarrative = React.useMemo(
    () => (analysis ? collectNarrative(analysis.recommendation) : { rationale: [], cautions: [] }),
    [analysis],
  );

  const updateIntakeMode = React.useCallback((nextMode: IntakeSourceMode) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("mode", nextMode);
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const actionDisabled = saving || loadingLane !== null;
  const canInterrogate = Boolean(
    documentNotes.trim() ||
    sourceText.trim() ||
    workingNotes.trim() ||
    documentFiles.length,
  );

  const loadImportedFiles = React.useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setLoadingLane("documents");
    setFileNotice(null);

    try {
      const imported = await Promise.all(
        files.map((file) =>
          importIntakeFile(file, attachmentKind)
        )
      );

      setDocumentFiles((current) => mergeImportedFiles(current, imported));

      const reviewCount = imported.filter((item) => item.status !== "ready").length;
      setFileNotice(
        reviewCount > 0
          ? `${reviewCount} uploaded file(s) need a manual summary before they can influence interrogation fully.`
          : `${imported.length} uploaded file(s) added to the intake.`,
      );
    } finally {
      setLoadingLane(null);
    }
  }, [attachmentKind]);

  const removeImportedFile = React.useCallback((id: string) => {
    setDocumentFiles((current) => current.filter((item) => item.id !== id));
  }, []);

  const toggleChecklist = React.useCallback((id: string) => {
    setChecklist((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const toggleTextGuidance = React.useCallback((id: string) => {
    setTextGuidance((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const upsertProjectFromIntake = React.useCallback(async (navigateTo: string) => {
    setSaving(true);

    try {
      const name = deriveOpportunityName(briefInput);
      const customerName = customer.trim();
      const siteName = site.trim();
      rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.roomName, name, {
        scope: RECENT_TEXT_HISTORY_SCOPES.importIntake,
      });
      rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.customer, customerName, {
        scope: RECENT_TEXT_HISTORY_SCOPES.importIntake,
      });
      rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.site, siteName, {
        scope: RECENT_TEXT_HISTORY_SCOPES.importIntake,
      });
      const sourceNotes = buildStoredSourceNotes(briefInput);
      const qualificationSummary = buildQualificationSummary(checklist);
      const generatedAnalysis = analysis ? buildAnalysisNotesBlock(analysis) : "";
      const interrogationSummary = interrogation ? buildInterrogationNotesBlock(interrogation) : "";
      const combinedNotes = [
        sourceNotes,
        `Source coverage: ${sourceCoverage}`,
        "Qualification checklist:",
        qualificationSummary,
        interrogationSummary,
        generatedAnalysis,
      ]
        .filter(Boolean)
        .join("\n\n");

      const active = ensureActiveProject({
        name,
        customer: customerName,
        site: siteName,
        roomName: name,
        stage: "Discovery",
        status: requiredComplete === required.length ? "Review Needed" : "Draft",
        notes: combinedNotes,
      });

      const recommendedFamilies = analysis?.families?.length
        ? analysis.families
        : active.discovery?.recommendedFamilies;

      const inferredApplicationType = interrogation
        ? interrogation.parsed.roomType !== "General AV Space"
          ? interrogation.parsed.roomType
          : analysis?.extracted.roomType ??
            (analysis?.extracted.intent === "room" ? "Room solution" : "Product selection")
        : active.discovery?.applicationType;

      const inferredDisplayCount =
        interrogation?.parsed.displayCount != null
          ? String(interrogation.parsed.displayCount)
          : analysis?.extracted.displays != null
            ? String(analysis.extracted.displays)
            : active.discovery?.displayCount;

      const inferredDistance =
        interrogation?.parsed.rackDistanceM != null
          ? String(interrogation.parsed.rackDistanceM)
          : analysis
            ? distanceHintToMeters(analysis.extracted.distanceHint) || active.discovery?.cableDistanceM
            : active.discovery?.cableDistanceM;

      const inferredUsbNeeds = interrogation?.parsed.conferencing.byom
        ? "BYOM / USB room device access"
        : analysis?.extracted.byodUsbC
          ? "USB-C / BYOD"
          : active.discovery?.usbNeeds;

      const inferredControlNeeds = interrogation?.parsed.control.controlRequired
        ? "Simple guided control required"
        : analysis?.extracted.switchingNeeded
          ? "Switching required"
          : active.discovery?.controlNeeds;

      const inferredWorkflowTrack = resolveWorkflowTrack(destination);
      const inferredProjectScope = sourceCoverage;
      const inferredCustomerOutcome =
        interrogation?.salesperson.whatCustomerNeeds[0] ?? active.discovery?.customerOutcome;
      const inferredBudget = interrogation?.parsed.budgetNotes ?? active.discovery?.budgetBand;
      const inferredUrgency = interrogation?.parsed.urgencyNotes ?? active.discovery?.urgency;
      const inferredSourceTypes = interrogation?.parsed.sources?.length
        ? interrogation.parsed.sources.join(", ")
        : active.discovery?.sourceTypes;
      const inferredSourceCount =
        interrogation?.parsed.sourceInput.sourceCount != null
          ? String(interrogation.parsed.sourceInput.sourceCount)
          : active.discovery?.sourceCount;
      const inferredAudioNeeds = interrogation?.parsed.audio.reinforcementLikely
        ? "Audio reinforcement or capture is likely part of scope"
        : active.discovery?.audioNeeds;

      updateProject(active.id, {
        name,
        customer: customerName,
        site: siteName,
        roomName: name,
        stage: "Discovery",
        status: requiredComplete === required.length ? "Review Needed" : "Draft",
        notes: combinedNotes,
        catalog: {
          ...(active.catalog ?? {}),
          selectedBrand: "WyreStorm",
          skus: analysis?.topSkus?.length
            ? analysis.topSkus.map((item) => item.sku)
            : active.catalog?.skus ?? [],
          notes: analysis
            ? [
                `Auto-ranked from import intake in ${analysis.extracted.intent} mode.`,
                interrogation?.designDirection.primaryArchitecture
                  ? `Primary design direction: ${interrogation.designDirection.primaryArchitecture}.`
                  : "",
              ]
                .filter(Boolean)
                .join(" ")
            : active.catalog?.notes,
        },
        discovery: {
          ...(active.discovery ?? {}),
          customer: customerName,
          site: siteName,
          roomName: name,
          workflowTrack: inferredWorkflowTrack,
          projectScope: inferredProjectScope,
          customerOutcome: inferredCustomerOutcome,
          applicationType: inferredApplicationType,
          displayCount: inferredDisplayCount,
          cableDistanceM: inferredDistance,
          sourceTypes: inferredSourceTypes,
          sourceCount: inferredSourceCount,
          usbNeeds: inferredUsbNeeds,
          audioNeeds: inferredAudioNeeds,
          controlNeeds: inferredControlNeeds,
          budgetBand: inferredBudget,
          urgency: inferredUrgency,
          notes: combinedNotes,
          recommendedFamilies,
          recommendedNextTool:
            analysis?.nextToolPath ?? active.discovery?.recommendedNextTool ?? "/app/tools/discovery",
          createdAt: active.discovery?.createdAt ?? new Date().toISOString(),
        },
      });

      const attachmentInputs = [
        ...documentFiles.map((file) => ({
          name: file.name,
          kind: file.attachmentKind,
          source: "Import Intake",
          summary: file.excerpt || file.statusMessage,
          contentType: file.contentType,
          sizeBytes: file.sizeBytes,
        })),
        sourceText.trim()
          ? {
              name: `${name} intake source text`,
              kind: "brief" as const,
              source: "Import Intake Text",
              summary: sourceText.trim().slice(0, 280),
              contentType: "text/plain",
              sizeBytes: sourceText.trim().length,
            }
          : null,
      ].filter((input): input is NonNullable<typeof input> => Boolean(input));

      await Promise.allSettled(
        attachmentInputs.map((input) => addProjectAttachment(active.id, input))
      );

      nav(navigateTo);
    } finally {
      setSaving(false);
    }
  }, [
    analysis,
    briefInput,
    checklist,
    customer,
    destination,
    documentFiles,
    interrogation,
    nav,
    required.length,
    requiredComplete,
    site,
    sourceText,
    sourceCoverage,
  ]);

  const title = intakeMode === "diagram" ? "Import Diagram or Existing System" : "Import Brief or Document";
  const description = intakeMode === "diagram"
    ? "Turn a sketch or live system into a clean project start."
    : "Turn a brief, RFQ, or email trail into a clean project start.";
  const intakeModeHelper = intakeMode === "diagram"
    ? "Best when the system shape already exists."
    : "Best when the brief already exists in writing.";
  const documentTitle = intakeMode === "diagram" ? "Upload diagrams or screenshots" : "Upload briefs or support files";
  const documentHelper = intakeMode === "diagram"
    ? "Add screenshots, PDFs, markups, or photos. Wingman keeps them with the intake and uses extracted text where it can."
    : "Add RFQs, tenders, notes, emails, or markups. Pasted text is still the strongest signal.";
  const documentNoteLabel = intakeMode === "diagram" ? "Diagram / system notes" : "Tender / RFQ notes";
  const documentAccept = ".pdf,.docx,.txt,.md,.csv,.eml,.png,.jpg,.jpeg,.svg";
  const sourceTextLabel = intakeMode === "diagram" ? "Describe the current system" : "Paste the customer brief";
  const sourceTextPlaceholder = intakeMode === "diagram"
    ? "Describe the existing signal flow, rooms, displays, sources, control expectations, pain points, and what needs to change."
    : "Paste tender wording, meeting notes, an email thread, or the customer request in plain English.";
  const sourceTextHelper = intakeMode === "diagram"
    ? "A short plain-English summary makes diagrams much easier to read."
    : "Paste the raw wording. No need to rewrite it.";
  const documentNotePlaceholder = intakeMode === "diagram"
    ? "Call out what the diagram does not show clearly: pain points, rooms, signal issues, missing labels, or upgrade objectives."
    : "Call out key deliverables, commercial constraints, tender language, or scope wording that should shape the output.";
  const interrogationSummary = interrogation
    ? truncateText(interrogation.salesperson.summaryParagraph, 200)
    : "Add source material to build the interrogation brief.";
  const solutionSummary = analysis
    ? analysis.topSkus.length > 0
      ? `${analysis.topSkus[0].sku} currently leads the ranked starting point, with ${analysis.nextToolLabel} as the next workflow.`
      : `Wingman has a family direction and a recommended next workflow: ${analysis.nextToolLabel}.`
    : "Add source material to get a family direction and next route.";
  const sourceSignalCount = [
    sourceText.trim(),
    documentNotes.trim(),
    workingNotes.trim(),
    documentFiles.length > 0 ? "files" : "",
    selectedGuidancePrompts.length > 0 ? "guidance" : "",
  ].filter(Boolean).length;
  const readyFileCount = documentFiles.filter((item) => item.status === "ready").length;
  const needsSummaryCount = documentFiles.filter((item) => item.status === "needs-summary").length;
  const referenceOnlyCount = documentFiles.filter((item) => item.status === "unsupported" || item.status === "error").length;
  const confidencePct = interrogation ? Math.round(interrogation.parsed.confidence * 100) : 0;
  const projectShellName = deriveOpportunityName(briefInput);
  const primaryActionLabel =
    destination === "sales-enquiry" ? "Open qualification" : "Open Guided Project";
  const readinessLabel = requiredComplete === required.length
    ? "Ready to launch"
    : `${required.length - requiredComplete} required check${required.length - requiredComplete === 1 ? "" : "s"} left`;
  const coverageLines = [
    sourceText.trim() ? "Source text added" : "",
    documentFiles.length ? `${documentFiles.length} file(s) attached` : "",
    documentNotes.trim() ? "Formal notes added" : "",
    workingNotes.trim() ? "Internal working notes added" : "",
    selectedGuidancePrompts.length ? `${selectedGuidancePrompts.length} focus area(s) selected` : "",
  ].filter(Boolean);
  const topNeedLines = interrogation?.salesperson.whatCustomerNeeds.slice(0, 3) ?? [];
  const riskLines = interrogation?.salesperson.keyRisksAndUnknowns.slice(0, 3) ?? [];
  const actionLines = interrogation?.salesperson.recommendedNextActions.slice(0, 3) ?? [];
  const shortlistLines = analysis?.topSkus.slice(0, 4).map((item) => `${item.sku}${item.family ? ` - ${item.family}` : ""}`) ?? [];
  const sourceInsightSummary =
    `${topNeedLines.length} need${topNeedLines.length === 1 ? "" : "s"}, ` +
    `${riskLines.length} risk${riskLines.length === 1 ? "" : "s"}, ` +
    `${actionLines.length} action${actionLines.length === 1 ? "" : "s"}, ` +
    `${shortlistLines.length} SKU${shortlistLines.length === 1 ? "" : "s"}`;
  const checklistSummary =
    `${requiredComplete}/${required.length} required, ${recommendedComplete}/${recommended.length} recommended`;
  const handoffSummary =
    `${coverageLines.length} coverage item${coverageLines.length === 1 ? "" : "s"}, ` +
    `${selectedGuidancePrompts.length} priority area${selectedGuidancePrompts.length === 1 ? "" : "s"}`;

  return (
    <>
      <div className="wm-page wm-animate-in wm-import-intake-page" style={pageWrapStyle()}>
        <div style={stackStyle(14)}>
          <PageHeader
            eyebrow={intakeMode === "diagram" ? "DIAGRAM INTAKE" : "IMPORT INTAKE"}
            title={title}
            description={description}
            actions={
              <>
                <button className="wm-btn" type="button" onClick={() => nav("/app/tools")}>
                  Tool Hub
                </button>
                {analysis ? (
                  <button
                    className="wm-btn"
                    disabled={actionDisabled}
                    type="button"
                    onClick={() => {
                      void upsertProjectFromIntake(analysis.nextToolPath);
                    }}
                  >
                    Open {analysis.nextToolLabel}
                  </button>
                ) : null}
                <button
                  className="wm-btn wm-btn-primary"
                  disabled={actionDisabled}
                  type="button"
                  onClick={() => {
                    void upsertProjectFromIntake("/app/tools/discovery");
                  }}
                >
                  {saving ? "Saving..." : "Launch Guided Project"}
                </button>
              </>
            }
          />

          <section className="wm-import-intake-page__hero-shell" style={cardStyle()}>
            <div className="wm-import-intake-page__hero-grid">
              <article className="wm-import-intake-page__hero-metric" style={heroMetricStyle("rgba(95,223,194,0.24)")}>
                <div style={smallLabelStyle()}>Start mode</div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em" }}>
                  {intakeMode === "diagram" ? "Diagram-first" : "Brief-first"}
                </div>
                <div style={helperTextStyle()}>{intakeModeHelper}</div>
              </article>

              <article className="wm-import-intake-page__hero-metric" style={heroMetricStyle("rgba(99,160,224,0.24)")}>
                <div style={smallLabelStyle()}>Signals</div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em" }}>
                  {sourceSignalCount} intake signal{sourceSignalCount === 1 ? "" : "s"}
                </div>
                <div style={helperTextStyle()}>{sourceCoverage}</div>
              </article>

              <article className="wm-import-intake-page__hero-metric" style={heroMetricStyle("rgba(244,196,114,0.24)")}>
                <div style={smallLabelStyle()}>Readout confidence</div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em" }}>
                  {confidencePct}%
                </div>
                <div style={helperTextStyle()}>
                  {interrogation ? truncateText(interrogation.salesperson.summaryParagraph, 96) : "Add source material to build the readout."}
                </div>
              </article>

              <article className="wm-import-intake-page__hero-metric" style={heroMetricStyle("rgba(129,163,255,0.24)")}>
                <div style={smallLabelStyle()}>Next tool</div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em" }}>
                  {analysis?.nextToolLabel ?? "Guided Project"}
                </div>
                <div style={helperTextStyle()}>
                  {analysis?.topSkus[0]
                    ? `${analysis.topSkus[0].sku} is the current lead SKU.`
                    : "Wingman will suggest the next tool once the intake is clear enough."}
                </div>
              </article>
            </div>
          </section>

          <div className="wm-import-intake-page__layout">
            <div className="wm-import-intake-page__main" style={stackStyle(14)}>
              <div style={{ order: 2 }}>
                <div style={{ height: 4, borderRadius: 999, background: "linear-gradient(90deg, rgba(103,232,249,0.8), rgba(74,222,128,0.72), rgba(251,191,36,0.72))", marginBottom: 10 }} />
                <div style={importWizardStyles.dividerCyan} />
                <CollapsibleCard
                  id="import-intake-supporting"
                  title="Intake setup"
                  subtitle="Set the source, the destination, and the core project details."
                  defaultCollapsed={false}
                >
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      marginBottom: 14,
                    }}
                  >
                    <article style={sourceCardStyle("rgba(99,160,224,0.16)")}>
                      <div style={smallLabelStyle()}>Source route</div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>
                        {intakeMode === "diagram" ? "Diagram / Existing System" : "Brief / Document"}
                      </div>
                      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          style={toggleButtonStyle(intakeMode === "document")}
                          onClick={() => updateIntakeMode("document")}
                        >
                          Brief / Document
                        </button>
                        <button
                          type="button"
                          style={toggleButtonStyle(intakeMode === "diagram")}
                          onClick={() => updateIntakeMode("diagram")}
                        >
                          Diagram / System
                        </button>
                      </div>
                      <div style={{ ...helperTextStyle(), marginTop: 8 }}>{intakeModeHelper}</div>
                    </article>

                    <article style={sourceCardStyle("rgba(120,208,189,0.16)")}>
                      <div style={smallLabelStyle()}>Launch target</div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>
                        {destination === "sales-enquiry" ? "Sales enquiry qualification" : "New project start"}
                      </div>
                      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          style={toggleButtonStyle(destination === "project")}
                          onClick={() => setDestination("project")}
                        >
                          New Project Start
                        </button>
                        <button
                          type="button"
                          style={toggleButtonStyle(destination === "sales-enquiry")}
                          onClick={() => setDestination("sales-enquiry")}
                        >
                          Sales Enquiry
                        </button>
                      </div>
                      <div style={{ ...helperTextStyle(), marginTop: 8 }}>
                        {destination === "sales-enquiry"
                          ? "Best for a lighter qualification shell."
                          : "Best when this should become a full project shell."}
                      </div>
                    </article>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    <Field label="Project or enquiry name">
                      <RecentTextInput
                        historyKey={RECENT_TEXT_HISTORY_KEYS.roomName}
                        historyScope={RECENT_TEXT_HISTORY_SCOPES.importIntake}
                        value={projectName}
                        onChange={(event) => setProjectName(event.target.value)}
                        style={inputStyle()}
                      />
                    </Field>

                    <Field label="Customer">
                      <RecentTextInput
                        historyKey={RECENT_TEXT_HISTORY_KEYS.customer}
                        historyScope={RECENT_TEXT_HISTORY_SCOPES.importIntake}
                        value={customer}
                        onChange={(event) => setCustomer(event.target.value)}
                        style={inputStyle()}
                      />
                    </Field>

                    <Field label="Site">
                      <RecentTextInput
                        historyKey={RECENT_TEXT_HISTORY_KEYS.site}
                        historyScope={RECENT_TEXT_HISTORY_SCOPES.importIntake}
                        value={site}
                        onChange={(event) => setSite(event.target.value)}
                        style={inputStyle()}
                      />
                    </Field>
                  </div>

                  <Field label="Working notes">
                    <textarea
                      value={workingNotes}
                      onChange={(event) => setWorkingNotes(event.target.value)}
                      placeholder="Add assumptions, deadlines, owners, or anything else worth carrying forward."
                      style={textareaStyle(6)}
                    />
                  </Field>

                  <article style={sourceCardStyle(intakeMode === "diagram" ? "rgba(120,208,189,0.28)" : "rgba(120,208,189,0.18)")}>
                    <div>
                      <div style={smallLabelStyle()}>{documentTitle}</div>
                      <div style={{ ...helperTextStyle(), marginTop: 8 }}>{documentHelper}</div>
                    </div>

                    <Field label={intakeMode === "diagram" ? "Upload diagram files" : "Upload source files"}>
                      <input
                        accept={documentAccept}
                        multiple
                        style={inputStyle()}
                        type="file"
                        onChange={(event) => {
                          const files = event.currentTarget.files ? Array.from(event.currentTarget.files) : [];
                          event.currentTarget.value = "";
                          void loadImportedFiles(files);
                        }}
                      />
                    </Field>

                    <Field label={documentNoteLabel}>
                      <textarea
                        value={documentNotes}
                        onChange={(event) => setDocumentNotes(event.target.value)}
                        placeholder={documentNotePlaceholder}
                        style={textareaStyle(6)}
                      />
                    </Field>

                    {fileNotice ? (
                      <div
                        style={{
                          borderRadius: 12,
                          border: "1px solid rgba(120,208,189,0.16)",
                          background: "rgba(12,33,44,0.5)",
                          padding: "7px 10px",
                          fontSize: 11,
                          lineHeight: 1.5,
                          color: "rgba(255,255,255,0.82)",
                        }}
                      >
                        {fileNotice}
                      </div>
                    ) : null}

                    {loadingLane ? (
                      <div style={{ fontSize: 11, opacity: 0.76 }}>
                        Reading uploaded source files...
                      </div>
                    ) : null}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span className="wm-chip">{readyFileCount} ready</span>
                      {needsSummaryCount > 0 ? <span className="wm-chip">{needsSummaryCount} need summary</span> : null}
                      {referenceOnlyCount > 0 ? <span className="wm-chip">{referenceOnlyCount} reference only</span> : null}
                    </div>

                    <div>
                      <div style={{ ...smallLabelStyle(), marginBottom: 8 }}>Uploaded files</div>
                      <UploadedFileList
                        items={documentFiles}
                        emptyText={intakeMode === "diagram" ? "No diagram files uploaded yet." : "No supporting files uploaded yet."}
                        onRemove={removeImportedFile}
                      />
                    </div>
                  </article>
                </CollapsibleCard>
              </div>

        <section style={{ ...cardStyle(), order: 1 }}>
          <div style={sectionTitleStyle()}>{intakeMode === "diagram" ? "Describe the current system" : "Paste the source text"}</div>
          <div style={sectionTextStyle()}>
            {sourceTextHelper}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <article style={sourceCardStyle(intakeMode === "document" ? "rgba(99,160,224,0.28)" : "rgba(99,160,224,0.18)")}>
              <div>
                <div style={smallLabelStyle()}>{intakeMode === "diagram" ? "System description" : "Customer request"}</div>
                <div style={{ marginTop: 6, fontSize: 17, fontWeight: 800 }}>{sourceTextLabel}</div>
              </div>

              <Field label={sourceTextLabel}>
                <textarea
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  placeholder={sourceTextPlaceholder}
                  style={textareaStyle(14)}
                />
              </Field>

              <Field label="Output focus (optional)">
                <div style={{ ...helperTextStyle(), marginBottom: 8 }}>
                  Tell Wingman what to weight most.
                </div>
                <div className="wm-import-intake-page__guidance-grid">
                  {TEXT_GUIDANCE_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "7px 10px",
                        borderRadius: 12,
                        border: textGuidance.includes(option.id)
                          ? "1px solid rgba(120,208,189,0.28)"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: textGuidance.includes(option.id)
                          ? "rgba(27,96,82,0.2)"
                          : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={textGuidance.includes(option.id)}
                        onChange={() => toggleTextGuidance(option.id)}
                        style={{ marginTop: 2 }}
                      />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{option.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.74, marginTop: 2 }}>{option.helper}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div style={{ ...helperTextStyle(), marginTop: 8 }}>
                  Leave all off for a balanced read.
                </div>
              </Field>

              <CollapsibleCard
                id="import-intake-source-intelligence"
                title="Source intelligence"
                subtitle="Needs, risks, actions, and ranked SKUs in one place."
                right={<span className="wm-chip">{sourceInsightSummary}</span>}
                defaultCollapsed
              >
                <div className="wm-import-intake-page__insight-grid">
                  <div style={miniCardStyle()}>
                    <div style={smallLabelStyle()}>Customer needs</div>
                    {renderList(topNeedLines)}
                  </div>
                  <div style={miniCardStyle()}>
                    <div style={smallLabelStyle()}>Risks and unknowns</div>
                    {renderList(riskLines)}
                  </div>
                  <div style={miniCardStyle()}>
                    <div style={smallLabelStyle()}>Next actions</div>
                    {renderList(actionLines)}
                  </div>
                  <div style={miniCardStyle()}>
                    <div style={smallLabelStyle()}>SKU shortlist</div>
                    {renderList(shortlistLines)}
                  </div>
                </div>
              </CollapsibleCard>
            </article>
          </div>
        </section>

              <div style={{ height: 4, borderRadius: 999, background: "linear-gradient(90deg, rgba(103,232,249,0.8), rgba(74,222,128,0.72), rgba(251,191,36,0.72))", marginBottom: 10 }} />
                <div style={importWizardStyles.dividerAmber} />
              <CollapsibleCard
                  id="import-intake-qualification"
                title="Launch checklist"
                subtitle={`Required ${requiredComplete}/${required.length}. Recommended ${recommendedComplete}/${recommended.length}. ${readinessLabel}.`}
                right={
                  <span className="wm-chip">
                    {checklistSummary}
                  </span>
                }
                defaultCollapsed
              >
                <div className="wm-import-intake-page__checklist-grid">
                  {CHECKLIST.map((item) => (
                    <label key={item.id} style={checklistItemStyle(Boolean(checklist[item.id]), item.tier)}>
                      <input
                        type="checkbox"
                        checked={Boolean(checklist[item.id])}
                        onChange={() => toggleChecklist(item.id)}
                        style={{ marginTop: 2 }}
                      />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{item.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.72, marginTop: 2, textTransform: "capitalize" }}>
                          {item.tier}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <div style={{ ...helperTextStyle(), marginTop: 14 }}>
                  Clear the required checks before you launch.
                </div>
              </CollapsibleCard>
            </div>

            <aside className="wm-import-intake-page__rail" style={{ display: "grid", gap: 10, alignContent: "start" }}>
              <section className="wm-import-intake-page__launch-panel" style={launchPanelStyle()}>
                <div style={smallLabelStyle()}>Launch this intake</div>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900, letterSpacing: "-0.05em" }}>
                  {projectShellName}
                </div>
                <div style={{ ...helperTextStyle(), marginTop: 8 }}>
                  {destination === "sales-enquiry"
                    ? "Wingman will save an enquiry shell, attach the evidence, and send you into qualification."
                    : "Wingman will save the intake into a project shell and send you to the next tool."}
                </div>

                <div
                  className="wm-import-intake-page__launch-actions"
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gap: 8,
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  }}
                >
                  <button className="wm-btn" disabled={!interrogation || actionDisabled} type="button" onClick={() => setOpenPanel("interrogation")}>
                    Interrogation brief
                  </button>
                  <button
                    className="wm-btn"
                    disabled={!analysis || actionDisabled}
                    type="button"
                    onClick={() => setOpenPanel("solution")}
                  >
                    Solution brief
                  </button>
                  <button
                    className="wm-btn wm-btn-primary"
                    disabled={actionDisabled}
                    type="button"
                    onClick={() => {
                      void upsertProjectFromIntake("/app/tools/discovery");
                    }}
                  >
                    {primaryActionLabel}
                  </button>
                </div>

                <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                  <div style={reviewCardStyle("rgba(99,160,224,0.18)")}>
                    <div style={smallLabelStyle()}>Interrogation brief</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {interrogation ? `${confidencePct}% confidence` : "Waiting for source material"}
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.32, color: "rgba(255,255,255,0.8)" }}>
                      {interrogationSummary}
                    </div>
                  </div>

                  <div style={reviewCardStyle("rgba(216,177,76,0.18)")}>
                    <div style={smallLabelStyle()}>Solution starting point</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {analysis ? analysis.nextToolLabel : "No route yet"}
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.32, color: "rgba(255,255,255,0.8)" }}>
                      {solutionSummary}
                    </div>
                  </div>

                  <div style={reviewCardStyle("rgba(120,208,189,0.18)")}>
                    <div style={smallLabelStyle()}>Readiness board</div>
                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                      <div style={miniCardStyle()}>
                        <div style={smallLabelStyle()}>Required</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{requiredComplete}/{required.length}</div>
                      </div>
                      <div style={miniCardStyle()}>
                        <div style={smallLabelStyle()}>Files ready</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{readyFileCount}</div>
                      </div>
                      <div style={miniCardStyle()}>
                        <div style={smallLabelStyle()}>Coverage</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{sourceSignalCount}</div>
                      </div>
                      <div style={miniCardStyle()}>
                        <div style={smallLabelStyle()}>Route</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{analysis?.nextToolLabel ?? "Guided Project"}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.7, color: "rgba(255,255,255,0.84)" }}>
                      {readinessLabel}
                    </div>
                  </div>
                </div>
              </section>

              <CollapsibleCard
                id="import-intake-handoff"
                title="Handoff summary"
                subtitle="What Wingman will store before it launches."
                right={<span className="wm-chip">{handoffSummary}</span>}
                defaultCollapsed
              >
                <div style={sectionTextStyle()}>
                  This is what Wingman is about to write into the project.
                </div>

                <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                  <div style={miniCardStyle()}>
                    <div style={smallLabelStyle()}>Source coverage</div>
                    <div style={{ ...helperTextStyle(), marginTop: 4 }}>{sourceCoverage}</div>
                    {coverageLines.length > 0 ? renderList(coverageLines) : null}
                  </div>

                  {selectedGuidancePrompts.length > 0 ? (
                    <div style={miniCardStyle()}>
                      <div style={smallLabelStyle()}>Priority areas</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {selectedGuidancePrompts.map((prompt) => (
                          <span key={prompt} className="wm-chip">{prompt}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {analysis ? (
                    <button
                      className="wm-btn"
                      disabled={actionDisabled}
                      type="button"
                      onClick={() => {
                        void upsertProjectFromIntake(analysis.nextToolPath);
                      }}
                    >
                      Apply intake and open {analysis.nextToolLabel}
                    </button>
                  ) : null}

                  <button
                    className="wm-btn"
                    disabled={actionDisabled}
                    type="button"
                    onClick={() => {
                      void upsertProjectFromIntake("/app/projects");
                    }}
                  >
                    {destination === "sales-enquiry" ? "Save enquiry to Projects" : "Save intake to Projects"}
                  </button>
                </div>
              </CollapsibleCard>
            </aside>
          </div>

          <InsightDrawer
            open={openPanel === "interrogation"}
            title="Enquiry interrogation"
            subtitle={
              interrogation
                ? "Customer intent, commercial readout, and next questions."
                : "Add source text or files to build the interrogation brief."
            }
            onClose={() => setOpenPanel(null)}
          >
            {!canInterrogate || !interrogation ? (
              <div style={{ fontSize: 11, opacity: 0.74 }}>
                Upload a tender or RFQ, or paste the request text to build the interrogation brief.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="wm-chip">Track: {destination === "sales-enquiry" ? "Sales enquiry" : "Project start"}</span>
                  <span className="wm-chip">Vertical: {interrogation.parsed.vertical || "Unknown"}</span>
                  <span className="wm-chip">Complexity: {interrogation.parsed.complexity || "Unknown"}</span>
                  <span className="wm-chip">Room: {interrogation.parsed.roomType || "General AV Space"}</span>
                  <span className="wm-chip">Display: {interrogation.parsed.displayType || "Unknown"}</span>
                  <span className="wm-chip">Scale: {interrogation.parsed.deploymentScale || "Unknown"}</span>
                  <span className="wm-chip">Confidence: {Math.round(interrogation.parsed.confidence * 100)}%</span>
                </div>

                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    padding: 14,
                    fontSize: 14,
                    lineHeight: 1.32,
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  {interrogation.salesperson.summaryParagraph}
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  }}
                >
                  <div style={miniCardStyle()}>
                    <div style={smallLabelStyle()}>Customer Needs</div>
                    {renderList(interrogation.salesperson.whatCustomerNeeds.slice(0, 4))}
                  </div>

                  <div style={miniCardStyle()}>
                    <div style={smallLabelStyle()}>Risks And Unknowns</div>
                    {renderList(interrogation.salesperson.keyRisksAndUnknowns.slice(0, 4))}
                  </div>

                  <div style={miniCardStyle()}>
                    <div style={smallLabelStyle()}>Next Actions</div>
                    {renderList(interrogation.salesperson.recommendedNextActions.slice(0, 4))}
                  </div>

                  <div style={miniCardStyle()}>
                    <div style={smallLabelStyle()}>Clarify Next</div>
                    {renderList(
                      interrogation.parsed.clarificationQuestionsDetailed
                        .slice(0, 4)
                        .map((item) => item.question)
                    )}
                  </div>
                </div>

                <div>
                  <div style={smallLabelStyle()}>Primary design direction</div>
                  <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800 }}>
                    {interrogation.designDirection.primaryArchitecture}
                  </div>
                  <div style={{ ...helperTextStyle(), marginTop: 8 }}>
                    {interrogation.designDirection.commercialSummary}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {interrogation.recommendation.likelySolutionCategories.map((item) => (
                      <span key={item} className="wm-chip">{item}</span>
                    ))}
                    {interrogation.designDirection.productFamilyHints.map((item) => (
                      <span key={item} className="wm-chip">{item}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </InsightDrawer>

          <InsightDrawer
            open={openPanel === "solution"}
            title="Solution starting point"
            subtitle={
              analysis
                ? "Recommended families, ranked SKUs, and the next tool."
                : "Add source material to get family guidance and SKU ranking."
            }
            onClose={() => setOpenPanel(null)}
          >
            {!analysis ? (
              <div style={{ fontSize: 11, opacity: 0.74 }}>
                Add source material to get family guidance and SKU ranking.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="wm-chip">Intent: {analysis.extracted.intent === "room" ? "Room" : "Product"}</span>
                  {analysis.extracted.roomType ? <span className="wm-chip">Room: {analysis.extracted.roomType}</span> : null}
                  {analysis.extracted.resolution && analysis.extracted.resolution !== "unknown" ? (
                    <span className="wm-chip">Resolution: {analysis.extracted.resolution}</span>
                  ) : null}
                  {analysis.extracted.distanceHint && analysis.extracted.distanceHint !== "unknown" ? (
                    <span className="wm-chip">Distance: {analysis.extracted.distanceHint}</span>
                  ) : null}
                  {analysis.extracted.byodUsbC ? <span className="wm-chip">BYOD / USB-C</span> : null}
                  {analysis.extracted.switchingNeeded ? <span className="wm-chip">Switching Needed</span> : null}
                </div>

                <div style={miniCardStyle()}>
                  <div style={smallLabelStyle()}>Suggested next tool</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{analysis.nextToolLabel}</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {analysis.families.map((family) => (
                      <span key={family} className="wm-chip">{family}</span>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  {analysis.topSkus.length === 0 ? (
                    <div style={{ fontSize: 11, opacity: 0.74 }}>
                      No confident SKU matches found yet. Add more detail to improve ranking.
                    </div>
                  ) : (
                    analysis.topSkus.map((item) => (
                      <div
                        key={item.sku}
                        style={{
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 10,
                          padding: "7px 10px",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <strong>{item.sku}</strong>
                          <span style={{ fontSize: 11, opacity: 0.74 }}>{item.family || "General"}</span>
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.84, marginTop: 4 }}>{item.description}</div>
                      </div>
                    ))
                  )}
                </div>

                {analysisNarrative.rationale.length > 0 ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>Rationale</div>
                    <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 11, opacity: 0.82 }}>
                      {analysisNarrative.rationale.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {analysisNarrative.cautions.length > 0 ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>Cautions</div>
                    <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 11, opacity: 0.82 }}>
                      {analysisNarrative.cautions.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="wm-btn wm-btn-primary"
                    disabled={actionDisabled}
                    type="button"
                    onClick={() => {
                      void upsertProjectFromIntake(analysis.nextToolPath);
                    }}
                  >
                    Apply intake and open {analysis.nextToolLabel}
                  </button>
                  <button
                    className="wm-btn"
                    disabled={actionDisabled}
                    type="button"
                    onClick={() => {
                      void upsertProjectFromIntake("/app/projects");
                    }}
                  >
                    Apply intake and save to Projects
                  </button>
                </div>
              </>
            )}
          </InsightDrawer>
        </div>
      </div>
    </>
  );
}
