import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  WALL_REVIEW_PASS_KEY,
  readWallReviewPass,
  rememberWallReviewPass,
  wallReviewPassFrom,
  wallReviewPassFromSearch,
  wallReviewPassSearch,
} from "./wallReviewPass";

describe("wall review pass", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("opens on the design when nothing was read yet", () => {
    expect(readWallReviewPass()).toBe("decision");
  });

  it("brings back the pass the rep last read", () => {
    rememberWallReviewPass("transport");

    expect(readWallReviewPass()).toBe("transport");
  });

  it("ignores a stored pass that no longer names a stage", () => {
    window.localStorage.setItem(WALL_REVIEW_PASS_KEY, "print");

    expect(wallReviewPassFrom("print")).toBeNull();
    expect(readWallReviewPass()).toBe("decision");
  });

  it("reads the pass a link names, and ignores one that names no stage", () => {
    expect(wallReviewPassFromSearch("?pass=transport")).toBe("transport");
    expect(wallReviewPassFromSearch(new URLSearchParams("view=expert&pass=wall"))).toBe("wall");
    expect(wallReviewPassFromSearch("?pass=print")).toBeNull();
    expect(wallReviewPassFromSearch("")).toBeNull();
  });

  it("writes a pass into the link and keeps the builder's other params", () => {
    const shared = wallReviewPassSearch("?view=expert", "transport");

    expect(shared.toString()).toBe("view=expert&pass=transport");
    // The opening pass is the bare builder, so a shared link does not carry a
    // default the recipient never chose.
    expect(wallReviewPassSearch(shared, "decision").toString()).toBe("view=expert");
  });

  it("keeps the builder working when storage is unavailable", () => {
    const denied = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const blocked = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => rememberWallReviewPass("wall")).not.toThrow();
    expect(readWallReviewPass()).toBe("decision");

    denied.mockRestore();
    blocked.mockRestore();
  });
});
