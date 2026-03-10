import type { WingmanProjectState } from "@/core/workflow/projectState";

export type ProposalDraft = {
  solutionSummary: string;
  assumptions: string[];
  nextSteps: string[];
  commercialNotes: string[];
};

function safeText(value: unknown, fallback = "not yet defined"): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function nonZeroNumber(value: unknown, fallback = "not yet defined"): string {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return n > 0 ? String(n) : fallback;
}

function deriveArchitecture(state: WingmanProjectState): string {
  const roomType = (state.roomType ?? "").toLowerCase();
  const app = (state.application ?? "").toLowerCase();
  const displays = Number(state.displayCount ?? 0);
  const distance = Number(state.distanceM ?? 0);
  const wallType = (state.videoWall?.wallType ?? "").toLowerCase();

  if (wallType === "lcd" || wallType === "led") {
    return "video wall architecture with dedicated processing and mapped signal distribution";
  }

  if (app.includes("teams") || app.includes("meeting")) {
    if (distance > 20) return "meeting-room switching and extension architecture with longer-distance transport";
    return "meeting-room switching architecture with local collaboration and display connectivity";
  }

  if (roomType.includes("class") || roomType.includes("training")) {
    return "teaching-space presentation and distribution architecture";
  }

  if (displays >= 3) {
    return "multi-display distribution architecture";
  }

  if (distance > 30) {
    return "extended-distance signal transport architecture";
  }

  return "core AV switching and distribution architecture";
}

function deriveSolutionSummary(state: WingmanProjectState): string {
  const customer = safeText(state.customer, "the client");
  const roomType = safeText(state.roomType, "the target space");
  const application = safeText(state.application, "the intended application");
  const displays = nonZeroNumber(state.displayCount, "an undefined number of");
  const sources = nonZeroNumber(state.sourceCount, "an undefined number of");
  const distance = nonZeroNumber(state.distanceM, "an undefined");
  const budget = safeText(state.budgetBand, "an open");
  const architecture = deriveArchitecture(state);

  if ((state.videoWall?.wallType ?? "").trim()) {
    const wallType = safeText(state.videoWall?.wallType, "video wall");
    const layout = safeText(state.videoWall?.layout, "custom layout");
    return `This proposal outlines a ${wallType} ${layout} solution for ${customer}, intended for ${roomType}. The current design direction assumes ${sources} source inputs feeding ${displays} display endpoints through a ${architecture}. The proposal should be positioned around system usability, signal reliability, and a clear upgrade path within a ${budget} budget band.`;
  }

  return `This proposal outlines a WyreStorm solution for ${customer}, intended for ${roomType} and aligned to ${application}. The current design direction assumes ${sources} source inputs, ${displays} display endpoints, and transport requirements of approximately ${distance} metres, built around a ${architecture}. The commercial narrative should focus on fit-for-purpose design, usability, and value within a ${budget} budget band.`;
}

function deriveAssumptions(state: WingmanProjectState): string[] {
  const items: string[] = [];

  items.push(`Project stage is currently recorded as ${safeText(state.stage, "Discovery")}.`);
  items.push(`Room type is recorded as ${safeText(state.roomType)} and application is ${safeText(state.application)}.`);
  items.push(`The design currently assumes ${nonZeroNumber(state.sourceCount, "an undefined number of")} sources and ${nonZeroNumber(state.displayCount, "an undefined number of")} displays.`);
  items.push(`Transport distance is currently captured as ${nonZeroNumber(state.distanceM, "an undefined")} metres.`);
  items.push(`Control requirement is recorded as ${safeText(state.avGuide?.control)}.`);
  items.push(`USB requirement is recorded as ${safeText(state.avGuide?.usb)} and audio requirement is ${safeText(state.avGuide?.audio)}.`);

  if ((state.videoWall?.wallType ?? "").trim()) {
    items.push(`Video wall type is ${safeText(state.videoWall?.wallType)} with a ${safeText(state.videoWall?.layout)} layout.`);
    items.push(`Wall processor or controller requirement is recorded as ${safeText(state.videoWall?.processor)}.`);
    items.push(`Video wall source note is recorded as ${safeText(state.videoWall?.sources)}.`);
  }

  if ((state.notes ?? "").trim()) {
    items.push(`General project notes should be reviewed and incorporated into final scope language.`);
  }

  if (!state.bom || state.bom.length === 0) {
    items.push("No confirmed BOM lines are currently saved in the active project.");
  } else {
    items.push(`The active project currently contains ${state.bom.length} BOM line item(s).`);
  }

  return items;
}

function deriveNextSteps(state: WingmanProjectState): string[] {
  const items: string[] = [];

  if (!state.bom || state.bom.length === 0) {
    items.push("Confirm the initial product shortlist and build the BOM before final proposal release.");
  } else {
    items.push("Review BOM quantities, role descriptions, and any missing accessories before export.");
  }

  if (!(state.customer ?? "").trim()) {
    items.push("Confirm customer name and project reference for proposal title and document control.");
  }

  if (!(state.roomType ?? "").trim() || !(state.application ?? "").trim()) {
    items.push("Complete room type and application notes so the design narrative is more specific.");
  }

  if ((state.videoWall?.wallType ?? "").trim()) {
    items.push("Validate processor, layout, and display technology assumptions before pricing the wall solution.");
  }

  items.push("Add exclusions, assumptions, and any third-party dependencies before customer issue.");
  items.push("Confirm commercial notes, lead times, and whether installation or commissioning is included.");

  return items;
}

function deriveCommercialNotes(state: WingmanProjectState): string[] {
  const notes: string[] = [];

  notes.push("Position the design around operational fit, reliability, and ease of deployment.");
  notes.push("Keep the proposal customer-facing and avoid overloading the document with internal engineering language.");
  notes.push("Separate confirmed scope from optional enhancements or future-phase upgrades.");

  if ((state.budgetBand ?? "").trim()) {
    notes.push(`Current budget reference is ${state.budgetBand}; align the recommended solution tier accordingly.`);
  }

  if ((state.videoWall?.wallType ?? "").trim()) {
    notes.push("For video wall opportunities, clearly describe processing, layout assumptions, and display technology choices.");
  }

  return notes;
}

export function buildProposalDraft(state: WingmanProjectState): ProposalDraft {
  return {
    solutionSummary: deriveSolutionSummary(state),
    assumptions: deriveAssumptions(state),
    nextSteps: deriveNextSteps(state),
    commercialNotes: deriveCommercialNotes(state),
  };
}