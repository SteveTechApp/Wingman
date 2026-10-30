import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultProjectStore } from "../features/projects/model/projectDefaults";
import {
  duplicateCustomRoomTemplate,
  getCustomRoomTemplates,
  projectRoomTemplate,
  saveCustomRoomTemplate,
  saveProjectAsRoomTemplate,
  saveRoomTemplateCopy,
} from "./customRoomTemplates";
import { createBlankProjectTopology } from "./projectTopology";
import type { TemplateBomRow } from "./roomTemplates";

const CUSTOM_ROOM_TEMPLATE_KEY = "wingman-custom-room-templates-v1";

/**
 * What a room saved from a project carries into a template.
 *
 * A `TBC-` row is a question this room's design raised, and a template is the
 * starting point for a different room whose own answers raise their own
 * prompts. So the placeholder is not scope that travels, while the dependency
 * the next rep has to confirm is.
 */
const matrixRow = {
  item: 1,
  sku: "MX-0404-HDMI",
  description: "Presentation matrix",
  role: "Switching",
  qty: 1,
  type: "Required" as const,
  status: "included",
  evidence: "Customer brief",
  notes: "",
};

const networkPrompt = {
  item: 2,
  sku: "TBC-AV-NETWORK",
  description: "AV network readiness",
  role: "Network infrastructure",
  qty: 1,
  type: "Validate" as const,
  status: "validate",
  evidence: "Network availability is not fully confirmed.",
  notes: "Dependency prompt requiring design validation. Is there a managed AV network?",
};

function boardroom(governanceWarnings?: string[]) {
  const project = createDefaultProjectStore(() => "2026-10-26T09:00:00.000Z").projects[0];
  project.name = "Boardroom";
  project.proposal = {
    title: "Boardroom",
    summary: "Share slides",
    sections: [],
    products: [],
    assumptions: [],
    updatedAt: "2026-10-26T09:00:00.000Z",
    bomRows: [matrixRow, networkPrompt],
    ...(governanceWarnings ? { governanceWarnings } : {}),
  };
  return project;
}

/** A stored template that still carries a prompt, as one saved before the rule does. */
function storedTemplateWithPrompt() {
  const bom: TemplateBomRow[] = [
    {
      id: "stored-matrix",
      sku: "MX-0404-HDMI",
      description: "Presentation matrix",
      role: "Switching",
      qty: 1,
      type: "Required",
      status: "included",
      evidence: "Saved from project.",
      notes: "",
    },
    {
      id: "stored-network",
      sku: "TBC-AV-NETWORK",
      description: "AV network readiness",
      role: "Network infrastructure",
      qty: 1,
      type: "Validate",
      status: "validate",
      evidence: "Network availability is not fully confirmed.",
      notes: "Dependency prompt requiring design validation.",
    },
  ];
  return saveCustomRoomTemplate({
    id: "stored-boardroom",
    name: "Stored boardroom",
    vertical: "Corporate",
    application: "Meeting room / boardroom",
    scale: "12 seats",
    summary: "A stored boardroom design.",
    customerNarrative: "A stored boardroom design.",
    architecture: "Local matrix switching to a single display.",
    designNotes: [],
    assumptions: [],
    validationItems: ["Confirm the display height at survey."],
    upgradePaths: [],
    bom,
  });
}

