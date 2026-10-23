import { describe, expect, it, vi } from "vitest";
import { runWallSurveyScan } from "../api/wingmanApi";
import { defaultWallRequirements } from "./videowallOptions";
import { wallTransportPlan } from "./videowallTransport";
import {
  applyWallSurveyDetails,
  applyWallSurveyDisplayMounts,
  applyWallSurveyScan,
  editWallSurveyScan,
  mergeWallSurveyScans,
  parseWallSurveyScan,
  readWallSurveyPhoto,
  scanConfidenceTone,
  surveyMetres,
  surveyScanSummary,
} from "./wallSurveyScan";

// Only the two browser-and-network edges are stubbed; everything this file
// checks about landing a reading stays the real module.
vi.mock("../api/wingmanApi", () => ({
  runWallSurveyScan: vi.fn(async () => ({ ok: true, data: { summary: "", rows: [], unread: [], confidence: 0 } })),
}));
vi.mock("./visionAttachments", () => ({
  downscaleImageToBase64: vi.fn(async () => ({ base64Data: "AAAA", mimeType: "image/jpeg" })),
}));

function plan(overrides: Partial<typeof defaultWallRequirements> = {}) {
  return wallTransportPlan({ ...defaultWallRequirements, columns: 2, rows: 1, sources: 1, ...overrides });
}

describe("worksheet photo request", () => {
  it("asks a development server for its sample only when the switch is on", async () => {
    const file = new File(["photo"], "worksheet.jpg", { type: "image/jpeg" });
    vi.mocked(runWallSurveyScan).mockClear();

    await readWallSurveyPhoto(file, plan());
    expect(vi.mocked(runWallSurveyScan).mock.calls[0][0]).not.toHaveProperty("mock");

    await readWallSurveyPhoto(file, plan(), { mock: true });
    expect(vi.mocked(runWallSurveyScan).mock.calls[1][0]).toMatchObject({ fileName: "worksheet.jpg", mock: true });
  });
});

