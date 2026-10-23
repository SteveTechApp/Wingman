import { beforeEach, describe, expect, it } from "vitest";
import { buildInstallationSchedule } from "./installationSchedule";
import { installationRateCardHint, seedInstallationRates } from "./installationRateCard";
import { createProposalWizardDefaults } from "./proposalWizard";
import type { SalesBomRow } from "./salesReadiness";
import {
  EMPTY_TEMPLATE_PRICING,
  loadTemplateProposalPricing,
  normalizeTemplateProposalPricing,
  saveTemplateProposalPricing,
  templatePricingDraft,
  templatePricingStorageKey,
  templatePricingSummary,
  type TemplateProposalPricing,
} from "./templateProposalPricing";
import { defaultWallRequirements } from "./videowallOptions";

function rows(): SalesBomRow[] {
  return [
    { item: 1, sku: "NHD-1", description: "Encoder", role: "Encoding", qty: 2, type: "Required", status: "included", evidence: "Selected", notes: "" },
    { item: 2, sku: "NHD-2", description: "Decoder", role: "Decoding", qty: 1, type: "Required", status: "included", evidence: "Selected", notes: "" },
  ];
}

const installation = () =>
  buildInstallationSchedule({
    ...defaultWallRequirements,
    application: "lcd-direct",
    layout: "independent",
    columns: 2,
    rows: 1,
    sources: 1,
    linkDetails: {
      "source-1": { enclosure: "Rack shelf" },
      "display-1": { enclosure: "Rack shelf", termination: "HDMI faceplate" },
    },
  });

function defaults() {
  return createProposalWizardDefaults({
    projectId: "template-tpl-huddle",
    projectName: "Huddle room",
    preparedBy: "",
    executiveSummary: "A room brief.",
    architectureNarrative: "One switch and two screens.",
  });
}

describe("template pricing storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("brings the prices back for the template that saved them", () => {
    const pricing: TemplateProposalPricing = {
      currency: "EUR",
      bomUnitPrices: { "NHD-1": "1250.00" },
      installationUnitPrices: { "install-enclosure-rack-shelf": "80" },
    };
    saveTemplateProposalPricing("tpl-huddle", pricing);

    expect(window.localStorage.getItem(templatePricingStorageKey("tpl-huddle"))).toContain("1250.00");
    expect(loadTemplateProposalPricing("tpl-huddle")).toEqual(pricing);
    // Prices belong to one template, so another starts unpriced.
    expect(loadTemplateProposalPricing("tpl-boardroom")).toEqual(EMPTY_TEMPLATE_PRICING);
  });

  it("drops a stored value the document could not print", () => {
    window.localStorage.setItem(
      templatePricingStorageKey("tpl-huddle"),
      JSON.stringify({
        currency: "CHF",
        bomUnitPrices: { "NHD-1": "  ", "NHD-2": "quote on request", "NHD-3": 40 },
        installationUnitPrices: { "install-mount-pole": "-5" },
      }),
    );

    const pricing = loadTemplateProposalPricing("tpl-huddle");

    // A number written by an older draft is still a price; a non-number is not.
    // The blank cell is kept as the rep's "unpriced here", not dropped.
    expect(pricing.bomUnitPrices).toEqual({ "NHD-1": "", "NHD-3": "40" });
    expect(pricing.installationUnitPrices).toEqual({});
    // The document prints the currency it knows, not one it does not.
    expect(pricing.currency).toBe("GBP");
  });

  it("keeps a cleared rate cleared, so the rate card cannot refill it by itself", () => {
    const card = { updatedAt: "2026-10-21T12:00:00.000Z", currency: "GBP" as const, rates: { "install-enclosure-rack-shelf": "120" } };
    saveTemplateProposalPricing("tpl-huddle", {
      currency: "GBP",
      bomUnitPrices: {},
      installationUnitPrices: { "install-enclosure-rack-shelf": "" },
    });

    const loaded = loadTemplateProposalPricing("tpl-huddle");

    // The empty cell comes back as an empty cell: the rep cleared it on purpose,
    // and an absent key would look like a line nobody had reached yet.
    expect(loaded.installationUnitPrices).toEqual({ "install-enclosure-rack-shelf": "" });
    expect(seedInstallationRates(card, loaded.installationUnitPrices)).toEqual({ "install-enclosure-rack-shelf": "" });
    // The card's number is still offered beside it, which is what the hint does.
    expect(installationRateCardHint(card, "install-enclosure-rack-shelf", loaded.installationUnitPrices["install-enclosure-rack-shelf"]))
      .toBe("120");
  });

  it("is no pricing at all when nothing usable was saved", () => {
    expect(normalizeTemplateProposalPricing(undefined)).toEqual(EMPTY_TEMPLATE_PRICING);
    expect(normalizeTemplateProposalPricing({ bomUnitPrices: "nope" })).toEqual(EMPTY_TEMPLATE_PRICING);
    expect(loadTemplateProposalPricing("tpl-huddle")).toEqual(EMPTY_TEMPLATE_PRICING);
  });
});

