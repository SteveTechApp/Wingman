import { describe, expect, it } from "vitest";
import { wallSurveyReviewStamp } from "./wallSurveyReview";
import { defaultWallRequirements } from "./videowallOptions";
import { wallTransportPlan, type WallTransportPlan } from "./videowallTransport";
import {
  WALL_HANDOFF_DETAIL_FIELDS,
  WALL_SURVEY_HEADER,
  appliedRunText,
  appliedRunsText,
  flaggedSurveyRuns,
  mergeDisplayMounts,
  mergeSurveyDetails,
  mergeSurveyRuns,
  parseWallSurveyCsv,
  surveySummary,
  wallSurveyCsv,
  wallSurveySheetAuditNote,
  wallSurveySheetImports,
  wallSurveyGapHeadline,
  wallSurveyGapLinkList,
  wallSurveyGapText,
  wallSurveyGaps,
  wallSurveyRows,
} from "./wallSurvey";

function plan(overrides: Partial<typeof defaultWallRequirements> = {}): WallTransportPlan {
  return wallTransportPlan({ ...defaultWallRequirements, ...overrides });
}

const sheet = (rows: string[]) => [WALL_SURVEY_HEADER.join(","), ...rows].join("\r\n");

describe("wall survey sheet", () => {
  it("lists every physical link once, even where the table folds them", () => {
    const large = plan({ layout: "independent", columns: 4, rows: 4, sources: 2 });
    // The on-screen table folds a 16-panel array; the sheet never does.
    expect(large.links.length).toBeLessThan(large.allLinks.length);

    const rows = wallSurveyRows(large);
    expect(rows).toHaveLength(large.allLinks.length);
    expect(rows.map((row) => row.id)).toEqual(large.allLinks.map((link) => link.id));
    expect(rows.filter((row) => row.id.startsWith("display-"))).toHaveLength(16);
    expect(rows[0]).toMatchObject({ id: "source-1", allowanceMetres: expect.any(Number), limitMetres: expect.any(Number) });
  });

  it("writes a header and one row per link with its allowance and limit", () => {
    const design = plan({ columns: 2, rows: 1, sources: 1 });
    const lines = wallSurveyCsv(design).split("\r\n");

    expect(lines[0]).toBe(
      "Link id,Link,Cable,Allowance (m),Limit (m),Measured run (m),Display housing,Mount at display,Termination at display,Run entry at display",
    );
    // The sheet's key travels with the file: the same three words, written as
    // comment lines a spreadsheet shows and the import reads past.
    expect(lines[1]).toBe("# Allowance — The cable length the design assumes for this link. A blank run cell keeps it.");
    expect(lines[2]).toBe("# Limit — The longest run this cable and transport carry. A longer run needs a different cable before the proposal issues.");
    expect(lines[3]).toBe("# In design — The run the saved design already holds for this link, for reference only. The run column shows it until you measure the link.");
    expect(lines).toHaveLength(design.allLinks.length + 4);
    expect(lines[4]).toBe("source-1,Source 1,HDMI 2.0 copper (passive),2,5,,,,,");
  });

  it("carries an already-measured run and round-trips it unchanged", () => {
    const design = plan({ columns: 2, rows: 1, sources: 1, measuredRuns: { "display-2": 9 } });
    const csv = wallSurveyCsv(design);
    expect(csv).toContain("display-2,Panel 2,HDMI 2.0 copper (passive),5,5,9,,,,");

    const read = parseWallSurveyCsv(csv, design);
    expect(read.problems).toEqual([]);
    expect(read.runs).toEqual([{ id: "display-2", metres: 9 }]);
    expect(read.cleared).toEqual(["source-1", "display-1"]);
  });

  it("reads measured runs written on site, whatever shape the cell takes", () => {
    const design = plan({ columns: 2, rows: 1, sources: 1 });
    const read = parseWallSurveyCsv(
      sheet([
        "source-1,Source 1,HDMI 2.0 copper (passive),5,15,12.5",
        "",
        '"display-1","Panel 1","HDMI 2.0 copper (passive)",5,15,"12,5 m"',
        "display-2,Panel 2,HDMI 2.0 copper (passive),5,15, 8 ",
      ]),
      design,
    );

    expect(read.problems).toEqual([]);
    expect(read.runs).toEqual([
      { id: "source-1", metres: 12.5 },
      { id: "display-1", metres: 12.5 },
      { id: "display-2", metres: 8 },
    ]);
  });

  it("names the rows it cannot use instead of dropping a run", () => {
    const design = plan({ columns: 1, rows: 1, sources: 1 });
    const read = parseWallSurveyCsv(
      sheet(["display-9,Panel 9,HDMI 2.0 copper (passive),5,15,4", "display-1,Panel 1,HDMI 2.0 copper (passive),5,15,about five"]),
      design,
    );

    expect(read.runs).toEqual([]);
    expect(read.problems).toEqual([
      'Row 2: "display-9" is not a link in this design.',
      'Row 3: "about five" is not a length in metres.',
    ]);
  });

  it("keeps the later row when a link appears twice", () => {
    const design = plan({ columns: 1, rows: 1, sources: 1 });
    const read = parseWallSurveyCsv(
      sheet([
        "display-1,Panel 1,HDMI 2.0 copper (passive),5,15,4",
        "display-1,Panel 1,HDMI 2.0 copper (passive),5,15,7",
      ]),
      design,
    );

    expect(read.runs).toEqual([{ id: "display-1", metres: 7 }]);
    expect(read.problems).toEqual(["Row 3: display-1 is listed twice; the later row wins."]);
  });

  it("accepts a sheet without the header row", () => {
    const design = plan({ columns: 1, rows: 1, sources: 1 });
    const read = parseWallSurveyCsv("display-1,Panel 1,HDMI 2.0 copper (passive),5,15,6", design);
    expect(read.runs).toEqual([{ id: "display-1", metres: 6 }]);
  });
});

