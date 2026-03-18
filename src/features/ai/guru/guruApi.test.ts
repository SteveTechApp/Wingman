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

  it("pulls site-survey guidance from the shared training library in resources mode", async () => {
    const answer = await askGuru("What should I capture during an AV site survey?", {
      mode: "resources",
    });

    expect(answer.text).toContain("Site Survey Field Guide");
    expect(answer.text.toLowerCase()).toContain("room");
    expect(answer.sources?.some((source) => source.to === "/app/tools/training")).toBe(true);
  });

  it("uses networking reference knowledge without forcing product guidance for conceptual questions", async () => {
    vi.mocked(assessQuestionIntelligence).mockResolvedValue(makeAssessment());

    const answer = await askGuru("Explain IGMP snooping in simple terms for AVoIP multicast.", {
      mode: "ask",
    });

    expect(answer.text).toContain("IGMP Snooping");
    expect(answer.text).not.toContain("To tighten this into exact product guidance");
  });

  it("answers direct capability questions with concise matching switchers instead of generic design guidance", async () => {
    vi.mocked(assessQuestionIntelligence).mockResolvedValue(
      makeAssessment({
        score: 88,
        confidence: "High",
        escalationRequired: false,
        escalationReasons: [],
        records: [
          makeRecord({
            sku: "SW-220-TX-W",
            name: "SW-220-TX-W",
            summary: "Wireless presentation switcher with native AirPlay and Miracast support.",
            features: ["AirPlay", "Miracast", "Wireless casting"],
            tags: ["presentation switcher", "airplay"],
          }),
          makeRecord({
            sku: "SW-620-TX-W",
            name: "SW-620-TX-W",
            summary: "Wireless presentation switcher with AirPlay, Miracast, and BYOM support.",
            features: ["AirPlay", "Miracast", "Wireless casting"],
            tags: ["presentation switcher", "airplay"],
          }),
          makeRecord({
            sku: "SW-640L-TX-W",
            name: "SW-640L-TX-W",
            summary: "Dual-output wireless presentation switcher with native AirPlay and Miracast casting.",
            features: ["AirPlay", "Miracast", "Wireless casting"],
            tags: ["presentation switcher", "airplay"],
          }),
          makeRecord({
            sku: "SW-510-TX",
            name: "SW-510-TX",
            summary: "HDBaseT presentation switcher without native wireless casting.",
            features: ["HDBaseT"],
            tags: ["presentation switcher"],
          }),
        ],
      }),
    );

    const answer = await askGuru("which presentation switchers support airplay?", {
      mode: "ask",
    });

    expect(answer.text).toContain("SW-220-TX-W");
    expect(answer.text).toContain("SW-620-TX-W");
    expect(answer.text).toContain("SW-640L-TX-W");
    expect(answer.text).toContain("same IP subnet");
    expect(answer.text).not.toContain("First decide whether the room is presentation-led or routing-led");
    expect(answer.confidence).toBe("high");
  });

  it("uses shared discovery recommendation context when Guru is asked against an active project", async () => {
    vi.mocked(assessQuestionIntelligence).mockResolvedValue(makeAssessment());

    const answer = await askGuru("What family should I start with for this project?", {
      mode: "project-check",
      discovery: {
        workflowTrack: "Extend a signal",
        sourceCount: "1",
        displayCount: "1",
        sourceConnectionType: "HDMI",
        displayConnectionType: "HDMI",
        transportDistanceBand: "Up to 70m",
        transportCableType: "Cat6",
        signalFormats: "4K 60Hz 4:4:4",
      },
    });

    expect(answer.text).toContain("Likely direction");
    expect(answer.text).toContain("Why this answer:");
    expect(answer.text).toContain("What's still missing:");
    expect(answer.text).toContain("HDBaseT");
    expect(answer.text).not.toContain("No strong product matches were found");
    expect(answer.explanation?.headline).toContain("HDBaseT");
    expect(answer.explanation?.why?.length).toBeGreaterThan(0);
    expect(answer.explanation?.whatsMissing?.length).toBeGreaterThan(0);
    expect(answer.explanation?.handoffItems?.[0]?.step).toBeDefined();
    expect(answer.explanation?.handoffItems?.[0]?.questionId).toBeTruthy();
    expect(answer.sources?.some((source) => source.to === "/app/tools/discovery")).toBe(true);
  });

  it("keeps project recommendation answers concise even when broad knowledge content is available", async () => {
    vi.mocked(assessQuestionIntelligence).mockResolvedValue(
      makeAssessment({
        score: 82,
        confidence: "High",
        escalationRequired: false,
        escalationReasons: [],
        records: [makeRecord()],
      }),
    );

    const answer = await askGuru("What should I recommend for this project?", {
      mode: "project-check",
      discovery: {
        workflowTrack: "Switch between devices",
        sourceCount: "3",
        displayCount: "2",
        sourceConnectionType: "HDMI",
        displayConnectionType: "HDMI",
        switchSolutionType: "Presentation switcher",
        featureRequirements: "AirPlay, Miracast, USB-C",
      },
    });

    expect(answer.text).toContain("Likely direction:");
    expect(answer.text).toContain("Why this answer:");
    expect(answer.text).toContain("Best product starting points");
    expect(answer.text).not.toContain("First decide whether the room is presentation-led or routing-led");
    expect(answer.explanation?.headline).toBeTruthy();
    expect(answer.explanation?.why?.length).toBeGreaterThan(0);
  });
});
