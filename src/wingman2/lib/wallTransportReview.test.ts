import { describe, expect, it } from "vitest";
import type { ProjectAuditEntry } from "../data/projectStore";
import { defaultWallRequirements } from "./videowallOptions";
import { wallTransportPlan } from "./videowallTransport";
import {
  WALL_TRANSPORT_REVIEW_ANCHOR,
  wallTransportReviewEntryLinks,
  wallTransportReviewRowAnchor,
} from "./wallTransportReview";

function plan(overrides: Partial<typeof defaultWallRequirements> = {}) {
  return wallTransportPlan({ ...defaultWallRequirements, columns: 2, rows: 1, sources: 1, ...overrides });
}

function entry(action: string, detail: string): ProjectAuditEntry {
  return {
    id: "audit-1",
    action,
    detail,
    scope: "videowall",
    severity: "info",
    actorName: "Wingman user",
    createdAt: "2026-10-21T20:30:00.000Z",
  };
}

describe("wall transport review anchors", () => {
  it("names a row under the panel an address can open", () => {
    expect(wallTransportReviewRowAnchor("display-2")).toBe(`${WALL_TRANSPORT_REVIEW_ANCHOR}-row-display-2`);
  });
});

describe("wall transport entry links", () => {
  it("opens the rows a sheet import names, in the order it names them", () => {
    const links = wallTransportReviewEntryLinks(
      entry("wall-survey-sheet", "Survey sheet imported — 2 runs (Source 1: 3 m; Panel 1: 4.5 m); recorded 21 Oct 2026, 20:30"),
      plan(),
    );

    expect(links.map((link) => link.linkId)).toEqual(["source-1", "display-1"]);
    // The clause is the entry's own wording, so the button and the sentence
    // cannot be read as two different facts.
    expect(links.map((link) => link.label)).toEqual(["Source 1: 3 m", "Panel 1: 4.5 m"]);
    expect(links[1].rowId).toBe(wallTransportReviewRowAnchor("display-1"));
    expect(links[1].title).toContain("Panel 1's row");
  });

  it("opens the link an install-detail entry filled, without inventing a run", () => {
    const links = wallTransportReviewEntryLinks(
      entry("wall-survey-detail", "Install detail recorded from the proposal — 1 link (Panel 2)"),
      plan(),
    );

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ linkId: "display-2", label: "Panel 2" });
  });

  it("opens a review row's link without repeating the flagged clause", () => {
    const links = wallTransportReviewEntryLinks(
      entry(
        "wall-survey-review",
        "Worksheet photo review — 1 row accepted (1 typed), none rejected, 1 photo, 63% confidence, 1 typed run outside the printed allowance (Panel 1: 7 m against ≈2 m); recorded 20 Oct 2026, 14:12",
      ),
      plan(),
    );

    // The flag clause already has its own link into the decision, so the
    // transport button names the link rather than printing the same sentence
    // twice.
    expect(links.map((link) => link.label)).toEqual(["Panel 1"]);
  });

  it("names no row for an entry that names no link, or no wall", () => {
    expect(wallTransportReviewEntryLinks(entry("wall-survey-review", "Worksheet photo review — 2 rows accepted"), plan())).toEqual([]);
    expect(wallTransportReviewEntryLinks(entry("wall-survey-sheet", "Survey sheet imported — no measured runs"), plan())).toEqual([]);
    expect(wallTransportReviewEntryLinks(entry("wall-survey-sheet", "Survey sheet imported — Panel 1: 4 m"), null)).toEqual([]);
  });

  it("leaves other scopes alone even when their words match a link", () => {
    const links = wallTransportReviewEntryLinks(entry("discovery-save", "Discovery updated — Panel 1 changed"), plan());

    expect(links).toEqual([]);
  });

  it("matches whole link names, so Panel 1 is not Panel 12", () => {
    const links = wallTransportReviewEntryLinks(entry("wall-survey-sheet", "Survey sheet imported — 1 run (Panel 12: 4 m)"), plan());

    expect(links).toEqual([]);
  });
});
