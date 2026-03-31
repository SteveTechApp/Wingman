import {
  createDeploymentProjectAttachment,
  createDeploymentProjectComment,
  createDeploymentProjectShare,
  fetchDeploymentProjects,
  markDeploymentProjectCommercialReady,
  syncDeploymentProjects,
  type DeploymentSession,
  type ProjectAttachmentInput,
  type ProjectAuditEntry,
  type ProjectCommentInput,
  type ProjectShareInput,
} from "@/app/api/wingmanDeploymentClient";
import type { ProjectRecommendationGovernance } from "@/features/governance/recommendationGovernance";
import {
  buildCustomerSafeSummary,
  type CustomerSummarySnapshot,
} from "@/features/projects/customerSummary";
import {
  RECENT_TEXT_HISTORY_KEYS,
  rememberRecentTextEntry,
} from "@/features/inputs/recentTextEntries";
import type { ProjectDevice } from "@/features/systemDesign/designTypes";

export type DiscoveryProductFamily =
  | "Apollo"
  | "HDBaseT"
  | "AVoIP"
  | "Matrix"
  | "USB Extension"
  | "Video Wall";

export type ProjectTemplateTier = "Bronze" | "Silver" | "Gold";
export type VideoWallTechnology = "LCD" | "LED";
export type CompareConfidence = "High" | "Medium" | "Low";

export type ProjectTemplateContext = {
  market: string;
  application: string;
  tier: ProjectTemplateTier;
  templateId?: string;
  summary?: string;
  solutionSummary?: string;
  recommendedFamilies?: DiscoveryProductFamily[];
  assumptions?: string[];
  includedSystems?: string[];
  uplift?: string[];
  nextTool?: string;
  starterDevices?: ProjectDevice[];
  createdAt?: string;
};

export type ProjectVideoWall = {
  technology: VideoWallTechnology;
  designTier?: ProjectTemplateTier;
  wallGoal?: "single" | "grid" | "pip" | "custom";
  buildMethod?: "tile-mode" | "per-display";
  multiviewStyle?: "equal-tiles" | "floating-windows" | "fixed-windows";
  pathMode?: "auto" | "local-processor" | "networkhd-120" | "networkhd-500" | "sdvoe-600";
  performancePriority?: "auto" | "low-bandwidth" | "low-latency" | "best-image";
  sourceProfile?: "player" | "matrix-feed" | "direct-hdmi" | "camera" | "mixed";
  sourceLandingStyle?: "standard" | "wallplate";
  requiresDanteAudio?: boolean;
  requiresUsbKvmLink?: boolean;
  rows: number;
  cols: number;
  widthM: number;
  heightM: number;
  diagonalIn: number;
  pixelPitchMm?: number;
  panelDiagonalIn?: number;
  bezelMm?: number;
  viewingDistanceM?: number;
  sourceCount?: number;
  outputRows?: number;
  outputCols?: number;
  panelCount?: number;
  cabinetRows?: number;
  cabinetCols?: number;
  canvasWidthPx?: number;
  canvasHeightPx?: number;
  ledTechnologyProfileId?: string;
  ledProcessorProfileId?: string;
  ledProcessorMaxPixels?: number;
  ledProcessorMaxWidthPx?: number;
  ledProcessorMaxHeightPx?: number;
  ledProcessorMaxInputs?: number;
  ledProcessorMaxWindows?: number;
  ledProcessorMode?: "single-source" | "multiview";
  ledScreenClass?: "modular" | "all-in-one-96-120";
  lcdDriveStrategy?: "decoder-per-screen" | "tile-loop-multiview" | "dedicated-processor";
  contentAspectRatio?: string;
  distortionRiskScore?: number;
  distortionRiskLevel?: "Low" | "Medium" | "High";
  hardWarnings?: string[];
  recommendedSku?: string;
  recommendedSkuQty?: number;
  recommendedItems?: Array<{
    sku: string;
    quantity: number;
    role?: string;
  }>;
  processorRecommendation?: string;
  mountingNotes?: string[];
  warnings?: string[];
  summary?: string;
  createdAt?: string;
};

export type ProjectCompareRecord = {
  brand: string;
  competitorSku: string;
  category: string;
  summary?: string;
  features?: string[];
  wyrestormSku: string;
  wyrestormName?: string;
  wyrestormCategory?: string;
  wyrestormVerified?: boolean;
  confidence: CompareConfidence;
  rationale?: string;
  recommendedFamilies?: DiscoveryProductFamily[];
  notes?: string[];
  createdAt?: string;
};

export type ProjectDiscoveryInputDetail = {
  sourceType?: string;
  connectionType?: string;
  cableType?: string;
  route?: string;
  sourceLocation?: string;
};

export type ProjectDiscoveryOutputDetail = {
  outputType?: string;
  route?: string;
  displayLocation?: string;
};

export type ProjectDiscovery = {
  customer: string;
  site: string;
  roomName: string;
  workflowTrack?: string;
  projectScope?: string;
  customerOutcome?: string;
  switchSolutionType?: string;
  matrixIoPreset?: string;
  featureRequirements?: string;
  applicationType?: string;
  roomLengthM?: string;
  roomWidthM?: string;
  roomHeightM?: string;
  floorType?: string;
  ceilingType?: string;
  installationPath?: string;
  displayLocation?: string;
  sourceLocation?: string;
  rackLocation?: string;
  sourceToRackDistanceM?: string;
  rackToDisplayDistanceM?: string;
  cableDistanceM?: string;
  transportDistanceBand?: string;
  transportCableType?: string;
  displayCount?: string;
  sourceCount?: string;
  sourceInventory?: string;
  outputBehaviour?: string;
  sourceTypes?: string;
  sourcePlacement?: string;
  sourceConnectionPath?: string;
  sourceConnectionType?: string;
  signalFormats?: string;
  signalHdr?: string;
  sourceCableType?: string;
  displayConnectionPath?: string;
  displayConnectionType?: string;
  displayCableType?: string;
  networkEnvironment?: string;
  usbNeeds?: string;
  usbStandards?: string;
  audioNeeds?: string;
  audioBreakout?: string;
  controlNeeds?: string;
  powerPreference?: string;
  passthroughNeeds?: string;
  budgetBand?: string;
  urgency?: string;
  inputDetails?: ProjectDiscoveryInputDetail[];
  outputDetails?: ProjectDiscoveryOutputDetail[];
  notes?: string;
  recommendedFamilies?: DiscoveryProductFamily[];
  recommendedNextTool?: string;
  createdAt?: string;
};

export type ProjectCatalogBomItem = {
  sku: string;
  quantity: number;
  role: string;
  description: string;
  notes?: string;
};

export type ProjectCatalog = {
  skus?: string[];
  bomItems?: ProjectCatalogBomItem[];
  selectedBrand?: string;
  notes?: string;
};

export type ProjectProposal = {
  selectedTier?: string;
  title?: string;
  notes?: string;
};

export type ProjectComment = {
  id: string;
  body: string;
  audience: "internal" | "customer";
  authorName: string;
  authorEmail?: string;
  createdAt: string;
};

export type ProjectShare = {
  id: string;
  title: string;
  message?: string;
  audience: "internal" | "customer";
  status?: string;
  shareUrl?: string;
  accessCode?: string;
  summaryHeadline?: string;
  createdAt: string;
  createdBy?: string;
};