describe("wall survey handoff gaps", () => {
  it("requires the display housing, run entry and termination on every link, and names what is blank", () => {
    const design = plan({ columns: 2, rows: 1, sources: 1 });
    const linkDetails = {
      // A source has no display-end survey cells.
      "source-1": { enclosure: "Rack", termination: "HDMI faceplate" },
      "display-1": { enclosure: "Back box", mount: "Wall bracket" },
    };

    const gaps = wallSurveyGaps(design, linkDetails);

    expect(WALL_HANDOFF_DETAIL_FIELDS).toEqual(["enclosure", "entry", "termination"]);
    expect(gaps).toEqual([
      { id: "display-1", link: "Panel 1", group: "display", missing: ["entry", "termination"] },
      { id: "display-2", link: "Panel 2", group: "display", missing: ["enclosure", "entry", "termination"] },
    ]);

    const text = wallSurveyGapText(gaps, 2);
    expect(text).toContain("2 of 2 links are missing a display housing, a run entry or a termination");
    expect(text).toContain("Panel 1 (run entry and termination)");
    expect(text).toContain("Panel 2 (display housing, run entry and termination)");
  });

  it("clears every link once the three cells are recorded, with or without a mount", () => {
    const design = plan({ columns: 2, rows: 1, sources: 1 });
    const linkDetails = Object.fromEntries(
      design.allLinks.map((link) => [
        link.id,
        { enclosure: "Back box", entry: "Floor box", termination: "HDMI faceplate" },
      ]),
    );

    expect(wallSurveyGaps(design, linkDetails)).toEqual([]);
    expect(wallSurveyGapText([], 2)).toBe(
      "Display housing, run entry and termination are recorded on all 2 links.",
    );
  });

  it("keeps a long shortfall readable by naming six links and counting the rest", () => {
    const design = plan({ layout: "independent", columns: 4, rows: 2, sources: 8 });
    const gaps = wallSurveyGaps(design);

    expect(gaps).toHaveLength(8);
    const text = wallSurveyGapText(gaps, 8);
    expect(text).toContain("8 of 8 links are missing a display housing, a run entry or a termination");
    expect(text).toContain("and 2 more");
  });

  it("offers the count and the short links separately for a panel that folds them", () => {
    const design = plan({ columns: 2, rows: 1, sources: 1 });
    const gaps = wallSurveyGaps(design);

    expect(wallSurveyGapHeadline(gaps, 2))
      .toBe("2 of 2 links are missing a display housing, a run entry or a termination.");
    expect(wallSurveyGapLinkList(gaps)).toBe(
      "Panel 1 (display housing, run entry and termination); Panel 2 (display housing, run entry and termination)",
    );
    expect(wallSurveyGapHeadline([], 3)).toBe(
      "Display housing, run entry and termination are recorded on all 3 links.",
    );
  });
});

