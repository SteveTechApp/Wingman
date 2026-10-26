import { describe, expect, it } from "vitest";
import {
  applyHdbtReceiver,
  hdbtDisplayReceiverForRun,
  hdbtUsbDataRequired,
  hasHdbtDisplayReceiver,
  metresFromRunText,
  quotesHdbtDisplayReceiver,
} from "./hdbtDisplayReceiver";
import { roomTemplates, type TemplateBomRow } from "./roomTemplates";
import { compileTemplateApplicationProposal } from "./proposalCompiler";
import { buildTemplateProject, templateBomRows } from "./templateReviewProposal";
import { proposalRoomBrief } from "./proposalRoomBrief";
import { getCustomRoomTemplates, saveProjectAsRoomTemplate } from "./customRoomTemplates";

const teachingRoom = () => roomTemplates.find((template) => template.id === "education-classroom-hdbaset")!;
const interactiveRoom = () => roomTemplates.find((template) => template.id === "education-primary-classroom-interactive-panel")!;
const receiverRow = (rows: TemplateBomRow[]) => rows.find((row) => row.role === "Display receiver")!;

describe("HDBaseT display receiver from a surveyed run", () => {
  it("takes the 35 m receiver for a short run and names the run it was measured at", () => {
    const choice = hdbtDisplayReceiverForRun(24);
    expect(choice).toMatchObject({ sku: "RX-500", limitMetres: 35 });
    expect(choice!.reason).toContain("24 m display run");
    expect(choice!.reason).toContain("inside the 35 m rating of RX-500");
    // The parts differ on more than distance, so the sentence says so.
    expect(choice!.reason).toContain("4K60 at 4:2:0");
    expect(choice!.reason).toContain("RX-700");
  });

  it("takes the 100 m receiver once the run is past the short part's rating", () => {
    const choice = hdbtDisplayReceiverForRun(62);
    expect(choice).toMatchObject({ sku: "RX-700", limitMetres: 100 });
    expect(choice!.reason).toContain("62 m display run");
    expect(choice!.reason).toContain("beyond the 35 m rating of RX-500");
    expect(choice!.reason).toContain("rated to 100 m");
  });

  it("names the shortfall when the surveyed run is longer than either receiver", () => {
    const choice = hdbtDisplayReceiverForRun(130);
    expect(choice!.sku).toBe("RX-700");
    expect(choice!.reason).toContain("beyond the 100 m rating of RX-700");
    expect(choice!.reason).toContain("mid-span repeater or a fibre link");
  });

  it("keeps the matched receiver where USB data travels, short run or not", () => {
    const room = interactiveRoom();
    expect(hdbtUsbDataRequired(room.concept!)).toBe(true);
    expect(hdbtUsbDataRequired(teachingRoom().concept!)).toBe(false);

    const short = hdbtDisplayReceiverForRun(24, true)!;
    expect(short.sku).toBe("RX-700");
    expect(short.reason).toContain("24 m display run");
    expect(short.reason).toContain("USB data travels with the picture");

    const long = hdbtDisplayReceiverForRun(62, true)!;
    expect(long.sku).toBe("RX-700");
    expect(long.reason).toContain("beyond the 35 m rating of RX-500");
    expect(long.reason).toContain("matched RX-700");

    // The room's own schedule says USB travels, so a short run leaves the part
    // in place and only rewrites the reason it is quoted at that length.
    const measured = applyHdbtReceiver(room.bom, { ...room, surveyedRunMetres: 24 });
    expect(receiverRow(measured).sku).toBe("RX-700");
    expect(receiverRow(measured).notes).toContain("USB data travels with the picture");
  });

  it("reads a run written the way Discovery and a saved room model write it", () => {
    expect(metresFromRunText("28 m")).toBe(28);
    expect(metresFromRunText("55m endpoint route")).toBe(55);
    expect(metresFromRunText("70 metres")).toBe(70);
    expect(metresFromRunText(42)).toBe(42);
    for (const empty of [undefined, "Unknown", "", 0, -3]) expect(metresFromRunText(empty)).toBeUndefined();
  });

  it("chooses nothing until a run is measured", () => {
    for (const run of [undefined, 0, -5, Number.NaN]) expect(hdbtDisplayReceiverForRun(run)).toBeNull();
    const rows = teachingRoom().bom;
    expect(applyHdbtReceiver(rows, { concept: teachingRoom().concept })).toBe(rows);
  });

  it("rewrites the receiver row and keeps its identity, quantity and status", () => {
    const room = teachingRoom();
    const authored = receiverRow(room.bom);
    expect(authored.sku).toBe("RX-700");

    const short = applyHdbtReceiver(room.bom, { ...room, surveyedRunMetres: 24 });
    const chosen = receiverRow(short);
    expect(chosen.sku).toBe("RX-500");
    expect(chosen.id).toBe(authored.id);
    expect(chosen.qty).toBe(authored.qty);
    expect(chosen.status).toBe(authored.status);
    expect(chosen.notes).toContain("24 m display run");
    // Every other line is the template's own.
    expect(short.filter((row) => row.id !== authored.id)).toEqual(room.bom.filter((row) => row.id !== authored.id));
  });

  it("leaves another receiver a rep scheduled, and clears back to the authored row", () => {
    const room = teachingRoom();
    const swapped = room.bom.map((row) => row.role === "Display receiver" ? { ...row, sku: "RX3-100" } : row);
    expect(applyHdbtReceiver(swapped, { ...room, surveyedRunMetres: 24 })).toBe(swapped);

    const applied = applyHdbtReceiver(room.bom, { ...room, surveyedRunMetres: 24 });
    expect(receiverRow(applied).sku).toBe("RX-500");
    // The rule is idempotent, and a cleared run returns the author's line.
    expect(applyHdbtReceiver(applied, { ...room, surveyedRunMetres: 24 })).toBe(applied);
    expect(receiverRow(applyHdbtReceiver(room.bom, room)).sku).toBe("RX-700");
  });

  it("stops claiming a receiver the rep excluded, while still quoting the right part", () => {
    const room = teachingRoom();
    const authored = receiverRow(room.bom);
    const dropped = room.bom.map((row) => row.id === authored.id ? { ...row, status: "excluded", qty: 0 } : row);
    const applied = applyHdbtReceiver(dropped, { ...room, surveyedRunMetres: 24 });
    expect(receiverRow(applied).sku).toBe("RX-500");
    expect(quotesHdbtDisplayReceiver(applied)).toBe(false);
    expect(compileTemplateApplicationProposal({ ...room, surveyedRunMetres: 24 }, applied).technicalFacts
      .some((line) => line.startsWith("Display receiver:"))).toBe(false);
  });

  it("records the surveyed run on the saved project so a rebuild starts from it", () => {
    window.localStorage.clear();
    const room = teachingRoom();
    const template = { ...room, surveyedRunMetres: 28 };

    const project = buildTemplateProject(template, applyHdbtReceiver(template.bom, template));
    expect(project.discoveryBrief?.roomModel).toMatchObject({ cableRun: "28 m", longestRun: "28 m" });

    // A room rebuilt from that project keeps the figure, so its schedule quotes
    // the same receiver the survey chose rather than reverting to the 100 m part.
    const rebuilt = saveProjectAsRoomTemplate(project);
    expect(rebuilt.surveyedRunMetres).toBe(28);
    expect(getCustomRoomTemplates()[0].surveyedRunMetres).toBe(28);
    const rows = rebuilt.bom;
    expect(hasHdbtDisplayReceiver(rows)).toBe(true);
    expect(receiverRow(applyHdbtReceiver(rows, rebuilt)).sku).toBe("RX-500");

    // A room with no measured run records none, and reads as unmeasured.
    const unmeasured = buildTemplateProject(room, room.bom);
    expect(unmeasured.discoveryBrief?.roomModel).not.toHaveProperty("cableRun");
    expect(saveProjectAsRoomTemplate(unmeasured).surveyedRunMetres).toBeUndefined();
  });

  it("states the measured run in the room's design notes and the printed proposal", () => {
    const room = teachingRoom();
    const template = { ...room, surveyedRunMetres: 28 };
    const rows = applyHdbtReceiver(template.bom, template);
    expect(quotesHdbtDisplayReceiver(rows)).toBe(true);

    const proposal = compileTemplateApplicationProposal(template, rows);
    const fact = proposal.technicalFacts.find((line) => line.startsWith("Display receiver:"));
    expect(fact).toContain("28 m display run");
    expect(fact).toContain("RX-500");

    const brief = proposalRoomBrief({ ...proposalBare(), applicationProposal: proposal }, templateBomRows(template, rows));
    expect(brief.facts.join(" ")).toContain("28 m display run");

    // A room with no measured run keeps its authored notes and reads no run.
    const unmeasured = compileTemplateApplicationProposal(room, room.bom);
    expect(unmeasured.technicalFacts.some((line) => line.startsWith("Display receiver:"))).toBe(false);
  });
});

/** The smallest proposal the room brief reads, so only the facts under test vary. */
function proposalBare() {
  return { title: "Room", summary: "Room", sections: [], products: [], assumptions: [], updatedAt: new Date(0).toISOString() };
}
