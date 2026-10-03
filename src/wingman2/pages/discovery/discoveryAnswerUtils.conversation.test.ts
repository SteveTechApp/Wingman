import { describe, expect, it } from "vitest";
import { buildDiscoveryConversation } from "./discoveryAnswerUtils";
import type { DiscoveryQuestion } from "./discoveryTypes";

const questions: DiscoveryQuestion[] = [
  {
    id: "opportunity",
    shortLabel: "Opportunity",
    section: "Test",
    question: "What type of opportunity is this?",
    prompt: "",
    why: "",
    required: true,
    capturePlaceholder: "",
    options: [{ value: "meeting-room", label: "Meeting room / boardroom" }],
  },
  {
    id: "scale",
    shortLabel: "Scale",
    section: "Test",
    question: "What is the approximate room or system scale?",
    prompt: "",
    why: "",
    required: true,
    capturePlaceholder: "",
    options: [{ value: "single-large-room", label: "Single large room" }],
  },
];

describe("buildDiscoveryConversation confidence", () => {
  it("stamps the capture confidence onto each row from the confidence map", () => {
    const rows = buildDiscoveryConversation(
      questions,
      { opportunity: "meeting-room", scale: "single-large-room" },
      {},
      "Meeting room / boardroom",
      { opportunity: true },
      { opportunity: "high", scale: "low" },
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].confidence).toBe("high");
    expect(rows[1].confidence).toBe("low");
    expect(rows[0].confirmed).toBe(true);
  });

  it("leaves confidence undefined when no confidence was recorded", () => {
    const rows = buildDiscoveryConversation(
      questions,
      { opportunity: "meeting-room" },
      {},
      "Meeting room / boardroom",
    );

    expect(rows[0].confidence).toBeUndefined();
  });

  it("stamps the interpretation confidence score alongside the tier", () => {
    const rows = buildDiscoveryConversation(
      questions,
      { opportunity: "meeting-room", scale: "single-large-room" },
      {},
      "Meeting room / boardroom",
      {},
      { opportunity: "high", scale: "low" },
      { opportunity: 12, scale: 1 },
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].confidenceScore).toBe(12);
    expect(rows[1].confidenceScore).toBe(1);
  });

  it("leaves the score undefined when no score was recorded", () => {
    const rows = buildDiscoveryConversation(
      questions,
      { opportunity: "meeting-room" },
      {},
      "Meeting room / boardroom",
      {},
      { opportunity: "high" },
    );
    expect(rows[0].confidenceScore).toBeUndefined();
  });
});
