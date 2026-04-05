import type { DiscoveryProductFamily } from "@/features/discovery/discoveryStore";
import type { ParsedRequirement, RecommendationResult, DesignDirection, SalespersonReadyResponse } from "@/features/intelligence/types";
import type { ExtractedRequirements } from "@/import/extractRequirements";
import type { ImportRecommendation, RecommendedSku } from "@/import/recommendWyrestorm";

import type { IntakeImportedFile } from "./intakeFileText";

export type IntakeDestination = "project" | "sales-enquiry";

export type IntakeQuestion = {
  id: string;
  label: string;
  tier: "required" | "recommended" | "optional";
};

export type IntakeChecklistState = Record<string, boolean>;

export type IntakeAnalysis = {
  extracted: ExtractedRequirements;
  recommendation: ImportRecommendation;
  families: DiscoveryProductFamily[];
  nextToolPath: string;
  nextToolLabel: string;
  topSkus: RecommendedSku[];
};

export type IntakeInterrogation = {
  parsed: ParsedRequirement;
  recommendation: RecommendationResult;
  designDirection: DesignDirection;
  salesperson: SalespersonReadyResponse;
};

export type IntakeBriefInput = {
  destination: IntakeDestination;
  projectName: string;
  customer: string;
  site: string;
  documentNotes: string;
  sourceText: string;
  guidancePrompts: string[];
  workingNotes: string;
  documentFiles: IntakeImportedFile[];
};

export const CHECKLIST_KEY = "wm_intake_checklist_v1";

export const CHECKLIST: IntakeQuestion[] = [
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
  "/app/tools/discovery": "Guided Project",
};

function clipText(value: string, maxChars: number): string {
  const normalized = value.trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
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

function formatUploadedSourceList(
  label: string,
  files: IntakeImportedFile[],
): string {
  if (files.length === 0) return "";
  const lines = files.map((file) => `- ${file.name}: ${file.statusMessage}`);
  return `${label}:\n${lines.join("\n")}`;
}

export function emptyChecklist(): IntakeChecklistState {
  return CHECKLIST.reduce<IntakeChecklistState>((acc, item) => {
    acc[item.id] = false;
    return acc;
  }, {});
}

export function readChecklist(): IntakeChecklistState {
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    if (!raw) return emptyChecklist();
    const parsed = JSON.parse(raw) as IntakeChecklistState;
    return { ...emptyChecklist(), ...parsed };
  } catch {
    return emptyChecklist();
  }
}

export function writeChecklist(state: IntakeChecklistState) {
  try {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state));
  } catch {
  }
}

export function buildQualificationSummary(checklist: IntakeChecklistState): string {
  const lines = CHECKLIST.filter((item) => checklist[item.id]).map((item) => `- ${item.label}`);
  return lines.length > 0 ? lines.join("\n") : "- Qualification checklist not completed yet.";
}

export function getNextToolLabel(path: string): string {
  return NEXT_TOOL_LABELS[path] ?? "Guided Project";
}

export function distanceHintToMeters(distanceHint?: string): string {
  const hint = String(distanceHint ?? "").toLowerCase();
  if (hint === "long") return "30";
  if (hint === "medium") return "15";
  if (hint === "short") return "5";
  return "";
}

