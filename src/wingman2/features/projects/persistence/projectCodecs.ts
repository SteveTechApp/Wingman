import { routeCatalogByKey } from "../../../app/routeCatalog";
import { normalizeMultiSkuCompetitorAnalysis } from "../../../lib/documentIngest/multiSkuCompetitorIngest";
import { normaliseProjectTopology } from "../../../lib/projectTopology";
import { STRANDED_BRIEF_QUOTE_SAFETY_MESSAGE } from "../../../lib/strandedBriefQuoteSafety";
import type { StatusVariant } from "../../../types";
import type {
  DiscoveryConversationItem,
  ProjectAuditEntry,
  ProjectStage,
  ProjectStoreSnapshot,
  ProposalVisualConnection,
  ProposalVisualAsset,
  ProposalVisualKind,
  ProposalVisualPurpose,
  ProposalVisualStatus,
  StoredCompareRun,
  StoredDesignProposalRevision,
  StoredDiscoveryBrief,
  StoredGovernedDependency,
  StoredIngestAnalysis,
  StoredIngestVisualAttachment,
  StoredProductFamilyScore,
  StoredProductSelection,
  StoredProject,
  StoredProjectProposal,
  StoredProjectSyncConflict,
  StoredProjectSyncStatus,
  StoredProposalBomRow,
  StoredProposalDraft,
  StoredProposalVisualBlock,
  StoredQuoteSafetyStatus,
  StoredRecommendationEvidence,
  StoredRecommendationFeedback,
  StoredRequirementRecord,
  StoredRequirementStatus,
  StoredVideowallSummary,
  StoredWorkflowState,
} from "../model/projectTypes";

const projectStages: ProjectStage[] = ["Discovery", "Competitor Compare", "Proposal Builder", "Recommendations", "Templates", "Support"];

