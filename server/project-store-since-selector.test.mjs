import { describe, expect, it } from "vitest";
import { selectProjectsForSince } from "./wingman-app-store.mjs";

// The incremental-hydration pull (ADR-0001 §1.2k) lets a reload only download
// the projects whose row advanced past the revisions the local copies are
// based on. The contract under test is the SAFE side of that optimization:
// `selectProjectsForSince` may only skip a row when it can prove the client's
// copy is current with it (row syncRevision === the revision the client
// reported). Anything unprovable - a row the client never reported, a row
// whose revision moved, a forced 0 entry, a legacy row without a revision -
// must be returned, because skipping would hide content the hydration merge
// would otherwise adopt.

function project(id, syncRevision) {
  return {
    id,
    name: `Project ${id}`,
    updatedAt: "2026-09-03T09:00:00.000Z",
    ...(syncRevision === undefined ? {} : { syncRevision }),
  };
}

describe("selectProjectsForSince", () => {
  it("skips only rows whose revision equals the reported one", () => {
    const rows = [project("a", 3), project("b", 1), project("c", 7)];
    const selected = selectProjectsForSince(rows, { a: 3, b: 1, c: 7 });
    expect(selected.map((row) => row.id)).toEqual([]);
  });

  it("returns a row whose revision moved past the reported one (member synced it)", () => {
    const rows = [project("a", 4), project("b", 2)];
    const selected = selectProjectsForSince(rows, { a: 3, b: 2 });
    expect(selected.map((row) => row.id)).toEqual(["a"]);
  });

  it("returns rows the client never reported (new to it)", () => {
    const rows = [project("a", 3), project("b", 1)];
    expect(selectProjectsForSince(rows, { b: 1 }).map((row) => row.id)).toEqual(["a"]);
    expect(selectProjectsForSince(rows, {}).map((row) => row.id)).toEqual(["a", "b"]);
    expect(selectProjectsForSince(rows, null).map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("treats a manifest entry of 0 as a forced pull (syncConflict-flagged copy)", () => {
    const rows = [project("a", 3)];
    const selected = selectProjectsForSince(rows, { a: 0 });
    expect(selected.map((row) => row.id)).toEqual(["a"]);
  });

  it("always returns legacy rows that carry no syncRevision (currency cannot be proven)", () => {
    const rows = [project("legacy", undefined)];
    const selected = selectProjectsForSince(rows, { legacy: 3 });
    expect(selected.map((row) => row.id)).toEqual(["legacy"]);
  });

  it("returns a row whose reported revision is ahead of the row (fresh incarnation)", () => {
    const rows = [project("recreated", 1)];
    const selected = selectProjectsForSince(rows, { recreated: 5 });
    expect(selected.map((row) => row.id)).toEqual(["recreated"]);
  });

  it("drops malformed manifest values to always-return, never to skip", () => {
    const rows = [project("a", 3)];
    for (const manifest of [{ a: "three" }, { a: -1 }, { a: null }, { a: NaN }]) {
      expect(selectProjectsForSince(rows, manifest).map((row) => row.id), JSON.stringify(manifest)).toEqual(["a"]);
    }
  });

  it("handles rows without an id defensively", () => {
    const rows = [{ name: "no id", syncRevision: 3 }];
    expect(selectProjectsForSince(rows, {}).length).toBe(1);
  });
});
