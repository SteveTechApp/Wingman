import { beforeEach, describe, expect, it } from "vitest";
import type { CompetitorMatchResponse } from "../../api/wingmanApi";
import type { WyreStormProduct } from "../../features/compare";
import type { LiveCompetitorResearchAssessment } from "../../lib/liveCompetitorResearch";
import { saveCompetitorSpec } from "../../lib/savedCompetitorSpecs";
import {
  brandForCompetitorSku,
  compareReset,
  compareRunStarted,
  competitorSkusAfterRun,
  isCompetitorSkuHeldLocally,
  liveLookupFailed,
  liveLookupPlan,
  liveLookupSettled,
  liveResearchToScoredCandidate,
  mergeLiveResearchCompetitorSummary,
  needsLiveLookup,
} from "./compareRunLookup";
import type { CompetitorProfile, CompetitorSummary } from "./compareTypes";

const product: WyreStormProduct = {
  sku: "MX-0402-MST",
  name: "4x2 matrix",
  family: "Matrix",
  productClass: "Matrix",
  role: "Matrix switcher",
  transport: "HDMI",
  tags: ["matrix", "hdmi"],
  caveat: "Confirm the switcher size before quoting.",
};

function profile(overrides: Partial<CompetitorProfile> = {}): CompetitorProfile {
  return {
    brand: "CYP",
    sku: "OR-88U-4K22",
    rawText: "CYP OR-88U-4K22 MATRIX",
    productClass: "Matrix",
    role: "Matrix",
    transport: "HDMI",
    requestedTags: ["matrix"],
    videoTags: ["4k60"],
    knownProfile: null,
    resolvedSpec: null,
    ...overrides,
  };
}

/** A reviewed live lookup as the resolver endpoint reports one. */
function assessment(overrides: Partial<LiveCompetitorResearchAssessment> = {}): LiveCompetitorResearchAssessment {
  return {
    outcome: "candidate",
    sourceMode: "stored-intelligence",
    readinessStatus: "ready",
    candidateSku: product.sku,
    confidenceScore: 88,
    matchType: "DIRECT MATCH",
    summary: "Approved intelligence reads as a direct equivalent.",
    matched: ["Both switch four HDMI inputs"],
    warnings: [],
    blockers: [],
    nextActions: [],
    reviewRequired: false,
    sourceUrl: "https://example.test/product",
    competitor: {
      manufacturer: "CYP",
      model: "OR-44U",
      title: "CYP 4x4 matrix",
      category: "Matrix",
      comparisonDomain: "MATRIX",
      comparisonUseCase: "Routing",
      role: "Matrix",
      transport: "HDMI",
      subtype: "4x4",
      summary: "A 4x4 HDMI matrix.",
      sourceUrl: "https://example.test/product",
    },
    ...overrides,
  };
}

const baseSummary: CompetitorSummary = {
  heading: "CYP OR-44U",
  detail: "Local detail",
  recognisedClass: "Matrix",
  role: "Matrix",
  signalDirection: "Input to output",
  transport: "HDMI",
  resolution: "4K60",
  ecosystem: "HDMI",
  facts: [{ label: "Vendor technology", value: "Local guess" }],
  identityItems: [],
  knownFeatures: ["4x4"],
  unknownFeatures: [],
  verifyItems: [],
  outcomeLabel: "Plausible",
  warning: "",
};

describe("compare live lookup eligibility", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("distinguishes a governed catalogue SKU from an unknown typed SKU", () => {
    expect(isCompetitorSkuHeldLocally("CYP", "OR-88U-4K22")).toBe(true);
    expect(isCompetitorSkuHeldLocally("CYP", "NOT-IN-THE-CATALOGUE-99")).toBe(false);
  });

  it("treats a user-reviewed saved live lookup as locally held evidence", () => {
    saveCompetitorSpec({
      manufacturer: "CYP",
      sku: "NEW-LIVE-SKU-1",
      title: "Reviewed live lookup product",
      domain: "MATRIX",
      role: "Matrix",
      transport: "HDMI",
      maxResolution: "4K60",
      chroma: "4:4:4",
      notes: "Reviewed against the manufacturer page.",
      savedFrom: "live-lookup",
    });

    expect(isCompetitorSkuHeldLocally("CYP", "NEW-LIVE-SKU-1")).toBe(true);
  });

  it("asks for research when the local read is thin or the SKU is unknown", () => {
    // A classified, catalogued competitor needs no second opinion.
    expect(needsLiveLookup({ profile: profile(), brand: "CYP", sku: "OR-88U-4K22" })).toBe(false);
    // Nothing classified it, so the server has to read it.
    expect(needsLiveLookup({ profile: profile({ productClass: "Unknown", sku: "MYSTERY-1" }), brand: "CYP", sku: "MYSTERY-1" })).toBe(true);
    // A bare SKU-only guess is not evidence, even for a catalogue SKU.
    expect(needsLiveLookup({
      profile: profile({ resolvedSpec: { specTier: "sku-only" } as CompetitorProfile["resolvedSpec"] }),
      brand: "CYP",
      sku: "OR-88U-4K22",
    })).toBe(true);
    // A typed SKU the app has never seen is always worth asking about.
    expect(needsLiveLookup({ profile: profile({ sku: "NEW-01" }), brand: "CYP", sku: "NEW-01" })).toBe(true);
    // An empty field is not held locally, so the page still offers a lookup;
    // the request plan is what stops it asking about nothing.
    expect(needsLiveLookup({ profile: profile({ sku: "" }), brand: "CYP", sku: "" })).toBe(true);
  });

  it("names the brand that owns a SKU and falls back to a custom manufacturer", () => {
    expect(brandForCompetitorSku("OR-88U-4K22")).toBe("CYP");
    expect(brandForCompetitorSku("CUSTOM-INPUT-1")).toBe("CUSTOM");
  });
});