export type ProjectAttachment = {
  id: string;
  name: string;
  kind: "document" | "diagram" | "brief" | "other";
  source: string;
  summary?: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt: string;
  uploadedBy?: string;
};

export type StoredProject = {
  id: string;
  workspaceId?: string;
  ownerId?: string;
  name: string;
  customer: string;
  site: string;
  roomName: string;
  stage: string;
  status: string;
  notes: string;
  updatedAt: string;
  createdAt: string;
  discovery?: ProjectDiscovery;
  catalog?: ProjectCatalog;
  proposal?: ProjectProposal;
  template?: ProjectTemplateContext;
  videowall?: ProjectVideoWall;
  compare?: ProjectCompareRecord;
  attachments?: ProjectAttachment[];
  comments?: ProjectComment[];
  shares?: ProjectShare[];
  auditTrail?: ProjectAuditEntry[];
  recommendationGovernance?: ProjectRecommendationGovernance;
  customerSummary?: CustomerSummarySnapshot;
};

const STORAGE_KEY_BASE = "wm_projects_v2";
const SEEDED_KEY_BASE = "wm_projects_seeded_v2";
const ACTIVE_PROJECT_ID_KEY_BASE = "wm_active_project_id_v2";
const PROJECTS_TICK_KEY_BASE = "wm_projects_tick_v2";

type Listener = () => void;
const listeners = new Set<Listener>();
let projectsCache: StoredProject[] = [];
let projectsCacheRaw: string | null | undefined;
let projectsCacheSeeded: string | null | undefined;
let deploymentSession: DeploymentSession | null = null;
let remoteHydrationPromise: Promise<void> | null = null;
let remoteSyncTimer: number | null = null;
let remoteSyncRunning = false;
let remoteSnapshotApplying = false;

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {}
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function allowedFamilies(): DiscoveryProductFamily[] {
  return ["Apollo", "HDBaseT", "AVoIP", "Matrix", "USB Extension", "Video Wall"];
}

function storageScope(): string {
  return deploymentSession?.workspace.id || "local";
}

function storageKey(base: string): string {
  return `${base}:${storageScope()}`;
}

function storageProjectKey(): string {
  return storageKey(STORAGE_KEY_BASE);
}

function storageSeededKey(): string {
  return storageKey(SEEDED_KEY_BASE);
}

function storageActiveKey(): string {
  return storageKey(ACTIVE_PROJECT_ID_KEY_BASE);
}

function storageTickKey(): string {
  return storageKey(PROJECTS_TICK_KEY_BASE);
}

function resetCaches(): void {
  projectsCache = [];
  projectsCacheRaw = undefined;
  projectsCacheSeeded = undefined;
}


function resetNewProjectState<T extends Record<string, unknown>>(project: T): T {
  const next = { ...project } as T;
  const mutable = next as Record<string, unknown>;

  if ("matchPercent" in mutable) mutable["matchPercent"] = 0;
  if ("matchScore" in mutable) mutable["matchScore"] = 0;
  if ("score" in mutable && typeof mutable["score"] === "number") mutable["score"] = 0;
  if ("confidenceScore" in mutable) mutable["confidenceScore"] = 0;

  if ("associatedProducts" in mutable) mutable["associatedProducts"] = [];
  if ("recommendedProducts" in mutable) mutable["recommendedProducts"] = [];
  if ("selectedProducts" in mutable) mutable["selectedProducts"] = [];
  if ("products" in mutable && Array.isArray(mutable["products"])) mutable["products"] = [];

  if ("compare" in mutable) mutable["compare"] = undefined;
  if ("compareRecords" in mutable) mutable["compareRecords"] = [];
  if ("proposalLines" in mutable) mutable["proposalLines"] = [];
  if ("productRecommendations" in mutable) mutable["productRecommendations"] = [];
  if ("matchedProducts" in mutable) mutable["matchedProducts"] = [];
  if ("relatedProducts" in mutable) mutable["relatedProducts"] = [];

  return next;
}
function shouldSeedProjects(): boolean {
  return !deploymentSession || deploymentSession.mode === "demo";
}

function currentActorName(): string {
  return deploymentSession?.user.name || deploymentSession?.user.email || "Wingman";
}

function currentActorEmail(): string {
  return deploymentSession?.user.email || "";
}

function rememberProjectTextEntries(projectLike: {
  customer?: string;
  site?: string;
  roomName?: string;
  discovery?: Partial<ProjectDiscovery>;
}): void {
  rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.customer, projectLike.customer ?? projectLike.discovery?.customer ?? "");
  rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.site, projectLike.site ?? projectLike.discovery?.site ?? "");
  rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.roomName, projectLike.roomName ?? projectLike.discovery?.roomName ?? "");
  rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.application, projectLike.discovery?.applicationType ?? "");
}

function canUseBackendPermission(permission: keyof NonNullable<DeploymentSession["permissions"]>): boolean {
  if (!deploymentSession || deploymentSession.mode !== "backend") return true;
  return Boolean(deploymentSession.permissions?.[permission]);
}

function makeAuditEntry(action: string, detail: string, projectId?: string, severity: ProjectAuditEntry["severity"] = "info"): ProjectAuditEntry {
  return {
    id: makeId(),
    scope: "projects",
    action,
    detail,
    actorName: currentActorName(),
    actorEmail: currentActorEmail(),
    severity,
    createdAt: nowIso(),
    projectId,
  };
}

function normalizeRecommendedFamilies(value: unknown): DiscoveryProductFamily[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed = allowedFamilies();
  return value.filter((item): item is DiscoveryProductFamily =>
    typeof item === "string" && allowed.includes(item as DiscoveryProductFamily)
  );
}

function normalizeTemplateDevices(value: unknown): ProjectDevice[] {
  if (!Array.isArray(value)) return [];
  const devices: ProjectDevice[] = [];
  for (const device of value) {
    const item = device as ProjectDevice | undefined;
    const id = String(item?.id ?? "").trim();
    const name = String(item?.name ?? "").trim();
    const role = item?.role;
    if (!id || !name || !role) continue;

    const ports = Array.isArray(item?.ports)
      ? item.ports.flatMap((port) => {
          const portId = String(port?.id ?? "").trim();
          const portName = String(port?.name ?? "").trim();
          if (!portId || !portName || !port?.kind || !port?.direction) return [];
          return [{
            id: portId,
            name: portName,
            kind: port.kind,
            direction: port.direction,
          }];
        })
      : undefined;

    devices.push({
      id,
      name,
      role,
      manufacturer: typeof item?.manufacturer === "string" ? item.manufacturer.trim() : undefined,
      family: typeof item?.family === "string" ? item.family.trim() : undefined,
      sku: typeof item?.sku === "string" ? item.sku.trim().toUpperCase() : undefined,
      location: typeof item?.location === "string" ? item.location.trim() : undefined,
      ports,
    });
  }
  return devices;
}

function normalizeCatalogBomItems(value: unknown): ProjectCatalogBomItem[] {
  if (!Array.isArray(value)) return [];
  const items: ProjectCatalogBomItem[] = [];
  for (const rawItem of value) {
    const item = rawItem as ProjectCatalogBomItem | undefined;
    const sku = String(item?.sku ?? "").trim().toUpperCase();
    const description = String(item?.description ?? "").trim();
    const role = String(item?.role ?? "").trim();
    if (!sku || !description || !role) continue;

    items.push({
      sku,
      quantity: Math.max(1, Number(item?.quantity) || 1),
      role,
      description,
      notes: typeof item?.notes === "string" ? item.notes.trim() : undefined,
    });
  }
  return items;
}

