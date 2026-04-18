import { useMemo, useSyncExternalStore } from "react";
import { useParams } from "react-router-dom";

import {
  getActiveProject,
  getProjectById,
  subscribeProjects,
  type StoredProject,
} from "@/features/projects/projectStore";
import type {
  ProposalBomItem,
  ProposalSectionModel,
  ProposalViewModel,
} from "../proposalModel";

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function num(value: unknown, fallback = 0): number {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildBom(project: StoredProject | null): ProposalBomItem[] {
  if (!project) return [];

  const fromVideoWall = (project.videowall?.recommendedItems ?? []).map((item) => ({
    qty: item.quantity || 1,
    sku: item.sku,
    description: item.role || item.sku,
    notes: item.role,
  }));

  const fromStructuredCatalog = (project.catalog?.bomItems ?? []).map((item) => ({
    qty: item.quantity || 1,
    sku: item.sku,
    description: item.description || item.role || item.sku,
    notes: item.notes || item.role,
  }));

  const fromCatalog = (project.catalog?.skus ?? []).map((sku) => ({
    qty: 1,
    sku,
    description: sku,
  }));

  if (fromStructuredCatalog.length > 0) {
    return fromStructuredCatalog;
  }

  return [...fromVideoWall, ...fromCatalog];
}

function inferSystemType(project: StoredProject | null): string {
  if (!project) return "AV System";
  if (project.videowall) return "Video Wall";
  const family = project.discovery?.recommendedFamilies?.[0];
  if (family === "AVoIP") return "AV over IP";
  if (family === "HDBaseT") return "HDBaseT";
  if (family === "Matrix") return "Matrix Switching";
  if (family === "USB Extension" || family === "Apollo") return "Presentation / UC";
  return text(project.discovery?.applicationType, "AV System");
}

function buildSections(
  project: StoredProject | null,
  bom: ProposalBomItem[],
  systemType: string,
  displays: number,
  sources: number,
): ProposalSectionModel[] {
  const longestRun = text(project?.discovery?.cableDistanceM);
  const sourceLeg = text(project?.discovery?.sourceToRackDistanceM);
  const displayLeg = text(project?.discovery?.rackToDisplayDistanceM);

  return [
    {
      title: "Signal Architecture",
      summary: `The proposal is based on a ${systemType.toLowerCase()} design shaped by the current project discovery data.`,
      bullets: uniq([
        sources > 0 ? `${sources} source input${sources === 1 ? "" : "s"} captured` : "",
        displays > 0 ? `${displays} display endpoint${displays === 1 ? "" : "s"} captured` : "",
        text(project?.discovery?.outputBehaviour),
      ]),
    },
    {
      title: "Routing and Transport",
      summary: "Transport guidance is tied back to the recorded route lengths and path assumptions in the active project.",
      bullets: uniq([
        sourceLeg ? `Source to rack/core distance: ${sourceLeg}m` : "",
        displayLeg ? `Rack/core to display distance: ${displayLeg}m` : "",
        longestRun ? `Longest point-to-point run: ${longestRun}m` : "",
        text(project?.discovery?.transportCableType),
        text(project?.discovery?.displayConnectionType),
      ]),
    },
    {
      title: "Bill of Materials Logic",
      summary: "The proposal BOM is populated from saved project selections rather than fixed placeholder content.",
      bullets: uniq([
        `${bom.length} BOM line${bom.length === 1 ? "" : "s"} available from the project record`,
        text(project?.discovery?.notes),
      ]),
    },
  ];
}

function buildViewModel(project: StoredProject | null): ProposalViewModel {
  const bom = buildBom(project);
  const displays = num(project?.discovery?.displayCount);
  const sources = num(project?.discovery?.sourceCount);
  const zones = Math.max(1, num(project?.videowall?.panelCount) ? 1 : 0);
  const systemType = inferSystemType(project);
  const customerName = text(project?.customer || project?.discovery?.customer);
  const projectName = text(project?.name, "Proposal");
  const roomName = text(project?.roomName || project?.discovery?.roomName);
  const summaryText =
    text(project?.proposal?.notes) ||
    `This proposal outlines a ${systemType.toLowerCase()} solution${customerName ? ` for ${customerName}` : ""}${roomName ? ` in ${roomName}` : ""}, built from the current room, routing, and product-selection data.`;

  const keyBenefits = uniq([
    displays > 1 ? "Supports multi-display distribution" : "Supports the required display workflow",
    sources > 1 ? "Enables flexible source switching" : "Keeps source routing straightforward",
    text(project?.discovery?.usbNeeds) ? "Accounts for USB and collaboration requirements" : "",
    text(project?.discovery?.networkEnvironment) ? "Uses the recorded network environment as part of transport selection" : "",
    text(project?.discovery?.controlNeeds) ? "Includes control requirements in the design baseline" : "",
  ]).slice(0, 5);

  const checks = uniq([
    project ? "Active project connected" : "",
    displays > 0 ? "Display count detected" : "",
    sources > 0 ? "Source count detected" : "",
    bom.length > 0 ? "BOM items available" : "",
    text(project?.discovery?.cableDistanceM) ? "Route distance captured" : "",
  ]);

  const warnings = uniq([
    displays === 0 ? "No display count detected" : "",
    sources === 0 ? "No source count detected" : "",
    bom.length === 0 ? "No BOM items found in the project yet" : "",
    text(project?.discovery?.cableDistanceM) ? "" : "No longest route length has been captured yet",
  ]);

  return {
    projectId: text(project?.id, "unknown-project"),
    projectName,
    customerName,
    systemType,
    summaryText,
    keyBenefits,
    metrics: [
      { label: "Displays", value: displays || "N/A" },
      { label: "Sources", value: sources || "N/A" },
      { label: "Zones", value: zones || "N/A" },
      { label: "Technology", value: systemType },
    ],
    designSections: buildSections(project, bom, systemType, displays, sources),
    bom,
    confidence: {
      level: warnings.length === 0 ? "HIGH" : checks.length >= 3 ? "MEDIUM" : "LOW",
      checks,
      warnings,
    },
  };
}

export function useProposalProjectData(): ProposalViewModel {
  const params = useParams();
  const activeProject = useSyncExternalStore(
    subscribeProjects,
    () => getActiveProject() ?? null,
    () => null,
  );

  return useMemo(() => {
    const routeId = text(params.projectId || params.id);
    const project = routeId ? getProjectById(routeId) ?? activeProject : activeProject;
    return buildViewModel(project);
  }, [activeProject, params.id, params.projectId]);
}