function nowIso() { return new Date().toISOString(); }
function createId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function stringValue(value: unknown, fallback?: string) {
  const text = String(value ?? "").trim();
  return text || fallback || "";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

function positiveNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizedStage(value: unknown): ProjectStage {
  const stage = String(value ?? "").trim();
  if (stage === "Finder") return "Recommendations";
  return projectStages.includes(stage as ProjectStage) ? (stage as ProjectStage) : "Discovery";
}

function normalizedWorkflowRoute(value: unknown, fallback: string) {
  const route = stringValue(value, fallback);
  return route === "/wingman/finder" ? routeCatalogByKey.recommendations.path : route;
}

export function normalizeProductSelections(value: unknown): StoredProductSelection[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredProductSelection | null => {
      const record = objectRecord(item);
      const sku = stringValue(record?.sku);
      if (!record || !sku) return null;

      return {
        sku,
        quantity: positiveNumber(record.quantity),
        title: stringValue(record.title, undefined),
        family: stringValue(record.family, undefined),
        category: stringValue(record.category, undefined),
        status: statusVariant(record.status),
        tags: stringArray(record.tags),
        addedAt: stringValue(record.addedAt, nowIso()),
        source: stringValue(record.source, "Recommendations"),
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

export function normalizeRecommendationEvidence(value: unknown): StoredRecommendationEvidence | undefined {
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

function normalizeDiscoveryConversation(value: unknown): DiscoveryConversationItem[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const items = value
    .map((item): DiscoveryConversationItem | null => {
      const record = objectRecord(item);
      if (!record) return null;
      const question = stringValue(record.question);
      const answer = stringValue(record.answer);
      if (!question && !answer) return null;
      const confidence = record.confidence;
      const scoreValue = record.confidenceScore;
      return {
        stepId: stringValue(record.stepId, ""),
        question,
        answer: answer || "Captured note only",
        note: stringValue(record.note, ""),
        confirmed: record.confirmed === true,
        confidence:
          confidence === "high" || confidence === "matched" || confidence === "low"
            ? confidence
            : undefined,
        confidenceScore:
          typeof scoreValue === "number" && Number.isFinite(scoreValue)
            ? scoreValue
            : undefined,
      };
    })
    .filter((item): item is DiscoveryConversationItem => Boolean(item));

  return items.length ? items : undefined;
}

function normalizeDiscoveryBrief(value: unknown): StoredDiscoveryBrief | undefined {
  const record = objectRecord(value);
  if (!record) return undefined;

  const topology = normaliseProjectTopology(record.topology);
  const hasTopology = topology.locations.length > 0 || topology.connections.length > 0;

  return {
    savedAt: stringValue(record.savedAt, undefined),
    roomModel: objectRecord(record.roomModel) ?? undefined,
    topology: hasTopology ? topology : undefined,
    inference: objectRecord(record.inference) ?? undefined,
    capturedPercent: Number.isFinite(Number(record.capturedPercent)) ? Number(record.capturedPercent) : undefined,
    returnRoute: stringValue(record.returnRoute, undefined),
    missingInformation: stringArray(record.missingInformation),
    nextBestQuestion: stringValue(record.nextBestQuestion, undefined),
    reviewPosition: Number.isFinite(Number(record.reviewPosition)) ? Math.max(0, Math.floor(Number(record.reviewPosition))) : undefined,
    quoteSafetyStatus: normalizeQuoteSafetyStatus(record.quoteSafetyStatus),
    recommendationEvidence: normalizeRecommendationEvidence(record.recommendationEvidence),
    decisionEvidence: Array.isArray(record.decisionEvidence)
      ? record.decisionEvidence.flatMap((item) => {
          const candidate = objectRecord(item);
          if (!candidate) return [];
          const state = stringValue(candidate.state);
          const source = stringValue(candidate.source);
          const confidence = stringValue(candidate.confidence);
          if (!["confirmed", "inferred", "unknown", "conflict"].includes(state)) return [];
          if (!["customer", "topology", "workflow-inference", "system"].includes(source)) return [];
          if (!["high", "medium", "low"].includes(confidence)) return [];
          return [{ field: stringValue(candidate.field, "Requirement"), value: stringValue(candidate.value, "Unknown"), state: state as "confirmed" | "inferred" | "unknown" | "conflict", source: source as "customer" | "topology" | "workflow-inference" | "system", confidence: confidence as "high" | "medium" | "low", reason: stringValue(candidate.reason, undefined) }];
        })
      : undefined,
    decisionIntegrity: objectRecord(record.decisionIntegrity) ? {
      status: ["confirmed", "inferred", "review", "conflict"].includes(stringValue(objectRecord(record.decisionIntegrity)?.status)) ? stringValue(objectRecord(record.decisionIntegrity)?.status) as "confirmed" | "inferred" | "review" | "conflict" : "review",
      unknownCount: Number(objectRecord(record.decisionIntegrity)?.unknownCount) || 0,
      inferredCount: Number(objectRecord(record.decisionIntegrity)?.inferredCount) || 0,
      conflictCount: Number(objectRecord(record.decisionIntegrity)?.conflictCount) || 0,
      canQuote: objectRecord(record.decisionIntegrity)?.canQuote === true,
    } : undefined,
    discoveryConversation: normalizeDiscoveryConversation(record.discoveryConversation),
  };
}

function normalizeIngestVisualAttachmentKind(value: unknown): StoredIngestVisualAttachment["kind"] {
  return value === "room_photo" || value === "schematic_diagram" ? value : "unclear";
}

function normalizeIngestVisualContext(value: unknown): StoredIngestVisualAttachment[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredIngestVisualAttachment | null => {
      const record = objectRecord(item);
      if (!record) return null;

      const summary = stringValue(record.summary);
      const fileName = stringValue(record.fileName);
      if (!summary && !fileName) return null;

      return {
        id: stringValue(record.id, createId("visual-attachment")),
        fileName,
        kind: normalizeIngestVisualAttachmentKind(record.kind),
        summary,
        roomObservations: stringArray(record.roomObservations),
        visibleEquipment: stringArray(record.visibleEquipment),
        layoutNotes: stringArray(record.layoutNotes),
        confidence: Number.isFinite(Number(record.confidence)) ? Number(record.confidence) : 0,
        analyzedAt: stringValue(record.analyzedAt, nowIso()),
      };
    })
    .filter((item): item is StoredIngestVisualAttachment => Boolean(item));
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
    visualContext: normalizeIngestVisualContext(record.visualContext),
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
        version: Number.isFinite(Number(record.version)) ? Number(record.version) : undefined,
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
    discoveryConversation: normalizeDiscoveryConversation(record.discoveryConversation),
    designRevision: normalizeDesignProposalRevision(record.designRevision),
    submittedRevisionHash: stringValue(record.submittedRevisionHash, undefined),
    approvedRevisionHash: stringValue(record.approvedRevisionHash, undefined),
    approvalStatus:
      record.approvalStatus === "pending" || record.approvalStatus === "approved" || record.approvalStatus === "rejected"
        ? record.approvalStatus
        : "draft",
    submittedBy: stringValue(record.submittedBy, undefined),
    submittedAt: stringValue(record.submittedAt, undefined),
    approvedBy: stringValue(record.approvedBy, undefined),
    approvedAt: stringValue(record.approvedAt, undefined),
    approvalComments: stringValue(record.approvalComments, undefined),
    updatedAt: stringValue(record.updatedAt, nowIso()),
  };
}

function normalizeDesignProposalRevision(value: unknown): StoredDesignProposalRevision | undefined {
  const record = objectRecord(value);
  if (!record || Number(record.schemaVersion) !== 1) return undefined;
  // Design revisions are generated atomically by compileDesignProposal. Preserve
  // the versioned payload here; the compiler owns its schema and defaults.
  return record as unknown as StoredDesignProposalRevision;
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
        assetId: typeof record.assetId === "string" ? record.assetId : undefined,
        renderSrc: typeof record.renderSrc === "string" ? record.renderSrc : undefined,
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

export function normalizeRequirementRecords(value: unknown): StoredRequirementRecord[] {
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
    nextRoute: normalizedWorkflowRoute(record.nextRoute, routeCatalogByKey.projects.path),
    updatedAt: stringValue(record.updatedAt, nowIso()),
  };
}

export function decodeStoredProject(value: unknown): StoredProject | null {
  const record = objectRecord(value);
  if (!record) return null;

  const updatedAt = stringValue(record.updatedAt || record.createdAt, nowIso());
  const project: StoredProject = {
    ...(record as Partial<StoredProject>),
    id: stringValue(record.id, createId("stored-project")),
    name: stringValue(record.name || record.roomName, "Untitled Project"),
    owner: stringValue(record.owner || record.customer, "Wingman user"),
    ownerId: stringValue(record.ownerId, undefined),
    stage: normalizedStage(record.stage),
    status: statusVariant(record.status),
    updated: stringValue(record.updated, "Synced"),
    resumeTo: normalizedWorkflowRoute(record.resumeTo, routeCatalogByKey.discovery.path),
    createdAt: stringValue(record.createdAt, updatedAt),
    updatedAt,
  };

  // The compatibility spread preserves fields whose codecs do not yet own
  // (for example versioned proposal payloads). Fields owned below must start
  // clean so malformed legacy containers cannot leak through when their
  // normalizer returns no value.
  delete project.discoveryBrief;
  delete project.productSelections;
  delete project.omittedProductSkus;
  delete project.ingest;
  delete project.compareHistoryView;
  delete project.compareRuns;
  delete project.proposal;
  delete project.requirements;
  delete project.recommendationEvidence;
  delete project.feedback;
  delete project.workflow;
  delete project.videowall;
  delete project.visualAssets;
  delete project.auditTrail;
  delete project.syncConflict;

  if (record.isDemo === true) project.isDemo = true;

  const discoveryBrief = normalizeDiscoveryBrief(record.discoveryBrief);
  if (discoveryBrief) project.discoveryBrief = discoveryBrief;

  const productSelections = normalizeProductSelections(record.productSelections);
  if (productSelections.length) project.productSelections = productSelections;
  const omittedProductSkus = stringArray(record.omittedProductSkus)
    .map((sku) => sku.trim().toUpperCase())
    .filter(Boolean);
  if (omittedProductSkus.length) project.omittedProductSkus = omittedProductSkus;

  const ingest = normalizeIngestAnalysis(record.ingest);
  if (ingest) project.ingest = ingest;

  const compareHistoryView = objectRecord(record.compareHistoryView);
  if (compareHistoryView) project.compareHistoryView = {
    search: stringValue(compareHistoryView.search, undefined),
    filter: stringValue(compareHistoryView.filter, undefined),
    sort: stringValue(compareHistoryView.sort, undefined),
  };

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

  const videowall = normalizeVideowallSummary(record.videowall);
  if (videowall) project.videowall = videowall;

  const visualAssets = normalizeProposalVisualAssets(record.visualAssets, project.id);
  if (visualAssets.length) project.visualAssets = visualAssets;

  const auditTrail = normalizeAuditTrail(record.auditTrail);
  if (auditTrail.length) project.auditTrail = auditTrail;

  const syncConflict = normalizeSyncConflict(record.syncConflict);
  if (syncConflict) project.syncConflict = syncConflict;
  else delete project.syncConflict;

  return project;
}

function normalizeAuditTrail(value: unknown): ProjectAuditEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: stringValue(item.id, `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
      action: stringValue(item.action, "updated"),
      detail: stringValue(item.detail, "Activity recorded."),
      actorName: stringValue(item.actorName, "Wingman"),
      actorEmail: stringValue(item.actorEmail, undefined),
      scope: stringValue(item.scope, "project"),
      severity: ["info", "warn", "error"].includes(String(item.severity)) ? String(item.severity) as "info" : "info",
      createdAt: stringValue(item.createdAt, nowIso()),
    }))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function normalizeProposalVisualAssets(value: unknown, projectId: string): ProposalVisualAsset[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = objectRecord(item);
    const render = objectRecord(record?.render);
    if (!record || !render) return [];
    const kind = ["block-diagram", "technical-schematic", "room-concept"].includes(String(record.kind))
      ? record.kind as ProposalVisualKind
      : "block-diagram";
    return [{
      id: stringValue(record.id, createId("proposal-visual")),
      projectId,
      kind,
      title: stringValue(record.title, "Proposal visual"),
      purpose: (["proposal", "customer-explanation", "technical-review", "handover"].includes(String(record.purpose))
        ? record.purpose : "proposal") as ProposalVisualPurpose,
      status: (["draft", "review-required", "approved"].includes(String(record.status))
        ? record.status : "draft") as ProposalVisualStatus,
      revision: Math.max(1, Number(record.revision) || 1),
      source: objectRecord(record.source) as ProposalVisualAsset["source"] ?? { productSkus: [] },
      model: objectRecord(record.model) ?? undefined,
      connections: Array.isArray(record.connections) ? record.connections as ProposalVisualConnection[] : undefined,
      render: {
        svg: typeof render.svg === "string" ? render.svg : undefined,
        pngDataUrl: typeof render.pngDataUrl === "string" ? render.pngDataUrl : undefined,
        thumbnailDataUrl: typeof render.thumbnailDataUrl === "string" ? render.thumbnailDataUrl : undefined,
        width: Number(render.width) || 1600,
        height: Number(render.height) || 900,
      },
      caption: stringValue(record.caption),
      assumptions: Array.isArray(record.assumptions) ? record.assumptions.map(String) : [],
      warnings: Array.isArray(record.warnings) ? record.warnings.map(String) : [],
      createdAt: stringValue(record.createdAt, nowIso()),
      updatedAt: stringValue(record.updatedAt, nowIso()),
    }];
  });
}

function normalizeVideowallSummary(value: unknown): StoredVideowallSummary | null {
  const record = objectRecord(value);
  if (!record) return null;

  return {
    savedAt: stringValue(record.savedAt, nowIso()),
    wallType: stringValue(record.wallType),
    summary: objectRecord(record.summary) ?? {},
  };
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
    ...(record.isDemo === true ? { isDemo: true } : {}),
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

function normalizeSyncConflict(value: unknown): StoredProjectSyncConflict | undefined {
  const record = objectRecord(value);
  if (!record) return undefined;
  const fields = Array.isArray(record.fields)
    ? Array.from(new Set(record.fields.map((field) => stringValue(field)).filter(Boolean))).slice(0, 20)
    : [];
  if (!fields.length) return undefined;
  return { fields, detectedAt: stringValue(record.detectedAt, nowIso()) };
}

export function decodeProjectStore(value: unknown): ProjectStoreSnapshot {
  const candidate = objectRecord(value) as Partial<ProjectStoreSnapshot> | null;
  const projects = Array.isArray(candidate?.projects)
    ? candidate.projects.map(decodeStoredProject).filter((project): project is StoredProject => Boolean(project))
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
