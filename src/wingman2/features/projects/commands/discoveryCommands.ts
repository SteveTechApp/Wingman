import { routeCatalogByKey } from "../../../app/routeCatalog";
import type { MultiSkuCompetitorAnalysis } from "../../../lib/documentIngest/multiSkuCompetitorIngest";
import { stringValue } from "../persistence/projectCodecs";
import type { StoredDiscoveryBrief, StoredIngestAnalysis, StoredProductSelection, StoredVideowallSummary, StoredWorkflowState } from "../model/projectTypes";
import type { ProjectCommandContext, ProjectLifecycleCommands } from "./projectLifecycle";

function projectNameFromDiscoveryBrief(brief: StoredDiscoveryBrief) {
  const roomModel = brief.roomModel ?? {};
  const customer = stringValue(roomModel.customer || roomModel.customerName || roomModel.companyName);
  const roomType = stringValue(roomModel.roomType, "Discovery");
  return customer ? `${customer} ${roomType}` : `${roomType} Project`;
}

function projectNameFromIngest(files: string[], intelligence?: MultiSkuCompetitorAnalysis) {
  if (intelligence?.documentType === "multi_sku_competitor_list") {
    const account = intelligence.accountCustomer !== "Not confirmed" ? intelligence.accountCustomer : intelligence.manufacturer !== "Not confirmed" ? intelligence.manufacturer : "Competitor";
    return `${account} Multi-SKU Opportunity`;
  }
  if (files.length === 1) return `${files[0]} Requirements`;
  return files.length > 1 ? `${files[0]} + ${files.length - 1} file(s)` : "Imported Requirements";
}

const VIDEOWALL_PRODUCT_SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/;

export function productSelectionsFromVideowallSummary(summary: Record<string, unknown>, savedAt: string): StoredProductSelection[] {
  const recommendation = summary.recommendation && typeof summary.recommendation === "object" && !Array.isArray(summary.recommendation) ? summary.recommendation as Record<string, unknown> : {};
  const products = Array.isArray(recommendation.products) ? recommendation.products : [];
  const evidence = [recommendation.title, recommendation.rationale].filter((value): value is string => typeof value === "string" && Boolean(value.trim())).map((value) => value.trim());
  return [...new Set(products.filter((value): value is string => typeof value === "string").map((value) => value.trim().toUpperCase()).filter((value) => VIDEOWALL_PRODUCT_SKU_PATTERN.test(value)))]
    .map((sku) => ({ sku, title: sku, category: "Video Wall", status: "recommended" as const, tags: ["videowall"], addedAt: savedAt, source: "Video Wall Builder", evidence }));
}

