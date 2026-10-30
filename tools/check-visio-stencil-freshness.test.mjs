import { describe, expect, it } from "vitest";
import { AV_SYMBOLS } from "./lib/av-symbols.mjs";
import { buildAvStencil } from "./lib/av-stencil.mjs";
import { stencilDriftErrors } from "./check-visio-stencil-freshness.mjs";

/**
 * The freshness gate's reading: what it says when the committed stencil is the
 * one the catalogue builds, and what it names when it is not.
 *
 * Each case builds two real archives through the shared definition rather than
 * handing the comparator fixtures, because the claim under test is about packages
 * the builder actually makes.
 */

const fresh = () => buildAvStencil().archive;

/** The catalogue with one symbol's fill changed, as an uncommitted edit would leave it. */
const withFill = (fillColor) => buildAvStencil({
  masters: AV_SYMBOLS.map((symbol) => (
    symbol.nameU === "Wingman.AV.Display" ? { ...symbol, fillColor } : symbol
  )),
}).archive;

/** The catalogue with one more symbol in it. */
const withExtraSymbol = () => buildAvStencil({
  masters: [
    ...AV_SYMBOLS,
    { ...AV_SYMBOLS[0], nameU: "Wingman.AV.SecondDisplay", name: "Display (second)" },
  ],
}).archive;

describe("the stencil freshness gate", () => {
  it("passes when the committed file is what the catalogue builds", () => {
    expect(stencilDriftErrors({ committed: fresh(), fresh: fresh() })).toEqual([]);
  });

  it("fails a committed file the catalogue no longer builds, and names the symbol", () => {
    const errors = stencilDriftErrors({ committed: fresh(), fresh: withFill("#0B7285") });
    const message = errors.join("\n");
    expect(message).toContain("no longer matches a fresh build from the symbol catalogue");
    // A byte offset says where the files part company; the rep needs which symbol.
    expect(message).toContain("changed: visio/masters/master1.xml");
    expect(message).toContain("symbols that changed: visio/masters/master1.xml");
    expect(message).toContain("node tools/build-visio-stencil.mjs");
  });

  it("names a symbol added to the catalogue without a rebuild", () => {
    const message = stencilDriftErrors({ committed: fresh(), fresh: withExtraSymbol() }).join("\n");
    expect(message).toContain("only in the fresh build:");
    expect(message).toContain("visio/masters/master4.xml");
  });

  it("fails a stencil missing from the tree, because it is a tracked artifact", () => {
    const errors = stencilDriftErrors({ committed: null, fresh: fresh() });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("stencils/wingman-av-symbols.vssx is not in the tree");
    expect(errors[0]).toContain("node tools/build-visio-stencil.mjs");
  });

  it("says a file that is not a package at all cannot be trusted part by part", () => {
    const message = stencilDriftErrors({ committed: Buffer.from("not an OPC package"), fresh: fresh() }).join("\n");
    expect(message).toContain("does not read as an OPC package");
    expect(message).not.toContain("changed:");
  });

  it("reports one byte against a rebuild, so a truncated commit cannot slip through", () => {
    const committed = Buffer.from(fresh());
    committed[committed.length - 1] ^= 0xff;
    const message = stencilDriftErrors({ committed, fresh: fresh() }).join("\n");
    expect(message).toContain("no longer matches a fresh build");
    expect(message).toContain("rebuild and commit it");
  });
});
