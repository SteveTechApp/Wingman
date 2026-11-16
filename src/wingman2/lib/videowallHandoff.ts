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
  /** Discovery details that belong to the room but are not wall-array inputs. */
  roomDetails?: string[];
  /** Decisions that Discovery did not capture; the builder's starting values are provisional. */
  openQuestions?: string[];
};

type AnswerMap = Record<string, unknown>;
type NoteMap = Record<string, string | undefined>;

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

function answerNumber(answers: AnswerMap, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = answers[key];
    const number = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
    if (Number.isInteger(number) && number > 0 && number <= 256) return number;
  }
  return undefined;
}

function answerToken(answers: AnswerMap, key: string): string {
  const value = answers[key];
  return Array.isArray(value) ? String(value[0] ?? "").trim() : String(value ?? "").trim();
}

function relevantNotes(notes: NoteMap | undefined, keys: string[]): string[] {
  return keys.map((key) => notes?.[key]?.trim() ?? "").filter(Boolean);
}

function wallArrayFromNotes(notes: string[]): { columns: number; rows: number } | undefined {
  for (const note of notes) {
    const match = note.match(/\b(\d{1,2})\s*[x×]\s*(\d{1,2})(?!\s*(?:mm|cm|m|in(?:ch(?:es)?)?|ft|feet)\b)/i);
    if (!match) continue;
    const columns = Number(match[1]);
    const rows = Number(match[2]);
    if (columns > 0 && rows > 0 && columns * rows <= 256) return { columns, rows };
  }
  return undefined;
}

function wallArrayFromAnswer(answers: AnswerMap): { columns: number; rows: number } | undefined {
  const value = answerToken(answers, "primary-display-panel-array");
  const match = value.match(/^\s*(\d{1,2})\s*[x×]\s*(\d{1,2})\s*$/i);
  if (!match) return undefined;
  const columns = Number(match[1]);
  const rows = Number(match[2]);
  return columns > 0 && rows > 0 && columns * rows <= 256 ? { columns, rows } : undefined;
}

function endpointDescription(answers: AnswerMap): string | undefined {
  const labels: Record<string, string> = {
    "one-display": "1 video feed endpoint recorded",
    "two-displays": "2 video feed endpoints recorded",
    "three-eight-displays": "3–8 video feed endpoints recorded",
    "nine-plus-displays": "9+ video feed endpoints recorded",
    "video-wall-output": "Video wall / LED processor feed endpoint recorded",
  };
  return labels[answerToken(answers, "displays")];
}

function pixelCanvasFromNotes(notes: string[]): { width: number; height: number } | undefined {
  for (const note of notes) {
    const match = note.match(/\b(\d{3,5})\s*[x×]\s*(\d{3,5})\s*(?:px|pixels?)\b/i);
    if (!match) continue;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (width >= 320 && height >= 240 && width <= 16384 && height <= 16384) return { width, height };
  }
  return undefined;
}

function repeaterDescription(answers: AnswerMap, notes: NoteMap | undefined): string | undefined {
  const value = answerToken(answers, "repeater-displays");
  const labels: Record<string, string> = {
    "no-repeater-displays": "No repeater screens recorded",
    "one-two-repeater-displays": "1–2 repeater screens recorded",
    "three-four-repeater-displays": "3–4 repeater screens recorded",
    "five-eight-repeater-displays": "5–8 repeater screens recorded",
    "nine-plus-repeater-displays": "9+ repeater screens recorded",
    "unknown-repeater-displays": "Repeater screen count not confirmed",
  };
  const detail = notes?.["repeater-displays"]?.trim();
  return [labels[value], detail].filter(Boolean).join(" — ") || undefined;
}

/** True when the discovery answers describe a wall rather than a set of displays. */
export function hasDiscoveryVideoWallIntent(answers: AnswerMap): boolean {
  const technology = singleAnswer(answers, "video-wall-technology");
  const purpose = singleAnswer(answers, "video-wall-purpose");
  const primary = answerToken(answers, "primary-display");
  return (
    answerHas(answers["displays"], "video-wall-output")
    || answerHas(answers["display-behaviour"], "video-wall-or-processor-feed")
    || primary === "lcd-video-wall"
    || primary === "led-video-wall"
    || (Boolean(technology) && technology !== "wall-technology-unknown")
    || (Boolean(purpose) && purpose !== "wall-purpose-unknown")
    || answerHas(answers["opportunity"], "video-wall")
  );
}