export function createDiscoveryCommands(context: ProjectCommandContext, lifecycle: ProjectLifecycleCommands) {
  const { now, read, createId, createAuditId } = context;
  const { getActiveProject, getCurrentWorkflowProject, upsertStoredProject, createWorkflowProject } = lifecycle;
  return {
    saveDiscoveryBriefToProject(brief: StoredDiscoveryBrief, projectId?: string | null) {
      const timestamp = now();
      const snapshot = read();
      const existing = projectId === undefined ? getCurrentWorkflowProject(snapshot) : projectId ? snapshot.projects.find((project) => project.id === projectId) ?? null : null;
      const workflow: StoredWorkflowState = { source: "Discovery", lastStep: "Discovery saved", nextRoute: routeCatalogByKey.recommendations.path, updatedAt: timestamp };
      const capturedPercent = brief.capturedPercent ?? 0;
      const auditDetail = existing?.discoveryBrief ? `Discovery updated — ${capturedPercent}% captured` : `Discovery created — ${capturedPercent}% captured`;
      const audit = { id: createAuditId?.() ?? createId("audit"), action: existing ? "discovery-save" : "discovery-create", detail: auditDetail, scope: "discovery", severity: "info" as const, actorName: "Wingman user", createdAt: timestamp };
      return upsertStoredProject(existing ? {
        ...existing, name: existing.discoveryBrief ? existing.name : projectNameFromDiscoveryBrief(brief), stage: "Discovery", status: "recommended", updated: "Just now", resumeTo: routeCatalogByKey.recommendations.path, updatedAt: timestamp, discoveryBrief: brief, auditTrail: [audit, ...(existing.auditTrail ?? [])].slice(0, 50), workflow,
      } : createWorkflowProject({ name: projectNameFromDiscoveryBrief(brief), stage: "Discovery", status: "recommended", resumeTo: routeCatalogByKey.recommendations.path, discoveryBrief: brief, auditTrail: [audit], workflow }));
    },
    productSelectionsFromVideowallSummary(summary: Record<string, unknown>, savedAt = now()) { return productSelectionsFromVideowallSummary(summary, savedAt); },
    saveVideowallToProject(input: { wallType: string; summary: Record<string, unknown> }) {
      const timestamp = now();
      const existing = getCurrentWorkflowProject();
      const recommendedProducts = productSelectionsFromVideowallSummary(input.summary, timestamp);
      const recommendedSkus = new Set(recommendedProducts.map((product) => product.sku));
      const productSelections = [...recommendedProducts, ...(existing?.productSelections ?? []).filter((product) => !recommendedSkus.has(product.sku))].slice(0, 20);
      const videowall: StoredVideowallSummary = { savedAt: timestamp, wallType: input.wallType, summary: input.summary };
      const workflow: StoredWorkflowState = { source: "Video Wall Builder", lastStep: "Video wall discovery saved", nextRoute: routeCatalogByKey.discovery.path, updatedAt: timestamp };
      const name = input.wallType === "led" ? "LED Video Wall Discovery" : input.wallType === "lcd" ? "LCD Video Wall Discovery" : "Video Wall Discovery";
      return upsertStoredProject(existing ? { ...existing, updated: "Just now", updatedAt: timestamp, videowall, productSelections, workflow } : createWorkflowProject({ name, stage: "Discovery", status: "recommended", resumeTo: routeCatalogByKey.discovery.path, videowall, productSelections: productSelections.length ? productSelections : undefined, workflow }));
    },
    saveIngestAnalysisToProject(input: Omit<StoredIngestAnalysis, "updatedAt"> & { updatedAt?: string }, options: { requireExistingProject?: boolean } = {}) {
      const timestamp = input.updatedAt ?? now();
      const ingest: StoredIngestAnalysis = { requirements: input.requirements, unknowns: input.unknowns, skippedFiles: input.skippedFiles, files: input.files, multiSkuIntelligence: input.multiSkuIntelligence, visualContext: input.visualContext, updatedAt: timestamp };
      const snapshot = read();
      const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
      if (!existing && options.requireExistingProject) return null;
      const isMultiSku = input.multiSkuIntelligence?.documentType === "multi_sku_competitor_list";
      const workflow: StoredWorkflowState = { source: "Document Ingest", lastStep: isMultiSku ? "Multi-SKU competitor intelligence saved" : "Requirements imported", nextRoute: isMultiSku ? routeCatalogByKey.compare.path : routeCatalogByKey.discovery.path, updatedAt: timestamp };
      return upsertStoredProject(existing ? { ...existing, stage: isMultiSku ? "Competitor Compare" : "Discovery", status: input.unknowns.length ? "alternative" : "recommended", updated: "Just now", resumeTo: isMultiSku ? routeCatalogByKey.ingest.path : routeCatalogByKey.discovery.path, updatedAt: timestamp, ingest, workflow } : createWorkflowProject({ name: projectNameFromIngest(input.files, input.multiSkuIntelligence), owner: input.multiSkuIntelligence?.accountCustomer !== "Not confirmed" ? input.multiSkuIntelligence?.accountCustomer : undefined, stage: isMultiSku ? "Competitor Compare" : "Discovery", status: input.unknowns.length ? "alternative" : "recommended", resumeTo: isMultiSku ? routeCatalogByKey.ingest.path : routeCatalogByKey.discovery.path, ingest, workflow }));
    },
  };
}