function normalizeDiscovery(discovery?: ProjectDiscovery): ProjectDiscovery | undefined {
  if (!discovery) return undefined;
  return {
    ...discovery,
    customer: discovery.customer ?? "",
    site: discovery.site ?? "",
    roomName: discovery.roomName ?? "",
    workflowTrack: discovery.workflowTrack ?? "",
    projectScope: discovery.projectScope ?? "",
    customerOutcome: discovery.customerOutcome ?? "",
    switchSolutionType: discovery.switchSolutionType ?? "",
    matrixIoPreset: discovery.matrixIoPreset ?? "",
    featureRequirements: discovery.featureRequirements ?? "",
    notes: discovery.notes ?? "",
    floorType: discovery.floorType ?? "",
    ceilingType: discovery.ceilingType ?? "",
    installationPath: discovery.installationPath ?? "",
    transportDistanceBand: discovery.transportDistanceBand ?? "",
    transportCableType: discovery.transportCableType ?? "",
    outputBehaviour: discovery.outputBehaviour ?? "",
    sourceInventory: discovery.sourceInventory ?? "",
    sourceTypes: discovery.sourceTypes ?? "",
    sourcePlacement: discovery.sourcePlacement ?? "",
    sourceConnectionPath: discovery.sourceConnectionPath ?? "",
    sourceConnectionType: discovery.sourceConnectionType ?? "",
    signalFormats: discovery.signalFormats ?? "",
    signalHdr: discovery.signalHdr ?? "",
    sourceCableType: discovery.sourceCableType ?? "",
    displayConnectionPath: discovery.displayConnectionPath ?? "",
    displayConnectionType: discovery.displayConnectionType ?? "",
    displayCableType: discovery.displayCableType ?? "",
    networkEnvironment: discovery.networkEnvironment ?? "",
    audioBreakout: discovery.audioBreakout ?? "",
    powerPreference: discovery.powerPreference ?? "",
    passthroughNeeds: discovery.passthroughNeeds ?? "",
    usbStandards: discovery.usbStandards ?? "",
    inputDetails: Array.isArray(discovery.inputDetails)
      ? discovery.inputDetails.map((detail) => ({
          sourceType: detail?.sourceType ?? "",
          connectionType: detail?.connectionType ?? "",
          cableType: detail?.cableType ?? "",
          route: detail?.route ?? "",
          sourceLocation: detail?.sourceLocation ?? "",
        }))
      : [],
    outputDetails: Array.isArray(discovery.outputDetails)
      ? discovery.outputDetails.map((detail) => ({
          outputType: detail?.outputType ?? "",
          route: detail?.route ?? "",
          displayLocation: detail?.displayLocation ?? "",
        }))
      : [],
    recommendedFamilies: normalizeRecommendedFamilies(discovery.recommendedFamilies),
  };
}

function normalizeTemplate(template?: ProjectTemplateContext): ProjectTemplateContext | undefined {
  if (!template) return undefined;
  return {
    ...template,
    templateId: typeof template.templateId === "string" ? template.templateId.trim() : undefined,
    market: template.market ?? "",
    application: template.application ?? "",
    tier: template.tier ?? "Bronze",
    summary: typeof template.summary === "string" ? template.summary.trim() : undefined,
    solutionSummary: typeof template.solutionSummary === "string" ? template.solutionSummary.trim() : undefined,
    recommendedFamilies: normalizeRecommendedFamilies(template.recommendedFamilies),
    assumptions: Array.isArray(template.assumptions) ? template.assumptions.filter((x): x is string => typeof x === "string") : [],
    includedSystems: Array.isArray(template.includedSystems)
      ? template.includedSystems.filter((x): x is string => typeof x === "string")
      : [],
    uplift: Array.isArray(template.uplift) ? template.uplift.filter((x): x is string => typeof x === "string") : [],
    nextTool: typeof template.nextTool === "string" ? template.nextTool.trim() : undefined,
    starterDevices: normalizeTemplateDevices(template.starterDevices),
  };
}

function normalizeCatalog(catalog?: ProjectCatalog): ProjectCatalog | undefined {
  if (!catalog) return undefined;
  const skus = Array.isArray(catalog.skus)
    ? catalog.skus
        .map((item) => String(item ?? "").trim().toUpperCase())
        .filter(Boolean)
    : [];

  return {
    skus,
    bomItems: normalizeCatalogBomItems(catalog.bomItems),
    selectedBrand: typeof catalog.selectedBrand === "string" ? catalog.selectedBrand.trim() : undefined,
    notes: typeof catalog.notes === "string" ? catalog.notes.trim() : undefined,
  };
}

