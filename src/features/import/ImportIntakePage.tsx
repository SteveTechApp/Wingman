import * as React from "react";
import { useNavigate } from "react-router-dom";

import RecentTextInput from "@/components/RecentTextInput";
import { recommendFamilies } from "@/features/discovery/discoveryStore";
import {
  RECENT_TEXT_HISTORY_KEYS,
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
import CollapsibleCard from "@/ui2/components/CollapsibleCard";

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

function toggleButtonStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    border: `1px solid ${active ? "rgba(120,208,189,0.44)" : "rgba(255,255,255,0.1)"}`,
    background: active ? "rgba(25,103,82,0.34)" : "rgba(255,255,255,0.03)",
    color: active ? "rgba(226,255,248,0.98)" : "rgba(255,255,255,0.82)",
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.02em",
  };
}

function sourceCardStyle(tint: string): React.CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${tint}`,
    background: "rgba(255,255,255,0.03)",
    padding: 16,
    display: "grid",
    gap: 12,
    alignContent: "start",
  };
}

function miniCardStyle(): React.CSSProperties {
  return {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: 14,
    display: "grid",
    gap: 8,
  };
}

function reviewCardStyle(accent: string): React.CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${accent}`,
    background: "linear-gradient(180deg, rgba(11,26,36,0.94), rgba(7,18,28,0.94))",
    padding: 16,
    display: "grid",
    gap: 10,
  };
}

function smallLabelStyle(): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.12em",
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
  };
}

function drawerPanelStyle(): React.CSSProperties {
  return {
    width: "min(760px, calc(100vw - 24px))",
    height: "calc(100vh - 24px)",
    borderRadius: 24,
    border: "1px solid rgba(120,208,189,0.18)",
    background: "linear-gradient(180deg, rgba(6,16,26,0.98), rgba(10,24,38,0.98))",
    boxShadow: "0 32px 80px rgba(0,0,0,0.45)",
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    overflow: "hidden",
  };
}

