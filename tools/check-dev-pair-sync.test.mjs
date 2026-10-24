import { describe, expect, it } from "vitest";
import { conflictedWorkspaceChip, syncedWorkspaceChip, waitForSyncedChip } from "./check-dev-pair-sync.mjs";

const SUCCESS = "wm-status-chip wm-status wm-status-success max-w-xl";
const NEUTRAL = "wm-status-chip wm-status wm-status-neutral max-w-xl";
const PROGRESS = "wm-status-chip wm-status wm-status-progress max-w-xl";

describe("the Projects chip's own words", () => {
  it("accepts either sentence projectSyncService writes after it reaches the backend", () => {
    for (const text of [
      "Project data was loaded from the workspace backend.",
      "Project changes are synced to the workspace backend.",
    ]) {
      expect(syncedWorkspaceChip({ className: SUCCESS, text })).toEqual({ synced: true, text });
    }
  });

  it("fails a browser-local chip and names the sentence it read", () => {
    const verdict = syncedWorkspaceChip({ className: NEUTRAL, text: "Saved in this browser" });

    expect(verdict.synced).toBe(false);
    expect(verdict.reason).toContain("Saved in this browser");
  });

  it("fails the signed-out banner, which is what an unsynced store reads", () => {
    const verdict = syncedWorkspaceChip({
      className: NEUTRAL,
      text: "Project backend sync is enabled, but Wingman is not signed in. Local changes are preserved.",
    });

    expect(verdict.synced).toBe(false);
    expect(verdict.reason).toContain("not signed in");
  });

  it("fails a chip that is still syncing, even though it names the backend", () => {
    // The syncing sentence contains the same phrase, so the tone is what has to
    // disagree: a rep reading "Saving..." has not reached the workspace yet.
    const verdict = syncedWorkspaceChip({ className: PROGRESS, text: "Saving project changes to the workspace backend..." });

    expect(verdict.synced).toBe(false);
    expect(verdict.reason).toContain("not wearing the synced tone");
  });

  it("fails a chip that has not been drawn yet", () => {
    expect(syncedWorkspaceChip(null)).toMatchObject({ synced: false, reason: "the Projects page has no sync chip" });
  });
});

describe("the chip's conflict sentence", () => {
  // `syncConflictStatusMessage` writes both shapes: the lanes it names for one
  // project, and the count for several. Either one means the store chose a copy
  // and is asking which to keep.
  const ONE_PROJECT = 'A team member changed Project name, Discovery brief in "Northbridge Meeting Room Refresh" since your last sync.';
  const SEVERAL_PROJECTS = "A team member changed projects since your last sync: \"Northbridge Meeting Room Refresh\", \"Boardroom wall\" and 2 more. See the Changed badges for details.";

  it("recognises the sentence for one project and for several", () => {
    for (const text of [ONE_PROJECT, SEVERAL_PROJECTS]) {
      expect(conflictedWorkspaceChip({ className: "wm-status wm-status-danger", text })).toEqual({ conflicted: true, text });
    }
  });

  it("does not read a conflict into the synced or local sentences", () => {
    for (const text of [
      "Project data was loaded from the workspace backend.",
      "Project changes are synced to the workspace backend.",
      "Saved in this browser",
    ]) {
      expect(conflictedWorkspaceChip({ className: SUCCESS, text }).conflicted).toBe(false);
    }
  });

  it("holds no opinion about a chip that has not been drawn", () => {
    expect(conflictedWorkspaceChip(null)).toEqual({ conflicted: false, text: "" });
  });
});

describe("waiting for the store to reach the backend", () => {
  function clockedReader(readings) {
    let index = 0;
    return {
      readChip: async () => readings[Math.min(index++, readings.length - 1)],
      // Every sleep advances the injected clock, so the timeout is reached by
      // polling rather than by wall time.
      now: () => clock,
      sleep: async (ms) => { clock += ms; },
    };
  }

  let clock = 0;

  it("returns the reading once a hydrate in flight has landed", async () => {
    clock = 0;
    const { readChip, now, sleep } = clockedReader([
      null,
      { className: NEUTRAL, text: "Saved in this browser" },
      { className: PROGRESS, text: "Saving project changes to the workspace backend..." },
      { className: SUCCESS, text: "Project data was loaded from the workspace backend." },
    ]);

    await expect(waitForSyncedChip(readChip, { now, sleep, intervalMs: 250, timeoutMs: 5_000 }))
      .resolves.toEqual({ synced: true, text: "Project data was loaded from the workspace backend." });
  });

  it("fails on a conflict sentence the moment it appears, without waiting out the timeout", async () => {
    clock = 0;
    const conflict = 'A team member changed Discovery brief in "Northbridge Meeting Room Refresh" since your last sync.';
    const { readChip, now, sleep } = clockedReader([
      { className: PROGRESS, text: "Saving project changes to the workspace backend..." },
      { className: "wm-status-chip wm-status wm-status-danger", text: conflict },
      { className: SUCCESS, text: "Project changes are synced to the workspace backend." },
    ]);

    // Demo data is never a team member's edit, so the conflict is the answer:
    // waiting for the chip to recover would hide the regression the pass exists
    // to catch.
    await expect(waitForSyncedChip(readChip, { now, sleep, intervalMs: 250, timeoutMs: 30_000 }))
      .rejects.toThrow(/reported a team member's change instead of a synced workspace: "A team member changed Discovery brief/);
    expect(clock).toBeLessThan(30_000);
  });

  it("gives up after the timeout and repeats the last thing the chip said", async () => {
    clock = 0;
    const { readChip, now, sleep } = clockedReader([
      { className: NEUTRAL, text: "Saved in this browser" },
    ]);

    await expect(waitForSyncedChip(readChip, { now, sleep, intervalMs: 250, timeoutMs: 1_000 }))
      .rejects.toThrow(/never reported a synced workspace: the Projects chip reads "Saved in this browser"/);
    expect(clock).toBeGreaterThanOrEqual(1_000);
  });
});
