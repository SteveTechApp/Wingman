import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

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

type UploadLane = "documents" | "emails";

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

function smallLabelStyle(): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.6)",
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

export default function ImportIntakePage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const intakeMode = searchParams.get("mode");
  const isDiagramMode = intakeMode === "diagram";
  const documentAttachmentKind = isDiagramMode ? "diagram" : "document";

  const [projectName, setProjectName] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [site, setSite] = React.useState("");
  const [destination, setDestination] = React.useState<IntakeDestination>("project");
  const [documentNotes, setDocumentNotes] = React.useState("");
  const [emailSubject, setEmailSubject] = React.useState("");
  const [emailThread, setEmailThread] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [workingNotes, setWorkingNotes] = React.useState("");
  const [documentFiles, setDocumentFiles] = React.useState<IntakeImportedFile[]>([]);
  const [emailFiles, setEmailFiles] = React.useState<IntakeImportedFile[]>([]);
  const [loadingLane, setLoadingLane] = React.useState<UploadLane | null>(null);
  const [fileNotice, setFileNotice] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [checklist, setChecklist] = React.useState<IntakeChecklistState>(() => readChecklist());

  React.useEffect(() => {
    writeChecklist(checklist);
  }, [checklist]);

  const required = CHECKLIST.filter((item) => item.tier === "required");
  const requiredComplete = required.filter((item) => checklist[item.id]).length;
  const recommended = CHECKLIST.filter((item) => item.tier === "recommended");
  const recommendedComplete = recommended.filter((item) => checklist[item.id]).length;

  const briefInput = React.useMemo<IntakeBriefInput>(() => ({
    destination,
    projectName,
    customer,
    site,
    documentNotes,
    emailSubject,
    emailThread,
    prompt,
    workingNotes,
    documentFiles,
    emailFiles,
  }), [
    customer,
    destination,
    documentFiles,
    documentNotes,
    emailFiles,
    emailSubject,
    emailThread,
    projectName,
    prompt,
    site,
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
    emailSubject.trim() ||
    emailThread.trim() ||
    prompt.trim() ||
    workingNotes.trim() ||
    documentFiles.length ||
    emailFiles.length,
  );

  const loadImportedFiles = React.useCallback(async (files: File[], lane: UploadLane) => {
    if (files.length === 0) return;

    setLoadingLane(lane);
    setFileNotice(null);

    try {
      const imported = await Promise.all(
        files.map((file) =>
          importIntakeFile(file, lane === "documents" ? documentAttachmentKind : "brief")
        )
      );

      if (lane === "documents") {
        setDocumentFiles((current) => mergeImportedFiles(current, imported));
      } else {
        setEmailFiles((current) => mergeImportedFiles(current, imported));
      }

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

  const removeImportedFile = React.useCallback((lane: UploadLane, id: string) => {
    if (lane === "documents") {
      setDocumentFiles((current) => current.filter((item) => item.id !== id));
      return;
    }

    setEmailFiles((current) => current.filter((item) => item.id !== id));
  }, []);

  const toggleChecklist = React.useCallback((id: string) => {
    setChecklist((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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
        ...emailFiles.map((file) => ({
          name: file.name,
          kind: "brief" as const,
          source: "Import Intake Email",
          summary: file.excerpt || file.statusMessage,
          contentType: file.contentType,
          sizeBytes: file.sizeBytes,
        })),
        emailThread.trim()
          ? {
              name: `${name} email interrogation brief`,
              kind: "brief" as const,
              source: "Import Intake Email",
              summary: `${emailSubject.trim() ? `${emailSubject.trim()} - ` : ""}${emailThread.trim().slice(0, 280)}`,
              contentType: "text/plain",
              sizeBytes: emailThread.trim().length,
            }
          : null,
        prompt.trim()
          ? {
              name: `${name} scratch prompt brief`,
              kind: "brief" as const,
              source: "Import Intake Prompt",
              summary: prompt.trim().slice(0, 280),
              contentType: "text/plain",
              sizeBytes: prompt.trim().length,
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
    emailFiles,
    emailSubject,
    emailThread,
    interrogation,
    nav,
    prompt,
    required.length,
    requiredComplete,
    site,
    sourceCoverage,
  ]);

  const description = isDiagramMode
    ? "Upload structured scope packs, consultant drawings, email threads, or scratch prompts so Wingman can translate an existing system idea into a live opportunity."
    : "Upload tender and RFQ documents, interrogate customer emails, or start from a plain-English prompt so Wingman can open the right project or sales enquiry from scratch.";

  const documentTitle = isDiagramMode
    ? "Drawings, scope packs, and existing system references"
    : "Tender, RFQ, and structured source documents";
  const documentHelper = isDiagramMode
    ? "PDF, DOCX, TXT, or image-based reference uploads can all be attached here. Text-based files are interrogated automatically, while image-only files are stored for reference and need a short manual summary."
    : "Upload consultant briefs, tenders, RFQs, and scope notes. Text-based files are interrogated automatically and merged into the intake context.";
  const documentNoteLabel = isDiagramMode
    ? "What does the diagram or scope pack show?"
    : "What matters in the tender or RFQ?";
  const documentAccept = isDiagramMode
    ? ".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.svg"
    : ".pdf,.docx,.txt,.md,.csv,.eml";

  return (
    <div className="wm-page wm-animate-in" style={pageWrapStyle()}>
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

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Opportunity setup</div>
          <div style={sectionTextStyle()}>
            Capture the shell once, then let document uploads, email interrogation, and scratch prompts build the intake story.
          </div>

          <div
            style={{
              marginTop: 16,
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

          <div style={{ marginTop: 18 }}>
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
            <div style={{ ...helperTextStyle(), marginTop: 10 }}>
              {destination === "sales-enquiry"
                ? "Keep the workflow framed around qualification, commercial risk, and next actions before deeper technical design."
                : "Create a project-first shell so Guided Project and downstream design tools start with room, document, and sales context already attached."}
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              borderRadius: 14,
              border: "1px solid rgba(120,208,189,0.18)",
              background: "rgba(12,33,44,0.55)",
              padding: 14,
            }}
          >
            <div style={smallLabelStyle()}>Current source coverage</div>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.84)" }}>
              {sourceCoverage}
            </div>
          </div>
        </section>

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Source capture</div>
          <div style={sectionTextStyle()}>
            Use one source or blend several. Wingman merges uploads, email context, and plain-English prompts into a single interrogation pass.
          </div>

          {fileNotice ? (
            <div
              style={{
                marginTop: 14,
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
            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.76 }}>
              Reading uploaded {loadingLane === "documents" ? "document" : "email"} files...
            </div>
          ) : null}

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            }}
          >
            <article style={sourceCardStyle("rgba(120,208,189,0.2)")}>
              <div>
                <div style={smallLabelStyle()}>Source Lane 1</div>
                <div style={{ marginTop: 6, fontSize: 17, fontWeight: 800 }}>{documentTitle}</div>
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
                    void loadImportedFiles(files, "documents");
                  }}
                />
              </Field>

              <Field label={documentNoteLabel}>
                <textarea
                  value={documentNotes}
                  onChange={(event) => setDocumentNotes(event.target.value)}
                  placeholder={isDiagramMode
                    ? "Describe the diagram, the known signal flow, or what the consultant pack is trying to achieve."
                    : "Call out the key deliverables, commercial constraints, room assumptions, or any tender wording that matters."}
                  style={textareaStyle(6)}
                />
              </Field>

              <div>
                <div style={{ ...smallLabelStyle(), marginBottom: 8 }}>Uploaded files</div>
                <UploadedFileList
                  items={documentFiles}
                  emptyText="No source files uploaded yet."
                  onRemove={(id) => removeImportedFile("documents", id)}
                />
              </div>
            </article>

            <article style={sourceCardStyle("rgba(99,160,224,0.2)")}>
              <div>
                <div style={smallLabelStyle()}>Source Lane 2</div>
                <div style={{ marginTop: 6, fontSize: 17, fontWeight: 800 }}>Email interrogation</div>
                <div style={{ ...helperTextStyle(), marginTop: 8 }}>
                  Paste a customer or consultant email thread, or upload `.eml` / text files, so Wingman can separate signal from noise and surface the actual opportunity.
                </div>
              </div>

              <Field label="Email subject">
                <input
                  value={emailSubject}
                  onChange={(event) => setEmailSubject(event.target.value)}
                  placeholder="RE: New boardroom refresh"
                  style={inputStyle()}
                />
              </Field>

              <Field label="Paste email thread">
                <textarea
                  value={emailThread}
                  onChange={(event) => setEmailThread(event.target.value)}
                  placeholder="Paste the body of the email thread, including any quoted replies that matter."
                  style={textareaStyle(7)}
                />
              </Field>

              <Field label="Upload email file">
                <input
                  accept=".eml,.txt,.md,.pdf,.docx"
                  multiple
                  style={inputStyle()}
                  type="file"
                  onChange={(event) => {
                    const files = event.currentTarget.files ? Array.from(event.currentTarget.files) : [];
                    event.currentTarget.value = "";
                    void loadImportedFiles(files, "emails");
                  }}
                />
              </Field>

              <div>
                <div style={{ ...smallLabelStyle(), marginBottom: 8 }}>Uploaded email files</div>
                <UploadedFileList
                  items={emailFiles}
                  emptyText="No email files uploaded yet."
                  onRemove={(id) => removeImportedFile("emails", id)}
                />
              </div>
            </article>

            <article style={sourceCardStyle("rgba(216,177,76,0.2)")}>
              <div>
                <div style={smallLabelStyle()}>Source Lane 3</div>
                <div style={{ marginTop: 6, fontSize: 17, fontWeight: 800 }}>Prompt from scratch</div>
                <div style={{ ...helperTextStyle(), marginTop: 8 }}>
                  Start with plain English when there is no formal brief yet. This is ideal for new opportunities, discovery calls, and rough sales qualification notes.
                </div>
              </div>

              <Field label="Describe the opportunity">
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Example: We need a dual-display Teams room for executive presentations, simple walk-in use, and a small rack in the comms room."
                  style={textareaStyle(7)}
                />
              </Field>

              <Field label="Working notes">
                <textarea
                  value={workingNotes}
                  onChange={(event) => setWorkingNotes(event.target.value)}
                  placeholder="Capture any assumptions, internal notes, deadlines, or context you want kept with the intake."
                  style={textareaStyle(6)}
                />
              </Field>

              <div style={miniCardStyle()}>
                <div style={smallLabelStyle()}>Good prompt inputs</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.84 }}>
                  Customer outcome, room/application, display count, conferencing expectations, distance/rack notes, urgency, and budget posture all help the next tools start cleanly.
                </div>
              </div>
            </article>
          </div>
        </section>

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Guided qualification checklist</div>
          <div style={sectionTextStyle()}>
            Required items: {requiredComplete}/{required.length} complete. Recommended items: {recommendedComplete}/{recommended.length} complete.
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
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

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
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
            <button
              className="wm-btn"
              disabled={actionDisabled}
              type="button"
              onClick={() => {
                void upsertProjectFromIntake("/app/projects");
              }}
            >
              {destination === "sales-enquiry" ? "Save Enquiry to Projects" : "Save Intake to Projects"}
            </button>
          </div>
        </section>

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Enquiry interrogation</div>
          <div style={sectionTextStyle()}>
            Wingman uses the combined intake to interpret the room, the commercial posture, the likely solution path, and the most important follow-up questions.
          </div>

          {!canInterrogate || !interrogation ? (
            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.74 }}>
              Upload a tender or RFQ, paste an email, or write a prompt from scratch to generate an interrogation summary.
            </div>
          ) : (
            <>
              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                  marginTop: 14,
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
                  marginTop: 16,
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

              <div style={{ marginTop: 16 }}>
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
        </section>

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Solution starting point</div>
          <div style={sectionTextStyle()}>
            The existing SKU and family recommendation layer still runs after interrogation so the next tool opens with a usable technical baseline.
          </div>

          {!analysis ? (
            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.74 }}>
              Add source material to generate family guidance and SKU ranking.
            </div>
          ) : (
            <>
              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
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

              <div style={{ marginTop: 12 }}>
                <div style={sectionTextStyle()}>
                  Suggested next tool: <strong>{analysis.nextToolLabel}</strong>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {analysis.families.map((family) => (
                    <span key={family} className="wm-chip">{family}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
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
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Rationale</div>
                  <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 12, opacity: 0.82 }}>
                    {analysisNarrative.rationale.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {analysisNarrative.cautions.length > 0 ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Cautions</div>
                  <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 12, opacity: 0.82 }}>
                    {analysisNarrative.cautions.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="wm-btn wm-btn-primary"
                  disabled={actionDisabled}
                  type="button"
                  onClick={() => {
                    void upsertProjectFromIntake(analysis.nextToolPath);
                  }}
                >
                  Apply Intake and Open {analysis.nextToolLabel}
                </button>
                <button
                  className="wm-btn"
                  disabled={actionDisabled}
                  type="button"
                  onClick={() => {
                    void upsertProjectFromIntake("/app/projects");
                  }}
                >
                  Apply Intake and Save to Projects
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
