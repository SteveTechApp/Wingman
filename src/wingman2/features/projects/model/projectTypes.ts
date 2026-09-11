import type { MultiSkuCompetitorAnalysis } from "../../../lib/documentIngest/multiSkuCompetitorIngest";
import type { ProjectTopology } from "../../../lib/projectTopology";
import type { StatusVariant } from "../../../types";
import type { DiscoveryEvidence, ProjectEvidenceFoundation } from "../../../types/productTruth";

export type ProjectStage =
  | "Discovery"
  | "Competitor Compare"
  | "Proposal Builder"
  | "Recommendations"
  | "Templates"
  | "Support";

export type StoredProject = {
  id: string;
  name: string;
  owner: string;
  ownerId?: string;
  stage: ProjectStage;
  status: StatusVariant;
  updated: string;
  resumeTo: string;
  createdAt: string;
  updatedAt: string;
  /** True for the built-in starter examples seeded by resetProjectStore(). Never set this on a real project. */
  isDemo?: boolean;
  discoveryBrief?: StoredDiscoveryBrief;
  productSelections?: StoredProductSelection[];
  /** SKUs deliberately removed by the user; automatic rebuilds must honour this list. */
  omittedProductSkus?: string[];
  ingest?: StoredIngestAnalysis;
  compareRuns?: StoredCompareRun[];
  compareHistoryView?: { search?: string; filter?: string; sort?: string };
  proposal?: StoredProjectProposal;
  proposalVersions?: StoredProposalVersion[];
  requirements?: StoredRequirementRecord[];
  recommendationEvidence?: StoredRecommendationEvidence;
  feedback?: StoredRecommendationFeedback[];
  dealOutcome?: "won" | "lost" | "deferred" | "";
  dealOutcomeWhy?: string;
  workflow?: StoredWorkflowState;
  videowall?: StoredVideowallSummary;
  evidenceFoundation?: ProjectEvidenceFoundation;
  visualAssets?: ProposalVisualAsset[];
  auditTrail?: ProjectAuditEntry[];
  /**
   * Server-owned per-project revision counter (ADR-0001 Phase 2). The backend
   * returns it on every sync/hydration; the client echoes it back as
   * baseRevision so the server's merge can tell stale writes apart and resolve
   * same-field concurrent edits deterministically instead of by arrival order.
   */
  syncRevision?: number;
  /**
   * Set by the sync-response handler whenever the merged server document
   * differs from the document this browser SENT on a lane the server merge
   * arbitrates: another team member's accepted changes (or our edit losing a
   * same-item tie) reached the row without this copy. `fields` names the
   * changed lanes; cleared on the first sync response whose merged content
   * matches our local copy. Never sent to the backend.
   */
  syncConflict?: StoredProjectSyncConflict;
};

export type StoredProjectSyncConflict = {
  /** Lane keys whose server-accepted content differs from our local copy. */
  fields: string[];
  /** When the conflict was last detected by a sync response. */
  detectedAt: string;
};

export type ProjectAuditEntry = {
  id: string;
  action: string;
  detail: string;
  actorName: string;
  actorEmail?: string;
  scope: string;
  severity: "info" | "warn" | "error";
  createdAt: string;
};

// One row of the discovery Q&A trail carried into the brief and, from there,
// into exported proposals so customers can see the conversation behind the
// design: the question asked, the closest governed answer, and the customer's
// own captured wording (which may differ from the governed label).
// `confirmed` records whether the rep verified this answer with the customer;
// only confirmed rows are presented as settled facts in exported documents.
// Optional so pre-existing stored rows (and test fixtures) keep loading.
export type DiscoveryConversationItem = {
  stepId: string;
  question: string;
  answer: string;
  note: string;
  confirmed?: boolean;
  /**
   * Capture confidence carried from the suggestion chip: "high" (score >= 5),
   * "matched" (score 3-4), or "low" (partial keyword-only hit). Low rows are
   * flagged for re-verification before export.
   */
  confidence?: "high" | "matched" | "low";
  /**
   * The raw interpretation match score behind the tier: 1 for a weak
   * keyword-only hit up to 5+ for a strong curated-phrase or exclusive
   * negative. Recorded so exports can show the trust level behind each
   * you-said → matched pair. Deliberate option picks are stamped high (10).
   */
  confidenceScore?: number;
};