describe("compare live lookup request", () => {
  it("asks for the typed competitor only once results are on screen", () => {
    const ready = {
      hasCompared: true,
      requestLiveLookup: true,
      manufacturer: "CYP",
      sku: "OR-44U",
    };

    expect(liveLookupPlan({ ...ready, onResults: true })).toEqual({
      run: true,
      request: { manufacturer: "CYP", model: "OR-44U" },
    });
    // Typing is not a question yet, and a request without a comparison would be
    // answering one the rep has not asked.
    expect(liveLookupPlan({ ...ready, onResults: false }).run).toBe(false);
    expect(liveLookupPlan({ ...ready, onResults: true, hasCompared: false }).run).toBe(false);
    expect(liveLookupPlan({ ...ready, onResults: true, requestLiveLookup: false }).run).toBe(false);
    // An empty model has nothing to resolve, so an offered lookup stays unasked.
    expect(liveLookupPlan({ ...ready, onResults: true, sku: "  " }).run).toBe(false);
  });

  it("leaves the page's three status values for one settled response", () => {
    expect(liveLookupSettled({ ok: true } as CompetitorMatchResponse)).toEqual({
      status: "done",
      result: { ok: true },
      error: "",
    });

    const failed = liveLookupSettled({ ok: false } as CompetitorMatchResponse);
    // The payload is kept so the panel can explain what it did return.
    expect(failed.status).toBe("error");
    expect(failed.result).toEqual({ ok: false });
    expect(failed.error).toContain("did not return a usable competitor profile");
  });

  it("turns a thrown request into the message the rep can read", () => {
    expect(liveLookupFailed(new Error("Network unavailable"))).toEqual({
      status: "error",
      result: null,
      error: "Network unavailable",
    });
    // Anything that is not an Error still has one sentence to show.
    expect(liveLookupFailed("offline").error).toBe("Live competitor research failed.");
  });
});

describe("compare run transitions", () => {
  it("starts at the results with the first direction selected", () => {
    expect(compareRunStarted()).toEqual({
      hasCompared: true,
      workflowStep: "options",
      compareStage: "results",
      resultTab: "overview",
      candidateIndex: 0,
    });
  });

  it("resets to capturing with nothing selected", () => {
    expect(compareReset()).toEqual({
      hasCompared: false,
      workflowStep: "capture",
      compareStage: "sku",
      resultTab: "overview",
      candidateIndex: 0,
    });
  });

  it("adds a typed SKU the catalogue does not hold, and only that one", () => {
    expect(competitorSkusAfterRun("NEW-TYPED-SKU", [])).toEqual(["NEW-TYPED-SKU"]);
    // A catalogue SKU needs no custom entry, and one already added is not added
    // again; both return the same array so the setter does not re-render.
    const added = ["NEW-TYPED-SKU"];
    expect(competitorSkusAfterRun("OR-88U-4K22", added)).toBe(added);
    expect(competitorSkusAfterRun("new-typed-sku", added)).toBe(added);
    expect(competitorSkusAfterRun("  ", added)).toBe(added);
  });
});

describe("compare live research result", () => {
  it("names no candidate when the assessment found no direction the app stocks", () => {
    expect(liveResearchToScoredCandidate(null, () => product)).toBeNull();
    expect(liveResearchToScoredCandidate(assessment({ outcome: "no-match" }), () => product)).toBeNull();
    // A researched SKU this app does not sell has no candidate to show.
    expect(liveResearchToScoredCandidate(assessment({ candidateSku: "UNKNOWN-1" }), () => undefined)).toBeNull();
  });

  it("treats approved, ready, unblocked stored intelligence as a direct match", () => {
    const candidate = liveResearchToScoredCandidate(assessment(), () => product)!;

    expect(candidate.verdict).toBe("GOOD MATCH");
    expect(candidate.solutionType).toBe("direct-equivalent");
    expect(candidate.governedLabel).toBe("Approved competitor intelligence");
    expect(candidate.unknowns).toEqual([]);
  });

  it("keeps researched-but-unreviewed data verify-only and says why", () => {
    const candidate = liveResearchToScoredCandidate(
      assessment({ sourceMode: "live", reviewRequired: true, readinessStatus: "usable-with-review" }),
      () => product,
    )!;

    expect(candidate.verdict).toBe("VERIFY");
    expect(candidate.solutionType).toBe("insufficient-evidence");
    expect(candidate.checks.join(" ")).toContain("must be reviewed");
    expect(candidate.unknowns.join(" ")).toContain("researched live");
  });

  it("lets the reviewed facts outrank the local guesses they cover", () => {
    const merged = mergeLiveResearchCompetitorSummary(
      baseSummary,
      assessment({
        sourceMode: "live",
        competitor: {
          ...assessment().competitor,
          summary: "Live summary of the matrix.",
          technologyProfile: {
            vendorTechnology: "SDVoE",
            canonicalTransport: "10GbE",
          } as LiveCompetitorResearchAssessment["competitor"]["technologyProfile"],
        },
      }),
    );

    expect(merged.detail).toBe("Live summary of the matrix.");
    expect(merged.transport).toBe("10GbE");
    // The live fact replaces the local guess with the same label rather than
    // printing the sheet twice.
    expect(merged.facts.filter((fact) => fact.label === "Vendor technology")).toEqual([
      { label: "Vendor technology", value: "SDVoE" },
    ]);
    expect(merged.warning).toContain("review the source");
  });

  it("leaves the local sheet alone when nothing was researched", () => {
    expect(mergeLiveResearchCompetitorSummary(baseSummary, null)).toBe(baseSummary);
  });
});
