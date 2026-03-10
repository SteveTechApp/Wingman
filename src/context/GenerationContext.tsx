import * as React from "react";
import type { NavigateFunction } from "react-router-dom";
import { createStrictContext } from "./createStrictContext";
import {
  createProject,
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  updateProject,
  type DiscoveryProductFamily,
  type ProjectDiscovery,
  type StoredProject,
} from "@/features/projects/projectStore";
import { recommendFamilies } from "@/features/discovery/discoveryStore";
import { readDesignSeeds } from "@/features/systemDesign/designSeed";
import { designRoom } from "@/services/roomDesignerService";
import type { UserTemplate } from "@/utils/types";

export type GenerationContextValue = {
  handleDesignRoom: (roomId?: string) => Promise<void>;
  handleAgentSubmit: (...args: unknown[]) => Promise<void>;
  handleSurveyImport: (payload?: unknown) => Promise<void>;
  handleStartFromTemplate: (template?: UserTemplate, navigate?: NavigateFunction) => Promise<void>;
};

const ALLOWED_FAMILIES: DiscoveryProductFamily[] = [
  "Apollo",
  "HDBaseT",
  "AVoIP",
  "Matrix",
  "USB Extension",
  "Video Wall",
];

function normalizeFamilies(value: string[]): DiscoveryProductFamily[] {
  const deduped = Array.from(new Set(value));
  return deduped.filter((item): item is DiscoveryProductFamily => {
    return ALLOWED_FAMILIES.includes(item as DiscoveryProductFamily);
  });
}

function inferFamilies(template: UserTemplate): DiscoveryProductFamily[] {
  const room = template.roomData;
  const recommended = recommendFamilies({
    applicationType: room.roomType,
    displayCount: String(room.displayCount ?? ""),
    cableDistanceM: String(
      Math.max(
        0,
        ...(Array.isArray(room.ioRequirements)
          ? room.ioRequirements.map((point) => Number(point.distance) || 0)
          : [0])
      )
    ),
    usbNeeds: Array.isArray(room.ioRequirements) && room.ioRequirements.some((point) => /usb/i.test(point.connectionType || ""))
      ? "USB-C / BYOD"
      : "",
    controlNeeds: room.technicalDetails?.controlSystem || "",
  });

  return recommended.families;
}

function buildTemplateProject(template: UserTemplate) {
  const room = template.roomData;
  const ioRequirements = Array.isArray(room.ioRequirements) ? room.ioRequirements : [];

  const sourceCount = ioRequirements
    .filter((point) => point.type === "input")
    .reduce((total, point) => total + (Number(point.quantity) || 1), 0);

  const longestDistance = ioRequirements
    .reduce((max, point) => Math.max(max, Number(point.distance) || 0), 0);

  const notes = [template.description, room.functionalityStatement]
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .join("\n\n");

  const recommendedFamilies = inferFamilies(template);

  return createProject({
    name: template.templateName || "Template Project",
    customer: "Sample customer",
    site: "",
    roomName: room.roomName || room.roomType || "Room",
    stage: "Discovery",
    status: "Draft",
    notes,
    template: {
      market: String(template.vertical || "general"),
      application: room.roomType || "General",
      tier: room.designTier,
      summary: template.description,
      recommendedFamilies,
      createdAt: new Date().toISOString(),
    },
    discovery: {
      customer: "Sample customer",
      site: "",
      roomName: room.roomName || room.roomType || "Room",
      applicationType: room.roomType,
      displayCount: String(room.displayCount ?? ""),
      sourceCount: sourceCount > 0 ? String(sourceCount) : "",
      cableDistanceM: longestDistance > 0 ? String(longestDistance) : "",
      usbNeeds: ioRequirements.some((point) => /usb/i.test(point.connectionType || "")) ? "USB-C / BYOD" : "",
      controlNeeds: room.technicalDetails?.controlSystem || "",
      notes,
      recommendedFamilies,
      recommendedNextTool: "/app/tools/discovery",
      createdAt: new Date().toISOString(),
    },
    catalog: {
      skus: [],
      selectedBrand: "WyreStorm",
      notes: `Started from template: ${template.templateName}`,
    },
    proposal: {
      selectedTier: room.designTier,
      title: `${template.templateName} proposal draft`,
    },
  });
}

