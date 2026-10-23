import { describe, expect, it } from "vitest";
import type { WallOption } from "./videowallOptions";
import { WALL_PICK_PARAM, wallPickFromSearch, wallPickSearch, wallPickedOption } from "./wallPick";

function option(id: string, blockers: string[] = []): WallOption {
  return { id, title: id.toUpperCase(), summary: "", equipment: [], path: [], checks: [], blockers, sources: [] };
}

describe("the design a builder link carries", () => {
  it("reads the design a link names and ignores a blank one", () => {
    expect(wallPickFromSearch("?pick=nhd150")).toBe("nhd150");
    expect(wallPickFromSearch(new URLSearchParams("pass=wall&pick=mx-0404-scl"))).toBe("mx-0404-scl");
    // A link copied from the recommendation names no design at all, and a
    // hand-edited blank one is the same absence.
    expect(wallPickFromSearch("?pass=wall")).toBeNull();
    expect(wallPickFromSearch("?pick=")).toBeNull();
    expect(wallPickFromSearch(`?pick=${encodeURIComponent("  ")}`)).toBeNull();
  });

  it("writes the design beside the rest of the address", () => {
    const search = wallPickSearch("?pass=transport&wall=abc", "nhd600");

    expect(search.get(WALL_PICK_PARAM)).toBe("nhd600");
    // The wall and the pass are other params, not this rule's to drop.
    expect(search.get("pass")).toBe("transport");
    expect(search.get("wall")).toBe("abc");
  });

  it("drops the design when the rep goes back to the recommendation", () => {
    const picked = wallPickSearch("?pass=wall", "nhd150");

    // The recommendation is the absence of a pick, so choosing it again must
    // not leave the previous id in the link.
    expect(wallPickSearch(picked, "").get(WALL_PICK_PARAM)).toBeNull();
    expect(wallPickSearch(picked, null).toString()).toBe("pass=wall");
  });

  it("honours only a design these answers still reach", () => {
    const options = [option("nhd150"), option("nhd600", ["This option requires a dedicated 10GbE AV network."])];

    expect(wallPickedOption(options, "nhd150")?.id).toBe("nhd150");
    // A design the recipient's catalogue rules out is not shown as a choice:
    // the sender's link promised a wall that fits, and this one no longer does.
    expect(wallPickedOption(options, "nhd600")).toBeNull();
    expect(wallPickedOption(options, "led-canvas-that-never-existed")).toBeNull();
    expect(wallPickedOption(options, "")).toBeNull();
    expect(wallPickedOption(options, null)).toBeNull();
  });
});