describe("saving a project as a room template", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("does not quote another room's open question in the template's schedule", () => {
    const template = saveProjectAsRoomTemplate(
      boardroom(["AV network readiness: Is there a managed AV network with suitable bandwidth?"]),
    );

    // The named part travels; the placeholder does not.
    expect(template.bom.map((row) => row.sku)).toEqual(["MX-0404-HDMI"]);
    // The question is kept where a template prints it, and it is named once:
    // the project's own warning already said it in a longer sentence.
    expect(template.validationItems).toEqual([
      "AV network readiness: Is there a managed AV network with suitable bandwidth?",
    ]);
    // The store the next visit reads says the same thing.
    const stored = getCustomRoomTemplates().find((candidate) => candidate.id === template.id)!;
    expect(stored.bom.some((row) => row.sku.startsWith("TBC-"))).toBe(false);
    expect(stored.validationItems).toContain(template.validationItems[0]);
  });

  it("names the dependency when the project's own warnings never did", () => {
    const template = saveProjectAsRoomTemplate(boardroom());

    expect(template.bom.map((row) => row.sku)).toEqual(["MX-0404-HDMI"]);
    // The fallback item is still there, and the dependency joins it rather than
    // being the only thing the template admits to.
    expect(template.validationItems).toEqual([
      "Confirm the project-derived template still matches the next customer's room.",
      "AV network readiness",
    ]);
  });

  it("names the project it was saved from, so the library can filter by it", () => {
    const project = boardroom();
    const template = saveProjectAsRoomTemplate(project);
    expect(template.sourceProjectId).toBe(project.id);
  });

  it("updates the room's template instead of saving a second one beside it", () => {
    const project = boardroom();
    const first = saveProjectAsRoomTemplate(project);

    // The room moved on: the proposal was reworked and its placeholder answered.
    project.proposal = { ...project.proposal!, summary: "Share slides on two displays", bomRows: [matrixRow] };
    const second = saveProjectAsRoomTemplate(project);

    // One row in the library, carrying the later design: a room has one
    // template, so a second save republishes it rather than adding to it.
    expect(getCustomRoomTemplates().filter((template) => template.sourceProjectId === project.id)).toHaveLength(1);
    expect(second.id).toBe(first.id);
    expect(second.summary).toBe("Share slides on two displays");
    expect(second.name).toBe("Boardroom template");
    // Only the design was refreshed; the template is still the one that was made
    // on the first save.
    expect(second.createdAt).toBe(first.createdAt);
  });

  it("keeps the name the rep gave that template", () => {
    const project = boardroom();
    const saved = saveProjectAsRoomTemplate(project);
    saveCustomRoomTemplate({ ...saved, name: "Boardroom AV standard" }, { id: saved.id });

    const again = saveProjectAsRoomTemplate(project);

    expect(again.id).toBe(saved.id);
    expect(again.name).toBe("Boardroom AV standard");
  });

  it("updates the room's own record rather than a copy of it", () => {
    const project = boardroom();
    const saved = saveProjectAsRoomTemplate(project);
    const copy = saveRoomTemplateCopy(saved, saved.bom);

    project.proposal = { ...project.proposal!, summary: "Share slides on two displays" };
    const again = saveProjectAsRoomTemplate(project);

    const byId = (id: string) => getCustomRoomTemplates().find((template) => template.id === id)!;
    expect(again.id).toBe(saved.id);
    expect(byId(saved.id).summary).toBe("Share slides on two displays");
    // A copy is a starting point of its own, so it keeps the design it copied.
    expect(byId(copy.id).summary).toBe(`Custom copy of ${saved.name}. Share slides`);
  });

  it("reports which record the next save would republish", () => {
    const project = boardroom();

    // Nothing saved yet: the next click adds a template.
    expect(projectRoomTemplate(project.id)).toBeNull();

    const saved = saveProjectAsRoomTemplate(project);
    expect(projectRoomTemplate(project.id)?.id).toBe(saved.id);

    // A copy made from it is a design of its own, so it is not the room's
    // template and does not become the record a save republishes.
    const copy = saveRoomTemplateCopy(saved, saved.bom);
    expect(projectRoomTemplate(project.id)?.id).not.toBe(copy.id);

    // Nor is another room's template this room's.
    const other = saveProjectAsRoomTemplate({ ...boardroom(), id: "another-room" });
    expect(projectRoomTemplate("another-room")?.id).toBe(other.id);
    expect(projectRoomTemplate(project.id)?.id).toBe(saved.id);
  });

  it("leaves the project's own response untouched", () => {
    const project = boardroom();
    saveProjectAsRoomTemplate(project);

    // The save is a projection, not a rewrite: the record the rep still reads
    // keeps the row the template no longer quotes.
    expect(project.proposal?.bomRows?.map((row) => row.sku)).toEqual(["MX-0404-HDMI", "TBC-AV-NETWORK"]);
  });
});

describe("copying a stored template", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts the copy from the parts, with the question as an item to confirm", () => {
    const stored = storedTemplateWithPrompt();
    const copy = saveRoomTemplateCopy(stored, stored.bom);

    expect(copy.bom.map((row) => row.sku)).toEqual(["MX-0404-HDMI"]);
    expect(copy.validationItems).toEqual([
      "Confirm the display height at survey.",
      "AV network readiness",
    ]);
    // The template it was copied from keeps the row the rep was reading.
    expect(getCustomRoomTemplates().find((template) => template.id === stored.id)?.bom)
      .toHaveLength(2);

    // Copying the copy does not name the same dependency again.
    const again = saveRoomTemplateCopy(copy, copy.bom);
    expect(again.validationItems).toEqual(copy.validationItems);
  });

  it("carries the same rule into a duplicate made from the library", () => {
    const stored = storedTemplateWithPrompt();
    const duplicate = duplicateCustomRoomTemplate(stored.id);

    expect(duplicate.bom.map((row) => row.sku)).toEqual(["MX-0404-HDMI"]);
    expect(duplicate.validationItems).toContain("AV network readiness");
    // The stored original is untouched, so nothing is deleted off an unreviewed
    // list: its page is where the prompt is answered.
    expect(getCustomRoomTemplates().find((template) => template.id === stored.id)?.bom)
      .toHaveLength(2);
  });
});

