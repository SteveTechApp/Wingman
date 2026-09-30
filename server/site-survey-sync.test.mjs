import { describe, expect, it } from "vitest";
import { decideSurveySync } from "./site-survey-sync.mjs";

const edits = (length) => ({ projectId: "p1", cableEdits: { c1: { cableId: "c1", actualLengthMetres: length, confirmed: true } }, deviceEdits: {}, locationEdits: {}, lastModified: `2026-09-11T10:00:${length}.000Z`, synced: false });

describe("site survey sync contract", () => {
  it("stores a first revision", () => {
    const result = decideSurveySync(undefined, { edits: edits(12) }, "r1");
    expect(result).toMatchObject({ outcome: "synced", idempotent: false, record: { serverTimestamp: "r1" } });
  });

  it("accepts a lost-response replay idempotently", () => {
    const first = decideSurveySync(undefined, { edits: edits(12) }, "r1");
    const replay = decideSurveySync(first.record, { edits: edits(12) }, "r2");
    expect(replay).toMatchObject({ outcome: "synced", idempotent: true, record: { serverTimestamp: "r1" } });
  });

  it("keeps the revision trail one-per-edit when bookkeeping-only replays arrive", () => {
    // Adoption/poll-ack echoes re-save the same survey content with fresh
    // local bookkeeping; none of that is a new edit, so no revision is minted.
    const first = decideSurveySync(undefined, { edits: edits(18) }, "r1").record;
    const echo = decideSurveySync(first, { edits: { ...edits(18), lastModified: "2026-09-11T11:11:11.000Z", synced: true, serverTimestamp: "r1" } }, "r2");
    expect(echo).toMatchObject({ outcome: "synced", idempotent: true, record: { serverTimestamp: "r1" } });
  });

  it("rejects a stale different edit and returns the current record", () => {
    const current = decideSurveySync(undefined, { edits: edits(18) }, "r2").record;
    const stale = decideSurveySync(current, { edits: edits(42), baseServerTimestamp: "r1" }, "r3");
    expect(stale).toMatchObject({ outcome: "conflict", record: { edits: { cableEdits: { c1: { actualLengthMetres: 18 } } }, serverTimestamp: "r2" } });
  });

  it("accepts an explicit retry based on the current server revision", () => {
    const current = decideSurveySync(undefined, { edits: edits(18) }, "r2").record;
    const retry = decideSurveySync(current, { edits: edits(42), baseServerTimestamp: "r2" }, "r3");
    expect(retry).toMatchObject({ outcome: "synced", idempotent: false, record: { edits: { cableEdits: { c1: { actualLengthMetres: 42 } } }, serverTimestamp: "r3" } });
  });
});