function normalizeVideoWall(videowall?: ProjectVideoWall): ProjectVideoWall | undefined {
  if (!videowall) return undefined;
  const normalizedRecommendedItems = Array.isArray(videowall.recommendedItems)
    ? videowall.recommendedItems
        .map((item) => ({
          sku: String(item?.sku ?? "").trim().toUpperCase(),
          quantity: Math.max(1, Number(item?.quantity) || 1),
          role: typeof item?.role === "string" ? item.role.trim() : undefined,
        }))
        .filter((item) => item.sku.length > 0)
    : [];

  return {
    ...videowall,
    technology: videowall.technology ?? "LCD",
    designTier:
      videowall.designTier === "Bronze" ||
      videowall.designTier === "Silver" ||
      videowall.designTier === "Gold"
        ? videowall.designTier
        : undefined,
    wallGoal:
      videowall.wallGoal === "single" ||
      videowall.wallGoal === "grid" ||
      videowall.wallGoal === "pip" ||
      videowall.wallGoal === "custom"
        ? videowall.wallGoal
        : undefined,
    buildMethod:
      videowall.buildMethod === "tile-mode" || videowall.buildMethod === "per-display"
        ? videowall.buildMethod
        : undefined,
    multiviewStyle:
      videowall.multiviewStyle === "equal-tiles" ||
      videowall.multiviewStyle === "floating-windows" ||
      videowall.multiviewStyle === "fixed-windows"
        ? videowall.multiviewStyle
        : undefined,
    pathMode:
      videowall.pathMode === "auto" ||
      videowall.pathMode === "local-processor" ||
      videowall.pathMode === "networkhd-120" ||
      videowall.pathMode === "networkhd-500" ||
      videowall.pathMode === "sdvoe-600"
        ? videowall.pathMode
        : undefined,
    performancePriority:
      videowall.performancePriority === "auto" ||
      videowall.performancePriority === "low-bandwidth" ||
      videowall.performancePriority === "low-latency" ||
      videowall.performancePriority === "best-image"
        ? videowall.performancePriority
        : undefined,
    sourceProfile:
      videowall.sourceProfile === "player" ||
      videowall.sourceProfile === "matrix-feed" ||
      videowall.sourceProfile === "direct-hdmi" ||
      videowall.sourceProfile === "camera" ||
      videowall.sourceProfile === "mixed"
        ? videowall.sourceProfile
        : undefined,
    sourceLandingStyle:
      videowall.sourceLandingStyle === "standard" ||
      videowall.sourceLandingStyle === "wallplate"
        ? videowall.sourceLandingStyle
        : undefined,
    requiresDanteAudio:
      typeof videowall.requiresDanteAudio === "boolean"
        ? videowall.requiresDanteAudio
        : undefined,
    requiresUsbKvmLink:
      typeof videowall.requiresUsbKvmLink === "boolean"
        ? videowall.requiresUsbKvmLink
        : undefined,
    rows: Number(videowall.rows) || 1,
    cols: Number(videowall.cols) || 1,
    widthM: Number(videowall.widthM) || 0,
    heightM: Number(videowall.heightM) || 0,
    diagonalIn: Number(videowall.diagonalIn) || 0,
    pixelPitchMm: videowall.pixelPitchMm != null ? Number(videowall.pixelPitchMm) : undefined,
    panelDiagonalIn: videowall.panelDiagonalIn != null ? Number(videowall.panelDiagonalIn) : undefined,
    bezelMm: videowall.bezelMm != null ? Number(videowall.bezelMm) : undefined,
    viewingDistanceM: videowall.viewingDistanceM != null ? Number(videowall.viewingDistanceM) : undefined,
    sourceCount: videowall.sourceCount != null ? Number(videowall.sourceCount) : undefined,
    outputRows: videowall.outputRows != null ? Number(videowall.outputRows) : undefined,
    outputCols: videowall.outputCols != null ? Number(videowall.outputCols) : undefined,
    panelCount: videowall.panelCount != null ? Number(videowall.panelCount) : undefined,
    cabinetRows: videowall.cabinetRows != null ? Number(videowall.cabinetRows) : undefined,
    cabinetCols: videowall.cabinetCols != null ? Number(videowall.cabinetCols) : undefined,
    canvasWidthPx: videowall.canvasWidthPx != null ? Number(videowall.canvasWidthPx) : undefined,
    canvasHeightPx: videowall.canvasHeightPx != null ? Number(videowall.canvasHeightPx) : undefined,
    ledTechnologyProfileId: typeof videowall.ledTechnologyProfileId === "string" ? videowall.ledTechnologyProfileId : undefined,
    ledProcessorProfileId: typeof videowall.ledProcessorProfileId === "string" ? videowall.ledProcessorProfileId : undefined,
    ledProcessorMaxPixels: videowall.ledProcessorMaxPixels != null ? Number(videowall.ledProcessorMaxPixels) : undefined,
    ledProcessorMaxWidthPx: videowall.ledProcessorMaxWidthPx != null ? Number(videowall.ledProcessorMaxWidthPx) : undefined,
    ledProcessorMaxHeightPx: videowall.ledProcessorMaxHeightPx != null ? Number(videowall.ledProcessorMaxHeightPx) : undefined,
    ledProcessorMaxInputs: videowall.ledProcessorMaxInputs != null ? Number(videowall.ledProcessorMaxInputs) : undefined,
    ledProcessorMaxWindows: videowall.ledProcessorMaxWindows != null ? Number(videowall.ledProcessorMaxWindows) : undefined,
    ledProcessorMode: videowall.ledProcessorMode,
    ledScreenClass: videowall.ledScreenClass,
    lcdDriveStrategy: videowall.lcdDriveStrategy,
    contentAspectRatio: typeof videowall.contentAspectRatio === "string" ? videowall.contentAspectRatio : undefined,
    distortionRiskScore: videowall.distortionRiskScore != null ? Number(videowall.distortionRiskScore) : undefined,
    distortionRiskLevel: videowall.distortionRiskLevel,
    hardWarnings: Array.isArray(videowall.hardWarnings) ? videowall.hardWarnings.filter((x): x is string => typeof x === "string") : [],
    recommendedSku: typeof videowall.recommendedSku === "string" ? videowall.recommendedSku : undefined,
    recommendedSkuQty: videowall.recommendedSkuQty != null ? Number(videowall.recommendedSkuQty) : undefined,
    recommendedItems: normalizedRecommendedItems,
    mountingNotes: Array.isArray(videowall.mountingNotes) ? videowall.mountingNotes.filter((x): x is string => typeof x === "string") : [],
    warnings: Array.isArray(videowall.warnings) ? videowall.warnings.filter((x): x is string => typeof x === "string") : [],
  };
}

function normalizeCompare(compare?: ProjectCompareRecord): ProjectCompareRecord | undefined {
  if (!compare) return undefined;
  return {
    ...compare,
    brand: compare.brand ?? "",
    competitorSku: compare.competitorSku ?? "",
    category: compare.category ?? "",
    wyrestormSku: compare.wyrestormSku ?? "",
    wyrestormName: typeof compare.wyrestormName === "string" ? compare.wyrestormName : undefined,
    wyrestormVerified: typeof compare.wyrestormVerified === "boolean" ? compare.wyrestormVerified : undefined,
    confidence: compare.confidence ?? "Medium",
    features: Array.isArray(compare.features) ? compare.features.filter((x): x is string => typeof x === "string") : [],
    notes: Array.isArray(compare.notes) ? compare.notes.filter((x): x is string => typeof x === "string") : [],
    recommendedFamilies: normalizeRecommendedFamilies(compare.recommendedFamilies),
  };
}

function normalizeComments(comments?: ProjectComment[]): ProjectComment[] {
  if (!Array.isArray(comments)) return [];
  return comments
    .map((comment) => ({
      id: String(comment?.id ?? makeId()),
      body: String(comment?.body ?? "").trim(),
      audience: (comment?.audience === "customer" ? "customer" : "internal") as "customer" | "internal",
      authorName: String(comment?.authorName ?? "Wingman user").trim(),
      authorEmail: typeof comment?.authorEmail === "string" ? comment.authorEmail.trim() : undefined,
      createdAt: typeof comment?.createdAt === "string" ? comment.createdAt : nowIso(),
    }))
    .filter((comment) => comment.body);
}

function normalizeShares(shares?: ProjectShare[]): ProjectShare[] {
  if (!Array.isArray(shares)) return [];
  return shares.map((share) => ({
    id: String(share?.id ?? makeId()),
    title: String(share?.title ?? "Customer share pack").trim(),
    message: typeof share?.message === "string" ? share.message.trim() : undefined,
    audience: share?.audience === "internal" ? "internal" : "customer",
    status: typeof share?.status === "string" ? share.status.trim() : undefined,
    shareUrl: typeof share?.shareUrl === "string" ? share.shareUrl.trim() : undefined,
    accessCode: typeof share?.accessCode === "string" ? share.accessCode.trim() : undefined,
    summaryHeadline: typeof share?.summaryHeadline === "string" ? share.summaryHeadline.trim() : undefined,
    createdAt: typeof share?.createdAt === "string" ? share.createdAt : nowIso(),
    createdBy: typeof share?.createdBy === "string" ? share.createdBy.trim() : undefined,
  }));
}

function normalizeAttachments(attachments?: ProjectAttachment[]): ProjectAttachment[] {
  if (!Array.isArray(attachments)) return [];
  return attachments.map((attachment) => ({
    id: String(attachment?.id ?? makeId()),
    name: String(attachment?.name ?? "Imported asset").trim(),
    kind: attachment?.kind === "document" || attachment?.kind === "diagram" || attachment?.kind === "brief"
      ? attachment.kind
      : "other",
    source: String(attachment?.source ?? "Wingman").trim(),
    summary: typeof attachment?.summary === "string" ? attachment.summary.trim() : undefined,
    contentType: typeof attachment?.contentType === "string" ? attachment.contentType.trim() : undefined,
    sizeBytes: attachment?.sizeBytes != null ? Number(attachment.sizeBytes) || undefined : undefined,
    uploadedAt: typeof attachment?.uploadedAt === "string" ? attachment.uploadedAt : nowIso(),
    uploadedBy: typeof attachment?.uploadedBy === "string" ? attachment.uploadedBy.trim() : undefined,
  }));
}

