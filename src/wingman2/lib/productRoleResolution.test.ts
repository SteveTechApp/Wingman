import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolveRoleFromClassification,
  resolveRoleFromText,
  type ProductClassificationFacts,
} from "./productRoleResolution";
import {
  extractRawProducts,
  normaliseProductRecord,
  resolveProductRoleWithEvidence,
} from "./productStoryEngine";

function facts(overrides: Partial<ProductClassificationFacts>): ProductClassificationFacts {
  return { confidence: 0.9, subClassifications: [], ...overrides };
}

describe("role resolution prefers the governed taxonomy", () => {
  it("uses a controlled subClassifications token before anything else", () => {
    const result = resolveRoleFromClassification(
      facts({ subClassifications: ["matrix", "hdmi"], primaryCategory: "Video" }),
    );

    expect(result?.role).toBe("matrix");
    expect(result?.source).toBe("taxonomy-classification");
    expect(result?.needsReview).toBe(false);
  });

  it("treats an audio capability on a video product as a capability, not a role", () => {
    // MXV-0808-H2A-MK2: a matrix with audio de-embed. The taxonomy already
    // separates the role token ("matrix") from the capability ("audio-deembed").
    const result = resolveRoleFromClassification(
      facts({
        subClassifications: ["matrix", "hdmi", "audio-deembed"],
        signalDomains: ["Video", "Audio", "Control"],
      }),
    );

    expect(result?.role).toBe("matrix");
  });

  it("does not turn a Dante-capable encoder into an audio product", () => {
    const result = resolveRoleFromClassification(
      facts({ subClassifications: ["networkhd-500", "encoder", "dante"] }),
    );

    expect(result?.role).toBe("avoip");
  });

  it("prefers the specific function over the product family it belongs to", () => {
    // A NetworkHD multiview processor carries both tokens; its story is about
    // multiview, not about AVoIP generally.
    const result = resolveRoleFromClassification(
      facts({ subClassifications: ["networkhd-500", "multiview-processor"] }),
    );

    expect(result?.role).toBe("multiview");
  });

  it("never reads 'video-bar' on an add-on microphone as a camera", () => {
    const result = resolveRoleFromClassification(
      facts({ subClassifications: ["microphone", "video-bar"] }),
    );

    expect(result?.role).toBe("audio");
  });

  it("falls back through systemRole, then category, then primaryCategory", () => {
    expect(
      resolveRoleFromClassification(facts({ systemRole: "Point-to-point extension" }))?.role,
    ).toBe("extension");

    // The 10 records that leak a product name into systemRole still resolve,
    // because `category` is clean on all of them.
    expect(
      resolveRoleFromClassification(
        facts({ systemRole: "4K60 8x8 HDMI Matrix", category: "Matrix switching", primaryCategory: "Video" }),
      )?.role,
    ).toBe("matrix");

    expect(
      resolveRoleFromClassification(facts({ primaryCategory: "Camera / Capture" }))?.role,
    ).toBe("camera");
  });

  it("gives cables and accessories no narrative role rather than inventing one", () => {
    const cable = resolveRoleFromClassification(
      facts({ subClassifications: ["cable", "active-optical"], primaryCategory: "Cable / Connectivity" }),
    );

    expect(cable?.role).toBe("general");
    expect(cable?.needsReview).toBe(false);
  });

  it("returns null when there is no taxonomy at all, so the caller can fall back", () => {
    expect(resolveRoleFromClassification(undefined)).toBeNull();
    expect(resolveRoleFromClassification(facts({}))).toBeNull();
  });
});

describe("text fallback is a guarded last resort", () => {
  it("requires audio to be the purpose, not merely a connection", () => {
    // The old rule matched bare "dante", "dsp", "speaker" or "amplifier"
    // anywhere in the concatenated product text.
    expect(resolveRoleFromText("4K60 encoder with Dante audio networking", "NHD-500-DNT-TX")).toBe("avoip");
    expect(resolveRoleFromText("8x8 matrix with speaker level outputs", "MX-0808")).toBe("matrix");
    expect(resolveRoleFromText("2 channel power amplifier", "AMP-2120")).toBe("audio");
    expect(resolveRoleFromText("ceiling microphone array for meeting rooms", "MIC-1")).toBe("audio");
  });

  it("does not let an application mention claim the role", () => {
    // "ideal for video wall applications" on a matrix datasheet used to make
    // the product a video wall processor.
    expect(resolveRoleFromText("HDBaseT matrix, ideal for video wall applications", "MX-1")).toBe("matrix");
  });

  it("orders tests most-specific-first", () => {
    expect(resolveRoleFromText("PTZ camera with HDBaseT output", "CAM-1")).toBe("camera");
    expect(resolveRoleFromText("NetworkHD decoder", "NHD-1")).toBe("avoip");
  });
});

describe("against the real catalogue", () => {
  const idx = JSON.parse(readFileSync("public/product-intelligence-index.json", "utf8"));
  const specs = (extractRawProducts(idx) as unknown[])
    .map((raw, i) => normaliseProductRecord(raw, i))
    .filter((spec): spec is NonNullable<typeof spec> => Boolean(spec));

  it("resolves every catalogue product from the taxonomy, never from prose", () => {
    const guessed = specs
      .map((spec) => ({ sku: spec.sku, res: resolveProductRoleWithEvidence(spec) }))
      .filter((entry) => entry.res.needsReview);

    expect(guessed.map((entry) => entry.sku)).toEqual([]);
  });

  it("calls only genuine audio products audio", () => {
    const audio = specs
      .filter((spec) => resolveProductRoleWithEvidence(spec).role === "audio")
      .map((spec) => spec.sku)
      .sort();

    // Was 16 before this redesign, of which 13 were not audio products -
    // including a PTZ camera, four NetworkHD encoders, two matrices, two
    // splitters and an HDBaseT extender.
    expect(audio).toEqual(["AMP-2120", "AMP-2120-DNT", "AMP-260-DNT", "COM-MIC-HUB"]);
  });

  it("keeps the specific SKUs that exposed the bug on their real roles", () => {
    const roleOf = (sku: string) => {
      const spec = specs.find((entry) => entry.sku === sku);
      expect(spec, sku).toBeDefined();
      return resolveProductRoleWithEvidence(spec!).role;
    };

    expect(roleOf("EX-100-H2-EARC")).toBe("extension");
    expect(roleOf("MXV-0808-H2A-MK2")).toBe("matrix");
    expect(roleOf("CAM-420-PTZ")).toBe("camera");
    expect(roleOf("NHD-500-DNT-TX")).toBe("avoip");
    expect(roleOf("NHD-610-TX")).toBe("avoip");
    expect(roleOf("MX-0804-EDC")).toBe("matrix");
    expect(roleOf("TX-H2X-ADZ")).toBe("extension");
  });

  it("stops assigning a narrative role to cables", () => {
    const cableRoles = new Set(
      specs
        .filter((spec) => /^CAB-/i.test(spec.sku))
        .map((spec) => resolveProductRoleWithEvidence(spec).role),
    );

    // Cables previously came back as presentation, camera and audio products.
    expect([...cableRoles]).toEqual(["general"]);
  });
});
