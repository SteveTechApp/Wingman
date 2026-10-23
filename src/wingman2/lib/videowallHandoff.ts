import {
  defaultWallRequirements,
  validateWallRequirements,
  type WallApplication,
  type WallLayout,
  type WallRequirements,
} from "./videowallOptions";

/**
 * Discovery and templates both reach a point where the wall stops being a
 * line item and becomes its own design problem. This handoff carries the
 * answers already given into the Video Wall builder so the rep does not
 * re-answer them, and records where the design started.
 */

export const VIDEO_WALL_HANDOFF_KEY = "wingman:video-wall-builder-handoff";

export type VideoWallHandoffSource = "discovery" | "template";

export type VideoWallHandoff = {
  source: VideoWallHandoffSource;
  label: string;
  requirements: Partial<WallRequirements>;
  /**
   * The room template the design started from. Carried so the saved wall can
   * record its template instead of the export inferring it later from a project.
   */
  templateId?: string;
};

type AnswerMap = Record<string, unknown>;

type TemplateLike = {
  id: string;
  name: string;
  architecture?: string;
  summary?: string;
  concept?: { architectureFamily?: string };
  bom?: { sku?: string; description?: string; role?: string }[];
};

function answerText(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join("|");
  return typeof value === "string" ? value : "";
}

function answerHas(value: unknown, token: string): boolean {
  const wanted = token.toLowerCase();
  return answerText(value)
    .toLowerCase()
    .split(/[|,]+/)
    .some((part) => part.trim() === wanted);
}

function singleAnswer(answers: AnswerMap, key: string): string {
  const value = answers[key];
  return typeof value === "string" ? value.trim() : "";
}

/** True when the discovery answers describe a wall rather than a set of displays. */
export function hasDiscoveryVideoWallIntent(answers: AnswerMap): boolean {
  const technology = singleAnswer(answers, "video-wall-technology");
  const purpose = singleAnswer(answers, "video-wall-purpose");
  return (
    answerHas(answers["displays"], "video-wall-output")
    || answerHas(answers["display-behaviour"], "video-wall-or-processor-feed")
    || (Boolean(technology) && technology !== "wall-technology-unknown")
    || (Boolean(purpose) && purpose !== "wall-purpose-unknown")
    || answerHas(answers["opportunity"], "video-wall")
  );
}

function handoffLabel(application: WallApplication, independent: boolean, multiWindow: boolean): string {
  const wall = application === "led" ? "LED wall" : application === "projection" ? "projection canvas" : "LCD wall";
  const behaviour = independent ? "independent tiles" : multiWindow ? "multi-source canvas" : "single canvas";
  return `Discovery: ${wall}, ${behaviour}`;
}

/** Seed the builder from the wall answers already captured in Discovery. */
export function discoveryVideoWallHandoff(answers: AnswerMap): VideoWallHandoff | null {
  if (!hasDiscoveryVideoWallIntent(answers)) return null;

  const technology = singleAnswer(answers, "video-wall-technology");
  const purpose = singleAnswer(answers, "video-wall-purpose");
  const led = technology === "direct-view-led" || answerHas(answers["opportunity"], "led");
  const projection = technology === "projection-canvas";
  const independent = !led && !projection && purpose === "independent-tiles";
  const multiWindow = !independent && purpose === "multi-source-canvas";
  const nineOrMore = answerHas(answers["displays"], "nine-plus-displays");

  const application: WallApplication = led ? "led" : projection ? "projection" : independent ? "lcd-direct" : "lcd-loop";
  const layout: WallLayout = independent ? "independent" : multiWindow ? "quad" : "single";
  const columns = nineOrMore ? 3 : 2;
  const rows = nineOrMore ? 3 : 2;
  const windows = independent ? 1 : multiWindow ? 4 : 1;
  const sources = independent ? columns * rows : Math.max(4, windows);

  return {
    source: "discovery",
    label: handoffLabel(application, independent, multiWindow),
    requirements: {
      application,
      layout,
      windows,
      columns,
      rows,
      sources,
      customMode: "fixed",
    },
  };
}

/** True when a template's design depends on wall processing rather than a plain room. */
export function templateHasVideoWall(template: TemplateLike): boolean {
  if (template.concept?.architectureFamily === "Video wall") return true;
  const text = `${template.name} ${template.architecture ?? ""} ${template.summary ?? ""}`.toLowerCase();
  if (/video wall|led wall|lcd wall/.test(text)) return true;
  return (template.bom ?? []).some((row) => /^SW-020\d/i.test(String(row.sku ?? ""))
    || /video wall processor/i.test(`${row.role ?? ""} ${row.description ?? ""}`));
}

/**
 * Seed the builder from a wall template. The template's own processor sets the
 * array and input count so the design starts from the scope the rep selected.
 */
export function templateVideoWallHandoff(template: TemplateLike): VideoWallHandoff | null {
  if (!templateHasVideoWall(template)) return null;

  const bom = template.bom ?? [];
  const text = `${template.name} ${template.architecture ?? ""} ${template.summary ?? ""}`.toLowerCase();
  const wallSku = bom.find((row) => /^SW-020\d/i.test(String(row.sku ?? "")))?.sku ?? "";
  const sixOutput = /SW-0206/i.test(wallSku);

  const application: WallApplication = /led/.test(text)
    ? "led"
    : /projection/.test(text)
      ? "projection"
      : "lcd-loop";

  return {
    source: "template",
    label: `Template: ${template.name}`,
    templateId: template.id,
    requirements: {
      application,
      layout: "single",
      windows: 1,
      // A two-input wall processor only ever sees two sources; wider templates
      // keep the builder's default source allowance.
      sources: /SW-020\d/i.test(wallSku) ? 2 : 4,
      columns: sixOutput ? 3 : 2,
      rows: 2,
      customMode: "fixed",
    },
  };
}

export function writeVideoWallHandoff(handoff: VideoWallHandoff): void {
  try {
    window.sessionStorage.setItem(VIDEO_WALL_HANDOFF_KEY, JSON.stringify(handoff));
  } catch {
    // Storage can be unavailable; the builder then opens on its saved draft.
  }
}

export function readVideoWallHandoff(): VideoWallHandoff | null {
  try {
    const raw = window.sessionStorage.getItem(VIDEO_WALL_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VideoWallHandoff>;
    if (parsed.source !== "discovery" && parsed.source !== "template") return null;
    if (!parsed.requirements || typeof parsed.requirements !== "object") return null;
    const templateId = typeof parsed.templateId === "string" ? parsed.templateId.trim() : "";
    return {
      source: parsed.source,
      label: typeof parsed.label === "string" && parsed.label.trim() ? parsed.label.trim() : "Wingman discovery",
      requirements: parsed.requirements,
      ...(templateId ? { templateId } : {}),
    };
  } catch {
    return null;
  }
}

export function clearVideoWallHandoff(): void {
  try {
    window.sessionStorage.removeItem(VIDEO_WALL_HANDOFF_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

/** Merge a handoff onto the builder defaults, rejecting anything invalid. */
export function seedWallRequirements(handoff: VideoWallHandoff | null): WallRequirements | null {
  if (!handoff) return null;
  const merged: WallRequirements = { ...defaultWallRequirements, ...handoff.requirements };
  if (validateWallRequirements(merged).length) return null;
  return merged;
}