function normalizeAuditTrail(entries?: ProjectAuditEntry[]): ProjectAuditEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => ({
    id: String(entry?.id ?? makeId()),
    scope: String(entry?.scope ?? "projects").trim(),
    action: String(entry?.action ?? "updated").trim(),
    detail: String(entry?.detail ?? "Project activity captured.").trim(),
    actorName: String(entry?.actorName ?? "Wingman").trim(),
    actorEmail: String(entry?.actorEmail ?? "").trim(),
    severity: entry?.severity === "error" || entry?.severity === "warn" ? entry.severity : "info",
    createdAt: typeof entry?.createdAt === "string" ? entry.createdAt : nowIso(),
    projectId: typeof entry?.projectId === "string" ? entry.projectId.trim() : undefined,
  }));
}

function defaultSeed(): StoredProject[] {
  const now = nowIso();
  return [
    {
      id: "p1",
      name: "Boardroom Refresh",
      customer: "Sample customer",
      site: "Banbury HQ",
      roomName: "Boardroom",
      stage: "Discovery",
      status: "Draft",
      notes: "Initial discovery captured. Confirm display sizes, source count, and cable paths.",
      updatedAt: now,
      createdAt: now,
      discovery: {
        customer: "Sample customer",
        site: "Banbury HQ",
        roomName: "Boardroom",
        applicationType: "Meeting Space",
        notes: "Initial discovery captured. Confirm display sizes, source count, and cable paths.",
        recommendedFamilies: ["Apollo", "HDBaseT"],
        createdAt: now,
      },
      catalog: { skus: [], selectedBrand: "WyreStorm" },
      proposal: { selectedTier: "None" },
      comments: [],
      shares: [],
      attachments: [],
      auditTrail: [],
    },
    {
      id: "p2",
      name: "Training Suite Upgrade",
      customer: "Sample customer",
      site: "Training Centre",
      roomName: "Training Suite",
      stage: "Specify",
      status: "Draft",
      notes: "Shortlisted products and accessories. Proposal structure to follow.",
      updatedAt: now,
      createdAt: now,
      discovery: {
        customer: "Sample customer",
        site: "Training Centre",
        roomName: "Training Suite",
        applicationType: "Training Room",
        notes: "Shortlisted products and accessories. Proposal structure to follow.",
        recommendedFamilies: ["AVoIP"],
        createdAt: now,
      },
      catalog: { skus: [], selectedBrand: "WyreStorm" },
      proposal: { selectedTier: "None" },
      comments: [],
      shares: [],
      attachments: [],
      auditTrail: [],
    },
  ];
}

function emit(): void {
  listeners.forEach((listener) => {
    try { listener(); } catch {}
  });
}

function touchProjectsTick(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageTickKey(), nowIso());
  } catch {}
}

function safeParse(value: string | null): StoredProject[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeProject(project: StoredProject): StoredProject {
  const discovery = normalizeDiscovery(project.discovery);
  const template = normalizeTemplate(project.template);
  const videowall = normalizeVideoWall(project.videowall);
  const compare = normalizeCompare(project.compare);
  const catalog = normalizeCatalog(project.catalog);
  return {
    ...project,
    customer: project.customer ?? discovery?.customer ?? "",
    site: project.site ?? discovery?.site ?? "",
    roomName: project.roomName ?? discovery?.roomName ?? "",
    notes: project.notes ?? discovery?.notes ?? "",
    discovery,
    template,
    videowall,
    compare,
    catalog: catalog ?? { skus: [], bomItems: [] },
    proposal: project.proposal,
    attachments: normalizeAttachments(project.attachments),
    comments: normalizeComments(project.comments),
    shares: normalizeShares(project.shares),
    auditTrail: normalizeAuditTrail(project.auditTrail),
    recommendationGovernance: project.recommendationGovernance,
    customerSummary: project.customerSummary,
  };
}

function setActiveProjectIdInternal(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(storageActiveKey(), id);
    else window.localStorage.removeItem(storageActiveKey());
  } catch {}
}

export function getProjectsTick(): string {
  if (typeof window === "undefined") return "server";
  try {
    return window.localStorage.getItem(storageTickKey()) ?? "0";
  } catch {
    return "0";
  }
}

function applyRemoteSnapshot(projects: StoredProject[], activeProjectId: string | null): void {
  if (typeof window === "undefined") return;
  remoteSnapshotApplying = true;
  try {
    const normalized = [...projects]
      .map(normalizeProject)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const raw = JSON.stringify(normalized);
    window.localStorage.setItem(storageProjectKey(), raw);
    window.localStorage.setItem(storageSeededKey(), "1");
    if (activeProjectId) {
      window.localStorage.setItem(storageActiveKey(), activeProjectId);
    } else {
      window.localStorage.removeItem(storageActiveKey());
    }
    projectsCache = normalized;
    projectsCacheRaw = raw;
    projectsCacheSeeded = "1";
    touchProjectsTick();
  } catch {
  } finally {
    remoteSnapshotApplying = false;
  }
}

async function hydrateFromDeployment(): Promise<void> {
  if (typeof window === "undefined" || !deploymentSession || deploymentSession.mode !== "backend" || remoteHydrationPromise) {
    return remoteHydrationPromise ?? Promise.resolve();
  }

  remoteHydrationPromise = (async () => {
    try {
      const response = await fetchDeploymentProjects(deploymentSession);
      if (Array.isArray(response.projects)) {
        applyRemoteSnapshot(response.projects, response.activeProjectId ?? null);
        emit();
      }
    } catch {
    } finally {
      remoteHydrationPromise = null;
    }
  })();

  return remoteHydrationPromise;
}

function scheduleRemoteSync(): void {
  if (
    typeof window === "undefined" ||
    !deploymentSession ||
    deploymentSession.mode !== "backend" ||
    remoteSnapshotApplying
  ) {
    return;
  }

  if (remoteSyncTimer != null) {
    window.clearTimeout(remoteSyncTimer);
  }

  remoteSyncTimer = window.setTimeout(async () => {
    if (!deploymentSession || deploymentSession.mode !== "backend" || remoteSyncRunning) return;
    remoteSyncRunning = true;
    try {
      const response = await syncDeploymentProjects(deploymentSession, {
        projects: loadProjects(),
        activeProjectId: getActiveProjectId(),
      });
      if (Array.isArray(response.projects)) {
        applyRemoteSnapshot(response.projects, response.activeProjectId ?? null);
      }
    } catch {
    } finally {
      remoteSyncRunning = false;
      remoteSyncTimer = null;
      emit();
    }
  }, 120);
}

export function configureProjectStoreSession(session: DeploymentSession | null): void {
  deploymentSession = session;
  resetCaches();
  if (typeof window === "undefined") return;
  void hydrateFromDeployment();
  emit();
}

