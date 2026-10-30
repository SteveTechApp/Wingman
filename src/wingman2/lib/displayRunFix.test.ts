import { describe, expect, it } from "vitest";
import {
  DISPLAY_RUN_SPAN_FIX_ACTION,
  displayRunProjectFix,
  displayRunRepeaterRow,
  displayRunSpanFix,
  displayRunSpanFixText,
  schedulesDisplayRunRepeater,
} from "./displayRunFix";
import {
  applyHdbtReceiver,
  displayRunSpanPlan,
  HDBT_MID_SPAN_REPEATER,
  servedDisplayRunMetres,
  surveyedDisplayRunMetres,
} from "./hdbtDisplayReceiver";
import { roomTemplates, type TemplateBomRow } from "./roomTemplates";
import { buildTemplateProject } from "./templateReviewProposal";
import { displayRunRecord } from "./displayRunRecord";

const teachingRoom = () => roomTemplates.find((template) => template.id === "education-classroom-hdbaset")!;
const repeaterRows = (rows: TemplateBomRow[]) => rows.filter((row) => row.sku === HDBT_MID_SPAN_REPEATER.sku);
const NOW = "2026-10-26T10:00:00.000Z";

/**
 * A saved teaching room whose survey measured 130 m: the schedule quotes
 * RX-700, the room model records the run, and the reason still calls for the
 * repeater the schedule does not hold — the state a record is in before the fix.
 */
function savedRoom(runMetres = 130) {
  const template = { ...teachingRoom(), surveyedRunMetres: runMetres };
  return buildTemplateProject(template, applyHdbtReceiver(template.bom, template));
}

describe("display run span fix", () => {
  it("schedules one mid-span set per seam and records the span it serves", () => {
    const rows = teachingRoom().bom;
    const fix = displayRunSpanFix({ rows, runMetres: 130 })!;

    expect(fix.servedRunMetres).toBe(65);
    expect(fix.plan).toEqual(displayRunSpanPlan(130));
    // The survey's measurement is not the line the fix writes, so the template's
    // own rows come through untouched and the set is added beside them.
    expect(fix.rows.slice(0, rows.length)).toEqual(rows);
    const [set] = repeaterRows(fix.rows);
    expect(set).toMatchObject({
      sku: HDBT_MID_SPAN_REPEATER.sku,
      role: "Display extender",
      qty: 1,
      type: "Required",
      status: "included",
      owner: "wyrestorm",
      scopeSection: "distribution",
    });
    // The row says what the part does where it lands, not only which SKU it is.
    expect(set.description).toContain("mid-span repeater");
    expect(set.notes).toContain("65 m");
    expect(set.evidence).toContain("2 spans");
  });

  it("writes nothing for a run one receiver already carries", () => {
    expect(displayRunSpanFix({ rows: teachingRoom().bom, runMetres: 62 })).toBeNull();
    expect(displayRunSpanFix({ rows: teachingRoom().bom, runMetres: 100 })).toBeNull();
    expect(displayRunSpanFix({ rows: teachingRoom().bom, runMetres: undefined })).toBeNull();
  });

  it("leaves a set the rep already scheduled as it is, and still records the span", () => {
    const authored: TemplateBomRow = {
      ...displayRunRepeaterRow(displayRunSpanPlan(130)!, "set-1"),
      qty: 2,
      notes: "Rep's own positioning note.",
    };
    const rows = [...teachingRoom().bom, authored];
    expect(schedulesDisplayRunRepeater(rows)).toBe(true);

    const fix = displayRunSpanFix({ rows, runMetres: 130 })!;
    expect(fix.rows).toHaveLength(rows.length);
    expect(fix.rows.find((row) => row.id === "set-1")?.notes).toBe("Rep's own positioning note.");
    expect(fix.servedRunMetres).toBe(65);
  });

  it("does not count an excluded set as scheduled", () => {
    const rows = teachingRoom().bom;
    const dropped = rows.map((row, index) => index === 0
      ? { ...row, sku: HDBT_MID_SPAN_REPEATER.sku, qty: 0, status: "excluded" }
      : row);
    expect(schedulesDisplayRunRepeater(dropped)).toBe(false);
    // The fix adds its own quoted line beside the excluded one rather than
    // trusting a line the schedule does not carry.
    const fix = displayRunSpanFix({ rows: dropped, runMetres: 130 })!;
    expect(schedulesDisplayRunRepeater(fix.rows)).toBe(true);
    expect(repeaterRows(fix.rows).filter((row) => row.status !== "excluded")).toHaveLength(1);
  });

  it("carries a longer run on more than one set", () => {
    const fix = displayRunSpanFix({ rows: [], runMetres: 250 })!;
    expect(fix.plan).toEqual({ runMetres: 250, spans: 3, spanMetres: 84, repeaters: 2 });
    expect(repeaterRows(fix.rows)[0].qty).toBe(2);
    expect(fix.servedRunMetres).toBe(84);
  });

  it("offers the change in one sentence both surfaces print", () => {
    const text = displayRunSpanFixText(displayRunSpanPlan(130)!);

    expect(text).toContain("2 spans of 65 m");
    expect(text).toContain(`one extender set of ${HDBT_MID_SPAN_REPEATER.sku}`);
    expect(text).toContain("records 65 m as the run each receiver serves");
    // The action has one name, so a rep meets the same button twice.
    expect(DISPLAY_RUN_SPAN_FIX_ACTION).toBe("Schedule the mid-span repeater");
  });
});

