import { describe, expect, it } from "vitest";
import { validateProposalExport } from "./proposalExportValidation";
import type { DiscoveryConversationItem } from "../data/projectStore";

function run(discoveryConversation: DiscoveryConversationItem[]) {
  return validateProposalExport({
    products: [],
    bomRows: [],
    discoveryConversation,
  });
}

const NOTE_ONLY = "Captured note only";

describe("validateProposalExport discovery-conversation gate", () => {
  it("blocks export on a note-only capture that never mapped to a governed answer", () => {
    const result = run([
      {
        stepId: "scale",
        question: "What is the approximate room or system scale?",
        answer: NOTE_ONLY,
        note: "It's the big exec room at the end of the corridor.",
      },
    ]);

    expect(result.allowed).toBe(false);
    expect(result.blockers).toHaveLength(1);
    const blocker = result.blockers[0];
    expect(blocker.domain).toBe("discovery");
    expect(blocker.id).toBe("discovery-note-only-scale");
    expect(blocker.message).toContain("captured as a note only");
    expect(blocker.message).toContain("scale");
  });

  it("still blocks a note-only capture even when marked confirmed with the customer", () => {
    const result = run([
      {
        stepId: "audio",
        question: "What audio is required?",
        answer: NOTE_ONLY,
        note: "They want it loud enough for the back row.",
        confirmed: true,
      },
    ]);

    expect(result.allowed).toBe(false);
    // Confirming the note does not create a governed answer to quote against.
    expect(result.blockers.some((b) => b.id === "discovery-note-only-audio")).toBe(true);
  });

  it("warns (but does not block) on open rows that do have a governed answer", () => {
    const result = run([
      {
        stepId: "opportunity",
        question: "What type of opportunity is this?",
        answer: "Meeting room / boardroom",
        note: "The exec boardroom on the top floor.",
      },
    ]);

    expect(result.allowed).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].id).toBe("discovery-open-rows");
    expect(result.warnings[0].message).toContain("1 discovery conversation row");
  });

  it("passes cleanly when every captured row has a governed answer and is confirmed", () => {
    const result = run([
      {
        stepId: "opportunity",
        question: "What type of opportunity is this?",
        answer: "Meeting room / boardroom",
        note: "The exec boardroom on the top floor.",
        confirmed: true,
      },
      {
        stepId: "scale",
        question: "What is the approximate room or system scale?",
        answer: "Single large room",
        note: "",
        confirmed: true,
      },
    ]);

    expect(result.allowed).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("reports a combined count across open rows", () => {
    const result = run([
      { stepId: "a", question: "Q1", answer: "Answer A", note: "" },
      { stepId: "b", question: "Q2", answer: "Answer B", note: "" },
    ]);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain("2 discovery conversation rows");
  });

  it("flags low-confidence captures to re-verify before quote, even when confirmed", () => {
    const result = run([
      {
        stepId: "scale",
        question: "What is the approximate room or system scale?",
        answer: "Single large room",
        note: "A big room.",
        confirmed: true,
        confidence: "low",
      },
    ]);

    // Known: confirmed answers pass the open-rows gate, but the low tier still
    // warrants a "verify before quote" warning so no guess reaches the quote.
    expect(result.allowed).toBe(true);
    expect(result.blockers).toHaveLength(0);
    const low = result.warnings.find((warning) => warning.id === "discovery-low-confidence");
    expect(low).toBeDefined();
    expect(low?.domain).toBe("discovery");
    expect(low?.severity).toBe("warning");
    expect(low?.message).toContain("1 discovery answer");
    expect(low?.message).toContain("verify before quote");
  });

  it("does not flag high or matched confidence rows as low-confidence", () => {
    const result = run([
      { stepId: "a", question: "Q1", answer: "Answer A", note: "", confirmed: true, confidence: "high" },
      { stepId: "b", question: "Q2", answer: "Answer B", note: "", confirmed: true, confidence: "matched" },
    ]);
    expect(result.allowed).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("adds no discovery blockers when there is no conversation", () => {
    const result = validateProposalExport({ products: [], bomRows: [] });
    expect(result.allowed).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});