describe("templatePricingDraft", () => {
  it("puts the template's prices on the draft the document builder reads", () => {
    const base = defaults();
    const draft = templatePricingDraft(base, {
      currency: "USD",
      bomUnitPrices: { "NHD-1": "900" },
      installationUnitPrices: { "install-enclosure-rack-shelf": "40" },
    });

    expect(draft.currency).toBe("USD");
    expect(draft.bomUnitPrices).toEqual({ "NHD-1": "900" });
    expect(draft.installationUnitPrices).toEqual({ "install-enclosure-rack-shelf": "40" });
    // Nothing wizard-only travels with a price: the template's own copy stays.
    expect(draft.executiveSummary).toBe(base.executiveSummary);
    expect(draft.proposalReference).toBe(base.proposalReference);
    expect(draft.projectName).toBe(base.projectName);
  });
});

describe("templatePricingSummary", () => {
  it("counts what the export would still print as TBC", () => {
    const schedule = installation();
    const summary = templatePricingSummary(rows(), schedule, {
      currency: "GBP",
      bomUnitPrices: { "NHD-1": "100" },
      installationUnitPrices: { "install-enclosure-rack-shelf": "80" },
    });

    expect(summary.unpricedEquipment).toBe(1);
    expect(summary.unpricedInstallation).toBe(1);
    expect(summary.complete).toBe(false);
    // The panel names the lines, not only how many are missing.
    expect(summary.unpricedLines).toEqual([
      { kind: "equipment", id: "NHD-2", label: "NHD-2" },
      { kind: "installation", id: "install-termination-hdmi-faceplate", label: "Termination — HDMI faceplate" },
    ]);
    expect(summary.text).toContain("Still to price: equipment NHD-2; installation Termination — HDMI faceplate.");
    // The priced lines still sum, so the panel shows what is already known.
    expect(summary.equipment.total).toBe(200);
    expect(summary.text).toContain("Equipment £200.00");
    expect(summary.text).toContain("installation £160.00");
    expect(summary.text).toContain("2 lines need a price before the export prints a total.");
  });

  it("names one line per rate key, not one per row", () => {
    // Two rows sharing a SKU share one price cell, so the hold names it once.
    const summary = templatePricingSummary([...rows(), { ...rows()[1], item: 3, qty: 4 }], null, EMPTY_TEMPLATE_PRICING);

    expect(summary.unpricedEquipment).toBe(3);
    expect(summary.unpricedLines).toHaveLength(2);
    expect(summary.unpricedText).toBe("Still to price: equipment NHD-1, NHD-2.");
  });

  it("keeps a long schedule to one sentence", () => {
    const many = Array.from({ length: 5 }, (_, index) => ({ ...rows()[0], item: index + 1, sku: `SKU-${index + 1}` }));
    const summary = templatePricingSummary(many, null, EMPTY_TEMPLATE_PRICING);

    expect(summary.unpricedText).toBe("Still to price: equipment SKU-1, SKU-2, SKU-3 and 2 more.");
  });

  it("is complete once every equipment row and installation line is priced", () => {
    const summary = templatePricingSummary(rows(), installation(), {
      currency: "GBP",
      bomUnitPrices: { "NHD-1": "100", "NHD-2": "50" },
      installationUnitPrices: {
        "install-enclosure-rack-shelf": "80",
        "install-termination-hdmi-faceplate": "35",
      },
    });

    expect(summary.complete).toBe(true);
    expect(summary.unpricedEquipment).toBe(0);
    expect(summary.unpricedInstallation).toBe(0);
    expect(summary.text).toContain("Equipment £250.00");
    expect(summary.text).toContain("installation £195.00");
    expect(summary.text).toContain("Every line is priced.");
    expect(summary.unpricedLines).toEqual([]);
    expect(summary.unpricedText).toBe("");
  });

  it("says there is nothing to price rather than claiming a priced schedule", () => {
    const summary = templatePricingSummary([], null, EMPTY_TEMPLATE_PRICING);

    // No schedule is not the same as a schedule fully priced, and the document
    // says so in its own section.
    expect(summary.text).toBe("There are no equipment or installation lines to price.");
    expect(summary.complete).toBe(false);
  });

  it("has no installation scope without a saved wall survey", () => {
    const summary = templatePricingSummary(rows(), null, {
      currency: "GBP",
      bomUnitPrices: { "NHD-1": "100", "NHD-2": "50" },
      installationUnitPrices: {},
    });

    expect(summary.installation).toBeNull();
    expect(summary.unpricedInstallation).toBe(0);
    // Without installation scope the equipment prices are the whole question.
    expect(summary.complete).toBe(true);
  });
});
