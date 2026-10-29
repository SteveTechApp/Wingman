import { describe, expect, it } from "vitest";
import {
  READING_SECTIONS,
  READING_SECTION_IDS,
  buildReadingsReport,
  fileReadings,
  sectionAnchor,
} from "./browser-readings-sections.mjs";

/** One line per pass, written the way the walk prints them. */
const REPORT_LINES = [
  "Reading the build at b474097ec9dc-dirty, written 2026-10-29T15:27:00.531Z; all 1506 files it was made from hash to what it recorded.",
  "5 gallery card row states hold their action rows at 1366px, 1151px and 360px, each one seeded and measured from the same list.",
  "The store line above the cards names the same lanes at those widths: at 360px the card's lane label holds 215px and the line's 253px.",
  "The guided Home's three recent cards — Northbridge Meeting Room Refresh and two others — held a stale survey reading at 1366px.",
  "The journey strip's 3 entries held their label and reason inside their own column once opened from \"More tools\".",
  "5 CRM send-history rows, one with its conversation open, stay inside the panel at 1366px in the project record.",
  "5 CRM send-history rows, one with its conversation open, stay inside the panel at 1366px in the response wizard.",
  "Every shape in the send history named what dropping it costs before the second click.",
  "A send dropped in the project record's send history left the response builder's list.",
  "The dropped-sends note named the 3 sends the sweep left out of this browser's CRM send history on both of its mounts.",
  "A load that found a retired wall summary copy of 60282 bytes removed it without saying so.",
  "All 5 response-builder step cards keep their content inside the card at 1366px, 560px, 390px and 360px.",
  "The Settings hero kept its action row on one line, inside the header's own box, at every width.",
  "The Sales Helper hero held its icon + copy header inside the page host that clips it at every width.",
  "The guided wall wizard's start step leads with the LED brief and holds it at 1366px, 390px and 360px.",
  "The template save notice named the design it saved and wrapped inside its own box.",
  "All 29 routes in the manifest and 6 parameterised and splat addresses the router registers rendered a page inside the shell.",
  "Verified built app pages, Compare workflow, project detail route and every manifest route in a real browser.",
];

describe("filing the walk's readings", () => {
  it("places every line the walk printed, with nothing left over", () => {
    const { sections, unplaced, ambiguous } = fileReadings(REPORT_LINES);

    expect(unplaced).toEqual([]);
    expect(ambiguous).toEqual([]);
    expect(sections.reduce((total, section) => total + section.readings.length, 0)).toBe(REPORT_LINES.length);
  });

  it("keeps both mounts of one surface in its section, so a note has one place to point", () => {
    const { sections } = fileReadings(REPORT_LINES);
    const crm = sections.find((section) => section.id === "crm-send-history");

    // The rows in both mounts, the drop costs, the drop across mounts and the note
    // above them are one surface read five ways; a section per reading would make
    // the doc note choose one and hide the rest.
    expect(crm.readings).toHaveLength(5);
    expect(crm.readings[0]).toContain("project record");
    expect(crm.readings[1]).toContain("response wizard");
  });

  it("files a reading by the sentence it opens with, not by the numbers in it", () => {
    const reworded = [
      "3 gallery card row states hold their action rows at 800px, seeded and measured from one list.",
      "The Settings hero kept its action row on one line at 300px, inside a 320px page host.",
    ];

    const { sections, unplaced } = fileReadings(reworded);

    expect(unplaced).toEqual([]);
    expect(sections.find((section) => section.id === "project-gallery").readings).toHaveLength(1);
    expect(sections.find((section) => section.id === "settings-hero").readings).toHaveLength(1);
  });

  it("refuses a reading no section claims, rather than appending it unindexed", () => {
    const { unplaced } = fileReadings(["A new pass measured something no doc note can point at."]);

    expect(unplaced).toEqual(["A new pass measured something no doc note can point at."]);
  });

  it("refuses a reading two sections claim, rather than letting the first win", () => {
    const line = "5 CRM send-history rows stay inside the panel; the response-builder step cards keep their content inside the card.";
    const { ambiguous, sections } = fileReadings([line]);

    expect(ambiguous).toEqual([{ line, ids: ["crm-send-history", "response-builder-step-cards"] }]);
    expect(sections.every((section) => section.readings.length === 0)).toBe(true);
  });

  it("leaves an empty run with every section present and empty", () => {
    const { sections } = fileReadings([]);

    // A section that vanished when a pass stopped printing would take its doc link
    // with it; the report says the surface has no reading this run instead.
    expect(sections).toHaveLength(READING_SECTIONS.length);
    expect(sections.every((section) => section.readings.length === 0)).toBe(true);
  });
});