function handoffLabel(application: WallApplication, behaviour: string): string {
  const wall = application === "led" ? "LED wall" : application === "projection" ? "projection canvas" : "LCD wall";
  return `Discovery: ${wall}, ${behaviour}`;
}

/**
 * Seed the builder from the wall answers already captured in Discovery.
 *
 * `projectName` is the room those answers describe, when the project or the
 * draft names one: the wall arrives in a builder that also serves every other
 * room, so the arrival has to say which room it was answered for.
 */
export function discoveryVideoWallHandoff(answers: AnswerMap, projectName?: string | null, notes?: NoteMap): VideoWallHandoff | null {
  if (!hasDiscoveryVideoWallIntent(answers)) return null;

  const technologyAnswer = singleAnswer(answers, "video-wall-technology");
  const primary = answerToken(answers, "primary-display");
  const primaryTechnology = primary === "lcd-video-wall" ? "lcd-array"
    : primary === "led-video-wall" ? "direct-view-led"
      : primary === "single-projector" || primary === "dual-projectors" ? "projection-canvas" : "";
  const technology = primaryTechnology || (technologyAnswer === "wall-technology-unknown" ? "" : technologyAnswer);
  const purposeAnswer = answerToken(answers, "video-wall-purpose");
  const behaviour = answers["display-behaviour"];
  const purpose = purposeAnswer && purposeAnswer !== "wall-purpose-unknown" ? purposeAnswer
    : answerHas(behaviour, "independent-routing-per-display") ? "independent-tiles"
      : answerHas(behaviour, "multiview-on-one-output") ? "multi-source-canvas" : "";
  const led = technology === "direct-view-led";
  const projection = technology === "projection-canvas";
  const independent = !led && !projection && purpose === "independent-tiles";
  const multiWindow = !independent && purpose === "multi-source-canvas";
  const dimensionNotes = relevantNotes(notes, ["video-wall-technology", "primary-display"]);
  const explicitArray = wallArrayFromNotes(dimensionNotes);
  const answerArray = wallArrayFromAnswer(answers);
  const columns = answerNumber(answers, "video-wall-columns", "wall-columns") ?? answerArray?.columns ?? explicitArray?.columns;
  const rows = answerNumber(answers, "video-wall-rows", "wall-rows") ?? answerArray?.rows ?? explicitArray?.rows;
  const arrayKnown = columns !== undefined && rows !== undefined;
  const pixelCanvas = pixelCanvasFromNotes(dimensionNotes);
  const lcdPanelSize = dimensionNotes.join(" ").match(/\b(\d{2,3}(?:\.\d+)?)\s*(?:in(?:ch(?:es)?)?\b|\")/i);
  const pitch = dimensionNotes.join(" ").match(/\b(\d+(?:\.\d+)?)\s*mm\s*(?:pixel\s*)?pitch\b/i);
  const application: WallApplication = led ? "led" : projection ? "projection" : independent ? "lcd-direct" : "lcd-loop";
  const behaviourLabel = independent ? "independent tiles"
    : multiWindow ? "multi-source canvas"
      : purpose === "single-canvas" ? "single canvas"
        : purpose === "signage-presets" ? "signage presets" : "content behaviour not confirmed";
  const layout: WallLayout = independent ? "independent" : multiWindow ? "quad" : "single";
  // Display output count and repeater screens describe signal endpoints, not
  // the LCD panel/cabinet array. Keep the builder's 2×2 starting basis only as
  // an explicit provisional value when Discovery has no array measurement.
  const arrayColumns = columns ?? 2;
  const arrayRows = rows ?? 2;
  const windows = independent ? 1 : multiWindow ? 4 : 1;
  const sources = independent ? arrayColumns * arrayRows : Math.max(4, windows);
  const roomDetails = [endpointDescription(answers), repeaterDescription(answers, notes), ...relevantNotes(notes, ["primary-display", "primary-display-panel-array", "video-wall-technology", "video-wall-purpose"])]
    .filter((detail): detail is string => Boolean(detail));
  const openQuestions: string[] = [];
  if (!technology) openQuestions.push("Wall technology is not confirmed; the builder's LCD workflow is only a temporary planning basis.");
  if (!arrayKnown) openQuestions.push("Panel/cabinet array is not captured; the displayed 2 × 2 array is a temporary planning starting point, not a confirmed design.");
  if (led && !pixelCanvas) openQuestions.push("LED pixel canvas is not captured; confirm processor canvas dimensions.");
  if (led && !pitch) openQuestions.push("LED pixel pitch is not captured; confirm it before sizing the physical wall.");
  if (!led && !projection && !lcdPanelSize) openQuestions.push("LCD panel diagonal is not captured; confirm the panel size before treating physical dimensions as final.");
  if (technologyAnswer && primaryTechnology && technologyAnswer !== primaryTechnology) {
    openQuestions.push("Primary display selection and video wall technology answer differ; confirm which technology is correct.");
  }
  if (!purpose) openQuestions.push("Wall content behaviour is not confirmed; confirm single canvas, independent tiles or multiview.");

  const room = (projectName ?? "").trim();

  return {
    source: "discovery",
    label: technology ? handoffLabel(application, behaviourLabel) : `Discovery: wall technology not confirmed, ${behaviourLabel}`,
    ...(room ? { projectName: room } : {}),
    ...(roomDetails.length ? { roomDetails: [...new Set(roomDetails)] } : {}),
    ...(openQuestions.length ? { openQuestions } : {}),
    requirements: {
      application,
      layout,
      windows,
      columns: arrayColumns,
      rows: arrayRows,
      sources,
      customMode: "fixed",
      ...(led && pixelCanvas ? { ledCanvasWidth: pixelCanvas.width, ledCanvasHeight: pixelCanvas.height } : {}),
      ...(lcdPanelSize && !led ? { panelDiagonalInches: Number(lcdPanelSize[1]) } : {}),
      ...(pitch && led ? { pixelPitchMm: Number(pitch[1]) } : {}),
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
    const roomDetails = Array.isArray(parsed.roomDetails) ? parsed.roomDetails.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()) : [];
    const openQuestions = Array.isArray(parsed.openQuestions) ? parsed.openQuestions.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()) : [];
    return {
      source: parsed.source,
      label: typeof parsed.label === "string" && parsed.label.trim() ? parsed.label.trim() : "Wingman discovery",
      requirements: parsed.requirements,
      ...(templateId ? { templateId } : {}),
      ...(projectName ? { projectName } : {}),
      ...(roomDetails.length ? { roomDetails } : {}),
      ...(openQuestions.length ? { openQuestions } : {}),
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

/** Include the captured room context and unresolved design decisions in the saved wall record. */
export function wallHandoffSavedOrigin(handoff: VideoWallHandoff): string {
  const context = handoff.roomDetails?.length ? `Captured: ${handoff.roomDetails.join("; ")}.` : "";
  const open = handoff.openQuestions?.length ? ` To confirm: ${handoff.openQuestions.join(" ")}` : "";
  return `${wallHandoffOrigin(handoff)}${context ? ` — ${context}` : ""}${open}`;
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
  const details = handoff.roomDetails?.length ? ` Room details: ${handoff.roomDetails.join("; ")}.` : "";
  const open = handoff.openQuestions?.length ? ` Still to confirm: ${handoff.openQuestions.join(" ")}` : "";
  return `Started from ${wallHandoffOrigin(handoff)} — ${wallHandoffDisplay(requirements)}. The answers below are taken from that work — adjust anything that differs.${details}${open}`;
}

/** Merge a handoff onto the builder defaults, rejecting anything invalid. */
export function seedWallRequirements(handoff: VideoWallHandoff | null): WallRequirements | null {
  if (!handoff) return null;
  const merged: WallRequirements = { ...defaultWallRequirements, ...handoff.requirements };
  if (validateWallRequirements(merged).length) return null;
  return merged;
}