function mergeSkus(current: string[] | undefined, suggested: string[]): string[] {
  return Array.from(
    new Set([...(Array.isArray(current) ? current : []), ...suggested.map((item) => item.trim()).filter(Boolean)])
  );
}

function valueOrFallback(primary: string | undefined, secondary: string | undefined, fallback = ""): string {
  const first = String(primary ?? "").trim();
  if (first) return first;
  const second = String(secondary ?? "").trim();
  if (second) return second;
  return fallback;
}

function buildDesignInput(project: StoredProject) {
  const seeds = readDesignSeeds();
  const discovery = project.discovery;

  return {
    projectName: project.name,
    targetTier: project.proposal?.selectedTier as "Bronze" | "Silver" | "Gold" | undefined,
    discovery: {
      ...seeds.discovery,
      customer: valueOrFallback(discovery?.customer, project.customer, "Sample customer"),
      site: valueOrFallback(discovery?.site, project.site),
      roomName: valueOrFallback(discovery?.roomName, project.roomName, "Room"),
      applicationType: valueOrFallback(discovery?.applicationType, seeds.discovery.applicationType, project.template?.application ?? "General AV"),
      roomLengthM: valueOrFallback(discovery?.roomLengthM, seeds.discovery.roomLengthM),
      roomWidthM: valueOrFallback(discovery?.roomWidthM, seeds.discovery.roomWidthM),
      roomHeightM: valueOrFallback(discovery?.roomHeightM, seeds.discovery.roomHeightM),
      displayLocation: valueOrFallback(discovery?.displayLocation, seeds.discovery.displayLocation),
      sourceLocation: valueOrFallback(discovery?.sourceLocation, seeds.discovery.sourceLocation),
      rackLocation: valueOrFallback(discovery?.rackLocation, seeds.discovery.rackLocation),
      cableDistanceM: valueOrFallback(discovery?.cableDistanceM, seeds.discovery.cableDistanceM),
      displayCount: valueOrFallback(discovery?.displayCount, seeds.discovery.displayCount),
      sourceCount: valueOrFallback(discovery?.sourceCount, seeds.discovery.sourceCount),
      usbNeeds: valueOrFallback(discovery?.usbNeeds, seeds.discovery.usbNeeds),
      audioNeeds: valueOrFallback(discovery?.audioNeeds, seeds.discovery.audioNeeds),
      controlNeeds: valueOrFallback(discovery?.controlNeeds, seeds.discovery.controlNeeds),
      budgetBand: valueOrFallback(discovery?.budgetBand, seeds.discovery.budgetBand),
      urgency: valueOrFallback(discovery?.urgency, seeds.discovery.urgency),
      notes: valueOrFallback(discovery?.notes, project.notes),
      recommendedFamilies: discovery?.recommendedFamilies ?? seeds.discovery.recommendedFamilies,
      recommendedNextTool: valueOrFallback(discovery?.recommendedNextTool, seeds.discovery.recommendedNextTool, "/app/tools/catalog"),
    },
    template: seeds.template,
    videoWall: seeds.videoWall,
  };
}

const noop = async () => {};

const [GenerationContext, useGenerationContext] =
  createStrictContext<GenerationContextValue>("Generation");

export { useGenerationContext };

