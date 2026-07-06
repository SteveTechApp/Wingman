import { useCallback, useEffect, useState } from "react";
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  normalizeMultiSkuCompetitorAnalysis,
  type MultiSkuCompetitorAnalysis,
} from "../lib/documentIngest/multiSkuCompetitorIngest";
import type { StatusVariant } from "../types";

export type ProjectStage =
  | "Discovery"
  | "Competitor Compare"
  | "Proposal Builder"
  | "Finder"
  | "Templates"
  | "Support";

export type StoredProject = {
  id: string;
  name: string;
  owner: string;
  stage: ProjectStage;
  status: StatusVariant;
  updated: string;
  resumeTo: string;
  createdAt: string;
  updatedAt: string;
  discoveryBrief?: StoredDiscoveryBrief;
  productSelections?: StoredProductSelection[];
  ingest?: StoredIngestAnalysis;
  compareRuns?: StoredCompareRun[];
  proposal?: StoredProjectProposal;
  requirements?: StoredRequirementRecord[];
  recommendationEvidence?: StoredRecommendationEvidence;
  feedback?: StoredRecommendationFeedback[];
  workflow?: StoredWorkflowState;
};

export type StoredDiscoveryBrief = {
  savedAt?: string;
  roomModel?: Record<string, unknown>;
  inference?: Record<string, unknown>;
  capturedPercent?: number;
  returnRoute?: string;
  missingInformation?: string[];
  nextBestQuestion?: string;
  quoteSafetyStatus?: StoredQuoteSafetyStatus;
  recommendationEvidence?: StoredRecommendationEvidence;
};

export type StoredProductSelection = {
  sku: string;
  title?: string;
  family?: string;
  category?: string;
  status?: StatusVariant;
  tags?: string[];
  addedAt?: string;
  source?: string;
  evidence?: string[];
  cautions?: string[];
};

export type StoredIngestAnalysis = {
  requirements: string[];
  unknowns: string[];
  skippedFiles: string[];
  files: string[];
  multiSkuIntelligence?: MultiSkuCompetitorAnalysis;
  updatedAt: string;
};

export type StoredCompareRun = {
  id: string;
  createdAt: string;
  competitorBrand?: string;
  competitorSku?: string;
  competitorName?: string;
  wyrestormSku?: string;
  wyrestormTitle?: string;
  mode?: string;
  summary?: string;
  warnings?: string[];
  matchScore?: number;
  confidence?: string;
  matchType?: string;
  wyrestormUrl?: string;
  evidence?: string[];
  source?: string;
};

export type StoredProjectProposal = {
  title: string;
  summary: string;
  sections: string[];
  products: StoredProductSelection[];
  productFamilyScores?: StoredProductFamilyScore[];
  assumptions: string[];
  outputPurpose?: StoredProposalOutputPurpose;
  governedDependencies?: StoredGovernedDependency[];
  bomRows?: StoredProposalBomRow[];
  evidence?: string[];
  repGuidance?: string[];
  governanceWarnings?: string[];
  validationNotes?: string[];
  visualBlocks?: StoredProposalVisualBlock[];
  readinessScore?: number;
  companyName?: string;
  preparedBy?: string;
  proposalFooter?: string;
  companyLogoDataUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  updatedAt: string;
};

export type StoredGovernedDependency = {
  id: string;
  sku: string;
  label: string;
  role: string;
  qty: number;
  type: string;
  status: string;
  confidence: string;
  governanceKind?: string;
  trigger: string;
  evidence: string;
  validationQuestion: string;
  customerSafeNote: string;
  sourceSku?: string;
  ruleId?: string;
  ruleSource?: string;
};

export type StoredRequirementStatus = "confirmed" | "unknown" | "review";

export type StoredRequirementRecord = {
  id: string;
  label: string;
  value: string;
  category: string;
  source: string;
  status: StoredRequirementStatus;
  whyItMatters: string;
  updatedAt: string;
};

export type StoredProposalOutputPurpose = {
  motion: string;
  summary: string;
  customerOutput: string;
  nextAction: string;
};

export type StoredProposalBomRow = {
  item: number;
  sku: string;
  description: string;
  role: string;
  qty: number;
  type?: string;
  status: string;
  evidence?: string;
  notes: string;
};

export type StoredProposalVisualBlock = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  proposalUse: string;
  exportLabel: string;
};

export type StoredWorkflowState = {
  source: string;
  lastStep: string;
  nextRoute: string;
  updatedAt: string;
};

