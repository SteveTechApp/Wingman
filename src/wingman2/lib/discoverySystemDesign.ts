// Discovery system design.
//
// A Discovery brief describes a whole room, and a room almost never resolves to
// a single product: an AV-over-IP design needs encoders, decoders and a
// controller; a matrix design needs the matrix and a receiver at each remote
// display; a UC room needs a room core plus a camera and microphones.
//
// The recommendation path previously collapsed the entire brief into one
// `FinderNeedDraft` and asked the selector for candidates. That returns a
// ranked list of ALTERNATIVES for a single slot - twelve products that could
// each be "the" answer - when what the brief actually described was a system
// made of several different products. The multi-product result the user
// expected had nowhere to come from.
//
// This module decomposes the brief into the slots the system needs, so each
// slot can be resolved to its own product. Slots are matched against the
// governed taxonomy (`subClassifications`, `primaryCategory`) rather than
// product prose, for the same reason role resolution is: an application
// mention on a datasheet is not a capability.

import type { StoredDiscoveryBrief } from "../data/projectStore";
import type { ProductClassificationFacts } from "./productRoleResolution";

export type SystemSlotKind =
  | "avoip-encoder"
  | "avoip-decoder"
  | "avoip-control"
  | "wall-processor"
  | "multiview"
  | "matrix"
  | "presentation-core"
  | "extension"
  | "camera"
  | "microphone"
  | "room-audio"
  | "control"
  | "wireless";

export type SystemSlot = {
  kind: SystemSlotKind;
  label: string;
  /** Why this slot exists, in language a non-expert rep can repeat. */
  purpose: string;
  quantity: number;
  /** Which Discovery answers produced this slot - shown as evidence. */
  derivedFrom: string[];
  /** False for slots worth offering but not required by the brief. */
  required: boolean;
  /** Taxonomy match, not text match. */
  match: {
    tokens?: string[];
    primaryCategory?: string[];
    excludeTokens?: string[];
  };
};

export type SystemDesign = {
  architecture: SystemArchitecture;
  architectureReason: string;
  slots: SystemSlot[];
  /** Parts of the design the brief did not answer well enough to size. */
  openQuestions: string[];
};

export type SystemArchitecture =
  | "avoip"
  | "video-wall"
  | "matrix"
  | "presentation"
  | "extension"
  | "undetermined";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function lower(value: unknown): string {
  return text(value).toLowerCase();
}

function listText(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => text(item)).join(" ").toLowerCase();
  return lower(value);
}

/**
 * Counts in a brief arrive as free text ("4", "4 displays", "6-10"). Parse the
 * first integer and treat an unparseable value as unknown rather than 1, so a
 * missing answer becomes an open question instead of a silently undersized
 * system.
 */