/** A template that records a surveyed run, the answers and the room layout. */
function measuredTemplate() {
  return saveCustomRoomTemplate({
    id: "measured-boardroom",
    name: "Measured boardroom",
    vertical: "Corporate",
    application: "Meeting room / boardroom",
    scale: "12 seats",
    summary: "A measured boardroom design.",
    customerNarrative: "A measured boardroom design.",
    architecture: "Local matrix switching to a single display.",
    designNotes: [],
    assumptions: [],
    validationItems: ["Confirm the display height at survey."],
    upgradePaths: [],
    surveyedRunMetres: 130,
    servedRunMetres: 65,
    discoveryAnswers: { displays: "2", opportunity: "meeting-room" },
    topology: createBlankProjectTopology(),
    bom: [
      {
        id: "measured-matrix",
        sku: "MX-0404-HDMI",
        description: "Presentation matrix",
        role: "Switching",
        qty: 1,
        type: "Required",
        status: "included",
        evidence: "Surveyed run of 130 m.",
        notes: "",
      },
    ],
  });
}

describe("what a copy of a template carries", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps the run the receiver was chosen on, and the answers a new room starts from", () => {
    const stored = measuredTemplate();

    // Both copy paths are the same starting point, so the figure that chose the
    // receiver, the span it serves and the answers a new room is pre-filled
    // from travel with it.
    const duplicate = duplicateCustomRoomTemplate(stored.id);
    expect(duplicate.surveyedRunMetres).toBe(130);
    expect(duplicate.servedRunMetres).toBe(65);
    expect(duplicate.discoveryAnswers).toEqual({ displays: "2", opportunity: "meeting-room" });

    const copy = saveRoomTemplateCopy(stored, stored.bom);
    expect(copy.surveyedRunMetres).toBe(130);
    expect(copy.servedRunMetres).toBe(65);
    expect(copy.discoveryAnswers).toEqual({ displays: "2", opportunity: "meeting-room" });
    const original = getCustomRoomTemplates().find((template) => template.id === stored.id)!;
    expect(copy.topology).toEqual(original.topology);
  });

  it("keeps the project a template came from through every copy", () => {
    const saved = saveProjectAsRoomTemplate(boardroom());

    // The library groups a rep's designs by that project, so a copy of one of
    // them is one of that project's designs too.
    expect(duplicateCustomRoomTemplate(saved.id).sourceProjectId).toBe(saved.sourceProjectId);
    expect(saveRoomTemplateCopy(saved, saved.bom).sourceProjectId).toBe(saved.sourceProjectId);
  });

  it("does not hand one room's wall, photos or review cells to a copy", () => {
    const stored = measuredTemplate();
    // A record an older or hand-edited store could hold: the room's own site
    // evidence beside the design it produced.
    const records = JSON.parse(window.localStorage.getItem(CUSTOM_ROOM_TEMPLATE_KEY) ?? "[]");
    records[0] = {
      ...records[0],
      wallRequirements: { columns: 3, rows: 3, sources: 2 },
      measuredRuns: { display: "130 m" },
      linkDetails: { essential: "Cat6A to the matrix" },
      surveyReview: { photos: ["boardroom.jpg"] },
    };
    window.localStorage.setItem(CUSTOM_ROOM_TEMPLATE_KEY, JSON.stringify(records));

    // A copy is built from the template record, which is read through an
    // allow-list, so none of that evidence can reach the next room as if it had
    // been surveyed there.
    const siteEvidence = ["wallRequirements", "measuredRuns", "linkDetails", "surveyReview"];
    const duplicate = duplicateCustomRoomTemplate(stored.id);
    for (const key of siteEvidence) expect(duplicate).not.toHaveProperty(key);

    const copy = saveRoomTemplateCopy(stored, stored.bom);
    for (const key of siteEvidence) expect(copy).not.toHaveProperty(key);
  });
});