export type StoredProposalDraft = {
  id: string;
  name: string;
  customer: string;
  state: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectStoreSnapshot = {
  projects: StoredProject[];
  proposalDrafts: StoredProposalDraft[];
  activeProjectId?: string | null;
  syncStatus?: StoredProjectSyncStatus;
};

export type StoredProjectSyncStatus = {
  state: "local" | "syncing" | "synced" | "error" | "conflict";
  message: string;
  updatedAt: string;
};

export type StoredQuoteSafetyStatus = "quote-ready" | "validate-before-quote" | "do-not-quote-yet";

export type StoredRecommendationProductFamily =
  | "NetworkHD"
  | "Matrix / HDBaseT"
  | "Presentation / UC"
  | "Video wall processor"
  | "Core review";

export type StoredProductFamilyScore = {
  family: StoredRecommendationProductFamily;
  score: number;
  reasons: string[];
  cautions: string[];
};

export type StoredRecommendationEvidence = {
  updatedAt: string;
  source: string;
  customerRequirement: string;
  productDirection: string;
  systemShape: string;
  whyThisFits: string[];
  evidenceUsed: string[];
  productFamilyScores?: StoredProductFamilyScore[];
  quoteChecks: string[];
  missingInformation: string[];
  requiredDependencies: string[];
  optionalUpgrades: string[];
  alternatives: string[];
  customerSafeWording: string[];
  internalGuidance: string[];
  quoteSafetyStatus: StoredQuoteSafetyStatus;
  quoteSafetyMessage: string;
  confidence: "high" | "medium" | "low";
  nextBestQuestion?: string;
};

type LocalProjectStorageMode = {
  kind: "local";
  reason: "server" | "sync-disabled" | "missing-auth" | "remote-rejected";
};

type RemoteProjectStorageMode = {
  kind: "remote";
  authToken?: string;
  authSource: "storage-token" | "http-only-cookie";
};

type ProjectStorageMode = LocalProjectStorageMode | RemoteProjectStorageMode;

export type StoredRecommendationFeedback = {
  id: string;
  createdAt: string;
  scope: "recommendation" | "bom" | "proposal" | "compare";
  rating: "accepted" | "needs-review" | "missing-accessory" | "wrong-fit";
  label: string;
  note?: string;
  sku?: string;
};

const PROJECT_STORE_KEY = "wingman-project-store-v1";
const PROJECT_STORE_EVENT = "wingman:project-store-updated";
const PROJECT_SYNC_ENDPOINT = "/api/wingman/projects/sync";
const PROJECTS_ENDPOINT = "/api/wingman/projects";
const BACKEND_SYNC_DEBOUNCE_MS = 600;
const PROJECT_BACKEND_SYNC_ENABLED = String(import.meta.env.VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC ?? "").toLowerCase() === "true";
const PROJECT_SYNC_DISABLED_MESSAGE = "Project backend sync is disabled. Projects are saved in this browser.";
const PROJECT_SYNC_SIGN_IN_MESSAGE = "Project backend sync is enabled, but Wingman is not signed in. Local changes are preserved.";
const PROJECT_SYNC_REJECTED_MESSAGE = "Project backend sync was rejected by the server. Local changes are preserved.";
const LOCAL_PROJECT_MODE_MESSAGE = PROJECT_SYNC_SIGN_IN_MESSAGE;
const PROJECT_SYNC_AUTH_STORAGE_KEYS = [
  "wingman.projectSyncToken",
  "wingman.sessionToken",
  "wingman.authToken",
  "wingman.auth.token",
  "wingman_session",
];
const projectStages: ProjectStage[] = [
  "Discovery",
  "Competitor Compare",
  "Proposal Builder",
  "Finder",
  "Templates",
  "Support",
];

let backendSyncTimer: number | null = null;
let backendHydrationPromise: Promise<void> | null = null;
let backendSyncRejectedForSession = false;

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultStore(): ProjectStoreSnapshot {
  const timestamp = nowIso();

  return {
    projects: [
      {
        id: "northbridge-meeting-room-refresh",
        name: "Northbridge Meeting Room Refresh",
        owner: "Steve",
        stage: "Discovery",
        status: "recommended",
        updated: "2 hours ago",
        resumeTo: routeCatalogByKey.discovery.path,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "harbour-retail-signage-rollout",
        name: "Harbour Retail Signage Rollout",
        owner: "Channel Sales",
        stage: "Competitor Compare",
        status: "alternative",
        updated: "Today",
        resumeTo: routeCatalogByKey.compare.path,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "westbrook-classroom-standard",
        name: "Westbrook Classroom Standard",
        owner: "Pre-sales",
        stage: "Proposal Builder",
        status: "recommended",
        updated: "Yesterday",
        resumeTo: routeCatalogByKey.proposal.path,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    activeProjectId: null,
    syncStatus: {
      state: "local",
      message: LOCAL_PROJECT_MODE_MESSAGE,
      updatedAt: timestamp,
    },
    proposalDrafts: [
      {
        id: "boardroom-av-upgrade-proposal",
        name: "Boardroom AV Upgrade Proposal",
        customer: "Apex Group",
        state: "Ready for review",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "meeting-room-standard-bundle",
        name: "Meeting Room Standard Bundle",
        customer: "Northbridge",
        state: "Waiting on assumptions",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "retail-display-distribution-pack",
        name: "Retail Display Distribution Pack",
        customer: "Harbour Retail",
        state: "Ready for export",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown, fallback?: string) {
  const text = String(value ?? "").trim();
  return text || fallback || "";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

function normalizedStage(value: unknown): ProjectStage {
  const stage = String(value ?? "").trim();
  return projectStages.includes(stage as ProjectStage) ? (stage as ProjectStage) : "Discovery";
}

function normalizeProductSelections(value: unknown): StoredProductSelection[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredProductSelection | null => {
      const record = objectRecord(item);
      const sku = stringValue(record?.sku);
      if (!record || !sku) return null;

      return {
        sku,
        title: stringValue(record.title, undefined),
        family: stringValue(record.family, undefined),
        category: stringValue(record.category, undefined),
        status: statusVariant(record.status),
        tags: stringArray(record.tags),
        addedAt: stringValue(record.addedAt, nowIso()),
        source: stringValue(record.source, "Product Finder"),
        evidence: stringArray(record.evidence),
        cautions: stringArray(record.cautions),
      } satisfies StoredProductSelection;
    })
    .filter((item): item is StoredProductSelection => Boolean(item));
}

function normalizeQuoteSafetyStatus(value: unknown): StoredQuoteSafetyStatus {
  const status = stringValue(value);
  if (status === "quote-ready" || status === "validate-before-quote" || status === "do-not-quote-yet") {
    return status;
  }

  return "do-not-quote-yet";
}

function normalizeEvidenceConfidence(value: unknown): StoredRecommendationEvidence["confidence"] {
  const confidence = stringValue(value);
  if (confidence === "high" || confidence === "medium" || confidence === "low") {
    return confidence;
  }

  return "low";
}

function normalizeProductFamilyScores(value: unknown): StoredProductFamilyScore[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredProductFamilyScore | null => {
      const record = objectRecord(item);
      const family = stringValue(record?.family);
      if (!record || !family) return null;

      return {
        family: family as StoredProductFamilyScore["family"],
        score: Number.isFinite(Number(record.score)) ? Number(record.score) : 0,
        reasons: stringArray(record.reasons),
        cautions: stringArray(record.cautions),
      };
    })
    .filter((item): item is StoredProductFamilyScore => Boolean(item));
}

function normalizeRecommendationEvidence(value: unknown): StoredRecommendationEvidence | undefined {
  const record = objectRecord(value);
  if (!record) return undefined;

  const customerRequirement = stringValue(record.customerRequirement);
  const productDirection = stringValue(record.productDirection);
  const systemShape = stringValue(record.systemShape);
  if (!customerRequirement && !productDirection && !systemShape) return undefined;

  return {
    updatedAt: stringValue(record.updatedAt, nowIso()),
    source: stringValue(record.source, "Wingman"),
    customerRequirement: customerRequirement || "Customer requirement not confirmed.",
    productDirection: productDirection || "Product direction not selected.",
    systemShape: systemShape || "System shape not confirmed.",
    whyThisFits: stringArray(record.whyThisFits),
    evidenceUsed: stringArray(record.evidenceUsed),
    productFamilyScores: normalizeProductFamilyScores(record.productFamilyScores),
    quoteChecks: stringArray(record.quoteChecks),
    missingInformation: stringArray(record.missingInformation),
    requiredDependencies: stringArray(record.requiredDependencies),
    optionalUpgrades: stringArray(record.optionalUpgrades),
    alternatives: stringArray(record.alternatives),
    customerSafeWording: stringArray(record.customerSafeWording),
    internalGuidance: stringArray(record.internalGuidance),
    quoteSafetyStatus: normalizeQuoteSafetyStatus(record.quoteSafetyStatus),
    quoteSafetyMessage: stringValue(record.quoteSafetyMessage, "Do not quote yet - confirm the missing information first."),
    confidence: normalizeEvidenceConfidence(record.confidence),
    nextBestQuestion: stringValue(record.nextBestQuestion, undefined),
  };
}

function normalizeDiscoveryBrief(value: unknown): StoredDiscoveryBrief | undefined {
  const record = objectRecord(value);
  if (!record) return undefined;

  return {
    savedAt: stringValue(record.savedAt, undefined),
    roomModel: objectRecord(record.roomModel) ?? undefined,
    inference: objectRecord(record.inference) ?? undefined,
    capturedPercent: Number.isFinite(Number(record.capturedPercent)) ? Number(record.capturedPercent) : undefined,
    returnRoute: stringValue(record.returnRoute, undefined),
    missingInformation: stringArray(record.missingInformation),
    nextBestQuestion: stringValue(record.nextBestQuestion, undefined),
    quoteSafetyStatus: normalizeQuoteSafetyStatus(record.quoteSafetyStatus),
    recommendationEvidence: normalizeRecommendationEvidence(record.recommendationEvidence),
  };
}

function normalizeIngestAnalysis(value: unknown): StoredIngestAnalysis | undefined {
  const record = objectRecord(value);
  if (!record) return undefined;

  return {
    requirements: stringArray(record.requirements),
    unknowns: stringArray(record.unknowns),
    skippedFiles: stringArray(record.skippedFiles),
    files: stringArray(record.files),
    multiSkuIntelligence: normalizeMultiSkuCompetitorAnalysis(record.multiSkuIntelligence),
    updatedAt: stringValue(record.updatedAt, nowIso()),
  };
}

function normalizeCompareRuns(value: unknown): StoredCompareRun[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredCompareRun | null => {
      const record = objectRecord(item);
      if (!record) return null;

      return {
        id: stringValue(record.id, createId("compare-run")),
        createdAt: stringValue(record.createdAt, nowIso()),
        competitorBrand: stringValue(record.competitorBrand, undefined),
        competitorSku: stringValue(record.competitorSku, undefined),
        competitorName: stringValue(record.competitorName, undefined),
        wyrestormSku: stringValue(record.wyrestormSku, undefined),
        wyrestormTitle: stringValue(record.wyrestormTitle, undefined),
        mode: stringValue(record.mode, undefined),
        summary: stringValue(record.summary, undefined),
        warnings: stringArray(record.warnings),
        matchScore: Number.isFinite(Number(record.matchScore)) ? Number(record.matchScore) : undefined,
        confidence: stringValue(record.confidence, undefined),
        matchType: stringValue(record.matchType, undefined),
        wyrestormUrl: stringValue(record.wyrestormUrl, undefined),
        evidence: stringArray(record.evidence),
        source: stringValue(record.source, "Competitor Compare"),
      } satisfies StoredCompareRun;
    })
    .filter((item): item is StoredCompareRun => Boolean(item));
}

function normalizeProjectProposal(value: unknown): StoredProjectProposal | undefined {
  const record = objectRecord(value);
  if (!record) return undefined;
  const outputPurpose = objectRecord(record.outputPurpose);

  return {
    title: stringValue(record.title, "Untitled Proposal"),
    summary: stringValue(record.summary),
    sections: stringArray(record.sections),
    products: normalizeProductSelections(record.products),
    assumptions: stringArray(record.assumptions),
    productFamilyScores: normalizeProductFamilyScores(record.productFamilyScores),
    outputPurpose: outputPurpose
      ? {
          motion: stringValue(outputPurpose.motion),
          summary: stringValue(outputPurpose.summary),
          customerOutput: stringValue(outputPurpose.customerOutput),
          nextAction: stringValue(outputPurpose.nextAction),
        }
      : undefined,
    governedDependencies: normalizeGovernedDependencies(record.governedDependencies),
    bomRows: normalizeProposalBomRows(record.bomRows),
    evidence: stringArray(record.evidence),
    repGuidance: stringArray(record.repGuidance),
    governanceWarnings: stringArray(record.governanceWarnings),
    validationNotes: stringArray(record.validationNotes),
    visualBlocks: normalizeProposalVisualBlocks(record.visualBlocks),
    readinessScore: Number.isFinite(Number(record.readinessScore)) ? Number(record.readinessScore) : undefined,
    companyName: stringValue(record.companyName, undefined),
    preparedBy: stringValue(record.preparedBy, undefined),
    proposalFooter: stringValue(record.proposalFooter, undefined),
    companyLogoDataUrl: stringValue(record.companyLogoDataUrl, undefined),
    contactEmail: stringValue(record.contactEmail, undefined),
    contactPhone: stringValue(record.contactPhone, undefined),
    updatedAt: stringValue(record.updatedAt, nowIso()),
  };
}

function normalizeProposalVisualBlocks(value: unknown): StoredProposalVisualBlock[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredProposalVisualBlock | null => {
      const record = objectRecord(item);
      if (!record) return null;

      const title = stringValue(record.title);
      const summary = stringValue(record.summary);
      if (!title && !summary) return null;

      return {
        id: stringValue(record.id, createId("visual-block")),
        kind: stringValue(record.kind, "signal-flow"),
        title: title || "Proposal visual",
        summary: summary || "Visual support for the customer proposal.",
        proposalUse: stringValue(record.proposalUse, "Use this to make the recommendation easier to understand and sell onward."),
        exportLabel: stringValue(record.exportLabel, "Proposal visual"),
      };
    })
    .filter((item): item is StoredProposalVisualBlock => Boolean(item));
}

function normalizeGovernedDependencies(value: unknown): StoredGovernedDependency[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredGovernedDependency | null => {
      const record = objectRecord(item);
      if (!record) return null;

      const dependency: StoredGovernedDependency = {
        id: stringValue(record.id, createId("dependency")),
        sku: stringValue(record.sku, "TBC"),
        label: stringValue(record.label, "Dependency"),
        role: stringValue(record.role, "Dependency"),
        qty: Number.isFinite(Number(record.qty)) ? Number(record.qty) : 1,
        type: stringValue(record.type, "Validate"),
        status: stringValue(record.status, "validate"),
        confidence: stringValue(record.confidence, "Low"),
        trigger: stringValue(record.trigger),
        evidence: stringValue(record.evidence),
        validationQuestion: stringValue(record.validationQuestion),
        customerSafeNote: stringValue(record.customerSafeNote),
      };

      const governanceKind = stringValue(record.governanceKind, undefined);
      const sourceSku = stringValue(record.sourceSku, undefined);
      const ruleId = stringValue(record.ruleId, undefined);
      const ruleSource = stringValue(record.ruleSource, undefined);

      if (governanceKind) dependency.governanceKind = governanceKind;
      if (sourceSku) dependency.sourceSku = sourceSku;
      if (ruleId) dependency.ruleId = ruleId;
      if (ruleSource) dependency.ruleSource = ruleSource;

      return dependency;
    })
    .filter((item): item is StoredGovernedDependency => Boolean(item));
}

function normalizeRequirementRecords(value: unknown): StoredRequirementRecord[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredRequirementRecord | null => {
      const record = objectRecord(item);
      if (!record) return null;
      const status = stringValue(record.status);
      const normalizedStatus: StoredRequirementStatus =
        status === "confirmed" || status === "unknown" || status === "review" ? status : "review";

      return {
        id: stringValue(record.id, createId("requirement")),
        label: stringValue(record.label, "Requirement"),
        value: stringValue(record.value, "Not confirmed"),
        category: stringValue(record.category, "General"),
        source: stringValue(record.source, "Wingman"),
        status: normalizedStatus,
        whyItMatters: stringValue(record.whyItMatters),
        updatedAt: stringValue(record.updatedAt, nowIso()),
      };
    })
    .filter((item): item is StoredRequirementRecord => Boolean(item));
}

function normalizeProposalBomRows(value: unknown): StoredProposalBomRow[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredProposalBomRow | null => {
      const record = objectRecord(item);
      if (!record) return null;

      return {
        item: Number.isFinite(Number(record.item)) ? Number(record.item) : 0,
        sku: stringValue(record.sku, "TBC"),
        description: stringValue(record.description, "Unspecified BOM item"),
        role: stringValue(record.role, "Dependency"),
        qty: Number.isFinite(Number(record.qty)) ? Number(record.qty) : 1,
        type: stringValue(record.type, undefined),
        status: stringValue(record.status, "validate"),
        evidence: stringValue(record.evidence, undefined),
        notes: stringValue(record.notes, "Validate before issue."),
      };
    })
    .filter((item): item is StoredProposalBomRow => Boolean(item));
}