export function parseCount(value: unknown): number | null {
  const raw = text(value);
  if (!raw) return null;
  const match = raw.match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function decideArchitecture(room: Record<string, unknown>): { architecture: SystemArchitecture; reason: string } {
  const blob = [
    lower(room.application),
    lower(room.outcome),
    lower(room.recommendedProductPath),
    lower(room.displayBehaviour),
    listText(room.devices),
    lower(room.avoipProfile),
    lower(room.avoipSeriesHint),
  ].join(" ");

  const displays = parseCount(room.displayCount);
  const sources = parseCount(room.sourceCount);

  if (/video wall|videowall|led wall/.test(blob)) {
    return { architecture: "video-wall", reason: "The brief describes a video wall or LED wall." };
  }

  if (/networkhd|av over ip|avoip|distribut(?:ed|ion)/.test(blob) || text(room.avoipProfile) || (displays !== null && displays > 10)) {
    return {
      architecture: "avoip",
      reason: displays !== null && displays > 10
        ? `The brief captures ${displays} displays, beyond what a fixed matrix serves comfortably.`
        : "The brief describes distributed or AV-over-IP routing.",
    };
  }

  if (sources !== null && displays !== null && sources > 1 && displays > 1) {
    return {
      architecture: "matrix",
      reason: `The brief captures ${sources} sources to ${displays} displays, which needs routing between them.`,
    };
  }

  if (sources !== null && sources > 1) {
    return {
      architecture: "presentation",
      reason: `The brief captures ${sources} sources sharing one display, which needs switching at the room.`,
    };
  }

  if (displays !== null || sources !== null) {
    return {
      architecture: "extension",
      reason: "The brief describes a single source and display, so the requirement is getting the signal there.",
    };
  }

  return {
    architecture: "undetermined",
    reason: "The brief does not yet capture enough about sources and displays to fix the system shape.",
  };
}

function needsExtension(room: Record<string, unknown>): boolean {
  const run = `${lower(room.cableRun)} ${lower(room.longestRun)}`;
  if (!run.trim()) return false;
  // Anything expressed in metres beyond a short in-room run, or described in
  // words as a long run, means the signal cannot go direct on HDMI.
  const metres = run.match(/(\d+)\s*m/);
  if (metres && Number.parseInt(metres[1], 10) > 10) return true;
  return /long|remote|another room|floor|building|100m|70m|50m/.test(run);
}

/**
 * Decompose a Discovery brief into the set of products the described system
 * actually needs. Pure and deterministic so it can be tested against briefs
 * directly.
 */
export function buildSystemDesign(brief: StoredDiscoveryBrief | null): SystemDesign {
  const room = asRecord(brief?.roomModel);
  const { architecture, reason } = decideArchitecture(room);

  const slots: SystemSlot[] = [];
  const openQuestions: string[] = [];

  const sources = parseCount(room.sourceCount);
  const displays = parseCount(room.displayCount);

  const sourceEvidence = sources !== null ? `Sources captured: ${sources}` : "Source count not captured";
  const displayEvidence = displays !== null ? `Displays captured: ${displays}` : "Display count not captured";

  if (sources === null) openQuestions.push("How many sources need to reach the screens?");
  if (displays === null) openQuestions.push("How many displays does the room have?");

  switch (architecture) {
    case "avoip":
      slots.push({
        kind: "avoip-encoder",
        label: "Source encoder",
        purpose: "Puts each source onto the AV network so any display can show it.",
        quantity: sources ?? 1,
        derivedFrom: [sourceEvidence, reason],
        required: true,
        match: { tokens: ["encoder", "transceiver"], excludeTokens: ["decoder"] },
      });
      slots.push({
        kind: "avoip-decoder",
        label: "Display decoder",
        purpose: "Takes the chosen source off the network and drives one screen.",
        quantity: displays ?? 1,
        derivedFrom: [displayEvidence, reason],
        required: true,
        match: { tokens: ["decoder"], excludeTokens: ["encoder"] },
      });
      slots.push({
        kind: "avoip-control",
        label: "AV-over-IP controller",
        purpose: "Runs the routing: without it the encoders and decoders have nothing telling them what to show.",
        quantity: 1,
        derivedFrom: ["Every NetworkHD system needs a controller"],
        required: true,
        match: { tokens: ["networkhd-control", "avoip-infrastructure", "controller"] },
      });
      break;

    case "video-wall":
      slots.push({
        kind: "wall-processor",
        label: "Video wall processor",
        purpose: "Spreads one picture across the group of screens and holds the layout.",
        quantity: 1,
        derivedFrom: [reason],
        required: true,
        match: { tokens: ["video-wall", "multiview-processor"], primaryCategory: ["Video Processing"] },
      });
      break;

    case "matrix":
      slots.push({
        kind: "matrix",
        label: "Matrix switcher",
        purpose: "Routes any source to any display, which is what having several of both requires.",
        quantity: 1,
        derivedFrom: [sourceEvidence, displayEvidence, reason],
        required: true,
        match: { tokens: ["matrix"] },
      });
      break;

    case "presentation":
      slots.push({
        kind: "presentation-core",
        label: "Presentation switcher",
        purpose: "Gives the room one place to connect and puts the chosen source on the screen.",
        quantity: 1,
        derivedFrom: [sourceEvidence, reason],
        required: true,
        match: { tokens: ["presentation-switcher", "source-switcher", "switcher"] },
      });
      break;

    case "extension":
    case "undetermined":
      break;
  }

  // Extension is additive, not exclusive: a matrix or presentation system still
  // needs a receiver at each display that is too far for a direct cable. This
  // is the most commonly forgotten line on a quote.
  if (needsExtension(room)) {
    const extensionQuantity = architecture === "matrix" || architecture === "presentation" ? displays ?? 1 : 1;
    slots.push({
      kind: "extension",
      label: architecture === "extension" ? "Extender kit" : "Display extender",
      purpose: "Carries the signal to a screen that is too far away for a direct HDMI cable.",
      quantity: extensionQuantity,
      derivedFrom: [`Cable run captured: ${text(room.cableRun) || text(room.longestRun)}`],
      required: true,
      match: { tokens: ["extender", "hdbaset"], excludeTokens: ["matrix"] },
    });
  } else if (architecture === "extension") {
    openQuestions.push("How far is the display from the equipment position?");
  }

  const ucRequirement = `${lower(room.unifiedCommunicationsRequirement)} ${lower(room.ucPurpose)} ${lower(room.conferencingPlatform)}`;
  const isUc = /yes|teams|zoom|meet|video call|conferenc|hybrid|byom/.test(ucRequirement);

  if (isUc || text(room.cameraNeeds)) {
    slots.push({
      kind: "camera",
      label: "Room camera",
      purpose: "Shows the people in the room to the far end of the call.",
      quantity: 1,
      derivedFrom: [text(room.cameraNeeds) ? `Camera requirement: ${text(room.cameraNeeds)}` : "Room is used for calls"],
      required: Boolean(text(room.cameraNeeds)) || isUc,
      match: { tokens: ["camera", "ptz"], primaryCategory: ["Camera / Capture"] },
    });
  }

  if (isUc || text(room.microphoneNeeds)) {
    slots.push({
      kind: "microphone",
      label: "Room microphone",
      purpose: "Picks up people in the room clearly - the most common complaint on a call is not being heard.",
      quantity: parseCount(room.microphoneConnections) ?? 1,
      derivedFrom: [
        text(room.microphoneNeeds) ? `Microphone requirement: ${text(room.microphoneNeeds)}` : "Room is used for calls",
      ],
      required: Boolean(text(room.microphoneNeeds)) || isUc,
      match: { tokens: ["microphone", "speakerphone"] },
    });
  }

  const audioNeed = `${lower(room.audioNeeds)} ${lower(room.audioPath)}`;
  if (/amplif|speaker|reinforc|ceiling|dsp|dante|program audio|room audio/.test(audioNeed)) {
    slots.push({
      kind: "room-audio",
      label: "Room audio",
      purpose: "Drives the room's speakers so everyone can hear the source and the far end.",
      quantity: 1,
      derivedFrom: [`Audio requirement: ${text(room.audioNeeds) || text(room.audioPath)}`],
      required: true,
      match: { tokens: ["amplifier", "dsp"], primaryCategory: ["Audio"] },
    });
  }

  if (text(room.controlNeeds) && !/none|no control|not required/.test(lower(room.controlNeeds))) {
    slots.push({
      kind: "control",
      label: "Room control",
      purpose: "Gives users a way to drive the system without knowing what is in the rack.",
      quantity: 1,
      derivedFrom: [`Control requirement: ${text(room.controlNeeds)}`],
      required: false,
      // An AV-over-IP system controller is not a room control interface. It
      // carries a "controller" token and would otherwise fill this slot with
      // the same product already quoted as the NetworkHD controller.
      match: {
        primaryCategory: ["Control"],
        tokens: ["control", "touch"],
        excludeTokens: ["networkhd-control", "avoip-infrastructure", "networkhd-100", "networkhd-500", "networkhd-600"],
      },
    });
  }

  return { architecture, architectureReason: reason, slots, openQuestions };
}

/**
 * Does a product satisfy this slot? Answered from the governed taxonomy only.
 * A product with no classification cannot be silently accepted into a BoM.
 */
export function productMatchesSlot(
  classification: ProductClassificationFacts | undefined,
  slot: SystemSlot,
): boolean {
  if (!classification) return false;

  const tokens = new Set((classification.subClassifications ?? []).map((token) => token.trim().toLowerCase()));

  if (slot.match.excludeTokens?.some((token) => tokens.has(token))) return false;

  if (slot.match.tokens?.some((token) => tokens.has(token))) return true;

  const primary = classification.primaryCategory?.trim() ?? "";
  return Boolean(slot.match.primaryCategory?.includes(primary));
}
