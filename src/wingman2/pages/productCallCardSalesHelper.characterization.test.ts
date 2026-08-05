import { describe, expect, it } from "vitest";
import {
  buildProductSalesHelperCopy,
  productRoleForSalesHelper,
  type ProductCard,
} from "./ProductCallCardsPage";

// Characterization tests for the Product Call Cards sales-helper copy. These
// lock the current (protected) sales guidance so it can be extracted to a
// domain module without any behavioural change. They assert the exact composed
// output for controlled inputs, plus the role-classification rules and the
// structural caps that buildProductSalesHelperCopy guarantees.

function makeProductCard(overrides: Partial<ProductCard> = {}): ProductCard {
  return {
    sku: "SKU-1",
    name: "Example product",
    family: "Example Family",
    category: "Example Category",
    description: "",
    fit: "",
    openingLine: "",
    questions: [],
    proofPoints: [],
    tags: [],
    headings: [],
    sourceSearchText: "",
    curated: false,
    ...overrides,
  };
}

describe("productRoleForSalesHelper (sales-role classification)", () => {
  const cases: Array<[Partial<ProductCard>, string]> = [
    [{ sku: "NHD-0401-MV" }, "multiview"],
    [{ sku: "SW-0204-VW-KIT" }, "videoWall"],
    [{ sku: "SW-0206-VW-KIT" }, "videoWall"],
    [{ sku: "AMP-220-10" }, "audio"],
    [{ sku: "NHD-500-TX" }, "networkhd"],
    [{ sku: "MX-0808-H2A" }, "matrix"],
    [{ sku: "MXV-0404-H2A" }, "matrix"],
    [{ sku: "SW-510-TX" }, "presentation"],
    [{ sku: "APO-VX20-UC" }, "uc"],
    [{ sku: "EX-100-KIT" }, "extender"],
    [{ sku: "RX-70-4K" }, "extender"],
    [{ sku: "TX-70-4K" }, "extender"],
    [{ sku: "CAM-210-PTZ" }, "camera"],
    [{ sku: "SYN-KEY10" }, "control"],
  ];

  it.each(cases)("maps %o to the %s role by SKU prefix", (overrides, expectedRole) => {
    expect(productRoleForSalesHelper(makeProductCard(overrides))).toBe(expectedRole);
  });

  it("falls back to text classification when the SKU prefix is unknown", () => {
    expect(
      productRoleForSalesHelper(makeProductCard({ sku: "GEN-1", name: "Video Wall Processor" })),
    ).toBe("videoWall");
    expect(
      productRoleForSalesHelper(makeProductCard({ sku: "GEN-2", family: "Presentation Switcher" })),
    ).toBe("presentation");
    expect(
      productRoleForSalesHelper(makeProductCard({ sku: "GEN-3", category: "Dante Audio Amplifier" })),
    ).toBe("audio");
  });

  it("defaults to the general role when nothing matches", () => {
    expect(productRoleForSalesHelper(makeProductCard({ sku: "GEN-9", name: "Mystery box" }))).toBe(
      "general",
    );
  });
});

describe("buildProductSalesHelperCopy (composed sales copy)", () => {
  const networkHdProduct = makeProductCard({
    sku: "NHD-500-TX",
    family: "NetworkHD 500",
    description: "Encodes 4K60 video over IP.",
    fit: "Best for distributed AV.",
    openingLine: "Ask about their network.",
    questions: ["How many endpoints are planned?"],
    proofPoints: ["Deployed at 200-endpoint sites."],
  });

  it("composes the exact NetworkHD sales copy for a controlled product", () => {
    const copy = buildProductSalesHelperCopy(networkHdProduct, "Acme boardroom", ["Confirm switch capacity."]);

    expect(copy.whatItDoes).toBe(
      "NHD-500-TX is a NetworkHD AV-over-IP product. Encodes 4K60 video over IP. In salesperson terms, it is there for moving video, USB, audio or control across a managed AV network when the system needs to scale beyond a fixed switch.",
    );
    expect(copy.fitHere).toBe(
      "NHD-500-TX fits Acme boardroom when sources and displays are spread out, expected to grow, or need flexible routing through a managed network. Best for distributed AV. Treat it as a strong direction, not a final quote line, until the checks below are answered.",
    );
    expect(copy.sayThis).toBe(
      'Ask about their network. Then qualify it plainly: "How many endpoints are planned?"',
    );
    // The product's own question leads, and its proof point is carried through.
    expect(copy.discoveryQuestions[0]).toBe("How many endpoints are planned?");
    expect(copy.proofPoints).toContain("Deployed at 200-endpoint sites.");
    expect(copy.specWatchOuts).toContain("Confirm switch capacity.");
  });

  it("uses 'this opportunity' when no application is supplied", () => {
    const copy = buildProductSalesHelperCopy(networkHdProduct, "", []);
    expect(copy.fitHere.startsWith("NHD-500-TX fits this opportunity when ")).toBe(true);
  });

  it("names the audio role for an amplifier SKU", () => {
    const copy = buildProductSalesHelperCopy(
      makeProductCard({ sku: "AMP-220-10", family: "Audio", description: "Two-channel amplifier." }),
      "Bar refit",
      [],
    );
    expect(copy.whatItDoes).toContain("AMP-220-10 is an audio amplifier or audio integration product.");
    expect(copy.whatItDoes).toContain(
      "turning the room's audio requirement into the right speaker load, zones, sources and control path.",
    );
  });

  it("respects the structural caps and de-duplicates regardless of input", () => {
    const noisy = makeProductCard({
      sku: "NHD-600-TX",
      family: "NetworkHD 600",
      questions: Array.from({ length: 12 }, (_value, index) => `Question ${index}?`),
      proofPoints: Array.from({ length: 12 }, (_value, index) => `Proof ${index}.`),
    });
    const copy = buildProductSalesHelperCopy(noisy, "Campus", Array.from({ length: 12 }, (_v, i) => `Check ${i}.`));

    expect(copy.realWorldJobs.length).toBeLessThanOrEqual(4);
    expect(copy.specWatchOuts.length).toBeLessThanOrEqual(5);
    expect(copy.useWhen.length).toBeLessThanOrEqual(4);
    expect(copy.avoidWhen.length).toBeLessThanOrEqual(3);
    expect(copy.proofPoints.length).toBeLessThanOrEqual(5);
    expect(copy.discoveryQuestions.length).toBeLessThanOrEqual(7);
    expect(new Set(copy.discoveryQuestions).size).toBe(copy.discoveryQuestions.length);
    expect(new Set(copy.proofPoints).size).toBe(copy.proofPoints.length);
  });
});
