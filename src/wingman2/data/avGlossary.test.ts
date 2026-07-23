import { describe, expect, it } from "vitest";
import { AV_GLOSSARY_CATEGORIES, AV_GLOSSARY_TERMS } from "./avGlossary";

describe("AV glossary as a reference lookup", () => {
  it("has unique ids and no duplicate terms", () => {
    const ids = AV_GLOSSARY_TERMS.map((term) => term.id);
    const terms = AV_GLOSSARY_TERMS.map((term) => term.term.toLowerCase());

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it("carries no audience-switching conversation copy", () => {
    // The glossary is a reference look-up, not a per-audience script. If this
    // ever comes back, it belongs in the sales pages that actually run a
    // conversation - not on a page whose job is explaining what a term means.
    for (const term of AV_GLOSSARY_TERMS) {
      expect(term).not.toHaveProperty("roleLanguage");
      expect(term).not.toHaveProperty("ask");
    }
  });

  it("covers the standards users come to a glossary to look up", () => {
    const ids = new Set(AV_GLOSSARY_TERMS.map((term) => term.id));

    // Chroma sampling in full: 4:2:2 was missing entirely before this page was
    // rebuilt, which left the most-asked comparison unanswerable.
    expect(ids).toContain("chroma-subsampling");
    expect(ids).toContain("four-four-four");
    expect(ids).toContain("four-two-two");
    expect(ids).toContain("four-two-zero");

    // Cabling and distance had no entry at all.
    expect(ids).toContain("cat-cable");
    expect(ids).toContain("hdmi-cable-types");
    expect(ids).toContain("active-optical-cable");
    expect(AV_GLOSSARY_CATEGORIES).toContain("Cabling and Distance");
  });

  it("gives every version/standard table a complete, well-formed shape", () => {
    const withTables = AV_GLOSSARY_TERMS.filter((term) => term.reference);
    expect(withTables.length).toBeGreaterThanOrEqual(7);

    for (const term of withTables) {
      const table = term.reference!;

      expect(table.caption.trim().length, term.id).toBeGreaterThan(0);
      expect(table.rowLabel.trim().length, term.id).toBeGreaterThan(0);
      expect(table.columns.length, term.id).toBeGreaterThan(0);
      expect(table.rows.length, term.id).toBeGreaterThan(1);

      // Every row must fill every column, or the table renders ragged.
      for (const row of table.rows) {
        expect(row.label.trim().length, `${term.id}/${row.label}`).toBeGreaterThan(0);
        expect(row.cells.length, `${term.id}/${row.label}`).toBe(table.columns.length);
      }
    }
  });

  it("explains the version tables users most often confuse", () => {
    const byId = new Map(AV_GLOSSARY_TERMS.map((term) => [term.id, term]));

    const hdmiRows = byId.get("hdmi")?.reference?.rows.map((row) => row.label) ?? [];
    expect(hdmiRows).toEqual(expect.arrayContaining(["HDMI 1.4", "HDMI 2.0", "HDMI 2.1"]));

    const usbRows = byId.get("usb-3")?.reference?.rows.map((row) => row.label) ?? [];
    expect(usbRows).toEqual(expect.arrayContaining(["USB 2.0", "USB 3.0", "USB4"]));

    const cableRows = byId.get("cat-cable")?.reference?.rows.map((row) => row.label) ?? [];
    expect(cableRows).toEqual(expect.arrayContaining(["Cat5e", "Cat6", "Cat6a"]));

    const hdbasetRows = byId.get("hdbaset")?.reference?.rows.map((row) => row.label) ?? [];
    expect(hdbasetRows).toEqual(expect.arrayContaining(["Spec 1.0", "Spec 3.0", "Class A"]));
  });

  it("answers 'what does it mean in reality' on the terms that need it", () => {
    const needsPracticalMeaning = [
      "chroma-subsampling",
      "hdmi",
      "hdbaset",
      "usb-3",
      "cat-cable",
      "hdmi-cable-types",
      "resolution-refresh",
      "colour-depth",
    ];

    for (const id of needsPracticalMeaning) {
      const term = AV_GLOSSARY_TERMS.find((entry) => entry.id === id);
      expect(term, id).toBeDefined();
      expect(term?.inReality?.trim().length ?? 0, id).toBeGreaterThan(80);
    }
  });

  it("keeps related-term cross references resolvable to real entries", () => {
    const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const known = new Set<string>();
    for (const term of AV_GLOSSARY_TERMS) {
      known.add(normalise(term.term));
      if (term.acronym) known.add(normalise(term.acronym));
      term.aliases.forEach((alias) => known.add(normalise(alias)));
    }

    // Cross-references on the rebuilt reference terms must land on a real
    // entry, otherwise "related terms" silently degrades into a text search.
    const rebuilt = [
      "chroma-subsampling",
      "four-four-four",
      "four-two-two",
      "four-two-zero",
      "cat-cable",
      "hdmi-cable-types",
      "active-optical-cable",
      "resolution-refresh",
      "colour-depth",
    ];

    for (const id of rebuilt) {
      const term = AV_GLOSSARY_TERMS.find((entry) => entry.id === id)!;
      for (const related of term.related) {
        expect(known.has(normalise(related)), `${id} -> ${related}`).toBe(true);
      }
    }
  });
});
