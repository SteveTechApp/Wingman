import { afterEach, describe, expect, it, vi } from "vitest";

import { askGuru } from "./guruApi";
import { lookupAndCompare } from "@/services/competitorComparisonService";
import {
  assessQuestionIntelligence,
  type QuestionIntelligenceAssessment,
} from "@/services/productIntelligenceAdvisor";
import type { ProductIntelligenceRecord } from "@/services/productIntelligenceService";

vi.mock("@/services/competitorComparisonService", () => ({
  lookupAndCompare: vi.fn(),
}));

vi.mock("@/services/productIntelligenceAdvisor", () => ({
  assessQuestionIntelligence: vi.fn(),
}));

function makeRecord(
  overrides: Partial<ProductIntelligenceRecord> = {},
): ProductIntelligenceRecord {
  return {
    id: "wyrestorm::SW-640L-TX-W",
    vendorType: "wyrestorm",
    brand: "WyreStorm",
    sku: "SW-640L-TX-W",
    name: "SW-640L-TX-W",
    family: "Apollo",
    group: "switcher",
    category: "Switchers",
    subcategory: "Presentation Switcher",
    classificationSource: "source",
    summary: "USB-C presentation switcher for meeting rooms and collaborative spaces.",
    features: ["USB-C", "BYOD", "Wireless presentation"],
    transport: "HDBaseT",
    inputs: [],
    outputs: [],
    control: [],
    audio: [],
    video: {
      maxResolution: "4K60 4:4:4",
      hdr: true,
      hdmi: "2.0",
      bandwidthGbps: 18,
    },
    latency: "Low",
    distanceMeters: 40,
    status: "approved",
    confidence: 0.92,
    sourceType: "catalog",
    sourceUrls: ["https://www.wyrestorm.com/"],
    tags: ["apollo", "meeting room", "usb-c"],
    notes: "",
    createdAt: "2026-03-18T10:00:00.000Z",
    updatedAt: "2026-03-18T10:00:00.000Z",
    lastCapturedAt: "2026-03-18T10:00:00.000Z",
    lastReviewedAt: "2026-03-18T10:00:00.000Z",
    reviewedBy: "qa",
    evidence: [],
    reviewFlags: [],
    archived: false,
    ...overrides,
  };
}

function makeAssessment(
  overrides: Partial<QuestionIntelligenceAssessment> = {},
): QuestionIntelligenceAssessment {
  return {
    question: "",
    score: 42,
    confidence: "Low",
    escalationRequired: true,
    escalationReasons: ["No matching product intelligence records found."],
    guidance: [],
    supportActions: [],
    warnings: [],
    records: [],
    available: true,
    mode: "local",
    fetchedAt: "2026-03-18T10:00:00.000Z",
    ...overrides,
  };
}

describe("askGuru", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("answers broad WyreStorm positioning questions from the central knowledge base", async () => {
    vi.mocked(assessQuestionIntelligence).mockResolvedValue(makeAssessment());

    const answer = await askGuru("How would you position WyreStorm against larger AV brands?", {
      mode: "ask",
    });

    expect(vi.mocked(lookupAndCompare)).not.toHaveBeenCalled();
    expect(answer.text).toContain("Position WyreStorm as a commercially practical AV platform");
    expect(answer.text).not.toContain("No strong product matches were found");
    expect(answer.confidence).toBe("high");
    expect(answer.sources?.some((source) => source.to === "/app/tools/compare")).toBe(true);
  });

  it("does not misroute AV transport comparisons into competitor lookup", async () => {
    vi.mocked(assessQuestionIntelligence).mockResolvedValue(makeAssessment());

    const answer = await askGuru("How do I compare HDBaseT and AVoIP for a corporate AV project?", {
      mode: "ask",
    });

    expect(vi.mocked(lookupAndCompare)).not.toHaveBeenCalled();
    expect(answer.text.toLowerCase()).toContain("choose hdbaset");
    expect(answer.text.toLowerCase()).toContain("choose avoip");
  });

  it("blends central knowledge with product intelligence for product-seeking questions", async () => {
    vi.mocked(assessQuestionIntelligence).mockResolvedValue(
      makeAssessment({
        score: 86,
        confidence: "High",
        escalationRequired: false,
        escalationReasons: [],
        records: [makeRecord()],
      }),
    );

    const answer = await askGuru("Which WyreStorm family best suits a small meeting room with USB-C BYOD?", {
      mode: "ask",
    });

    expect(answer.text).toContain("Likely WyreStorm direction");
    expect(answer.text).toContain("Best product starting points");
    expect(answer.suggestedSkus?.map((item) => item.sku)).toContain("SW-640L-TX-W");
    expect(answer.confidence).toBe("high");
  });
});