export function loadProjects(): StoredProject[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageProjectKey());
  const seeded = window.localStorage.getItem(storageSeededKey());

  if (raw === projectsCacheRaw && seeded === projectsCacheSeeded) {
    return projectsCache;
  }

  const existing = safeParse(raw).map(normalizeProject);

  if (existing.length > 0) {
    const sorted = [...existing].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const activeId = getActiveProjectId();
    if (!activeId && sorted[0]) setActiveProjectIdInternal(sorted[0].id);
    projectsCache = sorted;
    projectsCacheRaw = raw;
    projectsCacheSeeded = seeded;
    return sorted;
  }

  if (seeded !== "1" && shouldSeedProjects()) {
    const seed = defaultSeed();
    const rawSeed = JSON.stringify(seed);
    window.localStorage.setItem(storageProjectKey(), rawSeed);
    window.localStorage.setItem(storageSeededKey(), "1");
    if (seed[0]) setActiveProjectIdInternal(seed[0].id);
    touchProjectsTick();
    projectsCache = [...seed].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    projectsCacheRaw = rawSeed;
    projectsCacheSeeded = "1";
    return projectsCache;
  }

  projectsCache = [];
  projectsCacheRaw = raw;
  projectsCacheSeeded = seeded;
  return [];
}

export function saveProjects(projects: StoredProject[]): void {
  if (typeof window === "undefined") return;

  const normalized = [...projects]
    .map(normalizeProject)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const raw = JSON.stringify(normalized);
  window.localStorage.setItem(storageProjectKey(), raw);
  projectsCache = normalized;
  projectsCacheRaw = raw;
  window.localStorage.setItem(storageSeededKey(), "1");
  projectsCacheSeeded = window.localStorage.getItem(storageSeededKey());

  const activeId = getActiveProjectId();
  if (activeId && !normalized.some((p) => p.id === activeId)) {
    setActiveProjectIdInternal(normalized[0]?.id ?? null);
  } else if (!activeId && normalized[0]) {
    setActiveProjectIdInternal(normalized[0].id);
  }

  touchProjectsTick();
  emit();
  scheduleRemoteSync();
}

export function subscribeProjects(listener: Listener): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (
      event.key === storageProjectKey() ||
      event.key === storageActiveKey() ||
      event.key === storageTickKey()
    ) {
      listener();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function createProject(partial?: Partial<StoredProject>): StoredProject {
  const timestamp = nowIso();
  const discovery = normalizeDiscovery(partial?.discovery);
  const template = normalizeTemplate(partial?.template);
  const videowall = normalizeVideoWall(partial?.videowall);
  const compare = normalizeCompare(partial?.compare);
  const catalog = normalizeCatalog(partial?.catalog);

  const project: StoredProject = normalizeProject({
    id: partial?.id ?? makeId(),
    workspaceId: partial?.workspaceId ?? deploymentSession?.workspace.id,
    ownerId: partial?.ownerId ?? deploymentSession?.user.id,
    name: partial?.name ?? "New Project",
    customer: partial?.customer ?? discovery?.customer ?? "",
    site: partial?.site ?? discovery?.site ?? "",
    roomName: partial?.roomName ?? discovery?.roomName ?? "",
    stage: partial?.stage ?? "Discovery",
    status: partial?.status ?? "Draft",
    notes: partial?.notes ?? discovery?.notes ?? "",
    updatedAt: timestamp,
    createdAt: partial?.createdAt ?? timestamp,
    discovery,
    template,
    videowall,
    compare,
    catalog: catalog ?? { skus: [], bomItems: [] },
    proposal: partial?.proposal,
    attachments: partial?.attachments ?? [],
    comments: partial?.comments ?? [],
    shares: partial?.shares ?? [],
    auditTrail: [
      ...(partial?.auditTrail ?? []),
      makeAuditEntry("create", "Project was created.", partial?.id),
    ],
    recommendationGovernance: partial?.recommendationGovernance,
    customerSummary: partial?.customerSummary,
  });

  const projects = loadProjects();
  saveProjects([project, ...projects.filter((item) => item.id !== project.id)]);
  rememberProjectTextEntries(project);
  setActiveProjectIdInternal(project.id);
  touchProjectsTick();
  emit();
  return project;
}

export function updateProject(id: string, patch: Partial<StoredProject>): StoredProject | undefined {
  const projects = loadProjects();
  let updated: StoredProject | undefined;

  const next = projects.map((project) => {
    if (project.id !== id) return project;
    const catalog = normalizeCatalog(patch.catalog ?? project.catalog);
    updated = normalizeProject({
      ...project,
      ...patch,
      id: project.id,
      createdAt: project.createdAt,
      updatedAt: nowIso(),
      discovery: patch.discovery ? normalizeDiscovery(patch.discovery) : project.discovery,
      template: patch.template ? normalizeTemplate(patch.template) : project.template,
      videowall: patch.videowall ? normalizeVideoWall(patch.videowall) : project.videowall,
      compare: patch.compare ? normalizeCompare(patch.compare) : project.compare,
      catalog: catalog ?? { skus: [], bomItems: [] },
      proposal: patch.proposal ?? project.proposal,
      attachments: patch.attachments ? normalizeAttachments(patch.attachments) : project.attachments,
      comments: patch.comments ? normalizeComments(patch.comments) : project.comments,
      shares: patch.shares ? normalizeShares(patch.shares) : project.shares,
      auditTrail: [
        makeAuditEntry("update", "Project details were updated.", id),
        ...normalizeAuditTrail(patch.auditTrail ?? project.auditTrail),
      ].slice(0, 20),
      recommendationGovernance: patch.recommendationGovernance ?? project.recommendationGovernance,
      customerSummary: patch.customerSummary ?? project.customerSummary,
    });
    return updated;
  });

  saveProjects(next);
  if (updated) {
    rememberProjectTextEntries(updated);
  }
  return updated;
}

export function duplicateProject(
  id: string,
  overrides?: Partial<StoredProject>,
): StoredProject | undefined {
  const source = getProjectById(id);
  if (!source) return undefined;

  const duplicateName = overrides?.name?.trim()
    ? overrides.name
    : `${source.name} Copy`;

  return createProject({
    workspaceId: overrides?.workspaceId ?? source.workspaceId,
    ownerId: overrides?.ownerId ?? source.ownerId,
    name: duplicateName,
    customer: overrides?.customer ?? source.customer,
    site: overrides?.site ?? source.site,
    roomName: overrides?.roomName ?? source.roomName,
    stage: overrides?.stage ?? source.stage ?? "Discovery",
    status: overrides?.status ?? "Draft",
    notes: overrides?.notes ?? source.notes,
    discovery: overrides?.discovery ?? source.discovery,
    catalog: overrides?.catalog ?? source.catalog,
    proposal: overrides?.proposal ?? source.proposal,
    template: overrides?.template ?? source.template,
    videowall: overrides?.videowall ?? source.videowall,
    compare: overrides?.compare ?? source.compare,
    attachments: overrides?.attachments ?? [],
    comments: overrides?.comments ?? [],
    shares: overrides?.shares ?? [],
    recommendationGovernance: overrides?.recommendationGovernance ?? source.recommendationGovernance,
    customerSummary: overrides?.customerSummary ?? source.customerSummary,
    auditTrail: [
      makeAuditEntry("duplicate", `Project duplicated from "${source.name}".`, source.id),
    ],
  });
}

export function applyCompareToProject(
  id: string,
  compare: ProjectCompareRecord
): StoredProject | undefined {
  const normalized = normalizeCompare(compare);
  if (!normalized) return undefined;

  const project = getProjectById(id);
  if (!project) return undefined;

  const notesParts = [
    project.notes?.trim(),
    normalized.summary?.trim(),
    normalized.rationale ? `Rationale: ${normalized.rationale}` : "",
    normalized.notes?.length ? `Compare notes: ${normalized.notes.join("; ")}` : "",
    `Competitor SKU: ${normalized.brand} ${normalized.competitorSku}`,
    normalized.wyrestormVerified === false
      ? "WyreStorm mapping: Manual review required (no verified catalog SKU confirmed)."
      : `WyreStorm SKU: ${normalized.wyrestormSku}${normalized.wyrestormName ? ` (${normalized.wyrestormName})` : ""}`,
  ].filter(Boolean);

  const mergedNotes = notesParts.join("\n\n");

  const nextDiscovery: ProjectDiscovery = {
    customer: project.customer || "",
    site: project.site || "",
    roomName: project.roomName || "Replacement Opportunity",
    applicationType: normalized.category,
    notes: mergedNotes,
    recommendedFamilies: normalized.recommendedFamilies,
    createdAt: project.discovery?.createdAt ?? project.createdAt,
  };

  return updateProject(id, {
    stage: "Specify",
    notes: mergedNotes,
    compare: normalized,
    discovery: nextDiscovery,
  });
}

export function deleteProject(id: string): void {
  const projects = loadProjects();
  const next = projects.filter((project) => project.id !== id);
  saveProjects(next);
}

export function getProjectById(id: string): StoredProject | undefined {
  return loadProjects().find((project) => project.id === id);
}

export function getActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(storageActiveKey());
    if (saved) return saved;

    const projects = safeParse(window.localStorage.getItem(storageProjectKey()));
    const fallback = projects[0]?.id ?? null;
    if (fallback) window.localStorage.setItem(storageActiveKey(), fallback);
    return fallback;
  } catch {
    return null;
  }
}