describe("the readings index", () => {
  it("has one anchor per surface, and an id a link can be built from", () => {
    const ids = READING_SECTIONS.map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(READING_SECTION_IDS.size).toBe(ids.length);
    expect(sectionAnchor("project-gallery")).toBe("#project-gallery");
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("gives every section a heading a reader can recognise and a matcher to answer with", () => {
    for (const section of READING_SECTIONS) {
      expect(section.title.trim()).not.toBe("");
      expect(section.match.length).toBeGreaterThan(0);
      for (const pattern of section.match) expect(pattern).toBeInstanceOf(RegExp);
    }
  });
});

describe("the frozen report", () => {
  const build = (lines) => buildReadingsReport({
    lines,
    exit: 0,
    build: "Reading the build at abc123, written 2026-10-29T15:27:00.531Z.",
    commit: "abc1234",
    dirty: true,
    captured: "2026-10-29T15:31:31.502Z",
  });

  it("prints an index whose links are the headings that follow it", () => {
    const { text } = build(REPORT_LINES);

    for (const section of READING_SECTIONS) {
      // The link and its heading are one fact in two places, which is why both are
      // built from the table: a hand-written index drifts the first time a heading
      // is renamed, and the drift reads as a broken link rather than a stale index.
      expect(text).toContain(`[${section.title}](${sectionAnchor(section.id)})`);
      expect(text).toMatch(new RegExp(`^## ${section.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
    }
    expect(text).toContain("## Index");
  });

  it("says how many readings each surface carries, and how many sections were reached", () => {
    const { text, placed } = build(REPORT_LINES);

    expect(text).toContain(`${REPORT_LINES.length} readings in ${placed.length} of ${READING_SECTIONS.length} sections`);
    expect(text).toContain("5 readings");
    // Singular for one reading, and the count sits after the link so the index reads
    // as a list of surfaces rather than a column of numbers.
    expect(text).toContain("— 1 reading");
  });

  it("keeps a section that measured nothing, so the doc note pointing at it still lands", () => {
    const { text } = build([
      "The Settings hero kept its action row on one line, inside the header's own box, at every width.",
    ]);

    expect(text).toMatch(/^## Project gallery$/m);
    expect(text).toContain("Nothing measured this run.");
    expect(text).toContain("[Project gallery](#project-gallery) — 0 readings");
  });

  it("prints an unfiled reading under its own heading and returns it as a problem", () => {
    const stray = "A new pass measured something no doc note can point at.";
    const { text, problems } = build([stray]);

    expect(text).toContain("## Unfiled readings");
    expect(text).toContain(`no section claims this reading: ${stray}`);
    expect(problems).toHaveLength(1);
  });

  it("still writes the report around a failing walk, and says which run it was", () => {
    const { text } = buildReadingsReport({
      lines: ["Reading the build at abc123, written 2026-10-29T15:27:00.531Z."],
      exit: 1,
      build: "Reading the build at abc123.",
      commit: "abc1234",
      dirty: false,
      captured: "2026-10-29T15:31:31.502Z",
    });

    // A failure is the most useful reading of the day: the report keeps it and the
    // exit code, rather than the tool deciding there is nothing worth writing.
    expect(text).toContain("(exit 1)");
    expect(text).toContain(", clean tree");
    expect(text).toContain("## The run");
  });

  it("says the walk never reported rather than printing an empty index", () => {
    const { text, problems } = build([]);

    expect(text).toContain("The walk printed no readings");
    expect(text).not.toContain("0 readings in 0 of");
    expect(problems).toEqual([]);
  });
});