describe("wall survey install detail", () => {
  it("writes each link's install cells and round-trips them unchanged", () => {
    const linkDetails = { "display-2": { enclosure: "Back box", entry: "Floor box" } };
    const displayMounts = { "display-2": "Wall bracket" };
    const design = plan({ columns: 2, rows: 1, sources: 1, linkDetails, displayMounts });
    const csv = wallSurveyCsv(design, linkDetails, displayMounts);

    expect(csv).toContain("display-2,Panel 2,HDMI 2.0 copper (passive),5,5,,Back box,Wall bracket,,Floor box");
    expect(wallSurveyRows(design, linkDetails).find((row) => row.id === "display-2")?.detail).toEqual({
      enclosure: "Back box",
      entry: "Floor box",
    });

    const read = parseWallSurveyCsv(csv, design);
    expect(read.problems).toEqual([]);
    expect(read.details).toContainEqual({
      id: "display-2",
      detail: { enclosure: "Back box", termination: "", entry: "Floor box" },
    });
    expect(read.displayMounts).toEqual({ "display-1": "", ...displayMounts });
    // A sheet that comes back as it went out leaves the saved detail exactly as it was.
    expect(mergeSurveyDetails(linkDetails, read)).toEqual(linkDetails);
  });

  it("clears only the display mount cell the surveyor blanked", () => {
    const displayMounts = { "display-1": "Ceiling drop" };
    const design = plan({ columns: 1, rows: 1, sources: 1, displayMounts });
    const read = parseWallSurveyCsv(
      sheet(["display-1,Panel 1,HDMI 2.0 copper (passive),5,15,6,Back box,,HDMI"]),
      design,
    );

    expect(mergeDisplayMounts(displayMounts, read.displayMounts)).toBeUndefined();
    expect(read.displayMounts).toEqual({ "display-1": "" });
  });

  it("keeps the install line of a row whose run cannot be read", () => {
    const read = parseWallSurveyCsv(
      sheet(["display-1,Panel 1,HDMI 2.0 copper (passive),5,15,about five,Back box,,"]),
      plan({ columns: 1, rows: 1, sources: 1 }),
    );

    expect(read.runs).toEqual([]);
    expect(read.problems).toEqual(['Row 2: "about five" is not a length in metres.']);
    // The patch keeps the blank cells so merging can clear a field too.
    expect(read.details).toEqual([
      { id: "display-1", detail: { enclosure: "Back box", termination: "" } },
    ]);
  });

  it("keeps only the later install line when a link appears twice", () => {
    const read = parseWallSurveyCsv(
      sheet([
        "display-1,Panel 1,HDMI 2.0 copper (passive),5,15,4,Back box,Wall bracket,HDMI",
        "display-1,Panel 1,HDMI 2.0 copper (passive),5,15,7,Ceiling tile,,",
      ]),
      plan({ columns: 1, rows: 1, sources: 1 }),
    );

    expect(read.details).toEqual([
      { id: "display-1", detail: { enclosure: "Ceiling tile", termination: "" } },
    ]);
  });

  it("leaves saved detail alone when a sheet from before the install columns is imported", () => {
    const linkDetails = { "display-1": { enclosure: "Back box" } };
    const design = plan({ columns: 1, rows: 1, sources: 1, linkDetails });
    const read = parseWallSurveyCsv(sheet(["display-1,Panel 1,HDMI 2.0 copper (passive),5,15,6"]), design);

    expect(read.details).toEqual([]);
    expect(mergeSurveyDetails(linkDetails, read)).toEqual(linkDetails);
  });

  it("reports how many links came back with install detail", () => {
    const design = plan({ columns: 1, rows: 1, sources: 1 });
    const read = parseWallSurveyCsv(
      sheet(["display-1,Panel 1,HDMI 2.0 copper (passive),5,15,6,Back box,Wall bracket,"]),
      design,
    );

    expect(surveySummary(read, design.allLinks.length)).toBe(
      "1 of 2 links measured. 1 display link recorded housing, termination or run entry.",
    );
  });

  it("does not claim install detail when the sheet only blanked a cell", () => {
    const design = plan({ columns: 1, rows: 1, sources: 1 });
    const read = parseWallSurveyCsv(sheet(["display-1,Panel 1,HDMI 2.0 copper (passive),5,15,6,,,"]), design);

    expect(surveySummary(read, design.allLinks.length)).toBe("1 of 2 links measured.");
  });
});