function normalizeFeedback(value: unknown): StoredRecommendationFeedback[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredRecommendationFeedback | null => {
      const record = objectRecord(item);
      if (!record) return null;
      const rating = stringValue(record.rating);
      const normalizedRating: StoredRecommendationFeedback["rating"] =
        rating === "accepted" || rating === "needs-review" || rating === "missing-accessory" || rating === "wrong-fit"
          ? rating
          : "needs-review";
      const scope = stringValue(record.scope);
      const normalizedScope: StoredRecommendationFeedback["scope"] =
        scope === "recommendation" || scope === "bom" || scope === "proposal" || scope === "compare"
          ? scope
          : "recommendation";

      return {
        id: stringValue(record.id, createId("feedback")),
        createdAt: stringValue(record.createdAt, nowIso()),
        scope: normalizedScope,
        rating: normalizedRating,
        label: stringValue(record.label, "Recommendation feedback"),
        note: stringValue(record.note, undefined),
        sku: stringValue(record.sku, undefined),
      };
    })
    .filter((item): item is StoredRecommendationFeedback => Boolean(item));
}

function normalizeWorkflowState(value: unknown): StoredWorkflowState | undefined {
  const record = objectRecord(value);
  if (!record) return undefined;

  return {
    source: stringValue(record.source, "Wingman"),
    lastStep: stringValue(record.lastStep, "Updated"),
    nextRoute: stringValue(record.nextRoute, routeCatalogByKey.projects.path),
    updatedAt: stringValue(record.updatedAt, nowIso()),
  };
}

