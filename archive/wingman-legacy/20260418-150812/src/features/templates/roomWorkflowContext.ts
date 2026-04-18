import type { StoredProject } from "@/features/projects/projectStore";

import {
  ROOM_TEMPLATE_LIBRARY,
  roomTemplateSearchBlob,
  type RoomTemplateScenario,
} from "./roomTemplateLibrary";

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function dedupe(values: unknown[], limit = 12): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = tidy(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }

  return out;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length >= 4);
}

function buildProjectSearchBlob(project?: StoredProject | null): string {
  if (!project) return "";

  return [
    project.name,
    project.customer,
    project.site,
    project.roomName,
    project.notes,
    project.discovery?.applicationType,
    project.discovery?.projectScope,
    project.discovery?.customerOutcome,
    project.discovery?.workflowTrack,
    project.discovery?.featureRequirements,
    project.template?.application,
    project.template?.summary,
    project.template?.solutionSummary,
  ]
    .map((value) => tidy(value).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

export const DEFAULT_ROOM_TEMPLATE_ID = ROOM_TEMPLATE_LIBRARY[0]?.id ?? "";

export function findRoomTemplateById(id?: string | null): RoomTemplateScenario | undefined {
  const key = tidy(id);
  if (!key) return undefined;
  return ROOM_TEMPLATE_LIBRARY.find((template) => template.id === key);
}

export function deriveRoomTemplateFamilies(
  project?: StoredProject | null,
  room?: RoomTemplateScenario | null,
): string[] {
  return dedupe([
    ...(room?.recommendedFamilies || []),
    ...(project?.template?.recommendedFamilies || []),
    ...(project?.discovery?.recommendedFamilies || []),
    ...(project?.compare?.recommendedFamilies || []),
  ]);
}

export function findBestRoomTemplateForProject(
  project?: StoredProject | null,
): RoomTemplateScenario | undefined {
  if (!project) return undefined;

  const projectBlob = buildProjectSearchBlob(project);
  if (!projectBlob) return undefined;

  const projectFamilies = new Set(
    deriveRoomTemplateFamilies(project).map((item) => normalizeKey(item)),
  );

  let best: RoomTemplateScenario | undefined;
  let bestScore = 0;

  for (const room of ROOM_TEMPLATE_LIBRARY) {
    let score = 0;
    const roomBlob = roomTemplateSearchBlob(room);

    if (projectBlob.includes(room.roomType.toLowerCase())) score += 40;
    if (projectBlob.includes(room.vertical.toLowerCase())) score += 10;

    for (const family of room.recommendedFamilies) {
      if (projectFamilies.has(normalizeKey(family))) score += 14;
    }

    for (const token of tokenize(`${room.roomType} ${room.vertical} ${room.category} ${room.useCases.join(" ")}`)) {
      if (projectBlob.includes(token)) score += 2;
    }

    if (projectBlob.includes(roomBlob)) score += 12;

    if (score > bestScore) {
      bestScore = score;
      best = room;
    }
  }

  return bestScore > 0 ? best : undefined;
}