describe("applying a survey sheet", () => {
  it("merges every run and clears the links left blank", () => {
    const measuredRuns = { "display-1": 4, "display-2": 4 };
    const design = plan({ columns: 2, rows: 1, sources: 1, measuredRuns });
    const read = parseWallSurveyCsv(
      sheet([
        "source-1,Source 1,HDMI 2.0 copper (passive),5,15,3",
        "display-1,Panel 1,HDMI 2.0 copper (passive),5,15,9",
        "display-2,Panel 2,HDMI 2.0 copper (passive),5,15,",
      ]),
      design,
    );

    expect(mergeSurveyRuns(measuredRuns, read)).toEqual({ "display-1": 9, "source-1": 3 });
    // The saved map is never mutated in place.
    expect(measuredRuns).toEqual({ "display-1": 4, "display-2": 4 });
  });

  it("reports what landed and what did not", () => {
    const design = plan({ columns: 2, rows: 1, sources: 1 });
    const read = parseWallSurveyCsv(
      sheet(["source-1,Source 1,HDMI 2.0 copper (passive),5,15,3", "nope,,,5,15,4"]),
      design,
    );

    expect(surveySummary(read, design.allLinks.length)).toBe(
      `1 of ${design.allLinks.length} links measured. Row 3: "nope" is not a link in this design.`,
    );
    expect(surveySummary(parseWallSurveyCsv(sheet([]), design), design.allLinks.length)).toContain(
      "No measured runs in this sheet",
    );
  });
});

describe("flaggedSurveyRuns", () => {
  const design = plan({ columns: 2, rows: 1, sources: 1 });
  const link = (id: string) => design.allLinks.find((candidate) => candidate.id === id)!;

  function readRow(id: string, metres: number) {
    const row = link(id);
    return [id, row.label, row.cable, row.allowanceMetres, row.limitMetres, metres].join(",");
  }

  it("names a sheet run that sits far from the allowance printed beside it", () => {
    const far = Math.round(link("source-1").allowanceMetres * 4);
    const read = parseWallSurveyCsv(sheet([readRow("source-1", far)]), design);

    expect(flaggedSurveyRuns(read, design)).toEqual([
      {
        id: "source-1",
        label: link("source-1").label,
        metres: far,
        allowanceMetres: link("source-1").allowanceMetres,
        warning: expect.stringContaining("at least twice the printed allowance"),
      },
    ]);
  });

  it("leaves a run close to its allowance alone", () => {
    const near = link("source-1").allowanceMetres + 1;
    const read = parseWallSurveyCsv(sheet([readRow("source-1", near)]), design);

    expect(flaggedSurveyRuns(read, design)).toEqual([]);
  });

  it("checks every read run, not only the first one that is far", () => {
    const far = Math.round(link("display-1").allowanceMetres * 4);
    const read = parseWallSurveyCsv(
      sheet([readRow("source-1", link("source-1").allowanceMetres + 1), readRow("display-1", far)]),
      design,
    );

    expect(flaggedSurveyRuns(read, design).map((row) => row.id)).toEqual(["display-1"]);
  });
});

describe("appliedRunsText", () => {
  it("names each run with the number that landed, in the sheet's order", () => {
    expect(
      appliedRunsText([
        { label: "Source 1", metres: 4.5 },
        { label: "Panel 2", metres: 4 },
      ]),
    ).toBe("Source 1: 4.5 m; Panel 2: 4 m");
  });

  it("names a row applied for its install cell without inventing a run", () => {
    // A typed row can land with only a termination; it still has to be named.
    expect(appliedRunText({ label: "Panel 3" })).toBe("Panel 3");
    expect(appliedRunText({ label: "Panel 3", metres: null })).toBe("Panel 3");
  });
});