function normalizeStoredProject(value: unknown): StoredProject | null {
  const record = objectRecord(value);
  if (!record) return null;

  const updatedAt = stringValue(record.updatedAt || record.createdAt, nowIso());
  const project: StoredProject = {
    ...(record as Partial<StoredProject>),
    id: stringValue(record.id, createId("stored-project")),
    name: stringValue(record.name || record.roomName, "Untitled Project"),
    owner: stringValue(record.owner || record.customer, "Wingman user"),
    stage: normalizedStage(record.stage),
    status: statusVariant(record.status),
    updated: stringValue(record.updated, "Synced"),
    resumeTo: stringValue(record.resumeTo, routeCatalogByKey.discovery.path),
    createdAt: stringValue(record.createdAt, updatedAt),
    updatedAt,
  };

  const discoveryBrief = normalizeDiscoveryBrief(record.discoveryBrief);
  if (discoveryBrief) project.discoveryBrief = discoveryBrief;

  const productSelections = normalizeProductSelections(record.productSelections);
  if (productSelections.length) project.productSelections = productSelections;

  const ingest = normalizeIngestAnalysis(record.ingest);
  if (ingest) project.ingest = ingest;

  const compareRuns = normalizeCompareRuns(record.compareRuns);
  if (compareRuns.length) project.compareRuns = compareRuns;

  const proposal = normalizeProjectProposal(record.proposal);
  if (proposal) project.proposal = proposal;

  const requirements = normalizeRequirementRecords(record.requirements);
  if (requirements.length) project.requirements = requirements;

  const recommendationEvidence = normalizeRecommendationEvidence(record.recommendationEvidence);
  if (recommendationEvidence) project.recommendationEvidence = recommendationEvidence;

  const feedback = normalizeFeedback(record.feedback);
  if (feedback.length) project.feedback = feedback;

  const workflow = normalizeWorkflowState(record.workflow);
  if (workflow) project.workflow = workflow;

  return project;
}

function normalizeProposalDraft(value: unknown): StoredProposalDraft | null {
  const record = objectRecord(value);
  if (!record) return null;

  const updatedAt = stringValue(record.updatedAt || record.createdAt, nowIso());
  return {
    id: stringValue(record.id, createId("proposal-draft")),
    name: stringValue(record.name, "Untitled Proposal"),
    customer: stringValue(record.customer, "Wingman user"),
    state: stringValue(record.state, "Draft"),
    createdAt: stringValue(record.createdAt, updatedAt),
    updatedAt,
  };
}

function normalizeSyncStatus(value: unknown): StoredProjectSyncStatus {
  const record = objectRecord(value);
  const state = stringValue(record?.state);
  const normalizedState: StoredProjectSyncStatus["state"] =
    state === "syncing" || state === "synced" || state === "error" || state === "conflict" || state === "local"
      ? state
      : "local";

  return {
    state: normalizedState,
    message: stringValue(record?.message, "Project data is stored locally."),
    updatedAt: stringValue(record?.updatedAt, nowIso()),
  };
}

function safeStore(candidate: Partial<ProjectStoreSnapshot> | null | undefined): ProjectStoreSnapshot {
  const projects = Array.isArray(candidate?.projects)
    ? candidate.projects.map(normalizeStoredProject).filter((project): project is StoredProject => Boolean(project))
    : [];
  const proposalDrafts = Array.isArray(candidate?.proposalDrafts)
    ? candidate.proposalDrafts.map(normalizeProposalDraft).filter((draft): draft is StoredProposalDraft => Boolean(draft))
    : [];
  const activeProjectId = projects.some((project) => project.id === candidate?.activeProjectId)
    ? candidate?.activeProjectId ?? null
    : null;

  return {
    projects,
    proposalDrafts,
    activeProjectId,
    syncStatus: normalizeSyncStatus(candidate?.syncStatus),
  };
}

function statusVariant(value: unknown): StatusVariant {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "recommended" || normalized.includes("ready") || normalized.includes("track")) return "recommended";
  if (normalized === "caution" || normalized.includes("risk") || normalized.includes("block")) return "caution";
  return "alternative";
}

export function projectBackendSyncEnabled() {
  return PROJECT_BACKEND_SYNC_ENABLED;
}

function localProjectMessage(reason: LocalProjectStorageMode["reason"]) {
  if (reason === "sync-disabled") return PROJECT_SYNC_DISABLED_MESSAGE;
  if (reason === "remote-rejected") return PROJECT_SYNC_REJECTED_MESSAGE;
  return PROJECT_SYNC_SIGN_IN_MESSAGE;
}

