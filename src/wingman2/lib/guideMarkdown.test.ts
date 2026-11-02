import { describe, expect, it } from "vitest";
import userGuide from "../../../docs/USER_GUIDE.md?raw";
import { guideInline, guideSectionLabel, parseGuide } from "./guideMarkdown";

const SAMPLE = [
  "# A guide",
  "",
  "Opening sentence that runs",
  "over two lines.",
  "",
  "## 1. First thing",
  "",
  "- **Bold** lead with `code`",
  "  wrapped onto a second line",
  "- Second item",
  "",
  "### Detail",
  "",
  "| Column | Meaning |",
  "| --- | --- |",
  "| `a` | one |",
  "",
  "## Second thing",
  "",
  "1. Step one",
  "2. Step two",
].join("\n");

describe("parseGuide", () => {
  it("keeps the title, the lead and one section per level-two heading", () => {
    const guide = parseGuide(SAMPLE);

    expect(guide.title).toBe("A guide");
    expect(guide.lead).toEqual([
      { kind: "paragraph", spans: [{ text: "Opening sentence that runs over two lines." }] },
    ]);
    expect(guide.sections.map((section) => section.label)).toEqual(["First thing", "Second thing"]);
  });

  it("drops the number a section heading opens with, because the rail numbers its own bands", () => {
    expect(guideSectionLabel("1. Start with the room")).toBe("Start with the room");
    expect(guideSectionLabel("When something looks wrong")).toBe("When something looks wrong");
  });

  it("keeps a wrapped bullet on the bullet it belongs to", () => {
    const [first] = parseGuide(SAMPLE).sections;

    expect(first.blocks[0]).toEqual({
      kind: "list",
      ordered: false,
      items: [
        [
          { text: "Bold", bold: true },
          { text: " lead with " },
          { text: "code", code: true },
          { text: " wrapped onto a second line" },
        ],
        [{ text: "Second item" }],
      ],
    });
  });

  it("reads a table's header and rows, and a numbered run as an ordered list", () => {
    const guide = parseGuide(SAMPLE);

    expect(guide.sections[0].blocks).toContainEqual({
      kind: "table",
      head: [[{ text: "Column" }], [{ text: "Meaning" }]],
      rows: [[[{ text: "a", code: true }], [{ text: "one" }]]],
    });
    expect(guide.sections[1].blocks).toEqual([
      {
        kind: "list",
        ordered: true,
        items: [[{ text: "Step one" }], [{ text: "Step two" }]],
      },
    ]);
  });
});

describe("guideInline", () => {
  it("prints a link's text rather than a path the app cannot serve", () => {
    expect(guideInline("read [`VIDEO_WALL.md`](./VIDEO_WALL.md)")).toEqual([
      { text: "read " },
      { text: "VIDEO_WALL.md", code: true },
    ]);
  });

  it("leaves an unmatched delimiter in the text instead of dropping it", () => {
    expect(guideInline("a stray * asterisk")).toEqual([{ text: "a stray * asterisk" }]);
  });
});

describe("the shipped guide", () => {
  it("parses into sections with content, so the Help page cannot render empty", () => {
    const guide = parseGuide(userGuide);

    expect(guide.sections.length).toBeGreaterThan(5);
    expect(guide.sections.every((section) => section.label.length > 0 && section.blocks.length > 0)).toBe(true);
    expect(new Set(guide.sections.map((section) => section.key)).size).toBe(guide.sections.length);
  });
});
