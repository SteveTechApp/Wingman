import { describe, expect, it } from "vitest";
import {
  repScript,
  compareVerdictTier,
  repTierLabelFromRun,
  uniqueText,
  commercializeCompareCopy,
  competitorPlainEnglishPurpose,
  salesWhyBullets,
  salesImportantDifference,
  compactCompareQuoteChecks,
  type RepCompetitor,
  type RepCandidate,
} from "./repScript";

const competitor: RepCompetitor = {
  heading: "Kramer VS-42H",
  recognisedClass: "Matrix",
  role: "matrix switcher",
  identityItems: ["4 HDMI inputs", "2 HDMI outputs"],
  knownFeatures: [],
  verifyItems: ["Confirm routed I/O size", "Confirm video format"],
  warning: "Compare warning: Input connector types not verified locally.",
  ecosystem: "Kramer",
};

const candidate: RepCandidate = {
  product: { sku: "MX-0404-SCL", name: "4x4 HDMI Matrix", role: "matrix switcher", family: "MX" },
  matched: ["Technology class matches.", "Same endpoint role."],
  partialMatches: [],
  mismatches: [],
  blockers: [],
  unknowns: [],
  dependencies: ["Needs a matching HDBaseT receiver"],
  checks: [],
  gaps: [],
};

describe("compareVerdictTier (explicit confidence tier)", () => {
  it("maps every status and option to the canonical label + tone", () => {
    expect(compareVerdictTier("match")).toEqual({ label: "Strong direction", tone: "strong" });
    expect(compareVerdictTier("partial")).toEqual({ label: "Plausible — confirm", tone: "confirm" });
    expect(compareVerdictTier("checks")).toEqual({ label: "Plausible — confirm", tone: "confirm" });
    expect(compareVerdictTier("no-match")).toEqual({ label: "No equivalent", tone: "none" });
    expect(compareVerdictTier("no-match", { reviewedBy: "Steve" })).toEqual({
      label: "No equivalent",
      tone: "none",
    });
    expect(compareVerdictTier("no-match", { evidencePending: true })).toEqual({
      label: "Evidence pending",
      tone: "pending",
    });
  });
});

describe("repTierLabelFromRun (stored run tier)", () => {
  it("prefers the stored confidence, then matchType, then the honest fallback", () => {
    expect(repTierLabelFromRun({ confidence: "Strong direction", matchType: "match" })).toBe("Strong direction");
    expect(repTierLabelFromRun({ matchType: "partial" })).toBe("partial");
    expect(repTierLabelFromRun({})).toBe("Comparison saved");
    expect(repTierLabelFromRun({ confidence: "" })).toBe("Comparison saved");
  });
});