function localProjectSyncStatus(
  previous?: StoredProjectSyncStatus | null,
  reason: LocalProjectStorageMode["reason"] = "missing-auth",
): StoredProjectSyncStatus {
  return {
    state: "local",
    message: localProjectMessage(reason),
    updatedAt: previous?.updatedAt ?? nowIso(),
  };
}

function readBrowserStorageValue(storageKey: "localStorage" | "sessionStorage", key: string) {
  try {
    return window[storageKey].getItem(key)?.trim() ?? "";
  } catch {
    return "";
  }
}

function readVisibleCookieValue(name: string) {
  if (typeof document === "undefined") return "";

  const cookies = document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex <= 0) continue;
    if (cookie.slice(0, separatorIndex).trim() !== name) continue;

    const rawValue = cookie.slice(separatorIndex + 1).trim();
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return "";
}

function getProjectSyncAuthToken() {
  if (typeof window === "undefined") return "";

  for (const key of PROJECT_SYNC_AUTH_STORAGE_KEYS) {
    const sessionValue = readBrowserStorageValue("sessionStorage", key);
    if (sessionValue) return sessionValue;

    const localValue = readBrowserStorageValue("localStorage", key);
    if (localValue) return localValue;
  }

  return readVisibleCookieValue("wingman_session");
}

function getProjectStorageMode(): ProjectStorageMode {
  if (typeof window === "undefined") {
    return { kind: "local", reason: "server" };
  }

  if (!projectBackendSyncEnabled()) {
    return { kind: "local", reason: "sync-disabled" };
  }

  if (backendSyncRejectedForSession) {
    return { kind: "local", reason: "remote-rejected" };
  }

  const authToken = getProjectSyncAuthToken();
  return {
    kind: "remote",
    authToken: authToken || undefined,
    authSource: authToken ? "storage-token" : "http-only-cookie",
  };
}

function buildProjectApiRequest(init: RequestInit, storageMode: RemoteProjectStorageMode): RequestInit {
  const headers = new Headers(init.headers);
  if (storageMode.authToken) {
    headers.set("Authorization", `Bearer ${storageMode.authToken}`);
  }

  return {
    ...init,
    credentials: "include",
    headers,
  };
}

function storedProjectFromBackend(value: Record<string, unknown>): StoredProject {
  return normalizeStoredProject(value) ?? {
    id: createId("backend-project"),
    name: "Untitled Project",
    owner: "Wingman user",
    stage: "Discovery",
    status: "alternative",
    updated: "Synced",
    resumeTo: routeCatalogByKey.discovery.path,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function backendProjectFromStored(project: StoredProject) {
  return {
    ...project,
    customer: project.owner,
    site: "",
    roomName: project.name,
    notes: `Resume workflow: ${project.resumeTo}`,
  };
}

async function fetchBackendProjectStore(storageMode: RemoteProjectStorageMode) {
  if (typeof window === "undefined") return null;

  try {
    const response = await fetch(
      PROJECTS_ENDPOINT,
      buildProjectApiRequest(
        {
          cache: "no-store",
        },
        storageMode,
      ),
    );

    if (response.status === 401) {
      backendSyncRejectedForSession = true;
      setProjectSyncStatus({
        state: "local",
        message: PROJECT_SYNC_SIGN_IN_MESSAGE,
        updatedAt: nowIso(),
      });
      return null;
    }
    if (!response.ok) return null;
    const payload = (await response.json()) as { projects?: unknown[] };
    if (!Array.isArray(payload.projects)) return null;

    return payload.projects
      .filter((project): project is Record<string, unknown> => Boolean(project) && typeof project === "object")
      .map(storedProjectFromBackend);
  } catch {
    return null;
  }
}

function setProjectSyncStatus(syncStatus: StoredProjectSyncStatus) {
  if (typeof window === "undefined") return;

  const snapshot = readProjectStore();
  writeProjectStore(
    {
      ...snapshot,
      syncStatus,
    },
    { syncBackend: false },
  );
}

function scheduleBackendProjectSync(snapshot: ProjectStoreSnapshot, storageMode: ProjectStorageMode = getProjectStorageMode()) {
  if (typeof window === "undefined") return;

  if (storageMode.kind === "local") {
    if (backendSyncTimer) {
      window.clearTimeout(backendSyncTimer);
      backendSyncTimer = null;
    }
    return;
  }

  setProjectSyncStatus({
    state: "syncing",
    message: "Saving project changes to the workspace backend...",
    updatedAt: nowIso(),
  });

  if (backendSyncTimer) {
    window.clearTimeout(backendSyncTimer);
  }

  backendSyncTimer = window.setTimeout(() => {
    backendSyncTimer = null;
    const store = safeStore(snapshot);

    fetch(
      PROJECT_SYNC_ENDPOINT,
      buildProjectApiRequest(
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activeProjectId: store.activeProjectId ?? null,
            projects: store.projects.map(backendProjectFromStored),
          }),
        },
        storageMode,
      ),
    )
      .then((response) => {
        if (response.status === 401) {
          backendSyncRejectedForSession = true;
          setProjectSyncStatus({
            state: "local",
            message: PROJECT_SYNC_SIGN_IN_MESSAGE,
            updatedAt: nowIso(),
          });
          return;
        }

        if (!response.ok) {
          setProjectSyncStatus({
            state: "error",
            message: `Project sync failed with status ${response.status}. Local changes were preserved.`,
            updatedAt: nowIso(),
          });
          return;
        }

        setProjectSyncStatus({
          state: "synced",
          message: "Project changes are synced to the workspace backend.",
          updatedAt: nowIso(),
        });
      })
      .catch(() => {
        setProjectSyncStatus({
          state: "error",
          message: "Project sync failed. Local changes were preserved.",
          updatedAt: nowIso(),
        });
      });
  }, BACKEND_SYNC_DEBOUNCE_MS);
}

export function readProjectStore(): ProjectStoreSnapshot {
  if (typeof window === "undefined") {
    return defaultStore();
  }

  const raw = window.localStorage.getItem(PROJECT_STORE_KEY);

  if (!raw) {
    return defaultStore();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ProjectStoreSnapshot>;
    return safeStore(parsed);
  } catch {
    return defaultStore();
  }
}

export function writeProjectStore(snapshot: ProjectStoreSnapshot, options: { syncBackend?: boolean } = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const storageMode = getProjectStorageMode();
  const store = safeStore({
    ...snapshot,
    syncStatus: storageMode.kind === "local" ? localProjectSyncStatus(snapshot.syncStatus, storageMode.reason) : snapshot.syncStatus,
  });
  window.localStorage.setItem(PROJECT_STORE_KEY, JSON.stringify(store));
  if (options.syncBackend !== false && storageMode.kind === "remote") {
    scheduleBackendProjectSync(store, storageMode);
  }
  window.dispatchEvent(new CustomEvent(PROJECT_STORE_EVENT));
}

