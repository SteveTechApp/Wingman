import { describe, expect, it } from "vitest";
import type { DiscoveryConversationItem } from "../data/projectStore";
import {
  extractUnresolvedDiscoveryItems,
  unresolvedToAssumptions,
  unresolvedToRisks,
  type DecisionEvidenceItem,
} from "./unresolvedDiscoveryItems";

describe("extractUnresolvedDiscoveryItems", () => {
  it("returns empty array when no data provided", () => {
    expect(extractUnresolvedDiscoveryItems({})).toEqual([]);
  });

  it("extracts low-confidence items from conversation", () => {
    const conversation: DiscoveryConversationItem[] = [
      {
        stepId: "signal",
        question: "What resolution is needed?",
        answer: "4K",
        note: "Customer said sharp picture",
        confirmed: false,
        confidence: "low",
        confidenceScore: 2,
      },
    ];
    const items = extractUnresolvedDiscoveryItems({ discoveryConversation: conversation });
    expect(items).toHaveLength(1);
    expect(items[0].field).toBe("Signal standard");
    expect(items[0].reason).toBe("low-confidence");
    expect(items[0].capturedAnswer).toBe("Customer said sharp picture");
  });

  it("extracts unconfirmed items from conversation", () => {
    const conversation: DiscoveryConversationItem[] = [
      {
        stepId: "usb",
        question: "USB requirements?",
        answer: "Type-C",
        note: "",
        confidence: "high",
        confidenceScore: 8,
        // confirmed is undefined — not confirmed
      },
    ];
    const items = extractUnresolvedDiscoveryItems({ discoveryConversation: conversation });
    expect(items).toHaveLength(1);
    expect(items[0].field).toBe("USB requirements");
    expect(items[0].reason).toBe("unconfirmed");
  });

  it("does not extract confirmed high-confidence items", () => {
    const conversation: DiscoveryConversationItem[] = [
      {
        stepId: "sources",
        question: "How many sources?",
        answer: "2",
        note: "Laptop and room PC",
        confirmed: true,
        confidence: "high",
        confidenceScore: 10,
      },
    ];
    const items = extractUnresolvedDiscoveryItems({ discoveryConversation: conversation });
    expect(items).toHaveLength(0);
  });

  it("extracts inferred items from decision evidence", () => {
    const evidence: DecisionEvidenceItem[] = [
      {
        field: "signal",
        value: "HDMI 2.0",
        state: "inferred",
        source: "workflow-inference",
        confidence: "medium",
      },
    ];
    const items = extractUnresolvedDiscoveryItems({ decisionEvidence: evidence });
    expect(items).toHaveLength(1);
    expect(items[0].field).toBe("Signal standard");
    expect(items[0].reason).toBe("inferred");
  });

  it("extracts conflict items from decision evidence", () => {
    const evidence: DecisionEvidenceItem[] = [
      {
        field: "displays",
        value: "2 displays (customer said 1, topology shows 2)",
        state: "conflict",
        source: "topology",
        confidence: "low",
      },
    ];
    const items = extractUnresolvedDiscoveryItems({ decisionEvidence: evidence });
    expect(items).toHaveLength(1);
    expect(items[0].reason).toBe("conflict");
  });

  it("does not extract confirmed items from decision evidence", () => {
    const evidence: DecisionEvidenceItem[] = [
      {
        field: "audio",
        value: "DSP required",
        state: "confirmed",
        source: "customer",
        confidence: "high",
      },
    ];
    const items = extractUnresolvedDiscoveryItems({ decisionEvidence: evidence });
    expect(items).toHaveLength(0);
  });

  it("deduplicates items from conversation and evidence", () => {
    const conversation: DiscoveryConversationItem[] = [
      {
        stepId: "signal",
        question: "Resolution?",
        answer: "4K",
        note: "Sharp picture needed",
        confidence: "low",
        confidenceScore: 2,
      },
    ];
    const evidence: DecisionEvidenceItem[] = [
      {
        field: "signal",
        value: "4K",
        state: "inferred",
        source: "workflow-inference",
        confidence: "medium",
      },
    ];
    const items = extractUnresolvedDiscoveryItems({
      discoveryConversation: conversation,
      decisionEvidence: evidence,
    });
    // Should deduplicate — only one "signal" item (low-confidence wins over inferred)
    expect(items).toHaveLength(1);
    expect(items[0].reason).toBe("low-confidence");
  });

  it("sorts by severity: conflict first, then low-confidence, inferred, unconfirmed", () => {
    const conversation: DiscoveryConversationItem[] = [
      {
        stepId: "usb",
        question: "USB?",
        answer: "Type-C",
        note: "Needs confirmation",
        confirmed: false,
        confidence: "high",
        confidenceScore: 8,
      },
      {
        stepId: "signal",
        question: "Resolution?",
        answer: "4K",
        note: "Customer said sharp picture",
        confidence: "low",
        confidenceScore: 2,
      },
    ];
    const evidence: DecisionEvidenceItem[] = [
      {
        field: "displays",
        value: "2 displays",
        state: "conflict",
        source: "topology",
        confidence: "low",
      },
      {
        field: "network",
        value: "1Gbps assumed",
        state: "inferred",
        source: "workflow-inference",
        confidence: "medium",
      },
    ];
    const items = extractUnresolvedDiscoveryItems({
      discoveryConversation: conversation,
      decisionEvidence: evidence,
    });
    expect(items).toHaveLength(4);
    expect(items[0].reason).toBe("conflict");
    expect(items[1].reason).toBe("low-confidence");
    expect(items[2].reason).toBe("inferred");
    expect(items[3].reason).toBe("unconfirmed");
  });

  it("skips conversation items with no answer and no note", () => {
    const conversation: DiscoveryConversationItem[] = [
      {
        stepId: "signal",
        question: "Resolution?",
        answer: "",
        note: "",
        confidence: "low",
        confidenceScore: 1,
      },
    ];
    const items = extractUnresolvedDiscoveryItems({ discoveryConversation: conversation });
    expect(items).toHaveLength(0);
  });

  it("prefers note over answer for capturedAnswer", () => {
    const conversation: DiscoveryConversationItem[] = [
      {
        stepId: "audio",
        question: "Audio needs?",
        answer: "Speakers",
        note: "Customer wants ceiling speakers for background music",
        confidence: "matched",
        confidenceScore: 4,
        confirmed: false,
      },
    ];
    const items = extractUnresolvedDiscoveryItems({ discoveryConversation: conversation });
    expect(items[0].capturedAnswer).toBe("Customer wants ceiling speakers for background music");
  });
});

