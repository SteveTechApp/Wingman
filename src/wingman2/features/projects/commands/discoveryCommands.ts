import { routeCatalogByKey } from "../../../app/routeCatalog";
import type { MultiSkuCompetitorAnalysis } from "../../../lib/documentIngest/multiSkuCompetitorIngest";
import {
  normalizeLinkDetails,
  wallLinkDetailText,
  wallTransportPlan,
  wallTransportRequirements,
  withWallLinkDetail,
  type WallLinkDetail,
} from "../../../lib/videowallTransport";
import { stringValue } from "../persistence/projectCodecs";
import type { ProjectAuditEntry, StoredDiscoveryBrief, StoredIngestAnalysis, StoredProductSelection, StoredProject, StoredVideowallSummary, StoredWorkflowState } from "../model/projectTypes";
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
  const equipment = Array.isArray(recommendation.equipment) ? recommendation.equipment : [];
  const evidence = [recommendation.title, recommendation.rationale].filter((value): value is string => typeof value === "string" && Boolean(value.trim())).map((value) => value.trim());
  const cautions = Array.isArray(summary.checks) ? summary.checks.filter((value): value is string => typeof value === "string") : [];
  return [...new Set(products.filter((value): value is string => typeof value === "string").map((value) => value.trim().toUpperCase()).filter((value) => VIDEOWALL_PRODUCT_SKU_PATTERN.test(value)))]
    .map((sku) => {
      const item = equipment.find((row) => row && typeof row === "object" && typeof row.sku === "string" && row.sku.trim().toUpperCase() === sku);
      const quantity = item && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 1024 ? item.quantity as number : undefined;
      return { sku, title: sku, ...(quantity ? { quantity } : {}), category: "Video Wall", status: "recommended" as const, tags: ["videowall"], addedAt: savedAt, source: "Video Wall Builder", evidence, ...(cautions.length ? { cautions } : {}) };
    });
}