async function hydrateProjectStoreFromBackendOnce(storageMode: RemoteProjectStorageMode) {
  const backendProjects = await fetchBackendProjectStore(storageMode);
  if (!backendProjects) return;
  const currentStore = readProjectStore();
  let conflictDetected = false;
  const localById = new Map(currentStore.projects.map((project) => [project.id, project]));
  const backendIds = new Set(backendProjects.map((project) => project.id));
  const projects = backendProjects.map((backendProject) => {
    const localProject = localById.get(backendProject.id);
    if (!localProject) return backendProject;

    const localTime = Date.parse(localProject.updatedAt || "");
    const backendTime = Date.parse(backendProject.updatedAt || "");
    if (Number.isFinite(localTime) && Number.isFinite(backendTime) && localTime > backendTime) {
      conflictDetected = true;
      return localProject;
    }

    return backendProject;
  });

  currentStore.projects.forEach((project) => {
    if (!backendIds.has(project.id)) {
      projects.push(project);
    }
  });

  writeProjectStore(
    {
      ...currentStore,
      projects,
      activeProjectId: currentStore.activeProjectId,
      syncStatus: conflictDetected
        ? {
            state: "conflict",
            message: "Local project changes were newer than backend data, so Wingman preserved the local version.",
            updatedAt: nowIso(),
          }
        : {
            state: "synced",
            message: "Project data was loaded from the workspace backend.",
            updatedAt: nowIso(),
          },
    },
    { syncBackend: false },
  );
}

export async function hydrateProjectStoreFromBackend() {
  const storageMode = getProjectStorageMode();
  if (storageMode.kind === "local") return;

  if (!backendHydrationPromise) {
    backendHydrationPromise = hydrateProjectStoreFromBackendOnce(storageMode);
  }

  return backendHydrationPromise;
}

export function resetProjectBackendSyncSessionState() {
  backendSyncRejectedForSession = false;
  backendHydrationPromise = null;
}

export function resetProjectStore() {
  writeProjectStore(defaultStore());
}