describe("display run span fix on a saved project", () => {
  it("schedules the set on the room's own schedule and records the span it serves", () => {
    const project = savedRoom();
    // The record before the fix: the measurement, the receiver, and the reason
    // asking for a repeater the room does not hold.
    expect(project.discoveryBrief?.roomModel).toMatchObject({ cableRun: "130 m" });
    expect(project.proposal?.validationNotes).toContainEqual(expect.stringContaining("mid-span repeater or a fibre link"));

    const fix = displayRunProjectFix(project, NOW)!;

    expect(fix.servedRunMetres).toBe(65);
    // Both halves are written, and the survey's measurement is not one of them.
    expect(fix.project.discoveryBrief?.roomModel).toMatchObject({ cableRun: "130 m", servedRun: "65 m" });
    const set = (fix.project.productSelections ?? []).filter((item) => item.sku === HDBT_MID_SPAN_REPEATER.sku);
    expect(set).toHaveLength(1);
    expect(set[0]).toMatchObject({ quantity: 1, category: "Display extender", status: "recommended" });
    // The response rebuilt from this room quotes the set beside the receiver.
    expect(fix.project.productSelections?.some((item) => item.category === "Display receiver")).toBe(true);
    // The projector's record panel reads the reason back off the note, so the
    // note is restated over the span rather than left asking for the set.
    expect(fix.project.proposal?.validationNotes).toContainEqual(
      expect.stringContaining("carried in 2 spans of 65 m with a mid-span EX3-100-EARC"),
    );
    expect(fix.project.updated).toBe("Just now");
    expect(fix.project.updatedAt).toBe(NOW);

    // The record the gate reads now answers for the run: the measured figure is
    // unchanged and the span is inside the receiver's rating.
    expect(surveyedDisplayRunMetres(fix.project.discoveryBrief?.roomModel)).toBe(130);
    expect(servedDisplayRunMetres(fix.project.discoveryBrief?.roomModel)).toBe(65);
    // Nothing is written into the project the caller passed in.
    expect(project.discoveryBrief?.roomModel?.servedRun).toBeUndefined();
  });

  it("offers nothing for a run the quoted receiver already serves", () => {
    expect(displayRunProjectFix(savedRoom(62))).toBeNull();
    // A room carried in spans has the fix already, however long the survey was.
    const fixed = displayRunProjectFix(savedRoom(), NOW)!;
    expect(displayRunProjectFix(fixed.project)).toBeNull();
  });

  it("offers nothing for a room that quotes no receiver or measured no run", () => {
    const unquoted = savedRoom();
    unquoted.productSelections = (unquoted.productSelections ?? []).filter(
      (item) => item.category !== "Display receiver",
    );
    expect(displayRunProjectFix(unquoted)).toBeNull();

    const unmeasured = savedRoom();
    unmeasured.discoveryBrief = { ...unmeasured.discoveryBrief, roomModel: {} };
    expect(displayRunProjectFix(unmeasured)).toBeNull();
  });

  it("leaves a set the rep already scheduled as they scheduled it", () => {
    const project = savedRoom();
    const authored = { ...displayRunProjectFix(project, NOW)!.project.productSelections!.at(-1)!, quantity: 2 };
    project.productSelections = [...(project.productSelections ?? []), authored];

    const fix = displayRunProjectFix(project, NOW)!;
    const sets = (fix.project.productSelections ?? []).filter((item) => item.sku === HDBT_MID_SPAN_REPEATER.sku);
    // One line, at the quantity the rep chose: the fix records the span without
    // restating a schedule someone has already written.
    expect(sets).toHaveLength(1);
    expect(sets[0].quantity).toBe(2);
    expect(fix.servedRunMetres).toBe(65);
  });

  it("schedules the set where a proposal-built room keeps its schedule", () => {
    // A project authored in the proposal builder writes its products on the
    // saved response and leaves the selections empty. The set joins that list:
    // writing it to an empty selection list would make that list the schedule
    // and drop every other line from it.
    const project = savedRoom();
    project.productSelections = [];
    expect(project.proposal?.products.length).toBeGreaterThan(0);

    const fix = displayRunProjectFix(project, NOW)!;

    expect(fix.project.productSelections).toEqual(project.productSelections);
    expect((fix.project.proposal?.products ?? []).filter((item) => item.sku === HDBT_MID_SPAN_REPEATER.sku)).toHaveLength(1);
    expect(fix.project.discoveryBrief?.roomModel).toMatchObject({ servedRun: "65 m" });
    // The record reads the same list, so the fixed room reports the span and the
    // receiver it quotes rather than an empty schedule.
    expect(displayRunRecord(fix.project)).toMatchObject({ servedMetres: 65, receiverSku: "RX-700" });
  });

  it("offers nothing where the span would still leave the quoted receiver short", () => {
    const project = savedRoom();
    project.productSelections = (project.productSelections ?? []).map((item) =>
      item.category === "Display receiver" ? { ...item, sku: "RX-500" } : item,
    );

    // A rep holding the 35 m receiver on a 130 m run has to change the receiver:
    // two 65 m spans do not bring that part inside its rating, and the action
    // must not schedule a set and then say the link fits.
    expect(displayRunProjectFix(project, NOW)).toBeNull();
  });
});
