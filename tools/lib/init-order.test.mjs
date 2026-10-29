import { describe, expect, it } from "vitest";
import {
  bindingShapes,
  collectChunkModuleScopeReads,
  decodeMappings,
  findInitOrderHazards,
  sourceMapLookup,
  toChunkFacts,
} from "./init-order.mjs";

/**
 * The gate's two halves are pinned here without a bundle: what the emitted code
 * says is a module-scope read and what a read takes (functions are initialized
 * before any chunk body runs, everything else is not), and then which entry loads
 * can run that read first.
 *
 * That second half is the reason the gate asks its question once per entry. The
 * same read is safe or fatal depending on where the cycle is entered: a chunk that
 * reads a binding out of a chunk the entry reached *through* can only run after it,
 * which is why the palette crash showed up on `/wingman/templates/<id>` and not on
 * the pages that load the same two chunks in the other order.
 */

/** A chunk as the bundle describes it: emitted code, plus the chunks it imports. */
function chunk(fileName, { code = "", imports = [], dynamicImports = [], ...rest }) {
  return { fileName, code, imports, dynamicImports, isEntry: false, isDynamicEntry: false, facadeModuleId: null, modules: [], map: null, ...rest };
}

function analyze({ chunks, eager = [], entries }) {
  const collected = collectChunkModuleScopeReads({ chunks });
  const shapeOf = bindingShapes({ chunks });
  const reads = collected.reads.map((read) => ({ ...read, ...shapeOf(read) }));
  return { ...findInitOrderHazards({ chunks, eager, entries, reads }), reads, collected };
}

describe("collectChunkModuleScopeReads", () => {
  it("finds a read of an imported binding where the chunk's body runs", () => {
    const { collected } = analyze({
      chunks: [
        chunk("a.js", { code: 'import{l as e}from"./b.js";var t=e.aqua;', imports: ["b.js"] }),
        chunk("b.js", { code: "var l={aqua:'#0ff'};export{l};" }),
      ],
      entries: [{ fileName: "a.js", label: "a" }],
    });

    expect(collected.reads.map((read) => [read.localName, read.importedFrom, read.exportedName])).toEqual([["e", "b.js", "l"]]);
  });

  it("ignores a read inside a function, which runs later than the chunk body", () => {
    const { collected } = analyze({
      chunks: [
        chunk("a.js", { code: 'import{l as e}from"./b.js";export function paint(){return e.aqua}', imports: ["b.js"] }),
        chunk("b.js", { code: "var l={aqua:'#0ff'};export{l};" }),
      ],
      entries: [{ fileName: "a.js", label: "a" }],
    });

    expect(collected.reads).toEqual([]);
  });

  it("counts a read inside a function that is called where it stands", () => {
    const { collected } = analyze({
      chunks: [
        chunk("a.js", { code: 'import{l as e}from"./b.js";var t=(()=>e.aqua)();', imports: ["b.js"] }),
        chunk("b.js", { code: "var l={aqua:'#0ff'};export{l};" }),
      ],
      entries: [{ fileName: "a.js", label: "a" }],
    });

    expect(collected.reads).toHaveLength(1);
  });

  it("does not mistake a property name or a declared name for a read", () => {
    const { collected } = analyze({
      chunks: [
        chunk("a.js", { code: 'import{l as e}from"./b.js";var e2={e:1,l:2};function q(e){return e2.e}', imports: ["b.js"] }),
        chunk("b.js", { code: "var l=1;export{l};" }),
      ],
      entries: [{ fileName: "a.js", label: "a" }],
    });

    expect(collected.reads).toEqual([]);
  });
});

describe("bindingShapes", () => {
  // A barrel re-exports a function; another chunk re-exports an import of its own.
  const chunks = [
    chunk("definer.js", { code: 'import{rr as passed}from"./reexport.js";var c=1;function f(){}\nexport{f,c,passed as given};' }),
    chunk("reexport.js", { code: "export function rr(){}" }),
  ];

  const shapeOf = bindingShapes({ chunks });

  it("calls a function initialized before any chunk body runs", () => {
    expect(shapeOf({ importedFrom: "definer.js", exportedName: "f" })).toEqual({ kind: "function", hoisted: true });
  });

  it("does not call a var, which is undefined until its chunk runs", () => {
    expect(shapeOf({ importedFrom: "definer.js", exportedName: "c" })).toEqual({ kind: "var", hoisted: false });
  });

  it("asks a re-export where it is declared", () => {
    expect(shapeOf({ importedFrom: "definer.js", exportedName: "given" })).toEqual({ kind: "function", hoisted: true });
  });

  it("does not call a binding it cannot find, because a scan that cannot see one is not evidence", () => {
    expect(shapeOf({ importedFrom: "definer.js", exportedName: "missing" })).toEqual({ kind: "unknown", hoisted: false });
  });

  it("reads a const table as uninitialized", () => {
    const constChunks = [chunk("c.js", { code: "const t={aqua:1};export{t};" })];
    expect(bindingShapes({ chunks: constChunks })({ importedFrom: "c.js", exportedName: "t" })).toEqual({
      kind: "const",
      hoisted: false,
    });
  });
});

