import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ensureActiveProject,
  updateProject,
} from "@/features/projects/projectStore";
import {
  recommendFamilies,
  type DiscoveryProductFamily,
} from "@/features/discovery/discoveryStore";
import {
  extractRequirements,
  type ExtractedRequirements,
} from "@/import/extractRequirements";
import {
  recommendWyrestorm,
  type ImportRecommendation,
  type RecommendedSku,
} from "@/import/recommendWyrestorm";
import {
  PageHeader,
  pageWrapStyle,
  stackStyle,
  cardStyle,
  sectionTitleStyle,
  sectionTextStyle,
  inputStyle,
  textareaStyle,
  Field,
} from "@/ui2/page/PageChrome";

type IntakeQuestion = {
  id: string;
  label: string;
  tier: "required" | "recommended" | "optional";
};

type IntakeChecklistState = Record<string, boolean>;

type IntakeAnalysis = {
  extracted: ExtractedRequirements;
  recommendation: ImportRecommendation;
  families: DiscoveryProductFamily[];
  nextToolPath: string;
  nextToolLabel: string;
  topSkus: RecommendedSku[];
};

const CHECKLIST_KEY = "wm_intake_checklist_v1";

const CHECKLIST: IntakeQuestion[] = [
  { id: "goal", label: "What business outcome does the customer want?", tier: "required" },
  { id: "room", label: "Which room/application are we designing for?", tier: "required" },
  { id: "timeline", label: "What timeline is expected?", tier: "required" },
  { id: "budget", label: "Budget band has been discussed", tier: "recommended" },
  { id: "decision", label: "Decision makers and approvers are known", tier: "recommended" },
  { id: "constraints", label: "Site constraints or installation risks captured", tier: "recommended" },
  { id: "existing", label: "Existing kit or competitor baseline noted", tier: "optional" },
  { id: "handoff", label: "Internal handoff owner identified", tier: "optional" },
];

const NEXT_TOOL_LABELS: Record<string, string> = {
  "/app/tools/video-wall": "Video Wall Designer",
  "/app/tools/room-wizard": "Room Designer",
  "/app/tools/proposal": "Proposal Builder",
  "/app/tools/catalog": "Product Catalog",
  "/app/tools/discovery": "Discovery Wizard",
};

function emptyChecklist(): IntakeChecklistState {
  return CHECKLIST.reduce<IntakeChecklistState>((acc, item) => {
    acc[item.id] = false;
    return acc;
  }, {});
}

function readChecklist(): IntakeChecklistState {
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    if (!raw) return emptyChecklist();
    const parsed = JSON.parse(raw) as IntakeChecklistState;
    return { ...emptyChecklist(), ...parsed };
  } catch {
    return emptyChecklist();
  }
}

function writeChecklist(state: IntakeChecklistState) {
  try {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state));
  } catch {
  }
}

function buildQualificationSummary(checklist: IntakeChecklistState): string {
  const lines = CHECKLIST.filter((item) => checklist[item.id]).map((item) => `- ${item.label}`);
  return lines.length > 0 ? lines.join("\n") : "- Qualification checklist not completed yet.";
}

function getNextToolLabel(path: string): string {
  return NEXT_TOOL_LABELS[path] ?? "Discovery Wizard";
}

function distanceHintToMeters(distanceHint?: string): string {
  const hint = String(distanceHint ?? "").toLowerCase();
  if (hint === "long") return "30";
  if (hint === "medium") return "15";
  if (hint === "short") return "5";
  return "";
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of lines) {
    const line = value.trim();
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }

  return out;
}

function collectNarrative(recommendation: ImportRecommendation): { rationale: string[]; cautions: string[] } {
  if (recommendation.mode === "room") {
    const rationale = dedupeLines(recommendation.tiers.flatMap((tier) => tier.rationale)).slice(0, 4);
    const cautions = dedupeLines(recommendation.tiers.flatMap((tier) => tier.cautions)).slice(0, 4);
    return { rationale, cautions };
  }

  return {
    rationale: dedupeLines(recommendation.rationale).slice(0, 4),
    cautions: dedupeLines(recommendation.cautions).slice(0, 4),
  };
}