export function createDiscoveryCommands(context: ProjectCommandContext, lifecycle: ProjectLifecycleCommands) {
  const { now, read, write, createId, createAuditId } = context;
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
    saveVideowallToProject(input: {
      wallType: string;
      summary: Record<string, unknown>;
      templateId?: string;
      reviewNote?: string;
      /**
       * Trail notes for the paper sheets that landed since the last save, built
       * by the builder from the sheet it imported. Each one names the links the
       * sheet measured, so the saved wall's runs can be traced to paper.
       */
      sheetNotes?: string[];
    }) {
      const timestamp = now();
      const existing = getCurrentWorkflowProject();
      const recommendedProducts = productSelectionsFromVideowallSummary(input.summary, timestamp);
      const recommendedSkus = new Set(recommendedProducts.map((product) => product.sku));
      const productSelections = [...recommendedProducts, ...(existing?.productSelections ?? []).filter((product) => product.source !== "Video Wall Builder" && !recommendedSkus.has(product.sku))].slice(0, 20);
      const workflow: StoredWorkflowState = { source: "Video Wall Builder", lastStep: "Video wall discovery saved", nextRoute: routeCatalogByKey.videowall.path, updatedAt: timestamp };
      const name = input.wallType === "led" ? "LED Video Wall Discovery" : input.wallType === "lcd" ? "LCD Video Wall Discovery" : input.wallType === "projection" ? "Projection Layout Design" : "Video Wall Discovery";
      const target = existing ?? createWorkflowProject({ name, stage: "Discovery", status: "recommended", resumeTo: routeCatalogByKey.videowall.path, productSelections: productSelections.length ? productSelections : undefined, workflow });
      // The wall records where it belongs, so an export reads the link instead of
      // inferring it: the project it was saved into, and the template it started
      // from — passed by the handoff, kept from the previous save, or read from
      // the project's own room model.
      const templateId = stringValue(input.templateId) || stringValue(target.videowall?.templateId) || stringValue(target.discoveryBrief?.roomModel?.sourceTemplateId);
      const videowall: StoredVideowallSummary = {
        savedAt: timestamp,
        wallType: input.wallType,
        summary: input.summary,
        projectId: target.id,
        ...(templateId ? { templateId } : {}),
      };
      // A photo review and a paper sheet are events, not values: saving a wall
      // whose survey was acted on appends what happened, so the runs it carries
      // are attributable to the sheet or the reader that produced them. The
      // caller names each event (it has the review and the sheet), and the note
      // carries when it happened, so an identical repeat is a repeat and a later
      // review with the same counts is still a second event.
      const notes: { action: string; detail: string }[] = [];
      const reviewNote = typeof input.reviewNote === "string" ? input.reviewNote.trim() : "";
      if (reviewNote) notes.push({ action: "wall-survey-review", detail: reviewNote });
      for (const note of input.sheetNotes ?? []) {
        const detail = typeof note === "string" ? note.trim() : "";
        if (detail) notes.push({ action: "wall-survey-sheet", detail });
      }
      const recorded = new Set((target.auditTrail ?? []).map((entry) => `${entry.action}\u0000${entry.detail}`));
      const surveyAudit: ProjectAuditEntry[] = [];
      for (const note of notes) {
        const key = `${note.action}\u0000${note.detail}`;
        // A save that repeats a note already on the trail (or one passed twice in
        // the same call) is not a second event.
        if (recorded.has(key)) continue;
        recorded.add(key);
        surveyAudit.push({
          id: createAuditId?.() ?? createId("audit"),
          action: note.action,
          detail: note.detail,
          scope: "videowall",
          severity: "info",
          actorName: "Wingman user",
          createdAt: timestamp,
        });
      }
      return upsertStoredProject({
        ...target,
        updated: "Just now",
        updatedAt: timestamp,
        videowall,
        ...(existing ? { productSelections } : {}),
        ...(surveyAudit.length ? { auditTrail: [...surveyAudit, ...(target.auditTrail ?? [])].slice(0, 50) } : {}),
        workflow,
      });
    },
    /**
     * Record install cells a rep types on the proposal itself.
     *
     * The proposal's survey warning names the links without a display housing,
     * run entry or termination; a rep can fill those cells there instead of
     * going back to the wall builder. Only the cells passed here change, every other link
     * keeps what the survey already recorded, and the wall's save time moves
     * because the design did change.
     */
    recordWallInstallDetail(input: { projectId?: string; linkDetails: Record<string, WallLinkDetail> }) {
      const timestamp = now();
      const snapshot = read();
      const existing = input.projectId
        ? snapshot.projects.find((project) => project.id === input.projectId) ?? null
        : getCurrentWorkflowProject(snapshot);
      const requirements = existing?.videowall?.summary?.requirements;
      if (!existing?.videowall || !requirements || typeof requirements !== "object" || Array.isArray(requirements)) {
        return null;
      }

      let linkDetails = normalizeLinkDetails((requirements as Record<string, unknown>).linkDetails);
      const filled: string[] = [];
      for (const [id, patch] of Object.entries(input.linkDetails)) {
        if (!id.trim() || !patch || typeof patch !== "object") continue;
        const before = wallLinkDetailText(linkDetails?.[id]);
        linkDetails = withWallLinkDetail(linkDetails, id, patch);
        const after = wallLinkDetailText(linkDetails?.[id]);
        if (after && after !== before) filled.push(id.trim());
      }
      // A click that changed nothing is not a save: the wall keeps its own time
      // rather than reporting an edit the rep did not make.
      if (!filled.length) return null;
      const recorded = filled.length;

      const nextRequirements: Record<string, unknown> = { ...(requirements as Record<string, unknown>) };
      if (linkDetails) nextRequirements.linkDetails = linkDetails;
      else delete nextRequirements.linkDetails;
      // The entry names the links it filled, so the trail can open the row it
      // describes rather than only counting it. A wall without costable links
      // falls back to the ids, which is still the link the reader typed in.
      const transportRequirements = wallTransportRequirements(requirements);
      const transport = transportRequirements ? wallTransportPlan(transportRequirements) : null;
      const labels = new Map((transport?.allLinks ?? []).map((link) => [link.id, link.label]));
      const named = filled.map((id) => labels.get(id) ?? id);
      const shown = named.slice(0, 3).join("; ");
      const rest = named.length > 3 ? ` and ${named.length - 3} more` : "";
      const audit = {
        id: createAuditId?.() ?? createId("audit"),
        action: "wall-survey-detail",
        detail: `Install detail recorded from the proposal — ${recorded} link${recorded === 1 ? "" : "s"} (${shown}${rest})`,
        scope: "videowall",
        severity: "info" as const,
        actorName: "Wingman user",
        createdAt: timestamp,
      };
      return upsertStoredProject({
        ...existing,
        updated: "Just now",
        updatedAt: timestamp,
        videowall: {
          ...existing.videowall,
          savedAt: timestamp,
          summary: { ...existing.videowall.summary, requirements: nextRequirements },
        },
        auditTrail: [audit, ...(existing.auditTrail ?? [])].slice(0, 50),
      });
    },
    /**
     * A stale reading renewed from the list: the rep has looked at the room
     * again, so the survey is stamped with today instead of reopening the wall
     * builder. Only the date moves — the rows, the runs they applied and the
     * design stay as they were, and the wall's own save time does not, because
     * nothing about the wall changed.
     *
     * The command cannot judge staleness itself without pulling the review model
     * into the eager command chunk, so the card decides when to offer it and the
     * review's shape is all that is checked here.
     *
     * Because nothing about the design changed, the project keeps its place in
     * the gallery (which is store order) and its "Updated" stamp: a tap on a
     * card the rep is looking at must not shuffle the list under them or make a
     * different project active. `upsertStoredProject` does both, so this writes
     * the one entry in place instead.
     */
    reconfirmWallSurveyReview(input: { projectId: string; reviewedAt?: string }) {
      const timestamp = input.reviewedAt ?? now();
      const snapshot = read();
      const existing = snapshot.projects.find((project) => project.id === input.projectId) ?? null;
      const requirements = existing?.videowall?.summary?.requirements;
      if (!existing?.videowall || !requirements || typeof requirements !== "object" || Array.isArray(requirements)) {
        return null;
      }
      const record = requirements as Record<string, unknown>;
      const review = record.surveyReview;
      if (!review || typeof review !== "object" || Array.isArray(review)) return null;
      const stored = review as Record<string, unknown>;
      // A second press changes nothing, so it is not a save and leaves no entry
      // claiming the survey was confirmed twice.
      if (stored.reviewedAt === timestamp) return null;
      const rows = Array.isArray(stored.rows) ? stored.rows : [];
      const audit = {
        id: createAuditId?.() ?? createId("audit"),
        action: "wall-survey-reconfirm",
        detail: `Survey re-confirmed — ${rows.length} row${rows.length === 1 ? "" : "s"} kept, room checked again`,
        scope: "videowall",
        severity: "info" as const,
        actorName: "Wingman user",
        createdAt: timestamp,
      };
      const renewed: StoredProject = {
        ...existing,
        videowall: {
          ...existing.videowall,
          summary: {
            ...existing.videowall.summary,
            requirements: { ...record, surveyReview: { ...stored, reviewedAt: timestamp } },
          },
        },
        auditTrail: [audit, ...(existing.auditTrail ?? [])].slice(0, 50),
      };
      write({
        ...snapshot,
        projects: snapshot.projects.map((project) => (project.id === renewed.id ? renewed : project)),
      });
      return renewed;
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