describe("worksheet scan parsing", () => {
  it("lands handwritten runs on their link ids and reads comma decimals", () => {
    const scan = parseWallSurveyScan(
      {
        summary: "Two rows legible.",
        rows: [
          { linkId: "source-1", metres: "4,5", confidence: 0.8 },
          { linkId: "display-1", metres: "12.5 m", confidence: 0.7 },
        ],
        unread: [],
        confidence: 0.75,
      },
      plan(),
    );

    expect(scan.runs).toEqual([
      { id: "source-1", metres: 4.5 },
      { id: "display-1", metres: 12.5 },
    ]);
    expect(scan.problems).toEqual([]);
    expect(scan.unread).toEqual([]);
    expect(scan.blank).toEqual(["display-2"]);
    expect(scan.confidence).toBe(0.75);
  });

  it("rejects rows that name a link the design does not have, or no length", () => {
    const scan = parseWallSurveyScan(
      {
        rows: [
          { linkId: "display-9", metres: 6 },
          { linkId: "source-1", metres: "" },
          { linkId: "", metres: 3 },
          { linkId: "display-1", metres: 0 },
        ],
      },
      plan(),
    );

    expect(scan.runs).toEqual([]);
    expect(scan.problems).toEqual([
      'Photo row 1: "display-9" is not a link in this design.',
      'Photo row 2: source-1 has no usable length ("").',
      "Photo row 3: no link id could be read.",
      'Photo row 4: display-1 has no usable length ("0").',
    ]);
  });

  it("keeps the later reading when a link appears twice", () => {
    const scan = parseWallSurveyScan(
      {
        rows: [
          { linkId: "source-1", metres: 3 },
          { linkId: "source-1", metres: 4 },
        ],
      },
      plan(),
    );

    expect(scan.runs).toEqual([{ id: "source-1", metres: 4 }]);
    expect(scan.problems).toEqual(["Photo row 2: source-1 appears twice; the later read wins."]);
  });

  it("names the links the reader saw but could not make out, and never calls them blank", () => {
    const scan = parseWallSurveyScan(
      {
        rows: [{ linkId: "display-2", metres: 7 }],
        unread: ["source-1", "display-9", "display-2"],
      },
      plan(),
    );

    // display-2 was read, so its unread entry is a contradiction and is ignored.
    expect(scan.runs).toEqual([{ id: "display-2", metres: 7 }]);
    // display-9 is not a link in this design.
    expect(scan.unread).toEqual(["source-1"]);
    expect(scan.blank).toEqual(["display-1"]);
  });

  it("applies only what the photo read, keeping every other recorded run", () => {
    const scan = parseWallSurveyScan({ rows: [{ linkId: "source-1", metres: 5 }] }, plan());

    expect(applyWallSurveyScan({ "source-1": 2, "display-1": 9 }, scan)).toEqual({
      "source-1": 5,
      "display-1": 9,
    });
  });

  it("says what landed and what still needs typing", () => {
    const scan = parseWallSurveyScan(
      { rows: [{ linkId: "source-1", metres: 5 }], unread: ["display-1"], confidence: 0.4 },
      plan(),
    );

    expect(surveyScanSummary(scan, 3)).toBe(
      "Read 1 of 3 links from the photo; 1 could not be read (display-1) - type those runs in; 1 left blank kept the design allowance.",
    );
    expect(surveyScanSummary(parseWallSurveyScan(undefined, plan()), 3)).toBe(
      "No measured runs could be read from the photo - nothing was changed.",
    );
  });

  it("reads the install line beside a run and applies it to the same link", () => {
    const scan = parseWallSurveyScan(
      {
        rows: [
          {
            linkId: "display-1",
            metres: 5,
            enclosure: "Back box",
            mount: " Wall   bracket ",
            termination: "HDMI faceplate",
          },
        ],
      },
      plan(),
    );

    expect(scan.details).toEqual([
      { id: "display-1", detail: { enclosure: "Back box", termination: "HDMI faceplate" } },
    ]);
    expect(scan.displayMounts).toEqual({ "display-1": "Wall bracket" });
    expect(applyWallSurveyDetails({ "display-1": { enclosure: "Ceiling tile" } }, scan)).toEqual({
      "display-1": { enclosure: "Back box", termination: "HDMI faceplate" },
    });
  });

  it("keeps install words on a row whose run was unreadable, and drops an unknown link", () => {
    const scan = parseWallSurveyScan(
      {
        rows: [
          { linkId: "display-1", metres: "", mount: "Pole" },
          { linkId: "display-9", enclosure: "Back box" },
        ],
      },
      plan(),
    );

    expect(scan.details).toEqual([]);
    expect(scan.displayMounts).toEqual({ "display-1": "Pole" });
    expect(scan.problems).toContain('Photo row 2: "display-9" is not a link in this design.');
  });

  it("names install detail in the photo summary without claiming a run", () => {
    // A row the reader returned without a length at all is an install-only
    // reading, not a failed run, so it raises no problem.
    const detailOnly = parseWallSurveyScan({ rows: [{ linkId: "display-1", enclosure: "Back box" }] }, plan());
    expect(surveyScanSummary(detailOnly, 3)).toBe(
      "No measured runs could be read from the photo; 1 install detail read (display housing, mount, termination or run entry).",
    );

    const withRun = parseWallSurveyScan({ rows: [{ linkId: "display-1", metres: 5, enclosure: "Back box" }] }, plan());
    expect(surveyScanSummary(withRun, 3)).toContain("1 install detail read (display housing, mount, termination or run entry)");
  });

  it("merges several photos into one review with one short list of unread links", () => {
    const design = plan();
    const first = parseWallSurveyScan(
      { rows: [{ linkId: "source-1", metres: 4 }], unread: ["display-1"], summary: "First sheet." },
      design,
    );
    const second = parseWallSurveyScan(
      { rows: [{ linkId: "display-2", metres: 6 }], unread: ["display-1", "display-2"], summary: "Second sheet." },
      design,
    );

    const merged = mergeWallSurveyScans([first, second], design);

    expect(merged.photoCount).toBe(2);
    expect(merged.runs).toEqual([
      { id: "source-1", metres: 4 },
      { id: "display-2", metres: 6 },
    ]);
    // display-1 was unread on both sheets; display-2 was read by the second.
    expect(merged.unread).toEqual(["display-1"]);
    expect(merged.blank).toEqual([]);
    expect(merged.summary).toBe("First sheet. Second sheet.");
    expect(surveyScanSummary(merged, 3)).toBe(
      "Read 2 of 3 links from 2 photos; 1 could not be read (display-1) - type those runs in.",
    );
  });

  it("keeps the later photo's read when two photos cover the same link", () => {
    const design = plan();
    const first = parseWallSurveyScan(
      { rows: [{ linkId: "display-1", metres: 3, enclosure: "Back box" }] },
      design,
    );
    const second = parseWallSurveyScan(
      { rows: [{ linkId: "display-1", metres: 7, enclosure: "Ceiling tile" }] },
      design,
    );

    const merged = mergeWallSurveyScans([first, second], design);

    expect(merged.readings).toHaveLength(1);
    expect(merged.runs).toEqual([{ id: "display-1", metres: 7 }]);
    expect(merged.details).toEqual([{ id: "display-1", detail: { enclosure: "Ceiling tile" } }]);
  });

  it("names the photo a rejected row came from and keeps the rest of the batch", () => {
    const design = plan();
    const good = parseWallSurveyScan({ rows: [{ linkId: "display-1", metres: 5 }] }, design);
    const bad = parseWallSurveyScan({ rows: [{ linkId: "display-9", metres: 4 }] }, design);

    const merged = mergeWallSurveyScans([good, bad], design, ["front.jpg", "back.jpg"]);

    expect(merged.runs).toEqual([{ id: "display-1", metres: 5 }]);
    expect(merged.problems).toEqual(['back.jpg: Photo row 1: "display-9" is not a link in this design.']);
  });

  it("keeps each row's confidence and reader note with the run it belongs to", () => {
    const scan = parseWallSurveyScan(
      {
        rows: [
          { linkId: "source-1", metres: "4,5", confidence: 0.82, note: "Clear handwriting.", enclosure: "Back box" },
          { linkId: "display-1", metres: 6, confidence: 1.4 },
          { linkId: "display-2", metres: 7 },
        ],
      },
      plan(),
    );

    expect(scan.readings).toEqual([
      {
        id: "source-1",
        label: "Source 1",
        metres: 4.5,
        confidence: 0.82,
        note: "Clear handwriting.",
        detail: {},
      },
      { id: "display-1", label: "Panel 1", metres: 6, confidence: 1, note: "", detail: {} },
      { id: "display-2", label: "Panel 2", metres: 7, confidence: 0, note: "", detail: {} },
    ]);
  });

  it("offers a row that only carried install words for review, with no run", () => {
    const scan = parseWallSurveyScan({ rows: [{ linkId: "display-1", mount: "Pole", confidence: 0.6 }] }, plan());

    expect(scan.readings).toEqual([
      { id: "display-1", label: "Panel 1", metres: null, confidence: 0.6, note: "", detail: {}, displayMount: "Pole" },
    ]);
    expect(scan.displayMounts).toEqual({ "display-1": "Pole" });
    expect(scan.runs).toEqual([]);
  });

  it("applies only the rows a rep accepted and leaves the rest of the design alone", () => {
    const scan = parseWallSurveyScan(
      {
        rows: [
          { linkId: "source-1", metres: 5, confidence: 0.9 },
          { linkId: "display-1", metres: 9, confidence: 0.3 },
          { linkId: "display-2", metres: 7, confidence: 0.6, enclosure: "Back box" },
        ],
      },
      plan(),
    );
    const accepted = ["source-1", "display-2"];

    // The rejected display-1 reading never reaches either map.
    expect(applyWallSurveyScan({ "display-1": 2 }, scan, accepted)).toEqual({
      "source-1": 5,
      "display-1": 2,
      "display-2": 7,
    });
    expect(applyWallSurveyDetails({ "display-1": { enclosure: "Ceiling tile" } }, scan, accepted)).toEqual({
      "display-1": { enclosure: "Ceiling tile" },
      "display-2": { enclosure: "Back box" },
    });
    // Rejecting everything is a no-op, not a clear.
    expect(applyWallSurveyScan({ "display-1": 2 }, scan, [])).toEqual({ "display-1": 2 });
    expect(applyWallSurveyDetails({ "display-1": { enclosure: "Ceiling tile" } }, scan, [])).toEqual({
      "display-1": { enclosure: "Ceiling tile" },
    });
  });

  it("tones each confidence so a doubtful row stands out", () => {
    expect(scanConfidenceTone(0.95)).toBe("high");
    expect(scanConfidenceTone(0.8)).toBe("high");
    expect(scanConfidenceTone(0.79)).toBe("medium");
    expect(scanConfidenceTone(0.5)).toBe("medium");
    expect(scanConfidenceTone(0.49)).toBe("low");
    expect(scanConfidenceTone(0)).toBe("low");
  });

  it("reports unusable rows in the panel summary as well", () => {
    const scan = parseWallSurveyScan({ rows: [{ linkId: "display-7", metres: 4 }] }, plan());

    expect(surveyScanSummary(scan, 3)).toContain('Photo row 1: "display-7" is not a link in this design.');
  });
});