export function collectNarrative(
  recommendation: ImportRecommendation,
): { rationale: string[]; cautions: string[] } {
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

export function rankTopSkus(recommendation: ImportRecommendation, limit = 8): RecommendedSku[] {
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

export function buildAnalysisNotesBlock(analysis: IntakeAnalysis): string {
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

export function buildInterrogationNotesBlock(interrogation: IntakeInterrogation): string {
  const needs = interrogation.salesperson.whatCustomerNeeds.slice(0, 4).map((item) => `- ${item}`);
  const risks = interrogation.salesperson.keyRisksAndUnknowns.slice(0, 4).map((item) => `- ${item}`);
  const actions = interrogation.salesperson.recommendedNextActions.slice(0, 4).map((item) => `- ${item}`);
  const commercial = interrogation.salesperson.commercialGuidance.slice(0, 3).map((item) => `- ${item}`);

  return [
    "Enquiry interrogation:",
    `Summary: ${interrogation.salesperson.summaryParagraph}`,
    `Vertical: ${interrogation.parsed.vertical || "Unknown"}`,
    `Complexity: ${interrogation.parsed.complexity || "Unknown"}`,
    `Room type: ${interrogation.parsed.roomType || "General AV Space"}`,
    `Primary architecture: ${interrogation.designDirection.primaryArchitecture}`,
    interrogation.recommendation.likelySolutionCategories.length
      ? `Likely solution categories: ${interrogation.recommendation.likelySolutionCategories.join(", ")}`
      : "",
    needs.length ? `What the customer likely needs:\n${needs.join("\n")}` : "",
    risks.length ? `Key risks and unknowns:\n${risks.join("\n")}` : "",
    actions.length ? `Recommended next actions:\n${actions.join("\n")}` : "",
    commercial.length ? `Commercial guidance:\n${commercial.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildCombinedBrief(input: IntakeBriefInput): string {
  const sections = [
    `Workflow target: ${input.destination === "sales-enquiry" ? "Sales enquiry qualification" : "New project start"}`,
    input.projectName.trim() ? `Opportunity name: ${clipText(input.projectName, 180)}` : "",
    input.customer.trim() ? `Customer: ${clipText(input.customer, 180)}` : "",
    input.site.trim() ? `Site: ${clipText(input.site, 180)}` : "",
    input.documentNotes.trim() ? `Tender / RFQ notes:\n${clipText(input.documentNotes, 1800)}` : "",
    ...input.documentFiles.map((file) => {
      const body = file.extractedText || file.excerpt || file.statusMessage;
      return `Uploaded source file (${file.name}):\n${clipText(body, 3000)}`;
    }),
    input.sourceText.trim() ? `Customer request text:\n${clipText(input.sourceText, 6000)}` : "",
    input.guidancePrompts.length
      ? `Guidance priorities:\n${input.guidancePrompts.map((item) => `- ${clipText(item, 140)}`).join("\n")}`
      : "",
    input.workingNotes.trim() ? `Working notes:\n${clipText(input.workingNotes, 2200)}` : "",
  ].filter(Boolean);

  return clipText(sections.join("\n\n"), 22000);
}

export function buildStoredSourceNotes(input: IntakeBriefInput): string {
  const sections = [
    `Workflow target: ${input.destination === "sales-enquiry" ? "Sales enquiry qualification" : "New project start"}`,
    formatUploadedSourceList("Uploaded intake files", input.documentFiles),
    input.documentNotes.trim() ? `Tender / RFQ notes:\n${clipText(input.documentNotes, 900)}` : "",
    input.sourceText.trim() ? `Customer request text:\n${clipText(input.sourceText, 2000)}` : "",
    input.guidancePrompts.length
      ? `Guidance priorities:\n${input.guidancePrompts.map((item) => `- ${clipText(item, 120)}`).join("\n")}`
      : "",
    input.workingNotes.trim() ? `Working notes:\n${clipText(input.workingNotes, 900)}` : "",
  ].filter(Boolean);

  return sections.join("\n\n");
}

export function buildSourceCoverageSummary(input: IntakeBriefInput): string {
  const lines = [
    input.documentFiles.length > 0 ? `${input.documentFiles.length} uploaded source file(s)` : "",
    input.documentNotes.trim() ? "Formal tender / RFQ notes added" : "",
    input.sourceText.trim() ? "Customer request text captured" : "",
    input.guidancePrompts.length > 0 ? "Guidance priorities selected" : "",
  ].filter(Boolean);

  return lines.length > 0 ? lines.join(" | ") : "No source material added yet.";
}

export function resolveWorkflowTrack(destination: IntakeDestination): string {
  return destination === "sales-enquiry" ? "Sales Enquiry" : "Project Start";
}

export function deriveOpportunityName(input: IntakeBriefInput): string {
  const sourceHeading = input.sourceText
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return (
    input.projectName.trim() ||
    (sourceHeading ? clipText(sourceHeading, 90) : "") ||
    input.documentFiles[0]?.name.replace(/\.[^.]+$/, "") ||
    (input.destination === "sales-enquiry" ? "New Sales Enquiry" : "New Opportunity")
  );
}
