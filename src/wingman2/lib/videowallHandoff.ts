import {
  defaultWallRequirements,
  validateWallRequirements,
  type WallApplication,
  type WallLayout,
  type WallRequirements,
} from "./videowallOptions";
import { wallPhysicalSize } from "./wallPhysicalSize";

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
  /**
   * The project whose Discovery answers this wall came from, when one names it.
   * The label says what the wall does; the room says which room it was answered
   * for, which is what a rep opening the builder needs in front of them.
   */
  projectName?: string;
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

/**
 * Seed the builder from the wall answers already captured in Discovery.
 *
 * `projectName` is the room those answers describe, when the project or the
 * draft names one: the wall arrives in a builder that also serves every other
 * room, so the arrival has to say which room it was answered for.
 */
export function discoveryVideoWallHandoff(answers: AnswerMap, projectName?: string | null): VideoWallHandoff | null {
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

  const room = (projectName ?? "").trim();

  return {
    source: "discovery",
    label: handoffLabel(application, independent, multiWindow),
    ...(room ? { projectName: room } : {}),
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
    const projectName = typeof parsed.projectName === "string" ? parsed.projectName.trim() : "";
    return {
      source: parsed.source,
      label: typeof parsed.label === "string" && parsed.label.trim() ? parsed.label.trim() : "Wingman discovery",
      requirements: parsed.requirements,
      ...(templateId ? { templateId } : {}),
      ...(projectName ? { projectName } : {}),
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

/**
 * The wall a handoff opened, named the way the shared-link banner names one.
 *
 * A handoff arrives from another room's Discovery answers or from a template, so
 * the rep is reading a design they did not build. A banner that only says where
 * it came from leaves the same question a bare URL leaves — what am I standing
 * in front of? — so it names the array and the display `wallPhysicalSize`
 * reports, the phrase the shared-link banner, the copy confirmation and the
 * pasted line all quote. A wall that reads "55 in panels" here and nothing
 * there, or another size somewhere else, is two walls to the person comparing a
 * handoff with a link.
 */
export function wallHandoffDisplay(requirements: WallRequirements) {
  return `the ${requirements.columns} × ${requirements.rows} array, ${wallPhysicalSize(requirements).basis}`;
}

/**
 * Where a handoff came from, in the words every surface quotes: the label that
 * says what the wall does, and — for a Discovery wall — the room it was answered
 * for.
 *
 * The room rides here rather than in `label` because the label also names the
 * wall's behaviour ("LCD wall, single canvas"), and a builder that serves every
 * room needs both facts to say what arrived. A template handoff already names
 * itself, so it has no room to add. The banner and the saved wall's `origin`
 * both read this, so a record cannot name a wall differently from its arrival.
 */
export function wallHandoffOrigin(handoff: VideoWallHandoff): string {
  const room = (handoff.projectName ?? "").trim();
  return room ? `${handoff.label} (${room})` : handoff.label;
}

/**
 * The one sentence a handoff banner prints, in either reading of the builder.
 *
 * Both readings show the same arrival — a wall answered somewhere else — so they
 * quote one sentence rather than each composing its own, and the origin names
 * the room a Discovery wall was answered for. A handoff opens the guided
 * reading on its result, which is why the note belongs there and not on a
 * capture step the rep never sees.
 */
export function wallHandoffNote(handoff: VideoWallHandoff, requirements: WallRequirements) {
  return `Started from ${wallHandoffOrigin(handoff)} — ${wallHandoffDisplay(requirements)}. The answers below are taken from that work — adjust anything that differs.`;
}

/** Merge a handoff onto the builder defaults, rejecting anything invalid. */
export function seedWallRequirements(handoff: VideoWallHandoff | null): WallRequirements | null {
  if (!handoff) return null;
  const merged: WallRequirements = { ...defaultWallRequirements, ...handoff.requirements };
  if (validateWallRequirements(merged).length) return null;
  return merged;
}
