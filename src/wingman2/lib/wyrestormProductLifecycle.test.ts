import { describe, expect, it } from "vitest";

import {
  collectWyreStormSupersessionProblems,
  getWyreStormSupersession,
  resolveProductLifecycle,
  WYRESTORM_SUPERSESSIONS,
  type WyreStormSupersession,
} from "./wyrestormProductLifecycle";
import { getWyreStormSkuBusinessStatus } from "./wyrestormSkuBusinessStatus";

describe("wyrestorm product lifecycle", () => {
  it("treats a current SKU as recommendable", () => {
    const life = resolveProductLifecycle("CAM-210-NDI-PTZ");
    expect(life.status).toBe("active");
    expect(life.recommendable).toBe(true);
    expect(life.supersededBy).toBeUndefined();
  });

  it("blocks a discontinued SKU from being recommendable", () => {
    const life = resolveProductLifecycle("CAM-200-PTZ");
    expect(life.status).toBe("discontinued");
    expect(life.recommendable).toBe(false);
  });

  it("blocks a do-not-spec SKU from being recommendable", () => {
    const life = resolveProductLifecycle("APO-DG1");
    expect(life.status).toBe("do-not-spec");
    expect(life.recommendable).toBe(false);
  });

  it("identifies a superseded SKU and names its current replacement", () => {
    const supersession = getWyreStormSupersession("SYN-TOUCH10");
    expect(supersession?.successor).toBe("SYN-TOUCH10-V2");

    const life = resolveProductLifecycle("SYN-TOUCH10");
    expect(life.supersededBy).toBe("SYN-TOUCH10-V2");
    expect(life.recommendable).toBe(false);
    expect(life.note).toMatch(/SYN-TOUCH10-V2/);
  });

  it("treats the successor itself as current and recommendable", () => {
    const life = resolveProductLifecycle("SYN-TOUCH10-V2");
    expect(life.status).toBe("active");
    expect(life.recommendable).toBe(true);
    expect(life.supersededBy).toBeUndefined();
  });

  it("blocks a SKU the admin has manually marked doNotUse, even though it is otherwise unresolved", () => {
    const life = resolveProductLifecycle("SW-740-TX");
    expect(life.adminBlocked).toBe(true);
    expect(life.recommendable).toBe(false);
    expect(life.note).toMatch(/admin override/i);
  });

  it("does not block an otherwise-active SKU that the admin has explicitly approved", () => {
    const life = resolveProductLifecycle("APO-VX20-UC-V2");
    expect(life.adminBlocked).toBe(false);
    expect(life.recommendable).toBe(true);
  });
});

describe("WYRESTORM_SUPERSESSIONS active-successor pin", () => {
  const entry = (predecessor: string, successor: string): WyreStormSupersession => ({
    predecessor,
    successor,
    reason: "test fixture",
  });

  it("every promoted remap in the committed table resolves to an active SKU", () => {
    for (const { predecessor, successor } of WYRESTORM_SUPERSESSIONS) {
      expect(
        getWyreStormSkuBusinessStatus(successor),
        `${successor} (successor of ${predecessor}) must be active`,
      ).toBe("active");
    }
  });

  it("no promoted predecessor is itself an active current product", () => {
    for (const { predecessor, successor } of WYRESTORM_SUPERSESSIONS) {
      expect(
        getWyreStormSkuBusinessStatus(predecessor),
        `${predecessor} must not be active if it declares successor ${successor}`,
      ).not.toBe("active");
    }
  });

  it("no remap points at itself and no predecessor is promoted twice", () => {
    const seen = new Set<string>();
    for (const { predecessor, successor } of WYRESTORM_SUPERSESSIONS) {
      expect(predecessor.toUpperCase().replace(/[^A-Z0-9]+/g, "")).not.toBe(
        successor.toUpperCase().replace(/[^A-Z0-9]+/g, ""),
      );
      const key = predecessor.toUpperCase().replace(/[^A-Z0-9]+/g, "");
      expect(seen.has(key), `${predecessor} promoted twice`).toBe(false);
      seen.add(key);
    }
  });

  it("collectWyreStormSupersessionProblems reports none against the committed table (CI pin for the runtime equivalent of the lifecycle successor guard)", () => {
    expect(collectWyreStormSupersessionProblems()).toEqual([]);
  });

  it("rejects a successor that became discontinued (a promoted remap can never point at a discontinued SKU)", () => {
    const problems = collectWyreStormSupersessionProblems([
      entry("OLD-SKU", "NHD-TOUCH"),
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/must point at an active, quotable product/);
  });

  it("rejects a successor that does not resolve to any lifecycle row", () => {
    const problems = collectWyreStormSupersessionProblems([entry("OLD-SKU", "NO-SUCH-SKU")]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/does not resolve to any lifecycle row/);
  });

  it("rejects a row that names itself as its own successor", () => {
    const problems = collectWyreStormSupersessionProblems([entry("SELF-SKU", "self-sku")]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/names itself/);
  });

  it("rejects an active source row that declares a successor", () => {
    const problems = collectWyreStormSupersessionProblems([
      entry("CAM-210-NDI-PTZ", "SYN-TOUCH10-V2"),
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/is active but names successor/);
  });
});
