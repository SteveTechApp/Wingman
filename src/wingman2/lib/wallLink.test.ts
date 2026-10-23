import { describe, expect, it } from "vitest";
import { defaultWallRequirements, type WallRequirements } from "./videowallOptions";
import { wallStartingPointBrief } from "./wallStartingPoints";
import {
  WALL_LINK_PARAM,
  wallLinkBrief,
  wallLinkFromSearch,
  wallLinkSearch,
  wallLinkToken,
} from "./wallLink";

function wall(overrides: Partial<WallRequirements> = {}): WallRequirements {
  return { ...defaultWallRequirements, ...overrides };
}

/** A token for a payload the builder itself would never write. */
function handWritten(payload: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `1.${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

describe("wall link", () => {
  it("brings back the answers the link was copied from", () => {
    const design = wall({
      application: "projection",
      projectors: 2,
      layout: "single",
      windows: 1,
      sources: 2,
      displayResolution: "4k",
    });

    const shared = wallLinkBrief(wallLinkToken(design));

    expect(shared).not.toBeNull();
    expect(shared?.application).toBe("projection");
    expect(shared?.projectors).toBe(2);
    expect(shared?.windows).toBe(1);
    expect(shared?.sources).toBe(2);
    // Fields the sender never changed come back as the builder's defaults.
    expect(shared?.columns).toBe(defaultWallRequirements.columns);
    expect(shared?.mountingHeightMm).toBe(defaultWallRequirements.mountingHeightMm);
  });

  it("carries the design and never the site's survey", () => {
    const design = wall({
      application: "lcd-loop",
      layout: "quad",
      columns: 3,
      rows: 2,
      windows: 4,
      sources: 4,
      measuredRuns: { "display-1": 9 },
      linkDetails: { "display-1": { enclosure: "Back box" } },
      surveyReview: {
        reviewedAt: "2026-10-20T09:00:00Z",
        photoCount: 1,
        confidence: 0.9,
        rows: [{ id: "display-1", label: "Panel 1", metres: 9, confidence: 0.9, decision: "accepted" }],
      },
    });

    const shared = wallLinkBrief(wallLinkToken(design));

    // The question the link answers is "what wall is this", not "what was
    // measured in that room".
    expect(shared?.columns).toBe(3);
    expect(shared?.rows).toBe(2);
    expect(shared?.windows).toBe(4);
    expect(shared?.measuredRuns).toEqual({});
    expect(shared?.linkDetails).toEqual({});
    expect(shared?.surveyReview).toBeUndefined();
  });

  it("names the default wall instead of dropping it", () => {
    // A link that carried nothing would open whatever the recipient happened to
    // be working on, which is the behaviour the link exists to replace.
    const token = wallLinkToken(defaultWallRequirements);

    expect(token.startsWith("1.")).toBe(true);
    expect(wallLinkBrief(token)).toEqual(wallStartingPointBrief(defaultWallRequirements));
  });

  it("encodes the same wall the same way whatever order its answers are in", () => {
    const design = wall({ application: "lcd-grouped", columns: 3, rows: 3, displayFeeds: 4, windows: 1 });
    const reordered = Object.fromEntries(Object.entries(design).reverse()) as WallRequirements;

    // The address is rewritten on each edit, so an object that only reordered
    // its keys must not look like a different wall.
    expect(wallLinkToken(reordered)).toBe(wallLinkToken(design));
  });

  it("stays URL-safe", () => {
    const token = wallLinkToken(wall({ application: "led", ledCanvasWidth: 5120, ledCanvasHeight: 1080, layout: "single" }));

    expect(token).not.toMatch(/[+/=]/);
    expect(encodeURIComponent(token)).toBe(token);
  });

  it("ignores a token that names no wall this builder could show", () => {
    expect(wallLinkBrief(null)).toBeNull();
    expect(wallLinkBrief("")).toBeNull();
    expect(wallLinkBrief("nonsense")).toBeNull();
    expect(wallLinkBrief("1.")).toBeNull();
    // A later build's token is not half-read.
    expect(wallLinkBrief(handWritten({ application: "led" }).replace("1.", "2."))).toBeNull();
    // A payload that is not an object, or names an application that does not exist.
    expect(wallLinkBrief(handWritten([1, 2, 3]))).toBeNull();
    expect(wallLinkBrief(handWritten({ application: "hologram" }))).toBeNull();
    expect(wallLinkBrief(handWritten({ application: "lcd-loop", layout: "mosaic" }))).toBeNull();
    // A design that cannot pass the builder's own limits is not a wall.
    expect(wallLinkBrief(handWritten({ application: "led", ledCanvasWidth: 0 }))).toBeNull();
  });

  it("refuses a token long enough to be a payload dump", () => {
    expect(wallLinkBrief(`1.${"a".repeat(2100)}`)).toBeNull();
  });

  it("writes the wall beside the pass and keeps every other param", () => {
    const design = wall({ application: "projection", projectors: 2, layout: "single", sources: 2 });
    const shared = wallLinkSearch("?view=expert&pass=transport", design);

    expect(shared.get("pass")).toBe("transport");
    expect(shared.get("view")).toBe("expert");
    expect(wallLinkFromSearch(shared)?.projectors).toBe(2);
  });

  it("replaces the wall a link already names rather than adding a second", () => {
    const first = wallLinkSearch("?pass=wall", wall({ application: "led", layout: "single" }));
    const second = wallLinkSearch(first, wall({ application: "lcd-direct", layout: "independent", columns: 2, rows: 2 }));

    expect(second.getAll(WALL_LINK_PARAM)).toHaveLength(1);
    expect(wallLinkFromSearch(second)?.application).toBe("lcd-direct");
  });

  it("reads a link's wall from a query string or parsed params alike", () => {
    const token = wallLinkToken(wall({ application: "lcd-loop", layout: "split", columns: 4, rows: 1, windows: 2 }));

    expect(wallLinkFromSearch(`?wall=${token}`)?.columns).toBe(4);
    expect(wallLinkFromSearch(new URLSearchParams(`pass=wall&wall=${token}`))?.windows).toBe(2);
    expect(wallLinkFromSearch("?pass=wall")).toBeNull();
  });
});