describe("wallSurveySheetAuditNote", () => {
  const design = plan({ columns: 2, rows: 1, sources: 1 });
  const link = (id: string) => design.allLinks.find((candidate) => candidate.id === id)!;
  const row = (id: string, metres: number | string) =>
    [id, link(id).label, link(id).cable, link(id).allowanceMetres, link(id).limitMetres, metres].join(",");

  it("names the links and runs the paper carried, so the trail can be traced to the sheet", () => {
    const read = parseWallSurveyCsv(
      sheet([row("source-1", 3), row("display-1", 4.5), row("display-2", "")]),
      design,
    );
    const note = wallSurveySheetAuditNote(read, design, "2026-10-21T20:30:00.000Z");

    // The runs are named with their numbers, not only counted: "2 runs" cannot
    // answer which runs came from the paper.
    expect(note).toContain(`2 runs (${link("source-1").label}: 3 m; ${link("display-1").label}: 4.5 m)`);
    // A blank cell is a decision the sheet carried too.
    expect(note).toContain("1 link cleared");
    expect(note.startsWith("Survey sheet imported — ")).toBe(true);
    // The import time is in the note, so re-importing the same sheet is a
    // second event rather than a repeat.
    expect(note).toContain(wallSurveyReviewStamp("2026-10-21T20:30:00.000Z"));
  });

  it("names one run in the singular and counts the install lines", () => {
    const read = parseWallSurveyCsv(
      sheet(["display-1,Panel 1,HDMI 2.0 copper (passive),5,5,4,Back box,,HDMI faceplate"]),
      design,
    );
    const note = wallSurveySheetAuditNote(read, design, "2026-10-21T20:30:00.000Z");

    expect(note).toContain("1 run (Panel 1: 4 m)");
    expect(note).toContain("1 install line");
    expect(note).not.toContain("1 runs");
  });

  it("says a sheet of install detail carried no runs rather than printing an empty list", () => {
    const read = parseWallSurveyCsv(
      sheet(["source-1,Source 1,HDMI 2.0 copper (passive),2,5,,Back box,,,"]),
      design,
    );
    const note = wallSurveySheetAuditNote(read, design, "2026-10-21T20:30:00.000Z");

    expect(note).toContain("Survey sheet imported — no measured runs");
    expect(note).not.toContain("()");
  });

  it("falls back to the link id for a row the sheet named but the design did not", () => {
    // The reader drops rows it cannot match, so this is defensive: a note must
    // never print an empty label for a run it is recording.
    expect(
      wallSurveySheetAuditNote(
        { runs: [{ id: "display-9", metres: 2 }], cleared: [], details: [] },
        design,
        "2026-10-21T20:30:00.000Z",
      ),
    ).toContain("1 run (display-9: 2 m)");
  });
});

describe("wallSurveySheetImports", () => {
  const design = plan({ columns: 2, rows: 1, sources: 1 });
  const link = (id: string) => design.allLinks.find((candidate) => candidate.id === id)!;
  const row = (id: string, metres: number | string) =>
    [id, link(id).label, link(id).cable, link(id).allowanceMetres, link(id).limitMetres, metres].join(",");
  const entry = (read: ReturnType<typeof parseWallSurveyCsv>, importedAt = "2026-10-21T20:30:00.000Z") => ({
    id: `audit-${importedAt}`,
    action: "wall-survey-sheet",
    detail: wallSurveySheetAuditNote(read, design, importedAt),
    createdAt: importedAt,
  });

  it("reads the runs a sheet carried back off the entry that recorded them", () => {
    const read = parseWallSurveyCsv(sheet([row("source-1", 3), row("display-1", 4.5)]), design);

    expect(wallSurveySheetImports([entry(read)])).toEqual([
      {
        id: "audit-2026-10-21T20:30:00.000Z",
        importedAt: "2026-10-21T20:30:00.000Z",
        runs: [
          { label: link("source-1").label, metres: 3 },
          { label: link("display-1").label, metres: 4.5 },
        ],
      },
    ]);
  });

  it("reads every import, newest first as the trail keeps them", () => {
    const first = parseWallSurveyCsv(sheet([row("source-1", 3)]), design);
    const second = parseWallSurveyCsv(sheet([row("display-1", 4.5)]), design);

    expect(wallSurveySheetImports([
      entry(second, "2026-10-22T09:00:00.000Z"),
      entry(first, "2026-10-21T20:30:00.000Z"),
    ]).map((imported) => imported.runs)).toEqual([
      [{ label: link("display-1").label, metres: 4.5 }],
      [{ label: link("source-1").label, metres: 3 }],
    ]);
  });

  it("draws nothing for an entry that is not a sheet, or names no runs", () => {
    const detailOnly = parseWallSurveyCsv(
      sheet(["source-1,Source 1,HDMI 2.0 copper (passive),2,5,,Back box,,,"]),
      design,
    );

    expect(wallSurveySheetImports(undefined)).toEqual([]);
    expect(wallSurveySheetImports([
      { ...entry(detailOnly), action: "wall-survey-review" },
      entry(detailOnly),
    ])).toEqual([{ id: "audit-2026-10-21T20:30:00.000Z", importedAt: "2026-10-21T20:30:00.000Z", runs: [] }]);
  });
});