export function copyStoredProject(projectId: string) {
  const snapshot = readProjectStore();
  const project = snapshot.projects.find((item) => item.id === projectId);

  if (!project) {
    return;
  }

  const copy: StoredProject = {
    ...project,
    id: createId(project.id),
    name: `${project.name} Copy`,
    updated: "Just now",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const index = snapshot.projects.findIndex((item) => item.id === projectId);
  const projects = [...snapshot.projects];
  projects.splice(index + 1, 0, copy);

  writeProjectStore({
    ...snapshot,
    projects,
    activeProjectId: copy.id,
  });
}

export function deleteStoredProject(projectId: string) {
  const snapshot = readProjectStore();

  writeProjectStore({
    ...snapshot,
    projects: snapshot.projects.filter((project) => project.id !== projectId),
    activeProjectId: snapshot.activeProjectId === projectId ? null : snapshot.activeProjectId,
  });
}

export function copyStoredProposalDraft(draftId: string) {
  const snapshot = readProjectStore();
  const draft = snapshot.proposalDrafts.find((item) => item.id === draftId);

  if (!draft) {
    return;
  }

  const copy: StoredProposalDraft = {
    ...draft,
    id: createId(draft.id),
    name: `${draft.name} Copy`,
    state: "Copied draft",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const index = snapshot.proposalDrafts.findIndex((item) => item.id === draftId);
  const proposalDrafts = [...snapshot.proposalDrafts];
  proposalDrafts.splice(index + 1, 0, copy);

  writeProjectStore({
    ...snapshot,
    proposalDrafts,
  });
}

export function deleteStoredProposalDraft(draftId: string) {
  const snapshot = readProjectStore();

  writeProjectStore({
    ...snapshot,
    proposalDrafts: snapshot.proposalDrafts.filter((draft) => draft.id !== draftId),
  });
}

export function getProjectSyncStatus(snapshot: ProjectStoreSnapshot = readProjectStore()) {
  const storageMode = getProjectStorageMode();
  if (storageMode.kind === "local") {
    return localProjectSyncStatus(snapshot.syncStatus, storageMode.reason);
  }

  return snapshot.syncStatus ?? {
    state: "local",
    message: LOCAL_PROJECT_MODE_MESSAGE,
    updatedAt: nowIso(),
  };
}

export function saveRecommendationFeedback(
  feedback: Omit<StoredRecommendationFeedback, "id" | "createdAt"> & { id?: string; createdAt?: string },
  options: { requireExistingProject?: boolean } = {},
) {
  const snapshot = readProjectStore();
  const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
  if (!existing) return null;

  const timestamp = feedback.createdAt ?? nowIso();
  const nextFeedback: StoredRecommendationFeedback = {
    id: feedback.id ?? createId("feedback"),
    createdAt: timestamp,
    scope: feedback.scope,
    rating: feedback.rating,
    label: feedback.label,
    note: feedback.note,
    sku: feedback.sku,
  };

  return upsertStoredProject({
    ...existing,
    updated: "Just now",
    updatedAt: timestamp,
    feedback: [nextFeedback, ...(existing.feedback ?? [])].slice(0, 40),
    workflow: {
      source: "Sales Feedback",
      lastStep: `Feedback captured: ${feedback.label}`,
      nextRoute: existing.resumeTo,
      updatedAt: timestamp,
    },
  });
}

export function projectHasWorkflowData(project: StoredProject) {
  return Boolean(
    project.discoveryBrief ||
      project.ingest ||
      project.proposal ||
      project.workflow ||
      project.productSelections?.length ||
      project.compareRuns?.length ||
      project.feedback?.length,
  );
}

export function getActiveProject(snapshot: ProjectStoreSnapshot = readProjectStore()) {
  return snapshot.projects.find((project) => project.id === snapshot.activeProjectId) ?? null;
}

export function getCurrentWorkflowProject(snapshot: ProjectStoreSnapshot = readProjectStore()) {
  return getActiveProject(snapshot) ?? snapshot.projects.find(projectHasWorkflowData) ?? null;
}

export function setActiveProjectId(projectId: string | null) {
  const snapshot = readProjectStore();
  const activeProjectId = projectId && snapshot.projects.some((project) => project.id === projectId) ? projectId : null;
  writeProjectStore({
    ...snapshot,
    activeProjectId,
  });
}

export function clearActiveProject() {
  setActiveProjectId(null);
}

export function upsertStoredProject(project: StoredProject) {
  const snapshot = readProjectStore();
  const normalized = normalizeStoredProject(project) ?? project;
  const projects = [normalized, ...snapshot.projects.filter((item) => item.id !== normalized.id)];

  writeProjectStore({
    ...snapshot,
    projects,
    activeProjectId: normalized.id,
  });

  return normalized;
}

export function updateStoredProject(projectId: string, updater: (project: StoredProject) => StoredProject) {
  const snapshot = readProjectStore();
  let updatedProject: StoredProject | null = null;
  const projects = snapshot.projects.map((project) => {
    if (project.id !== projectId) return project;
    const nextProject = updater(project);
    updatedProject = normalizeStoredProject(nextProject) ?? nextProject;
    return updatedProject;
  });

  if (!updatedProject) return null;

  writeProjectStore({
    ...snapshot,
    projects,
    activeProjectId: projectId,
  });

  return updatedProject;
}

function createWorkflowProject(input: {
  name: string;
  owner?: string;
  stage: ProjectStage;
  status?: StatusVariant;
  resumeTo: string;
  discoveryBrief?: StoredDiscoveryBrief;
  ingest?: StoredIngestAnalysis;
  productSelections?: StoredProductSelection[];
  compareRuns?: StoredCompareRun[];
  proposal?: StoredProjectProposal;
  requirements?: StoredRequirementRecord[];
  recommendationEvidence?: StoredRecommendationEvidence;
  workflow: StoredWorkflowState;
}) {
  const timestamp = nowIso();

  return {
    id: createId("wingman-project"),
    name: input.name,
    owner: input.owner || "Wingman user",
    stage: input.stage,
    status: input.status ?? "alternative",
    updated: "Just now",
    resumeTo: input.resumeTo,
    createdAt: timestamp,
    updatedAt: timestamp,
    discoveryBrief: input.discoveryBrief,
    ingest: input.ingest,
    productSelections: input.productSelections,
    compareRuns: input.compareRuns,
    proposal: input.proposal,
    requirements: input.requirements,
    recommendationEvidence: input.recommendationEvidence,
    workflow: input.workflow,
  } satisfies StoredProject;
}

function projectNameFromDiscoveryBrief(brief: StoredDiscoveryBrief) {
  const roomModel = brief.roomModel ?? {};
  const customer = stringValue(roomModel.customer || roomModel.customerName || roomModel.companyName);
  const roomType = stringValue(roomModel.roomType, "Discovery");
  return customer ? `${customer} ${roomType}` : `${roomType} Project`;
}

function projectNameFromIngest(files: string[], intelligence?: MultiSkuCompetitorAnalysis) {
  if (intelligence?.documentType === "multi_sku_competitor_list") {
    const account = intelligence.accountCustomer !== "Not confirmed"
      ? intelligence.accountCustomer
      : intelligence.manufacturer !== "Not confirmed"
        ? intelligence.manufacturer
        : "Competitor";
    return `${account} Multi-SKU Opportunity`;
  }
  if (files.length === 1) return `${files[0]} Requirements`;
  return files.length > 1 ? `${files[0]} + ${files.length - 1} file(s)` : "Imported Requirements";
}

export function saveDiscoveryBriefToProject(brief: StoredDiscoveryBrief) {
  const timestamp = nowIso();
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  const workflow: StoredWorkflowState = {
    source: "Discovery",
    lastStep: "Discovery saved",
    nextRoute: routeCatalogByKey.finder.path,
    updatedAt: timestamp,
  };

  const project = existing
    ? {
        ...existing,
        name: existing.discoveryBrief ? existing.name : projectNameFromDiscoveryBrief(brief),
        stage: "Discovery" as const,
        status: "recommended" as const,
        updated: "Just now",
        resumeTo: routeCatalogByKey.finder.path,
        updatedAt: timestamp,
        discoveryBrief: brief,
        workflow,
      }
    : createWorkflowProject({
        name: projectNameFromDiscoveryBrief(brief),
        stage: "Discovery",
        status: "recommended",
        resumeTo: routeCatalogByKey.finder.path,
        discoveryBrief: brief,
        workflow,
      });

  return upsertStoredProject(project);
}

export function saveProductSelectionToProject(projectId: string, selection: StoredProductSelection) {
  const snapshot = readProjectStore();
  const existing =
    snapshot.projects.find((project) => project.id === projectId) ??
    createWorkflowProject({
      name: `${selection.sku} Product Selection`,
      stage: "Finder",
      status: selection.status ?? "alternative",
      resumeTo: routeCatalogByKey.finder.path,
      productSelections: [],
      workflow: {
        source: "Product Finder",
        lastStep: "Product selected",
        nextRoute: routeCatalogByKey.projects.path,
        updatedAt: nowIso(),
      },
    });

  const timestamp = nowIso();
  const selected = normalizeProductSelections([selection])[0] ?? selection;
  const productSelections = [
    selected,
    ...(existing.productSelections ?? []).filter((item) => item.sku !== selected.sku),
  ].slice(0, 20);

  return upsertStoredProject({
    ...existing,
    stage: "Finder",
    status: selected.status ?? existing.status,
    updated: "Just now",
    resumeTo: routeCatalogByKey.finder.path,
    updatedAt: timestamp,
    productSelections,
    workflow: {
      source: "Product Finder",
      lastStep: "Product selected",
      nextRoute: routeCatalogByKey.projects.path,
      updatedAt: timestamp,
    },
  });
}

export function saveProductSelectionToCurrentProject(selection: StoredProductSelection) {
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  const project =
    existing ??
    createWorkflowProject({
      name: `${selection.sku} Product Selection`,
      stage: "Finder",
      status: selection.status ?? "alternative",
      resumeTo: routeCatalogByKey.finder.path,
      productSelections: [],
      workflow: {
        source: "Product Finder",
        lastStep: "Product selected",
        nextRoute: routeCatalogByKey.projects.path,
        updatedAt: nowIso(),
      },
    });

  if (!existing) {
    upsertStoredProject(project);
  }

  return saveProductSelectionToProject(project.id, selection);
}

export function saveRecommendationEvidenceToProject(
  evidence: StoredRecommendationEvidence,
  selection?: StoredProductSelection,
) {
  const timestamp = nowIso();
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  const normalizedSelection = selection ? normalizeProductSelections([selection])[0] ?? selection : null;
  const productSelections = normalizedSelection
    ? [
        normalizedSelection,
        ...((existing?.productSelections ?? []).filter((item) => item.sku !== normalizedSelection.sku)),
      ].slice(0, 20)
    : existing?.productSelections;
  const status: StatusVariant =
    evidence.quoteSafetyStatus === "quote-ready"
      ? "recommended"
      : evidence.quoteSafetyStatus === "do-not-quote-yet"
        ? "caution"
        : "alternative";
  const workflow: StoredWorkflowState = {
    source: "Product Pitch",
    lastStep: "Recommendation evidence saved",
    nextRoute: routeCatalogByKey.proposal.path,
    updatedAt: timestamp,
  };
  const normalizedEvidence = normalizeRecommendationEvidence({
    ...evidence,
    updatedAt: timestamp,
    source: evidence.source || "Product Pitch",
  }) ?? evidence;

  const project = existing
    ? {
        ...existing,
        stage: "Finder" as const,
        status,
        updated: "Just now",
        resumeTo: routeCatalogByKey.productPitch.path,
        updatedAt: timestamp,
        productSelections,
        recommendationEvidence: normalizedEvidence,
        workflow,
      }
    : createWorkflowProject({
        name: normalizedSelection
          ? `${normalizedSelection.sku} Product Pitch`
          : evidence.productDirection || "Product Pitch Direction",
        stage: "Finder",
        status,
        resumeTo: routeCatalogByKey.productPitch.path,
        productSelections: normalizedSelection ? [normalizedSelection] : undefined,
        recommendationEvidence: normalizedEvidence,
        workflow,
      });

  return upsertStoredProject(project);
}

export function saveIngestAnalysisToProject(
  input: Omit<StoredIngestAnalysis, "updatedAt"> & { updatedAt?: string },
  options: { requireExistingProject?: boolean } = {},
) {
  const timestamp = input.updatedAt ?? nowIso();
  const ingest: StoredIngestAnalysis = {
    requirements: input.requirements,
    unknowns: input.unknowns,
    skippedFiles: input.skippedFiles,
    files: input.files,
    multiSkuIntelligence: input.multiSkuIntelligence,
    updatedAt: timestamp,
  };
  const snapshot = readProjectStore();
  const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
  if (!existing && options.requireExistingProject) return null;

  const isMultiSku = input.multiSkuIntelligence?.documentType === "multi_sku_competitor_list";
  const workflow: StoredWorkflowState = {
    source: "Document Ingest",
    lastStep: isMultiSku ? "Multi-SKU competitor intelligence saved" : "Requirements imported",
    nextRoute: isMultiSku ? routeCatalogByKey.compare.path : routeCatalogByKey.discovery.path,
    updatedAt: timestamp,
  };

  const project = existing
    ? {
        ...existing,
        stage: isMultiSku ? "Competitor Compare" as const : "Discovery" as const,
        status: input.unknowns.length ? "alternative" as const : "recommended" as const,
        updated: "Just now",
        resumeTo: isMultiSku ? routeCatalogByKey.ingest.path : routeCatalogByKey.discovery.path,
        updatedAt: timestamp,
        ingest,
        workflow,
      }
    : createWorkflowProject({
        name: projectNameFromIngest(input.files, input.multiSkuIntelligence),
        owner: input.multiSkuIntelligence?.accountCustomer !== "Not confirmed"
          ? input.multiSkuIntelligence?.accountCustomer
          : undefined,
        stage: isMultiSku ? "Competitor Compare" : "Discovery",
        status: input.unknowns.length ? "alternative" : "recommended",
        resumeTo: isMultiSku ? routeCatalogByKey.ingest.path : routeCatalogByKey.discovery.path,
        ingest,
        workflow,
      });

  return upsertStoredProject(project);
}

export function saveCompareRunToProject(
  run: Omit<StoredCompareRun, "id" | "createdAt"> & { id?: string; createdAt?: string },
  options: { requireExistingProject?: boolean } = {},
) {
  const timestamp = run.createdAt ?? nowIso();
  const snapshot = readProjectStore();
  const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
  if (!existing && options.requireExistingProject) return null;

  const compareRun: StoredCompareRun = {
    id: run.id ?? createId("compare-run"),
    createdAt: timestamp,
    competitorBrand: run.competitorBrand,
    competitorSku: run.competitorSku,
    competitorName: run.competitorName,
    wyrestormSku: run.wyrestormSku,
    wyrestormTitle: run.wyrestormTitle,
    mode: run.mode,
    summary: run.summary,
    warnings: run.warnings ?? [],
    matchScore: run.matchScore,
    confidence: run.confidence,
    matchType: run.matchType,
    wyrestormUrl: run.wyrestormUrl,
    evidence: run.evidence ?? [],
    source: run.source ?? "Competitor Compare",
  };
  const workflow: StoredWorkflowState = {
    source: "Competitor Compare",
    lastStep: "Competitor lookup saved",
    nextRoute: routeCatalogByKey.projects.path,
    updatedAt: timestamp,
  };

  const project = existing
    ? {
        ...existing,
        stage: "Competitor Compare" as const,
        status: "alternative" as const,
        updated: "Just now",
        resumeTo: routeCatalogByKey.compare.path,
        updatedAt: timestamp,
        compareRuns: [compareRun, ...(existing.compareRuns ?? [])].slice(0, 10),
        workflow,
      }
    : createWorkflowProject({
        name: `${compareRun.competitorSku || "Competitor"} Comparison`,
        stage: "Competitor Compare",
        status: "alternative",
        resumeTo: routeCatalogByKey.compare.path,
        compareRuns: [compareRun],
        workflow,
      });

  return upsertStoredProject(project);
}

export function saveProjectProposalToProject(proposal: StoredProjectProposal) {
  const timestamp = proposal.updatedAt || nowIso();
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  const workflow: StoredWorkflowState = {
    source: "Proposal Builder",
    lastStep: "Proposal preview generated",
    nextRoute: routeCatalogByKey.support.path,
    updatedAt: timestamp,
  };

  const project = existing
    ? {
        ...existing,
        stage: "Proposal Builder" as const,
        status: proposal.assumptions.length ? "alternative" as const : "recommended" as const,
        updated: "Just now",
        resumeTo: routeCatalogByKey.proposal.path,
        updatedAt: timestamp,
        proposal,
        workflow,
      }
    : createWorkflowProject({
        name: proposal.title,
        stage: "Proposal Builder",
        status: proposal.assumptions.length ? "alternative" : "recommended",
        resumeTo: routeCatalogByKey.proposal.path,
        proposal,
        workflow,
      });

  return upsertStoredProject(project);
}

export function saveProjectRequirementsToProject(projectId: string, requirements: StoredRequirementRecord[]) {
  const timestamp = nowIso();

  return updateStoredProject(projectId, (project) => ({
    ...project,
    updated: "Just now",
    updatedAt: timestamp,
    requirements: normalizeRequirementRecords(
      requirements.map((requirement) => ({
        ...requirement,
        updatedAt: timestamp,
      })),
    ),
    workflow: {
      source: "Project Requirements",
      lastStep: "Requirements reviewed",
      nextRoute: project.resumeTo,
      updatedAt: timestamp,
    },
  }));
}

export function useProjectStore() {
  const [snapshot, setSnapshot] = useState<ProjectStoreSnapshot>(() => readProjectStore());

  useEffect(() => {
    function refresh() {
      setSnapshot(readProjectStore());
    }

    hydrateProjectStoreFromBackend().catch(() => {
      // Local store remains valid when no backend session is available.
    });

    window.addEventListener(PROJECT_STORE_EVENT, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(PROJECT_STORE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const copyProject = useCallback((projectId: string) => {
    copyStoredProject(projectId);
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    deleteStoredProject(projectId);
  }, []);

  const copyProposalDraft = useCallback((draftId: string) => {
    copyStoredProposalDraft(draftId);
  }, []);

  const deleteProposalDraft = useCallback((draftId: string) => {
    deleteStoredProposalDraft(draftId);
  }, []);

  const resetStore = useCallback(() => {
    resetProjectStore();
  }, []);

  return {
    projects: snapshot.projects,
    proposalDrafts: snapshot.proposalDrafts,
    activeProjectId: snapshot.activeProjectId ?? null,
    activeProject: getActiveProject(snapshot),
    syncStatus: getProjectSyncStatus(snapshot),
    copyProject,
    deleteProject,
    copyProposalDraft,
    deleteProposalDraft,
    resetStore,
  };
}