function rankTopSkus(recommendation: ImportRecommendation, limit = 8): RecommendedSku[] {
  if (recommendation.mode === "product") {
    return recommendation.best.slice(0, limit);
  }

  const orderedTiers = ["Silver", "Gold", "Bronze"] as const;
  const bySku = new Map<string, RecommendedSku>();

  for (const tier of orderedTiers) {
    const match = recommendation.tiers.find((entry) => entry.tier === tier);
    if (!match) continue;

    for (const sku of match.skus) {
      if (bySku.has(sku.sku)) continue;
      bySku.set(sku.sku, sku);
      if (bySku.size >= limit) return Array.from(bySku.values());
    }
  }

  return Array.from(bySku.values());
}

function buildAnalysisNotesBlock(analysis: IntakeAnalysis): string {
  const intentLabel = analysis.extracted.intent === "room" ? "Room solution" : "Product match";
  const summary = analysis.extracted.summary.join("; ");
  const topSkuList = analysis.topSkus.map((item) => item.sku).join(", ");

  const lines = [
    "Automated intake analysis:",
    `Intent: ${intentLabel}`,
    summary ? `Signals: ${summary}` : "",
    analysis.families.length ? `Recommended families: ${analysis.families.join(", ")}` : "",
    topSkuList ? `Suggested SKUs: ${topSkuList}` : "",
    `Suggested next tool: ${analysis.nextToolLabel} (${analysis.nextToolPath})`,
  ];

  return lines.filter(Boolean).join("\n");
}