describe("unresolvedToAssumptions", () => {
  it("converts items to assumption strings", () => {
    const items = extractUnresolvedDiscoveryItems({
      discoveryConversation: [
        {
          stepId: "signal",
          question: "Resolution?",
          answer: "4K",
          note: "Sharp picture",
          confidence: "low",
          confidenceScore: 2,
        },
      ],
    });
    const assumptions = unresolvedToAssumptions(items);
    expect(assumptions).toHaveLength(1);
    expect(assumptions[0]).toContain("Signal standard (low confidence)");
    expect(assumptions[0]).toContain("needs customer confirmation");
  });

  it("labels conflicts with BLOCKER prefix", () => {
    const items = extractUnresolvedDiscoveryItems({
      decisionEvidence: [
        {
          field: "displays",
          value: "2 displays",
          state: "conflict",
          source: "topology",
          confidence: "low",
        },
      ],
    });
    const assumptions = unresolvedToAssumptions(items);
    expect(assumptions[0]).toContain("CONFLICT");
  });
});

describe("unresolvedToRisks", () => {
  it("converts items to risk strings with severity labels", () => {
    const items = extractUnresolvedDiscoveryItems({
      discoveryConversation: [
        {
          stepId: "signal",
          question: "Resolution?",
          answer: "4K",
          note: "Sharp picture",
          confidence: "low",
          confidenceScore: 2,
        },
      ],
    });
    const risks = unresolvedToRisks(items);
    expect(risks).toHaveLength(1);
    expect(risks[0]).toContain("[HIGH]");
    expect(risks[0]).toContain("low-confidence");
  });

  it("labels inferred items as MEDIUM", () => {
    const items = extractUnresolvedDiscoveryItems({
      decisionEvidence: [
        {
          field: "network",
          value: "1Gbps",
          state: "inferred",
          source: "workflow-inference",
          confidence: "medium",
        },
      ],
    });
    const risks = unresolvedToRisks(items);
    expect(risks[0]).toContain("[MEDIUM]");
    expect(risks[0]).toContain("inferred");
  });
});