describe("correcting a row before it is applied", () => {
  it("leaves the review alone when the rep changed nothing", () => {
    const scan = parseWallSurveyScan({ rows: [{ linkId: "source-1", metres: 5 }] }, plan());

    // The same object comes back, so a panel cannot re-render into a new scan
    // just because the edit map is empty.
    expect(editWallSurveyScan(scan, undefined)).toBe(scan);
    expect(editWallSurveyScan(scan, {})).toBe(scan);
  });

  it("applies the run the rep typed, not the one the photo read", () => {
    const scan = parseWallSurveyScan({ rows: [{ linkId: "display-1", metres: 9, confidence: 0.3 }] }, plan());
    const corrected = editWallSurveyScan(scan, { "display-1": { metres: 4 } });

    expect(corrected.readings[0].metres).toBe(4);
    expect(corrected.runs).toEqual([{ id: "display-1", metres: 4 }]);
    expect(applyWallSurveyScan({ "source-1": 2 }, corrected)).toEqual({ "source-1": 2, "display-1": 4 });
    // The read value is still on the scan it came from, so an audit can keep both.
    expect(scan.readings[0].metres).toBe(9);
  });

  it("drops a run the rep emptied and leaves the design's own run in place", () => {
    const scan = parseWallSurveyScan(
      { rows: [{ linkId: "display-1", metres: 9 }, { linkId: "display-2", metres: 6 }] },
      plan(),
    );
    const corrected = editWallSurveyScan(scan, { "display-1": { metres: null } });

    expect(corrected.readings.find((reading) => reading.id === "display-1")?.metres).toBeNull();
    expect(corrected.runs).toEqual([{ id: "display-2", metres: 6 }]);
    // The link reads as blank again, beside the one the photo never filled in,
    // so the design's recorded run survives.
    expect(corrected.blank).toEqual(["source-1", "display-1"]);
    expect(applyWallSurveyScan({ "display-1": 3 }, corrected)).toEqual({ "display-1": 3, "display-2": 6 });
  });

  it("reads a typed correction by the same rules as a cell on the photo", () => {
    expect(surveyMetres("7,5")).toBe(7.5);
    expect(surveyMetres("7.5 m")).toBe(7.5);
    expect(surveyMetres("7.")).toBe(7);
    expect(surveyMetres("")).toBeNull();
    expect(surveyMetres("smudged")).toBeNull();
  });

  it("corrects one install cell and keeps the others the reader saw", () => {
    const scan = parseWallSurveyScan(
      { rows: [{ linkId: "display-2", enclosure: "Back box", mount: "Pole", termination: "Cat6A outlet" }] },
      plan(),
    );
    const corrected = editWallSurveyScan(scan, { "display-2": { displayMount: "Tilt bracket" } });

    expect(corrected.details).toEqual([
      { id: "display-2", detail: { enclosure: "Back box", termination: "Cat6A outlet" } },
    ]);
    expect(applyWallSurveyDetails(undefined, corrected)).toEqual({
      "display-2": { enclosure: "Back box", termination: "Cat6A outlet" },
    });
    expect(corrected.displayMounts).toEqual({ "display-2": "Tilt bracket" });
    expect(applyWallSurveyDisplayMounts({ "display-1": "Ceiling bracket" }, corrected)).toEqual({
      "display-1": "Ceiling bracket",
      "display-2": "Tilt bracket",
    });
  });

  it("adds an install cell the photo could not read, and removes one it got wrong", () => {
    const scan = parseWallSurveyScan({ rows: [{ linkId: "display-1", metres: 4 }] }, plan());

    const typed = editWallSurveyScan(scan, { "display-1": { detail: { termination: "HDMI faceplate" } } });
    expect(typed.details).toEqual([{ id: "display-1", detail: { termination: "HDMI faceplate" } }]);

    const cleared = editWallSurveyScan(typed, { "display-1": { detail: { termination: "" } } });
    expect(cleared.details).toEqual([]);
    expect(applyWallSurveyDetails({ "display-1": { mount: "Pole" } }, cleared)).toEqual({
      "display-1": { mount: "Pole" },
    });
  });
});