export default function ImportIntakePage() {
  const nav = useNavigate();
  const [projectName, setProjectName] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [site, setSite] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [checklist, setChecklist] = React.useState<IntakeChecklistState>(() => readChecklist());

  React.useEffect(() => {
    writeChecklist(checklist);
  }, [checklist]);

  const required = CHECKLIST.filter((item) => item.tier === "required");
  const requiredComplete = required.filter((item) => checklist[item.id]).length;
  const recommended = CHECKLIST.filter((item) => item.tier === "recommended");
  const recommendedComplete = recommended.filter((item) => checklist[item.id]).length;

  const briefText = React.useMemo(() => {
    return [projectName.trim(), customer.trim(), site.trim(), notes.trim()]
      .filter(Boolean)
      .join("\n");
  }, [projectName, customer, site, notes]);

  const analysis = React.useMemo<IntakeAnalysis | null>(() => {
    if (!briefText.trim()) return null;

    const extracted = extractRequirements(briefText);
    const recommendation = recommendWyrestorm(extracted, briefText);

    const familyRecommendation = recommendFamilies({
      applicationType: [
        extracted.roomType ?? "",
        extracted.intent === "room" ? "room" : "product",
      ]
        .filter(Boolean)
        .join(" "),
      displayCount: extracted.displays != null ? String(extracted.displays) : "",
      cableDistanceM: distanceHintToMeters(extracted.distanceHint),
      usbNeeds: extracted.byodUsbC ? "usb-c byod" : "",
      controlNeeds: extracted.switchingNeeded ? "switching required" : "",
    });

    return {
      extracted,
      recommendation,
      families: familyRecommendation.families,
      nextToolPath: familyRecommendation.nextTool,
      nextToolLabel: getNextToolLabel(familyRecommendation.nextTool),
      topSkus: rankTopSkus(recommendation, 8),
    };
  }, [briefText]);

  const analysisNarrative = React.useMemo(
    () => (analysis ? collectNarrative(analysis.recommendation) : { rationale: [], cautions: [] }),
    [analysis]
  );

  const upsertProjectFromIntake = (navigateTo: string) => {
    const name = projectName.trim() || "New Opportunity";
    const customerName = customer.trim() || "Sample customer";
    const siteName = site.trim();
    const intakeNotes = notes.trim();
    const qualificationSummary = buildQualificationSummary(checklist);
    const generatedAnalysis = analysis ? buildAnalysisNotesBlock(analysis) : "";

    const combinedNotes = [
      intakeNotes,
      "Qualification checklist:",
      qualificationSummary,
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

    const inferredApplicationType = analysis
      ? analysis.extracted.roomType ??
        (analysis.extracted.intent === "room" ? "Room solution" : "Product selection")
      : active.discovery?.applicationType;

    const inferredDisplayCount =
      analysis?.extracted.displays != null
        ? String(analysis.extracted.displays)
        : active.discovery?.displayCount;

    const inferredDistance = analysis
      ? distanceHintToMeters(analysis.extracted.distanceHint) || active.discovery?.cableDistanceM
      : active.discovery?.cableDistanceM;

    const inferredUsbNeeds = analysis?.extracted.byodUsbC
      ? "USB-C / BYOD"
      : active.discovery?.usbNeeds;

    const inferredControlNeeds = analysis?.extracted.switchingNeeded
      ? "Switching required"
      : active.discovery?.controlNeeds;

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
          ? `Auto-ranked from intake brief in ${analysis.extracted.intent} mode.`
          : active.catalog?.notes,
      },
      discovery: {
        ...(active.discovery ?? {}),
        customer: customerName,
        site: siteName,
        roomName: name,
        applicationType: inferredApplicationType,
        displayCount: inferredDisplayCount,
        cableDistanceM: inferredDistance,
        usbNeeds: inferredUsbNeeds,
        controlNeeds: inferredControlNeeds,
        notes: combinedNotes,
        recommendedFamilies,
        recommendedNextTool:
          analysis?.nextToolPath ?? active.discovery?.recommendedNextTool ?? "/app/tools/discovery",
        createdAt: active.discovery?.createdAt ?? new Date().toISOString(),
      },
    });

    nav(navigateTo);
  };

  const toggleChecklist = (id: string) => {
    setChecklist((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="wm-page wm-animate-in" style={pageWrapStyle()}>
      <div style={stackStyle(14)}>
        <PageHeader
          eyebrow="TOOL"
          title="Import Intake"
          description="Capture a clean opportunity brief before discovery so downstream design and proposal steps stay reliable."
          actions={
            <>
              <button className="wm-btn" type="button" onClick={() => nav("/app/tools")}>
                Tool Hub
              </button>
              {analysis ? (
                <button
                  className="wm-btn"
                  type="button"
                  onClick={() => upsertProjectFromIntake(analysis.nextToolPath)}
                >
                  Open {analysis.nextToolLabel}
                </button>
              ) : null}
              <button className="wm-btn wm-btn-primary" type="button" onClick={() => upsertProjectFromIntake("/app/tools/discovery")}>
                Open Discovery
              </button>
            </>
          }
        />

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Opportunity intake</div>
          <div style={sectionTextStyle()}>
            Use this page as a first-run qualifier so non-technical users capture the right information before design starts.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            }}
          >
            <Field label="Project name">
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} style={inputStyle()} />
            </Field>

            <Field label="Customer">
              <input value={customer} onChange={(e) => setCustomer(e.target.value)} style={inputStyle()} />
            </Field>

            <Field label="Site">
              <input value={site} onChange={(e) => setSite(e.target.value)} style={inputStyle()} />
            </Field>

            <div />

            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={textareaStyle(5)} />
              </Field>
            </div>
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
            <button className="wm-btn wm-btn-primary" type="button" onClick={() => upsertProjectFromIntake("/app/tools/discovery")}>
              Continue to Discovery
            </button>
            <button className="wm-btn" type="button" onClick={() => upsertProjectFromIntake("/app/projects")}>
              Save Intake to Projects
            </button>
          </div>
        </section>

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Automated brief analysis</div>
          <div style={sectionTextStyle()}>
            Wingman parses your intake brief into likely project intent, product families, and ranked SKUs so the next tool starts with context.
          </div>

          {!analysis ? (
            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.74 }}>
              Add opportunity context in the notes field to generate recommendations.
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
                  type="button"
                  onClick={() => upsertProjectFromIntake(analysis.nextToolPath)}
                >
                  Apply Analysis and Open {analysis.nextToolLabel}
                </button>
                <button className="wm-btn" type="button" onClick={() => upsertProjectFromIntake("/app/projects")}>
                  Apply Analysis and Save to Projects
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