export type StoredDiscoveryBrief = {
  savedAt?: string;
  roomModel?: Record<string, unknown>;
  topology?: ProjectTopology;
  inference?: Record<string, unknown>;
  capturedPercent?: number;
  returnRoute?: string;
  missingInformation?: string[];
  nextBestQuestion?: string;
  /** Zero-based question index the guided interview's review mode was left on, so re-entering review resumes there instead of question one. */
  reviewPosition?: number;
  quoteSafetyStatus?: StoredQuoteSafetyStatus;
  recommendationEvidence?: StoredRecommendationEvidence;
  /** Field-level provenance used to prevent inferred or unknown requirements being presented as confirmed. */
  decisionEvidence?: Array<{
    field: string;
    value: string;
    state: "confirmed" | "inferred" | "unknown" | "conflict";
    source: "customer" | "topology" | "workflow-inference" | "system";
    confidence: "high" | "medium" | "low";
    reason?: string;
  }>;
  decisionIntegrity?: {
    status: "confirmed" | "inferred" | "review" | "conflict";
    unknownCount: number;
    inferredCount: number;
    conflictCount: number;
    canQuote: boolean;
  };
  structuredEvidence?: DiscoveryEvidence;
  discoveryConversation?: DiscoveryConversationItem[];
};

export type StoredProductSelection = {
  sku: string;
  /** Quantity captured by the workflow slot that selected this product. */
  quantity?: number;
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

export type StoredIngestVisualAttachment = {
  id: string;
  fileName: string;
  kind: "room_photo" | "schematic_diagram" | "unclear";
  summary: string;
  roomObservations: string[];
  visibleEquipment: string[];
  layoutNotes: string[];
  confidence: number;
  analyzedAt: string;
};

export type StoredIngestAnalysis = {
  requirements: string[];
  unknowns: string[];
  skippedFiles: string[];
  files: string[];
  multiSkuIntelligence?: MultiSkuCompetitorAnalysis;
  visualContext?: StoredIngestVisualAttachment[];
  updatedAt: string;
};

export type StoredCompareRun = {
  id: string;
  createdAt: string;
  /** Sequential snapshot number for repeated saves of the same comparison. */
  version?: number;
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
  verification?: StoredProposalVerification;
  applicationProposal?: StoredApplicationProposal;
  companyName?: string;
  preparedBy?: string;
  proposalFooter?: string;
  companyLogoDataUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  discoveryConversation?: DiscoveryConversationItem[];
  updatedAt: string;
  /** Approval workflow — managers review before customer issue. */
  approvalStatus?: ProposalApprovalStatus;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalComments?: string;
  /** Canonical, project-owned design revision used by review and every customer output. */
  designRevision?: StoredDesignProposalRevision;
  /** Hash of the exact canonical revision submitted for approval. */
  submittedRevisionHash?: string;
  /** Hash of the exact canonical revision approved for customer issue. */
  approvedRevisionHash?: string;
};

export type DesignRequirementState = "confirmed" | "inferred" | "unknown" | "conflict";

export type StoredDesignRequirementTrace = {
  id: string;
  customerStatement: string;
  interpretation: string;
  designConsequence: string;
  source: string;
  state: DesignRequirementState;
  confidence: "high" | "medium" | "low";
};

export type StoredDesignRoleCoverage = {
  role: "source" | "processing" | "transport" | "destination" | "network" | "usb" | "audio" | "control" | "power";
  label: string;
  required: boolean;
  covered: boolean;
  evidence: string[];
  requirementIds: string[];
};

export type StoredDesignProductOverview = {
  sku: string;
  name: string;
  quantity: number;
  designRole: string;
  requirementIds: string[];
  reason: string;
  proof: string[];
  dependencies: string[];
  validation: string[];
};

export type StoredDesignProposalRevision = {
  schemaVersion: 1;
  revisionId: string;
  contentHash: string;
  projectId: string;
  projectName: string;
  compiledAt: string;
  customerRequirement: string;
  interpretedRequirement: string;
  architecture: string;
  requirements: StoredDesignRequirementTrace[];
  roleCoverage: StoredDesignRoleCoverage[];
  productOverviews: StoredDesignProductOverview[];
  assumptions: string[];
  blockers: string[];
  warnings: string[];
  canIssue: boolean;
};

/** A snapshot of the proposal at a point in time, for version history. */
export type StoredProposalVersion = {
  id: string;
  versionNumber: number;
  savedAt: string;
  label: string;
  proposal: StoredProjectProposal;
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

export type ProposalApprovalStatus = "draft" | "pending" | "approved" | "rejected";

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
  assetId?: string;
  renderSrc?: string;
};

export type ProposalVisualKind = "block-diagram" | "technical-schematic" | "room-concept";
export type ProposalVisualPurpose = "proposal" | "customer-explanation" | "technical-review" | "handover";
export type ProposalVisualStatus = "draft" | "review-required" | "approved";

export type ProposalVisualConnection = {
  id: string;
  fromNodeId: string;
  fromPortId?: string;
  toNodeId: string;
  toPortId?: string;
  signal: "video" | "audio" | "control" | "network" | "usb" | "power";
  transport: string;
  cableId?: string;
  cableSpecification?: string;
  estimatedLengthM?: number;
  route: Array<{ x: number; y: number }>;
  status: "confirmed" | "assumed" | "by-others" | "review";
};

export type ProposalVisualAsset = {
  id: string;
  projectId: string;
  kind: ProposalVisualKind;
  title: string;
  purpose: ProposalVisualPurpose;
  status: ProposalVisualStatus;
  revision: number;
  source: { projectRevision?: string; productSkus: string[]; templateId?: string };
  model?: Record<string, unknown>;
  connections?: ProposalVisualConnection[];
  render: { svg?: string; pngDataUrl?: string; thumbnailDataUrl?: string; width: number; height: number };
  caption: string;
  assumptions: string[];
  warnings: string[];
  createdAt: string;
  updatedAt: string;
};

export type StoredProposalVerification = {
  status: "VERIFIED" | "NOT VERIFIED";
  baselineVersion?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  sourceTemplateId?: string;
  acknowledged: boolean;
  summary: string;
  issues: string[];
};

export type StoredApplicationProposalBenefit = {
  title: string;
  detail: string;
};

export type StoredApplicationProposalVisualBrief = {
  title: string;
  purpose: string;
};

export type StoredProposalProductSpecification = {
  sku: string;
  name: string;
  role: string;
  quantity: number;
  summary: string;
  keyFeatures: string[];
  validation: string[];
};

export type StoredProposalScopeItem = {
  category: string;
  description: string;
  responsibility: string;
  status: "included" | "allowance" | "by-others" | "validate";
  quantity: number;
  notes: string;
};

export type StoredApplicationProposal = {
  vertical: string;
  application: string;
  executiveSummary: string;
  customerNeed: string;
  solutionOverview: string;
  benefits: StoredApplicationProposalBenefit[];
  userJourney: string[];
  technicalFacts: string[];
  architectureDiagram: string;
  acceptanceCriteria: string[];
  visualBriefs: StoredApplicationProposalVisualBrief[];
  verifiedDesignParameters: string[];
  deploymentConditions: string[];
  marketStory?: string;
  roomVisualUrl?: string;
  productSpecifications?: StoredProposalProductSpecification[];
  thirdPartyScope?: StoredProposalScopeItem[];
};

export type StoredWorkflowState = {
  source: string;
  lastStep: string;
  nextRoute: string;
  updatedAt: string;
};

export type StoredVideowallSummary = {
  savedAt: string;
  wallType: string;
  summary: Record<string, unknown>;
};

export type StoredProposalDraft = {
  id: string;
  name: string;
  customer: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  /** True for the built-in starter examples seeded by resetProjectStore(). Never set this on a real draft. */
  isDemo?: boolean;
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

export type LocalProjectStorageMode = {
  kind: "local";
  reason: "server" | "sync-disabled" | "missing-auth" | "remote-rejected";
};

export type RemoteProjectStorageMode = {
  kind: "remote";
  authToken?: string;
  authSource: "storage-token" | "http-only-cookie";
};

export type ProjectStorageMode = LocalProjectStorageMode | RemoteProjectStorageMode;

export type StoredRecommendationFeedback = {
  id: string;
  createdAt: string;
  scope: "recommendation" | "bom" | "proposal" | "compare";
  rating: "accepted" | "needs-review" | "missing-accessory" | "wrong-fit";
  label: string;
  note?: string;
  sku?: string;
};