describe("findInitOrderHazards", () => {
  /**
   * `definer` imports `reader` back and `reader` reads the definer's table at
   * module scope: the shape the palette crash had, where the palette's chunk
   * reaches the reader's chunk through the schematic group. An entry that reaches
   * the definer first runs the reader while the definer is still being evaluated;
   * an entry that reaches the reader first runs it afterwards.
   */
  const cyclic = () => [
    chunk("reader.js", { code: 'import{t as table}from"./definer.js";var probe=table.aqua;', imports: ["definer.js"] }),
    chunk("definer.js", { code: 'import"./reader.js";var t={aqua:"#0ff"};export{t};', imports: ["reader.js"] }),
  ];

  it("reports a read an entry can run while the chunk that defines it is still evaluating", () => {
    const { findings } = analyze({
      chunks: cyclic(),
      entries: [{ fileName: "definer.js", label: "Template review" }],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ chunk: "reader.js", importedFrom: "definer.js", kind: "var", entries: ["Template review"] });
  });

  it("leaves the same read alone when the entry reaches the reader first", () => {
    const { findings } = analyze({
      chunks: cyclic(),
      entries: [{ fileName: "reader.js", label: "Proposal visuals" }],
    });

    expect(findings).toEqual([]);
  });

  it("branches per entry, so one cycle is reported for the load that enters it wrongly", () => {
    const { findings } = analyze({
      chunks: cyclic(),
      entries: [
        { fileName: "reader.js", label: "Proposal visuals" },
        { fileName: "definer.js", label: "Template review" },
      ],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].entries).toEqual(["Template review"]);
  });

  it("leaves a read of a hoisted function alone, which is what the boot depends on", () => {
    const chunks = [
      chunk("reader.js", { code: 'import{f as mak}from"./definer.js";var c=mak(1);', imports: ["definer.js"] }),
      chunk("definer.js", { code: 'import"./reader.js";function f(n){return n}export{f};', imports: ["reader.js"] }),
    ];

    expect(analyze({ chunks, entries: [{ fileName: "reader.js", label: "boot" }] }).findings).toEqual([]);
  });

  it("leaves a read whose definer has already evaluated alone", () => {
    const chunks = [
      chunk("reader.js", { code: 'import{t as table}from"./definer.js";var probe=table.aqua;', imports: ["definer.js"] }),
      chunk("definer.js", { code: 'var t={aqua:"#0ff"};export{t};' }),
    ];

    const { findings, stats } = analyze({ chunks, entries: [{ fileName: "reader.js", label: "boot" }] });
    expect(findings).toEqual([]);
    expect(stats.considered).toBe(1);
  });

  it("treats an eager chunk as already evaluated for a route load, and not for the boot", () => {
    // A chunk the entry document already holds is evaluated by the time a route
    // chunk arrives, so a cycle inside that closure is the boot's race, not the
    // route's: the same two chunks are safe for one and fatal for the other.
    const chunks = cyclic();
    const eager = ["definer.js"];

    expect(analyze({ chunks, eager, entries: [{ fileName: "reader.js", label: "a route" }] }).findings).toEqual([]);
    expect(
      analyze({ chunks, eager, entries: [{ fileName: "definer.js", label: "the boot", isBoot: true }] }).findings,
    ).toHaveLength(1);
  });

  it("says which chunks no entry reaches, so a read it cannot ask about is visible", () => {
    const chunks = [
      chunk("entry.js", { code: 'import"./kept.js";', dynamicImports: ["kept.js"] }),
      chunk("kept.js", { code: "var a=1;" }),
      chunk("parked.js", { code: 'import{t as t}from"./definer.js";var p=t.aqua;', imports: ["definer.js"] }),
      chunk("definer.js", { code: "var t=1;export{t};" }),
    ];

    const { stats } = analyze({ chunks, entries: [{ fileName: "entry.js", label: "boot" }] });
    expect(stats.unreachableChunks).toEqual(["parked.js", "definer.js"]);
  });

  it("counts the reads it left alone as hoisted rather than as checked", () => {
    const chunks = [
      chunk("reader.js", { code: 'import{fn,t as table}from"./definer.js";var a=fn(0),b=table.aqua;', imports: ["definer.js"] }),
      chunk("definer.js", { code: "function fn(n){return n}var t={aqua:1};export{fn,t};" }),
    ];

    const { stats } = analyze({ chunks, entries: [{ fileName: "reader.js", label: "boot" }] });
    expect(stats).toMatchObject({ reads: 2, hoisted: 1, considered: 1 });
  });
});

describe("source maps", () => {
  it("names the original position of a generated one", () => {
    // `AA` carries only a generated column; `IAAM` moves to generated column 4 and
    // maps it to source 0 at original line 0 (0-based), column 6.
    const lookup = sourceMapLookup({ mappings: "AA,IAAM", sources: ["../src/wingman2/lib/schematicVisualPalette.ts"] });

    expect(lookup(1, 4)).toMatchObject({ line: 1, column: 7 });
    expect(lookup(1, 4).source).toBe("../src/wingman2/lib/schematicVisualPalette.ts");
  });

  it("answers nothing for a position no segment describes", () => {
    const lookup = sourceMapLookup({ mappings: "AA,IAAM", sources: ["a.ts"] });

    expect(lookup(1, 0)).toBeNull();
  });

  it("answers nothing for a chunk the bundler wrote no map for", () => {
    expect(sourceMapLookup(null)(1, 1)).toBeNull();
    expect(decodeMappings("")).toEqual([]);
  });
});

describe("toChunkFacts", () => {
  it("drops an import of a file the build did not emit", () => {
    const chunks = toChunkFacts([
      { type: "chunk", fileName: "a.js", code: "import './external.js';", imports: ["external.js", "b.js"] },
      { type: "chunk", fileName: "b.js", code: "" },
      { type: "asset", fileName: "a.css", source: "" },
    ]);

    expect(chunks.map((entry) => entry.fileName)).toEqual(["a.js", "b.js"]);
    expect(chunks[0].imports).toEqual(["b.js"]);
  });
});