export function setActiveProjectId(id: string): void {
  setActiveProjectIdInternal(id);
  touchProjectsTick();
  emit();
}

export function getActiveProject(): StoredProject | undefined {
  const id = getActiveProjectId();
  if (!id) return undefined;
  return getProjectById(id);
}

export function ensureActiveProject(partial?: Partial<StoredProject>): StoredProject {
  const existing = getActiveProject();
  if (existing) {
    if (partial && Object.keys(partial).length > 0) {
      return updateProject(existing.id, partial) ?? existing;
    }
    return existing;
  }

  const projects = loadProjects();
  if (projects[0]) {
    setActiveProjectIdInternal(projects[0].id);
    if (partial && Object.keys(partial).length > 0) {
      return updateProject(projects[0].id, partial) ?? projects[0];
    }
    return projects[0];
  }

  const created = createProject({
    name: partial?.name ?? "New Project",
    customer: partial?.customer ?? "",
    site: partial?.site ?? "",
    roomName: partial?.roomName ?? "",
    stage: partial?.stage ?? "Discovery",
    status: partial?.status ?? "Draft",
    notes: partial?.notes ?? "",
    discovery: partial?.discovery,
    template: partial?.template,
    videowall: partial?.videowall,
    compare: partial?.compare,
    catalog: partial?.catalog ?? { skus: [] },
    proposal: partial?.proposal,
  });

  setActiveProjectIdInternal(created.id);
  return resetNewProjectState(created);
}

export function updateProjectDiscovery(
  projectId: string,
  discoveryPatch: Partial<ProjectDiscovery>
): StoredProject | undefined {
  const project = getProjectById(projectId);
  if (!project) return undefined;

  const existingDiscovery: ProjectDiscovery = normalizeDiscovery(project.discovery) ?? {
    customer: project.customer ?? "",
    site: project.site ?? "",
    roomName: project.roomName ?? "",
    notes: project.notes ?? "",
    createdAt: project.createdAt,
  };

  const nextDiscovery = normalizeDiscovery({
    ...existingDiscovery,
    ...discoveryPatch,
  })!;

  return updateProject(projectId, {
    customer: nextDiscovery.customer ?? project.customer,
    site: nextDiscovery.site ?? project.site,
    roomName: nextDiscovery.roomName ?? project.roomName,
    notes: nextDiscovery.notes ?? project.notes,
    stage: "Discovery",
    discovery: nextDiscovery,
  });
}

export function updateProjectFields(
  id: string,
  fields: Pick<StoredProject, "name" | "customer" | "site" | "roomName" | "stage" | "status" | "notes">
): StoredProject | undefined {
  const project = getProjectById(id);
  if (!project) return undefined;

  const nextDiscovery = project.discovery
    ? {
        ...project.discovery,
        customer: fields.customer,
        site: fields.site,
        roomName: fields.roomName,
        notes: fields.notes,
      }
    : undefined;

  return updateProject(id, {
    name: fields.name,
    customer: fields.customer,
    site: fields.site,
    roomName: fields.roomName,
    stage: fields.stage,
    status: fields.status,
    notes: fields.notes,
    discovery: nextDiscovery,
  });
}

export function applyProjectTemplate(
  id: string,
  template: {
    market: string;
    application: string;
    tier: "Bronze" | "Silver" | "Gold";
    summary?: string;
    recommendedFamilies?: DiscoveryProductFamily[];
    assumptions?: string[];
    createdAt?: string;
  }
): StoredProject | undefined {
  const project = getProjectById(id);
  if (!project) return undefined;

  const mergedNotes = [
    project.notes?.trim(),
    template.summary?.trim(),
    Array.isArray(template.assumptions) && template.assumptions.length
      ? `Assumptions: ${template.assumptions.join("; ")}`
      : "",
  ].filter(Boolean).join("\n\n");

  const nextDiscovery = {
    customer: project.customer || "",
    site: project.site || "",
    roomName: project.roomName || template.application || "",
    applicationType: template.application,
    notes: mergedNotes,
    recommendedFamilies: template.recommendedFamilies,
    createdAt: project.discovery?.createdAt ?? project.createdAt,
  };

  return updateProject(id, {
    roomName: project.roomName || template.application || project.roomName,
    stage: "Discovery",
    notes: mergedNotes,
    template: {
      market: template.market,
      application: template.application,
      tier: template.tier,
      summary: template.summary,
      recommendedFamilies: template.recommendedFamilies,
      assumptions: template.assumptions,
      createdAt: template.createdAt ?? new Date().toISOString(),
    } as any,
    discovery: nextDiscovery,
    proposal: {
      ...(project.proposal ?? {}),
      selectedTier: template.tier,
    },
  });
}