describe("repScript (the complete narrative)", () => {
  it("match: strong tier, sku-backed verdict, why bullets, match quote fallback", () => {
    // A clean competitor + candidate (nothing to check) forces the match fallback.
    const cleanCompetitor = { ...competitor, verifyItems: [], warning: "" };
    const cleanCandidate = {
      ...candidate,
      blockers: [],
      mismatches: [],
      unknowns: [],
      dependencies: [],
      checks: [],
      gaps: [],
    };
    const script = repScript({ competitor: cleanCompetitor, candidate: cleanCandidate, status: "match" });

    expect(script.tier).toEqual({ label: "Strong direction", tone: "strong" });
    expect(script.heading).toBe("A close WyreStorm match exists");
    expect(script.line).toContain("MX-0404-SCL");
    expect(script.purposeLine).toBe("Kramer VS-42H is used to route multiple sources to different display destinations.");
    expect(script.whyBullets).toEqual(["Technology class matches.", "Same endpoint role."]);
    expect(script.quoteChecks).toEqual(["Confirm current lifecycle, region and required accessories before quotation."]);
    expect(script.whatToSay).toBe("");
    expect(script.difference).toContain("right WyreStorm matrix direction");
    expect(script.nextSteps).toEqual([
      "Ask the customer what the product must actually do — the same job may be met by a different WyreStorm product.",
      "Start a new comparison if the requirement has changed.",
    ]);
  });

  it("checks: plausible tier and confirm-first verdict", () => {
    const script = repScript({ competitor, candidate, status: "checks" });

    expect(script.tier).toEqual({ label: "Plausible — confirm", tone: "confirm" });
    expect(script.heading).toBe("The direction looks plausible — confirm a few things first");
    expect(script.line).toContain("MX-0404-SCL");
  });

  it("partial: confirm-the-main-difference verdict", () => {
    const script = repScript({ competitor, candidate, status: "partial" });

    expect(script.tier).toEqual({ label: "Plausible — confirm", tone: "confirm" });
    expect(script.heading).toBe("Possibly similar — confirm the main difference");
  });

  it("no-match + reviewed: confirmed-no-match narrative with what-to-say", () => {
    const script = repScript({ competitor, candidate: null, status: "no-match", reviewedBy: "Steve" });

    expect(script.tier).toEqual({ label: "No equivalent", tone: "none" });
    expect(script.heading).toBe("No suitable WyreStorm match — confirmed by review");
    expect(script.line).toContain("Steve reviewed this competitor");
    expect(script.whatToSay).toContain("Say it plainly");
    expect(script.whatToSay).toContain("confirmed by review");
    expect(script.quoteChecks).toEqual(competitor.verifyItems.slice(0, 3));
  });

  it("no-match + evidence pending: honest pending narrative, never 'no equivalent'", () => {
    const script = repScript({
      competitor,
      candidate: null,
      status: "no-match",
      evidencePending: true,
      noMatchReason: "The model is not in the local catalogue.",
    });

    expect(script.tier).toEqual({ label: "Evidence pending", tone: "pending" });
    expect(script.heading).toBe("Evidence still being reviewed");
    expect(script.whatToSay).toContain("We are verifying this one");
    expect(script.whatToSay).toContain("The model is not in the local catalogue.");
  });

  it("no-match generic: carries the engine reason when present", () => {
    const script = repScript({
      competitor,
      candidate: null,
      status: "no-match",
      noMatchReason: "WyreStorm makes no DSP.",
    });

    expect(script.heading).toBe("No close WyreStorm equivalent found");
    expect(script.whatToSay).toContain("WyreStorm makes no DSP.");
  });

  it("no-match generic without a reason: plain cannot-confirm line", () => {
    // No verifyItems means the step list ends with the fallback line.
    const script = repScript({ competitor: { ...competitor, verifyItems: [] }, candidate: null, status: "no-match" });

    expect(script.whatToSay).toContain("I cannot confirm a WyreStorm equivalent");
    expect(script.nextSteps[0]).toContain("Ask the customer what the product must actually do");
    expect(script.nextSteps).toContain("Start a new comparison if the requirement has changed.");
  });
});

describe("shared copy utilities", () => {
  it("uniqueText dedupes case-insensitively and honours the limit", () => {
    expect(uniqueText(["A", "a", "B", "b", "C", "D"], 3)).toEqual(["A", "B", "C"]);
    expect(uniqueText(["", "  ", null, undefined])).toEqual([]);
  });

  it("commercializeCompareCopy turns technical warnings into sales language", () => {
    expect(commercializeCompareCopy("HDMI version not verified locally.")).toBe(
      "HDMI version needs checking before quote.",
    );
    expect(commercializeCompareCopy("")).toBe("");
  });

  it("competitorPlainEnglishPurpose describes the product's job", () => {
    expect(competitorPlainEnglishPurpose({ ...competitor, recognisedClass: "Wireless casting", role: "wireless casting" }))
      .toBe("let users share content wirelessly into the room system");
  });

  it("salesWhyBullets and salesImportantDifference read from candidate evidence", () => {
    expect(salesWhyBullets(candidate)).toEqual(["Technology class matches.", "Same endpoint role."]);
    expect(salesImportantDifference(competitor, candidate)).toContain("right WyreStorm matrix direction");
  });

  it("compactCompareQuoteChecks dedupes by category and caps at three", () => {
    const checks = compactCompareQuoteChecks(competitor, candidate, "checks");
    expect(checks.length).toBeLessThanOrEqual(3);
    expect(new Set(checks).size).toBe(checks.length);
  });
});