export function GenerationProvider(props: { children: React.ReactNode }) {
  const handleStartFromTemplate = React.useCallback(async (template?: UserTemplate, navigate?: NavigateFunction) => {
    if (!template) return;

    const project = buildTemplateProject(template);
    setActiveProjectId(project.id);

    if (typeof navigate === "function") {
      navigate(`/app/projects/${project.id}`);
    }
  }, []);

  const handleDesignRoom = React.useCallback(async (roomId?: string) => {
    const activeProject = getActiveProject() ?? ensureActiveProject({
      name: "New Project",
      customer: "Sample customer",
      roomName: roomId || "Room",
      stage: "Discovery",
      status: "Draft",
      notes: "",
    });

    const designInput = buildDesignInput(activeProject);
    const result = await designRoom({ ...designInput, roomId });

    const recommendedFamilies = normalizeFamilies(result.recommendedFamilies);
    const catalogSkus = mergeSkus(activeProject.catalog?.skus, result.suggestedSkus);

    const mergedNotes = [
      activeProject.notes?.trim(),
      roomId ? `Deterministic design refresh executed for room: ${roomId}.` : "Deterministic design refresh executed for active project.",
      result.summary.proposalSummary,
      result.notes.join(" "),
    ].filter(Boolean).join("\n\n");

    const nextDiscovery: ProjectDiscovery = {
      customer: valueOrFallback(activeProject.discovery?.customer, activeProject.customer, "Sample customer"),
      site: valueOrFallback(activeProject.discovery?.site, activeProject.site),
      roomName: valueOrFallback(activeProject.discovery?.roomName, activeProject.roomName, "Room"),
      applicationType: valueOrFallback(result.bundle.discovery.applicationType, activeProject.discovery?.applicationType, activeProject.template?.application ?? "General AV"),
      roomLengthM: valueOrFallback(result.bundle.discovery.roomLengthM, activeProject.discovery?.roomLengthM),
      roomWidthM: valueOrFallback(result.bundle.discovery.roomWidthM, activeProject.discovery?.roomWidthM),
      roomHeightM: valueOrFallback(result.bundle.discovery.roomHeightM, activeProject.discovery?.roomHeightM),
      displayLocation: valueOrFallback(result.bundle.discovery.displayLocation, activeProject.discovery?.displayLocation),
      sourceLocation: valueOrFallback(result.bundle.discovery.sourceLocation, activeProject.discovery?.sourceLocation),
      rackLocation: valueOrFallback(result.bundle.discovery.rackLocation, activeProject.discovery?.rackLocation),
      cableDistanceM: valueOrFallback(result.bundle.discovery.cableDistanceM, activeProject.discovery?.cableDistanceM),
      displayCount: valueOrFallback(result.bundle.discovery.displayCount, activeProject.discovery?.displayCount),
      sourceCount: valueOrFallback(result.bundle.discovery.sourceCount, activeProject.discovery?.sourceCount),
      usbNeeds: valueOrFallback(result.bundle.discovery.usbNeeds, activeProject.discovery?.usbNeeds),
      audioNeeds: valueOrFallback(result.bundle.discovery.audioNeeds, activeProject.discovery?.audioNeeds),
      controlNeeds: valueOrFallback(result.bundle.discovery.controlNeeds, activeProject.discovery?.controlNeeds),
      budgetBand: valueOrFallback(result.bundle.discovery.budgetBand, activeProject.discovery?.budgetBand),
      urgency: valueOrFallback(result.bundle.discovery.urgency, activeProject.discovery?.urgency),
      notes: mergedNotes,
      recommendedFamilies,
      recommendedNextTool: result.nextTool,
      createdAt: activeProject.discovery?.createdAt ?? activeProject.createdAt,
    };

    updateProject(activeProject.id, {
      stage: "Design",
      notes: mergedNotes,
      discovery: nextDiscovery,
      catalog: {
        ...(activeProject.catalog ?? {}),
        skus: catalogSkus,
        notes: [
          activeProject.catalog?.notes?.trim(),
          `Design families: ${recommendedFamilies.join(", ") || "Apollo"}.`,
          `Bundle counts: ${result.bundle.devices.length} devices, ${result.bundle.cables.length} cables.`,
        ].filter(Boolean).join("\n"),
      },
      proposal: {
        ...(activeProject.proposal ?? {}),
        selectedTier: activeProject.proposal?.selectedTier ?? activeProject.template?.tier ?? "Silver",
        title: activeProject.proposal?.title ?? `${activeProject.name} design proposal`,
        notes: [activeProject.proposal?.notes?.trim(), result.summary.proposalSummary]
          .filter(Boolean)
          .join("\n\n"),
      },
    });

    setActiveProjectId(activeProject.id);
  }, []);

  const value = React.useMemo<GenerationContextValue>(() => ({
    handleDesignRoom,
    handleAgentSubmit: noop,
    handleSurveyImport: noop,
    handleStartFromTemplate,
  }), [handleDesignRoom, handleStartFromTemplate]);

  return <GenerationContext.Provider value={value}>{props.children}</GenerationContext.Provider>;
}