export function applyVideoWallToProject(
  id: string,
  videowall: ProjectVideoWall
): StoredProject | undefined {
  const project = getProjectById(id);
  if (!project) return undefined;
  const recommendedItems = Array.isArray(videowall.recommendedItems)
    ? videowall.recommendedItems
        .map((item) => ({
          sku: String(item?.sku ?? "").trim().toUpperCase(),
          quantity: Math.max(1, Number(item?.quantity) || 1),
          role: typeof item?.role === "string" ? item.role.trim() : undefined,
        }))
        .filter((item) => item.sku.length > 0)
    : [];
  const fallbackSku = String(videowall.recommendedSku ?? "").trim().toUpperCase();
  const fallbackQty = Math.max(1, Number(videowall.recommendedSkuQty) || 1);
  if (recommendedItems.length === 0 && fallbackSku) {
    recommendedItems.push({
      sku: fallbackSku,
      quantity: fallbackQty,
      role: "Primary recommendation",
    });
  }
  const mergedCatalogSkus = Array.from(new Set([
    ...((project.catalog?.skus ?? []).map((item) => String(item).trim().toUpperCase()).filter(Boolean)),
    ...recommendedItems.map((item) => item.sku),
  ]));
  const displayCount = videowall.panelCount ?? (
    videowall.technology === "LED"
      ? Math.max(1, (videowall.cabinetRows ?? videowall.rows ?? 1) * (videowall.cabinetCols ?? videowall.cols ?? 1))
      : Math.max(1, (videowall.rows ?? 1) * (videowall.cols ?? 1))
  );
  const outputRows = videowall.outputRows ?? videowall.rows ?? 1;
  const outputCols = videowall.outputCols ?? videowall.cols ?? 1;
  const selectedTier =
    videowall.designTier ??
    (project.proposal?.selectedTier === "Bronze" ||
    project.proposal?.selectedTier === "Silver" ||
    project.proposal?.selectedTier === "Gold"
      ? project.proposal.selectedTier
      : undefined);

  const notesParts = [
    project.notes?.trim(),
    videowall.summary?.trim(),
    selectedTier ? `Design tier: ${selectedTier}` : "",
    Array.isArray(videowall.mountingNotes) && videowall.mountingNotes.length
      ? `Mounting notes: ${videowall.mountingNotes.join("; ")}`
      : "",
    videowall.processorRecommendation
      ? `Processor: ${videowall.processorRecommendation}`
      : "",
  ].filter(Boolean);

  const mergedNotes = notesParts.join("\n\n");

  const nextDiscovery = {
    customer: project.customer || "",
    site: project.site || "",
    roomName: project.roomName || "Video Wall",
    applicationType: videowall.technology === "LED" ? "LED Video Wall" : "LCD Video Wall",
    displayCount: String(displayCount),
    sourceCount: videowall.sourceCount != null ? String(videowall.sourceCount) : project.discovery?.sourceCount ?? "",
    outputBehaviour: `Signal output map ${outputCols} x ${outputRows}`,
    notes: mergedNotes,
    recommendedFamilies: ["Video Wall"] as DiscoveryProductFamily[],
    createdAt: project.discovery?.createdAt ?? project.createdAt,
  };

  return updateProject(id, {
    stage: "Design",
    notes: mergedNotes,
    videowall: {
      ...videowall,
      recommendedItems,
      createdAt: videowall.createdAt ?? new Date().toISOString(),
    } as any,
    discovery: nextDiscovery,
    catalog: {
      ...(project.catalog ?? {}),
      selectedBrand: project.catalog?.selectedBrand ?? "WyreStorm",
      skus: mergedCatalogSkus,
    },
    proposal: {
      ...(project.proposal ?? {}),
      selectedTier: selectedTier ?? project.proposal?.selectedTier,
    },
  });
}

function replaceProject(project: StoredProject): StoredProject | undefined {
  const current = loadProjects();
  const next = [normalizeProject(project), ...current.filter((item) => item.id !== project.id)];
  saveProjects(next);
  return getProjectById(project.id);
}

export async function addProjectComment(
  projectId: string,
  input: ProjectCommentInput
): Promise<StoredProject | undefined> {
  const project = getProjectById(projectId);
  if (!project) return undefined;

  if (
    deploymentSession?.mode === "backend" &&
    (
      (input.audience === "internal" && !canUseBackendPermission("canCreateInternalComments")) ||
      (input.audience === "customer" && !canUseBackendPermission("canCreateCustomerComments"))
    )
  ) {
    throw new Error("Your workspace role cannot add that kind of comment.");
  }

  if (deploymentSession?.mode === "backend") {
    const response = await createDeploymentProjectComment(deploymentSession, projectId, input);
    return replaceProject(response.project);
  }

  const comment: ProjectComment = {
    id: makeId(),
    body: input.body.trim(),
    audience: input.audience,
    authorName: currentActorName(),
    authorEmail: currentActorEmail() || undefined,
    createdAt: nowIso(),
  };

  const updated = updateProject(projectId, {
    comments: [comment, ...(project.comments ?? [])],
    auditTrail: [
      makeAuditEntry("comment", `A ${input.audience} comment was added.`, projectId),
      ...(project.auditTrail ?? []),
    ],
  });

  return updated;
}

export async function createProjectShare(
  projectId: string,
  input: ProjectShareInput
): Promise<StoredProject | undefined> {
  const project = getProjectById(projectId);
  if (!project) return undefined;

  if (deploymentSession?.mode === "backend" && !canUseBackendPermission("canPrepareShares")) {
    throw new Error("Your workspace role cannot prepare customer share packs.");
  }

  if (deploymentSession?.mode === "backend") {
    const response = await createDeploymentProjectShare(deploymentSession, projectId, input);
    return replaceProject(response.project);
  }

  const share: ProjectShare = {
    id: makeId(),
    title: input.title.trim(),
    message: input.message?.trim(),
    audience: input.audience,
    summaryHeadline: input.summaryHeadline?.trim(),
    status: "draft",
    createdAt: nowIso(),
    createdBy: deploymentSession?.user.id,
  };

  const updated = updateProject(projectId, {
    shares: [share, ...(project.shares ?? [])],
    customerSummary: project.customerSummary ?? buildCustomerSafeSummary(project),
    auditTrail: [
      makeAuditEntry("share", `A ${input.audience} share pack was prepared.`, projectId),
      ...(project.auditTrail ?? []),
    ],
  });

  return updated;
}

export async function addProjectAttachment(
  projectId: string,
  input: ProjectAttachmentInput
): Promise<StoredProject | undefined> {
  const project = getProjectById(projectId);
  if (!project) return undefined;

  if (deploymentSession?.mode === "backend" && !canUseBackendPermission("canRegisterAttachments")) {
    throw new Error("Your workspace role cannot register attachments.");
  }

  if (deploymentSession?.mode === "backend") {
    const response = await createDeploymentProjectAttachment(deploymentSession, projectId, input);
    return replaceProject(response.project);
  }

  const attachment: ProjectAttachment = {
    id: makeId(),
    name: input.name.trim(),
    kind: input.kind,
    source: input.source.trim(),
    summary: input.summary?.trim(),
    contentType: input.contentType?.trim(),
    sizeBytes: input.sizeBytes,
    uploadedAt: nowIso(),
    uploadedBy: deploymentSession?.user.id,
  };

  const updated = updateProject(projectId, {
    attachments: [attachment, ...(project.attachments ?? [])],
    auditTrail: [
      makeAuditEntry("attachment", `${input.kind} attachment "${input.name}" was registered.`, projectId),
      ...(project.auditTrail ?? []),
    ],
  });

  return updated;
}

export async function markProjectCommercialReady(
  projectId: string,
  completionNote: string,
): Promise<StoredProject | undefined> {
  const project = getProjectById(projectId);
  if (!project) return undefined;

  if (deploymentSession?.mode === "backend") {
    if (!canUseBackendPermission("canMarkCommercialReady")) {
      throw new Error("Your workspace role cannot complete the commercial readiness gate.");
    }
    const response = await markDeploymentProjectCommercialReady(deploymentSession, projectId, { completionNote });
    return replaceProject(response.project);
  }

  return updateProject(projectId, {
    stage: project.stage || "Proposal",
    status: "Commercial Ready",
    notes: [project.notes, completionNote].filter(Boolean).join("\n\n"),
    proposal: {
      ...(project.proposal ?? {}),
      notes: [project.proposal?.notes, completionNote].filter(Boolean).join("\n\n"),
    },
  });
}
