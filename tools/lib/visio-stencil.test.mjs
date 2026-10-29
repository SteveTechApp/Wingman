import { describe, expect, it } from "vitest";
import { AV_SYMBOLS } from "./av-symbols.mjs";
import {
  assertStencilPackage,
  buildStencilParts,
  CONTENT_TYPES,
  readZip,
  zipParts,
} from "./visio-stencil.mjs";

const STAMP = new Date("2026-10-28T00:00:00Z");

/** The shipped catalog as a package, the way the build script makes it. */
function shipped() {
  const parts = buildStencilParts({ masters: AV_SYMBOLS.map((symbol) => ({ ...symbol })), title: "Test", now: STAMP });
  return { parts, archive: zipParts(parts) };
}

/** A package with one part's bytes replaced, to see whether a problem is caught. */
function withPart(parts, path, editor) {
  return parts.map((part) => (part.path === path ? { ...part, data: editor(String(part.data)) } : part));
}

describe("the Visio stencil package", () => {
  it("carries every part a stencil is made of", () => {
    const { parts } = shipped();
    expect(parts.map((part) => part.path)).toEqual(expect.arrayContaining([
      "[Content_Types].xml",
      "_rels/.rels",
      "docProps/core.xml",
      "docProps/app.xml",
      "visio/document.xml",
      "visio/windows.xml",
      "visio/masters/masters.xml",
      "visio/masters/_rels/masters.xml.rels",
      "visio/pages/pages.xml",
      "visio/pages/page1.xml",
      "visio/_rels/document.xml.rels",
      "visio/pages/_rels/page1.xml.rels",
    ]));
    // `masters.xml` is the index, not a master: one part per symbol, and no more.
    expect(parts.filter((part) => /^visio\/masters\/master\d+\.xml$/.test(part.path)).length).toBe(AV_SYMBOLS.length);
  });

  it("types the document part as a stencil, which is what makes it one", () => {
    // A drawing's document part is `…drawing.main+xml`; the stencil type is the
    // single difference that decides how Visio opens the file.
    const { parts } = shipped();
    const contentTypes = String(parts.find((part) => part.path === "[Content_Types].xml").data);
    expect(contentTypes).toContain(`PartName="/visio/document.xml" ContentType="${CONTENT_TYPES.document}"`);
    expect(contentTypes).toContain("application/vnd.ms-visio.stencil.main+xml");
    expect(contentTypes).not.toContain("application/vnd.ms-visio.drawing");
  });

  it("holds together: no problems for the shipped symbols", () => {
    const { archive } = shipped();
    expect(assertStencilPackage({ archive, masters: AV_SYMBOLS })).toEqual([]);
  });

  it("survives a byte-for-byte round trip through the archive", () => {
    const { parts, archive } = shipped();
    const entries = readZip(archive);
    for (const part of parts) {
      expect(entries.get(part.path).toString("utf8")).toBe(String(part.data));
    }
  });

  it("is byte-identical when rebuilt, so a diff is a real change", () => {
    expect(shipped().archive.equals(shipped().archive)).toBe(true);
  });

  it("fails a document part that is typed as a drawing", () => {
    // The one mistake that turns a stencil into a file Visio opens as a drawing.
    const { parts } = shipped();
    const drawing = withPart(parts, "[Content_Types].xml", (text) =>
      text.replace(CONTENT_TYPES.document, "application/vnd.ms-visio.drawing.main+xml"));
    const problems = assertStencilPackage({ archive: zipParts(drawing), masters: AV_SYMBOLS });
    expect(problems.join("\n")).toContain("not typed as a stencil");
  });

  it("fails a relationship that points at a part the package does not have", () => {
    const { parts } = shipped();
    const missing = parts.filter((part) => part.path !== "visio/windows.xml");
    const problems = assertStencilPackage({ archive: zipParts(missing), masters: AV_SYMBOLS });
    expect(problems.join("\n")).toContain("windows.xml");
  });

  it("fails a symbol that draws nothing", () => {
    const empty = [{ ...AV_SYMBOLS[0], paths: [], properties: AV_SYMBOLS[0].properties, connections: [] }];
    const problems = assertStencilPackage({
      archive: zipParts(buildStencilParts({ masters: empty, title: "Test", now: STAMP })),
      masters: empty,
    });
    expect(problems.join("\n")).toContain("draws nothing");
  });

  it("fails a field the catalog describes but the shape does not carry", () => {
    const { archive } = shipped();
    const problems = assertStencilPackage({
      archive,
      masters: AV_SYMBOLS,
      expectProperties: { [AV_SYMBOLS[0].nameU]: AV_SYMBOLS[0].properties.length + 1 },
    });
    expect(problems.join("\n")).toContain("Shape Data fields");
  });

  it("gives each symbol a 16×16 bitmap icon for the stencil pane", () => {
    const { archive } = shipped();
    const mastersXml = readZip(archive).get("visio/masters/masters.xml").toString("utf8");
    for (const symbol of AV_SYMBOLS) {
      const element = mastersXml.slice(mastersXml.indexOf(`NameU="${symbol.nameU}"`));
      const base64 = element.match(/<Icon>([^<]+)<\/Icon>/)[1];
      const bitmap = Buffer.from(base64, "base64");
      expect(bitmap.subarray(0, 2).toString("ascii")).toBe("BM");
      expect(bitmap.readInt32LE(18)).toBe(16);
      expect(bitmap.readInt32LE(22)).toBe(16);
      expect(bitmap.readUInt16LE(28)).toBe(24);
    }
  });
});

describe("the AV symbol catalog", () => {
  it("names each symbol once, because Visio matches masters on the name", () => {
    const names = AV_SYMBOLS.map((symbol) => symbol.nameU);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name.startsWith("Wingman.AV.")).toBe(true);
  });

  it("keeps every point inside the box the symbol drops at", () => {
    // A point outside the shape's own width and height draws outside the drop
    // rectangle, which reads as a symbol that does not fit its own handles.
    for (const symbol of AV_SYMBOLS) {
      for (const path of symbol.paths) {
        for (const [x, y] of path.points) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(symbol.width);
          expect(y).toBeLessThanOrEqual(symbol.height);
        }
      }
    }
  });

  it("glues on all four edges and carries a field for what a rep fills in", () => {
    for (const symbol of AV_SYMBOLS) {
      expect(symbol.connections).toHaveLength(4);
      expect(symbol.properties.length).toBeGreaterThanOrEqual(4);
      const fields = symbol.properties.map((property) => property.name);
      expect(new Set(fields).size).toBe(fields.length);
      for (const property of symbol.properties) {
        expect(property.label.length).toBeGreaterThan(0);
        expect([0, 1]).toContain(property.type);
      }
    }
  });
});
