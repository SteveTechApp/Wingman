import { describe, expect, it } from "vitest";
import {
  assertWallTransportExportable,
  validateProposalExport,
  wallSurveyCompletenessWarnings,
  wallTransportBlockers,
} from "./proposalExportValidation";
import { defaultWallRequirements, type WallRequirements } from "./videowallOptions";
import type { DiscoveryConversationItem } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";

function run(discoveryConversation: DiscoveryConversationItem[]) {
  return validateProposalExport({
    products: [],
    bomRows: [],
    discoveryConversation,
  });
}

const NOTE_ONLY = "Captured note only";

describe("validateProposalExport discovery-conversation gate", () => {
  it("keeps third-party confirmation visible for required complete-system rows", () => {
    const result = validateProposalExport({ products: [], bomRows: [{ item: 1, sku: "BY-OTHERS-AUDIO-SPEAKERS-1", description: "Dining speakers", role: "Audio", qty: 4, type: "Required", status: "included", evidence: "Concept", notes: "Confirm supplier." }] });
    expect(result.warnings.some((warning) => warning.id === "chain-by-others-scope")).toBe(true);
  });
  it("keeps unstructured customer notes advisory without requiring an answer choice", () => {
    const result = run([
      {
        stepId: "scale",
        question: "What is the approximate room or system scale?",
        answer: NOTE_ONLY,
        note: "It's the big exec room at the end of the corridor.",
      },
    ]);

    expect(result.allowed).toBe(true);
    expect(result.blockers).toHaveLength(0);
    const blocker = result.warnings[0];
    expect(blocker.domain).toBe("discovery");
    expect(blocker.id).toBe("discovery-note-only-scale");
    expect(blocker.message).toContain("captured as a note only");
    expect(blocker.message).toContain("scale");
  });

  it("keeps note-only wording advisory even when marked confirmed", () => {
    const result = run([
      {
        stepId: "audio",
        question: "What audio is required?",
        answer: NOTE_ONLY,
        note: "They want it loud enough for the back row.",
        confirmed: true,
      },
    ]);

    expect(result.allowed).toBe(true);
    // Confirming the note does not create a governed answer to quote against.
    expect(result.warnings.some((b) => b.id === "discovery-note-only-audio")).toBe(true);
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

describe("validateProposalExport wall transport gate", () => {
  const wall = (overrides: Partial<WallRequirements> = {}): WallRequirements => ({
    ...defaultWallRequirements,
    application: "lcd-direct",
    layout: "independent",
    columns: 2,
    rows: 1,
    sources: 2,
    windows: 2,
    ...overrides,
  });

  it("blocks export when a measured run exceeds its transport, naming the link and the fix", () => {
    const result = validateProposalExport({
      products: [],
      bomRows: [],
      wallRequirements: wall({ measuredRuns: { "display-2": 40 } }),
    });

    expect(result.allowed).toBe(false);
    expect(result.blockers).toHaveLength(1);
    const blocker = result.blockers[0];
    expect(blocker.domain).toBe("transport");
    expect(blocker.id).toBe("transport-display-2");
    // The breach names the link, the run the survey measured and the limit it broke.
    expect(blocker.message).toContain("Panel 2");
    expect(blocker.message).toContain("measured 40 m run");
    expect(blocker.message).toContain("5 m limit");
    expect(blocker.fix).toContain("active or fibre HDMI cable");
    expect(blocker.fix).toContain("5 m");
  });

  it("keeps the panel that fits clear of the one that does not", () => {
    const result = validateProposalExport({
      products: [],
      bomRows: [],
      wallRequirements: wall({ measuredRuns: { "display-2": 40 } }),
    });

    expect(result.blockers.map((blocker) => blocker.id)).toEqual(["transport-display-2"]);
    // The unmeasured panel sits exactly on its 5 m allowance, so it warns rather
    // than blocking — the run still fits, it just leaves no headroom.
    const warning = result.warnings.find((entry) => entry.id === "transport-watch-display-1");
    expect(warning?.severity).toBe("warning");
    expect(warning?.message).toContain("at the 5 m limit");
  });

  it("lets a measured run inside the limit through", () => {
    const result = validateProposalExport({
      products: [],
      bomRows: [],
      wallRequirements: wall({ measuredRuns: { "display-1": 3, "display-2": 3 } }),
    });

    expect(result.allowed).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.warnings.filter((entry) => entry.domain === "transport")).toHaveLength(0);
  });

  it("fixes an over-limit loop hop on the hop, not the whole chain", () => {
    const blockers = wallTransportBlockers(wall({
      application: "lcd-loop",
      layout: "quad",
      columns: 2,
      rows: 2,
      windows: 4,
      sources: 4,
      measuredRuns: { "display-2": 8 },
    }));
    const hop = blockers.find((blocker) => blocker.id === "transport-display-2");

    expect(hop?.message).toContain("HDMI loop-through (panel to panel)");
    expect(hop?.fix).toContain("panel-to-panel hop");
    expect(hop?.fix).toContain("fibre extender");
  });

  it("fixes an over-limit copper drop with a fibre segment", () => {
    const blockers = wallTransportBlockers(wall({
      sourceLocation: "distributed",
      network: "1g",
      measuredRuns: { "display-1": 130 },
    }));
    const drop = blockers.find((blocker) => blocker.id === "transport-display-1");

    expect(drop?.message).toContain("130 m run");
    expect(drop?.message).toContain("100 m limit");
    expect(drop?.fix).toContain("fibre segment or an intermediate switch");
  });

  it("ignores a summary saved before the layout answers existed", () => {
    const legacy = { ...wall() } as Record<string, unknown>;
    delete legacy.sourceLocation;

    expect(wallTransportBlockers(legacy as unknown as WallRequirements)).toEqual([]);
    expect(validateProposalExport({ products: [], bomRows: [], wallRequirements: null }).allowed).toBe(true);
  });

  it("refuses the export with one message that carries the breach and its fix", () => {
    expect(() => assertWallTransportExportable(wall({ measuredRuns: { "display-2": 40 } })))
      .toThrow(/Proposal export blocked — 1 issue to resolve first\. Panel 2 cannot carry its run.*Fix: Use an active or fibre HDMI cable/);
    expect(() => assertWallTransportExportable(null)).not.toThrow();
    expect(() => assertWallTransportExportable(wall({ measuredRuns: { "display-2": 3 } }))).not.toThrow();
  });
});

describe("validateProposalExport wall survey completeness", () => {
  const wall = (overrides: Partial<WallRequirements> = {}): WallRequirements => ({
    ...defaultWallRequirements,
    application: "lcd-direct",
    layout: "independent",
    columns: 2,
    rows: 1,
    sources: 2,
    windows: 2,
    ...overrides,
  });
  const complete = {
    "display-1": { enclosure: "Ceiling tile", entry: "Ceiling void", termination: "HDMI faceplate" },
    "display-2": { enclosure: "Ceiling tile", entry: "Ceiling void", termination: "HDMI faceplate" },
  };

  it("warns that the survey is short without stopping the document", () => {
    const result = validateProposalExport({ products: [], bomRows: [], wallRequirements: wall() });
    const warning = result.warnings.find((entry) => entry.id === "survey-install-detail");

    // Completeness is a warning: the schedule can still print the links it has.
    expect(result.allowed).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(warning?.domain).toBe("survey");
    expect(warning?.severity).toBe("warning");
    expect(warning?.message).toContain("Survey incomplete: 2 of 2 links are missing a display housing, a run entry or a termination");
    expect(warning?.message).toContain("Panel 2 (display housing, run entry and termination)");
    expect(warning?.fix).toContain("display housing, run entry and termination");
  });

  it("names only the cell a link is still missing", () => {
    const warning = wallSurveyCompletenessWarnings(wall({
      linkDetails: { ...complete, "display-1": { enclosure: "Ceiling tile" } },
    }))[0];

    expect(warning.message).toContain("Survey incomplete: 1 of 2 links is missing a display housing, a run entry or a termination");
    expect(warning.message).toContain("Panel 1 (run entry and termination)");
    expect(warning.message).not.toContain("Panel 2");
    expect(warning.message).not.toContain("Source 1");
  });

  it("is quiet once every link records enclosure, run entry and termination", () => {
    const result = validateProposalExport({
      products: [],
      bomRows: [],
      wallRequirements: wall({ linkDetails: complete }),
    });

    expect(wallSurveyCompletenessWarnings(wall({ linkDetails: complete }))).toEqual([]);
    expect(result.warnings.filter((entry) => entry.domain === "survey")).toEqual([]);
  });

  it("does not count a mount as the enclosure, run entry or termination a handoff needs", () => {
    const warning = wallSurveyCompletenessWarnings(wall({
      linkDetails: {
        "source-1": { mount: "Wall bracket" },
        "source-2": { mount: "Wall bracket" },
        "display-1": { mount: "Pole" },
        "display-2": { mount: "Pole" },
      },
    }))[0];

    expect(warning.message).toContain("2 of 2 links");
  });

  it("ignores a summary saved before the layout answers existed", () => {
    const legacy = { ...wall(), sourceLocation: undefined } as unknown as WallRequirements;

    expect(wallSurveyCompletenessWarnings(legacy)).toEqual([]);
    expect(wallSurveyCompletenessWarnings(null)).toEqual([]);
  });
});

describe("validateProposalExport checks that carry their own domain", () => {
  // One test per domain the guard asks for: each names the domain on the entry
  // the check produced, so `check:export-validation-domains` can see the check
  // run rather than take the registry's word for it.
  it("warns that a long run has no documented reach", () => {
    const result = validateProposalExport({
      products: [{ sku: "EX-35-8K" }],
      bomRows: [],
      topology: { connections: [{ lengthMetres: 40 }] },
    });
    const warning = result.warnings.find((entry) => entry.id === "reach-EX-35-8K-unknown");

    expect(result.allowed).toBe(true);
    expect(warning?.domain).toBe("reach");
    expect(warning?.message).toContain("40m cable run");
  });

  it("warns about a product whose consumption its profile does not state", () => {
    const result = validateProposalExport({
      products: [{ sku: "APO-VX20-UC-V2", quantity: 1 }],
      bomRows: [],
    });
    const warning = result.warnings.find((entry) => entry.id === "power-unknown");

    expect(warning?.domain).toBe("power");
    expect(warning?.message).toContain("APO-VX20-UC-V2");
  });

  it("blocks a selected product its lifecycle record no longer allows quoting", () => {
    const result = validateProposalExport({
      products: [{ sku: "CAB-HAOC-6", quantity: 1 }],
      bomRows: [],
    });
    const blocker = result.blockers.find((entry) => entry.id === "lifecycle-CAB-HAOC-6");

    expect(result.allowed).toBe(false);
    expect(blocker?.domain).toBe("lifecycle");
    expect(blocker?.message).toContain("discontinued");
    // The quote has to move on, so the fix names the way out rather than only
    // reporting the status.
    expect(blocker?.fix).toContain("current product");

    // A current product and a cable are quotable: lifecycle only stops the
    // document for a SKU the business list has retired.
    const quotable = validateProposalExport({
      products: [{ sku: "APO-210-UC", quantity: 1 }, { sku: "CAB-HAOC-15", quantity: 2 }],
      bomRows: [],
    });
    expect(quotable.blockers.some((entry) => entry.domain === "lifecycle")).toBe(false);
  });

  it("blocks a BOM that still carries a TBC placeholder", () => {
    const result = validateProposalExport({
      products: [],
      bomRows: [{ item: 1, sku: "TBC-DISPLAY", description: "Display", role: "Display", qty: 1, type: "Required", status: "included", evidence: "Concept", notes: "Display brand TBC." }],
    });
    const blocker = result.blockers.find((entry) => entry.id === "chain-tbc-dependencies");

    expect(result.allowed).toBe(false);
    expect(blocker?.domain).toBe("chain");
    expect(blocker?.message).toContain("1 BOM row(s) are still placeholders");
  });
});

describe("validateProposalExport installation rate currency", () => {
  const wall = (overrides: Partial<WallRequirements> = {}): WallRequirements => ({
    ...defaultWallRequirements,
    application: "lcd-direct",
    layout: "independent",
    columns: 2,
    rows: 1,
    sources: 2,
    windows: 2,
    linkDetails: {
      "source-1": { enclosure: "Back box" },
      "display-1": { enclosure: "Back box" },
      "display-2": { termination: "Cat6A outlet" },
    },
    ...overrides,
  });
  const card = (currency: "GBP" | "USD" | "EUR" = "GBP") => ({
    updatedAt: "2026-10-21T12:00:00.000Z",
    currency,
    rates: { "install-enclosure-back-box": "120", "install-termination-cat6a-outlet": "35" },
  });

  it("names every line still holding the card's numbers on a quote in another currency", () => {
    const result = validateProposalExport({
      products: [],
      bomRows: [],
      wallRequirements: wall(),
      pricing: {
        currency: "USD",
        rateCard: card("GBP"),
        installationUnitPrices: { "install-enclosure-back-box": "120", "install-termination-cat6a-outlet": "35" },
      },
    });
    const warning = result.warnings.find((entry) => entry.id === "currency-installation-rates");

    // A commercial caveat, not a blocker: the rep may hold the card's figure.
    expect(result.allowed).toBe(true);
    expect(warning?.domain).toBe("currency");
    expect(warning?.severity).toBe("warning");
    expect(warning?.message).toContain("2 installation lines still hold your GBP rate card's numbers on a USD proposal");
    expect(warning?.message).toContain("Display housing — Back box");
    expect(warning?.message).toContain("Termination — Cat6A outlet");
    expect(warning?.fix).toContain("Type those rates in USD");
    expect(warning?.fix).toContain("save the card in USD");
  });

  it("counts one line in the singular", () => {
    const warning = validateProposalExport({
      products: [],
      bomRows: [],
      wallRequirements: wall(),
      pricing: {
        currency: "EUR",
        rateCard: card("GBP"),
        installationUnitPrices: { "install-enclosure-back-box": "120" },
      },
    }).warnings.find((entry) => entry.id === "currency-installation-rates");

    expect(warning?.message).toContain("1 installation line still holds your GBP rate card's number on a EUR proposal: Display housing — Back box.");
    expect(warning?.fix).toContain("Type that rate in EUR");
  });

  it("is quiet when the card is written in the proposal's currency", () => {
    const result = validateProposalExport({
      products: [],
      bomRows: [],
      wallRequirements: wall(),
      pricing: {
        currency: "GBP",
        rateCard: card("GBP"),
        installationUnitPrices: { "install-enclosure-back-box": "120" },
      },
    });

    expect(result.warnings.filter((entry) => entry.domain === "currency")).toEqual([]);
  });

  it("leaves a rate typed for this proposal alone", () => {
    const result = validateProposalExport({
      products: [],
      bomRows: [],
      wallRequirements: wall(),
      pricing: {
        currency: "USD",
        rateCard: card("GBP"),
        installationUnitPrices: { "install-enclosure-back-box": "150", "install-termination-cat6a-outlet": "40" },
      },
    });

    // Both cells hold this job's own numbers, so nothing was carried across.
    expect(result.warnings.filter((entry) => entry.domain === "currency")).toEqual([]);
  });

  it("has no opinion when the caller prices nothing", () => {
    expect(validateProposalExport({ products: [], bomRows: [], wallRequirements: wall() }).warnings
      .filter((entry) => entry.domain === "currency")).toEqual([]);
  });
});

/** The one line the run is measured against, in the shape the document prints. */
function receiverRow(sku: string, patch: Partial<SalesBomRow> = {}): SalesBomRow {
  return {
    item: 1,
    sku,
    description: `HDBaseT display receiver ${sku}`,
    role: "Display receiver",
    qty: 1,
    type: "Required",
    status: "included",
    evidence: "Survey 26 October",
    notes: "Chosen from the surveyed display run.",
    ...patch,
  };
}

const displayRunEntries = (result: ReturnType<typeof validateProposalExport>) =>
  result.blockers.filter((entry) => entry.domain === "display-run");

describe("validateProposalExport display-run gate", () => {
  it("holds a document that quotes a receiver on a run past the range's rating", () => {
    const result = validateProposalExport({
      products: [],
      bomRows: [receiverRow("RX-700")],
      displayRunMetres: 130,
    });
    const [blocker] = displayRunEntries(result);

    expect(blocker.domain).toBe("display-run");
    expect(blocker.severity).toBe("blocker");
    expect(blocker.sku).toBe("RX-700");
    expect(blocker.message).toContain("130 m display run");
    expect(blocker.message).toContain("100 m rating");
    // The fix is the change a rep can make: measured spans, or a shorter run.
    expect(blocker.fix).toContain("mid-span repeater or a fibre extender pair");
    expect(blocker.fix).toContain("100 m or less");
    // It lands among the blockers, which is what stops the export.
    expect(result.blockers.some((entry) => entry.id === "display-run-over-limit")).toBe(true);
  });

  it("allows a run the longest receiver is rated for", () => {
    const result = validateProposalExport({
      products: [],
      bomRows: [receiverRow("RX-700")],
      displayRunMetres: 100,
    });
    expect(displayRunEntries(result)).toEqual([]);
  });

  it("raises nothing for a room that quotes no HDBaseT receiver", () => {
    const result = validateProposalExport({
      products: [],
      bomRows: [receiverRow("RX-700", { status: "excluded", qty: 0 })],
      displayRunMetres: 130,
    });
    expect(displayRunEntries(result)).toEqual([]);
  });

  it("raises nothing when the room records no run", () => {
    for (const displayRunMetres of [undefined, null]) {
      const result = validateProposalExport({
        products: [],
        bomRows: [receiverRow("RX-500")],
        displayRunMetres,
      });
      expect(displayRunEntries(result)).toEqual([]);
    }
  });
});
