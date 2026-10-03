import { describe, expect, it } from "vitest";
import {
  CANONICAL_PROJECT_STAGES,
  CANONICAL_PROJECT_STATUSES,
  canonicalStageForRow,
  canonicalStatusForRow,
} from "./project-row-vocabulary.mjs";

// The canonicalisers exist because the supabase-tables snapshot commit copies
// each project document's stage/status into CHECK-constrained wingman_projects
// columns (migration 001) whose vocabulary differs from the client's. Before
// they landed, a real "Proposal Builder"/"recommended" project failed the
// commit with a 23514 (ADR-0001 §1.2c, closed by §1.2g). The contract under
// test: every client string maps to a CHECK-safe value, canonical values pass
// through, and NO input can ever produce a value outside the constrained set
// (the commit reconciles the whole workspace in one transaction, so one bad
// row would fail every project sync in the workspace).

describe("canonicalStageForRow", () => {
  it("maps every client ProjectStage to a canonical pipeline stage", () => {
    expect(canonicalStageForRow("Discovery")).toBe("Discovery");
    expect(canonicalStageForRow("Competitor Compare")).toBe("Design");
    expect(canonicalStageForRow("Recommendations")).toBe("Design");
    expect(canonicalStageForRow("Proposal Builder")).toBe("Proposal");
    expect(canonicalStageForRow("Templates")).toBe("Proposal");
    expect(canonicalStageForRow("Support")).toBe("Support");
  });

  it("passes canonical values through untouched (including the legacy Finder alias)", () => {
    for (const stage of CANONICAL_PROJECT_STAGES) {
      expect(canonicalStageForRow(stage)).toBe(stage);
    }
    expect(canonicalStageForRow("Finder")).toBe("Design");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(canonicalStageForRow("  proposal builder ")).toBe("Proposal");
    expect(canonicalStageForRow("COMMERCIAL READY")).not.toBe("COMMERCIAL READY");
    expect(canonicalStageForRow("In Progress")).toBe("Discovery"); // not a stage at all -> default
  });

  it("never returns a value outside the constrained set (totality)", () => {
    const garbage = ["", null, undefined, 42, "won", "delivered", "pre-sales", "archive", "   "];
    for (const value of garbage) {
      const mapped = canonicalStageForRow(value);
      expect(CANONICAL_PROJECT_STAGES, `input ${JSON.stringify(value)} must map inside the stage set`).toContain(mapped);
    }
  });
});

describe("canonicalStatusForRow", () => {
  it("maps every client StatusVariant to a canonical commercial status", () => {
    expect(canonicalStatusForRow("recommended")).toBe("Commercial Ready");
    expect(canonicalStatusForRow("caution")).toBe("In Progress");
    expect(canonicalStatusForRow("alternative")).toBe("Draft");
  });

  it("passes canonical values through untouched (the server's own mark-ready gate writes 'Commercial Ready' into documents)", () => {
    for (const status of CANONICAL_PROJECT_STATUSES) {
      expect(canonicalStatusForRow(status)).toBe(status);
    }
  });

  it("is case-insensitive for canonical values", () => {
    expect(canonicalStatusForRow("commercial ready")).toBe("Commercial Ready");
    expect(canonicalStatusForRow("in progress")).toBe("In Progress");
  });

  it("never returns a value outside the constrained set (totality)", () => {
    const garbage = ["", null, undefined, 7, "confirmed", "VERIFIED", "approved", "won", "lost", "deferred"];
    for (const value of garbage) {
      const mapped = canonicalStatusForRow(value);
      expect(CANONICAL_PROJECT_STATUSES, `input ${JSON.stringify(value)} must map inside the status set`).toContain(mapped);
    }
  });
});