function helperTextStyle(): React.CSSProperties {
  return {
    fontSize: 12,
    lineHeight: 1.5,
    color: "rgba(255,255,255,0.7)",
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
    return <div style={{ fontSize: 12, opacity: 0.72 }}>Nothing surfaced yet.</div>;
  }

  return (
    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, opacity: 0.88 }}>
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
    return <div style={{ fontSize: 12, opacity: 0.68 }}>{emptyText}</div>;
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
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, wordBreak: "break-word" }}>{item.name}</div>
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

          <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.82 }}>{item.statusMessage}</div>
          {item.excerpt ? (
            <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.7 }}>
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
            padding: 20,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
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

        <div style={{ padding: 20, overflowY: "auto", display: "grid", gap: 14 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ImportIntakePage() {
  const nav = useNavigate();
  const documentAttachmentKind = "document";

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
          importIntakeFile(file, documentAttachmentKind)
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
  }, [documentAttachmentKind]);

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

  const description = "Paste the customer request on the left, review Wingman output on the right, then add optional supporting context below.";
  const documentTitle = "Optional supporting documents";
  const documentHelper = "Upload tender, RFQ, scope, or diagram files when available. Text input remains the primary path.";
  const documentNoteLabel = "Supporting document notes";
  const documentAccept = ".pdf,.docx,.txt,.md,.csv,.eml,.png,.jpg,.jpeg,.svg";
  const interrogationSummary = interrogation
    ? truncateText(interrogation.salesperson.summaryParagraph, 180)
    : "Add source text or uploaded files to generate the interrogation brief.";
  const solutionSummary = analysis
    ? analysis.topSkus.length > 0
      ? `${analysis.topSkus[0].sku} currently leads the ranked SKU starting point.`
      : "Wingman has a family direction and next-tool route, but no strong SKU match yet."
    : "The solution baseline will appear once the intake has enough signal.";

  return (
    <>
      <div className="wm-page wm-animate-in wm-import-intake-page" style={pageWrapStyle()}>
        <div style={stackStyle(14)}>
          <PageHeader
            eyebrow="TOOL"
            title="Import Intake"
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
                  {saving ? "Saving..." : "Open Guided Project"}
                </button>
              </>
            }
          />

          <div className="wm-import-intake-page__layout">
            <div style={stackStyle(14)}>
              <div style={{ order: 2 }}>
                <CollapsibleCard
                  id="import-intake-supporting"
                  title="Supporting information"
                  subtitle="Project context, notes, and optional uploads."
                  defaultCollapsed
                >
                  <div
                    style={{
                      display: "grid",
                      gap: 14,
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    <Field label="Project or enquiry name">
                      <RecentTextInput
                        historyKey={RECENT_TEXT_HISTORY_KEYS.roomName}
                        value={projectName}
                        onChange={(event) => setProjectName(event.target.value)}
                        style={inputStyle()}
                      />
                    </Field>

                    <Field label="Customer">
                      <RecentTextInput
                        historyKey={RECENT_TEXT_HISTORY_KEYS.customer}
                        value={customer}
                        onChange={(event) => setCustomer(event.target.value)}
                        style={inputStyle()}
                      />
                    </Field>

                    <Field label="Site">
                      <RecentTextInput
                        historyKey={RECENT_TEXT_HISTORY_KEYS.site}
                        value={site}
                        onChange={(event) => setSite(event.target.value)}
                        style={inputStyle()}
                      />
                    </Field>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <div style={smallLabelStyle()}>Start this intake as</div>
                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
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
                        New Sales Enquiry
                      </button>
                    </div>
                  </div>

                  <Field label="Working notes">
                    <textarea
                      value={workingNotes}
                      onChange={(event) => setWorkingNotes(event.target.value)}
                      placeholder="Capture assumptions, internal notes, deadlines, or anything else worth carrying into the next workflow."
                      style={textareaStyle(6)}
                    />
                  </Field>

                  <article style={sourceCardStyle("rgba(120,208,189,0.2)")}>
                    <div>
                      <div style={smallLabelStyle()}>{documentTitle}</div>
                      <div style={{ ...helperTextStyle(), marginTop: 8 }}>{documentHelper}</div>
                    </div>

                    <Field label="Upload source files">
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
                        placeholder="Call out key deliverables, commercial constraints, or tender wording that matters."
                        style={textareaStyle(6)}
                      />
                    </Field>

                    {fileNotice ? (
                      <div
                        style={{
                          borderRadius: 12,
                          border: "1px solid rgba(120,208,189,0.16)",
                          background: "rgba(12,33,44,0.5)",
                          padding: "10px 12px",
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: "rgba(255,255,255,0.82)",
                        }}
                      >
                        {fileNotice}
                      </div>
                    ) : null}

                    {loadingLane ? (
                      <div style={{ fontSize: 12, opacity: 0.76 }}>
                        Reading uploaded source files...
                      </div>
                    ) : null}

                    <div>
                      <div style={{ ...smallLabelStyle(), marginBottom: 8 }}>Uploaded files</div>
                      <UploadedFileList
                        items={documentFiles}
                        emptyText="No supporting files uploaded yet."
                        onRemove={removeImportedFile}
                      />
                    </div>
                  </article>
                </CollapsibleCard>
              </div>

        <section style={{ ...cardStyle(), order: 1 }}>
          <div style={sectionTitleStyle()}>Input text</div>
          <div style={sectionTextStyle()}>
            Paste the request text or type the brief in plain English.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 14,
            }}
          >
            <article style={sourceCardStyle("rgba(99,160,224,0.2)")}>
              <div>
                <div style={smallLabelStyle()}>Text intake</div>
                <div style={{ marginTop: 6, fontSize: 17, fontWeight: 800 }}>Paste or type customer request</div>
              </div>

              <Field label="Source text">
                <textarea
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  placeholder="Paste the customer request or type the brief in plain English."
                  style={textareaStyle(14)}
                />
              </Field>

              <Field label="Output focus (optional)">
                <div style={{ ...helperTextStyle(), marginBottom: 8 }}>
                  This is not a customer questionnaire. Tick any areas you want Wingman to prioritise in the output.
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {TEXT_GUIDANCE_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={textGuidance.includes(option.id)}
                        onChange={() => toggleTextGuidance(option.id)}
                        style={{ marginTop: 2 }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{option.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.74, marginTop: 2 }}>{option.helper}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div style={{ ...helperTextStyle(), marginTop: 8 }}>
                  Leave all unticked for a balanced response.
                </div>
              </Field>
            </article>
          </div>
        </section>

              <CollapsibleCard
                id="import-intake-qualification"
                title="Qualification checklist"
                subtitle={`Required ${requiredComplete}/${required.length}. Recommended ${recommendedComplete}/${recommended.length}.`}
                right={
                  <span className="wm-chip">
                    {requiredComplete === required.length ? "Gate Ready" : "Needs Review"}
                  </span>
                }
                defaultCollapsed
              >
                <div style={{ display: "grid", gap: 10 }}>
                  {CHECKLIST.map((item) => (
                    <label
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checklist[item.id])}
                        onChange={() => toggleChecklist(item.id)}
                        style={{ marginTop: 2 }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.72, marginTop: 2, textTransform: "capitalize" }}>
                          {item.tier}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <div style={{ ...helperTextStyle(), marginTop: 14 }}>
                  Complete the required checks before launching into the next tool.
                </div>
              </CollapsibleCard>
            </div>

            <aside className="wm-import-intake-page__rail" style={{ display: "grid", gap: 14, alignContent: "start" }}>
              <section style={cardStyle()}>
                <div style={sectionTitleStyle()}>Review panels</div>
                <div style={sectionTextStyle()}>
                  Open a panel for detailed interpretation and recommendations.
                </div>

                <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                  <div style={reviewCardStyle("rgba(99,160,224,0.18)")}>
                    <div style={smallLabelStyle()}>Interrogation brief</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {interrogation ? `${Math.round(interrogation.parsed.confidence * 100)}% confidence` : "Waiting for source signal"}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.8)" }}>
                      {interrogationSummary}
                    </div>
                    <button
                      className="wm-btn"
                      disabled={!interrogation}
                      type="button"
                      onClick={() => setOpenPanel("interrogation")}
                    >
                      Open interrogation brief
                    </button>
                  </div>

                  <div style={reviewCardStyle("rgba(216,177,76,0.18)")}>
                    <div style={smallLabelStyle()}>Solution starting point</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {analysis ? analysis.nextToolLabel : "Awaiting recommendation"}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.8)" }}>
                      {solutionSummary}
                    </div>
                    <button
                      className="wm-btn"
                      disabled={!analysis}
                      type="button"
                      onClick={() => setOpenPanel("solution")}
                    >
                      Open solution brief
                    </button>
                  </div>

                  <div style={reviewCardStyle("rgba(120,208,189,0.18)")}>
                    <div style={smallLabelStyle()}>Source coverage</div>
                    <div style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.84)" }}>
                      {sourceCoverage}
                    </div>
                  </div>
                </div>
              </section>

              <section style={cardStyle()}>
                <div style={sectionTitleStyle()}>Launch intake</div>
                <div style={sectionTextStyle()}>
                  When the shell feels right, write the intake back into the project and open the next tool from here.
                </div>

                <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                  <button
                    className="wm-btn wm-btn-primary"
                    disabled={actionDisabled}
                    type="button"
                    onClick={() => {
                      void upsertProjectFromIntake("/app/tools/discovery");
                    }}
                  >
                    {destination === "sales-enquiry" ? "Qualify in Guided Project" : "Continue to Guided Project"}
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
              </section>
            </aside>
          </div>

          <InsightDrawer
            open={openPanel === "interrogation"}
            title="Enquiry interrogation"
            subtitle={
              interrogation
                ? "Commercial interpretation, customer intent, and next questions from the blended intake."
                : "Add source text or uploaded files to generate an interrogation summary."
            }
            onClose={() => setOpenPanel(null)}
          >
            {!canInterrogate || !interrogation ? (
              <div style={{ fontSize: 12, opacity: 0.74 }}>
                Upload a tender or RFQ, or paste the request text to generate an interrogation summary.
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
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    padding: 14,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  {interrogation.salesperson.summaryParagraph}
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 14,
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
                ? "Existing family recommendations and ranked SKUs, separated from the intake flow so you can inspect them on demand."
                : "Add source material to generate family guidance and SKU ranking."
            }
            onClose={() => setOpenPanel(null)}
          >
            {!analysis ? (
              <div style={{ fontSize: 12, opacity: 0.74 }}>
                Add source material to generate family guidance and SKU ranking.
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
                    <div style={{ fontSize: 12, opacity: 0.74 }}>
                      No confident SKU matches found yet. Add more detail to improve ranking.
                    </div>
                  ) : (
                    analysis.topSkus.map((item) => (
                      <div
                        key={item.sku}
                        style={{
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 10,
                          padding: "10px 12px",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <strong>{item.sku}</strong>
                          <span style={{ fontSize: 12, opacity: 0.74 }}>{item.family || "General"}</span>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.84, marginTop: 4 }}>{item.description}</div>
                      </div>
                    ))
                  )}
                </div>

                {analysisNarrative.rationale.length > 0 ? (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Rationale</div>
                    <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 12, opacity: 0.82 }}>
                      {analysisNarrative.rationale.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {analysisNarrative.cautions.length > 0 ? (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Cautions</div>
                    <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 12, opacity: 0.82 }}>
                      {analysisNarrative.cautions.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
