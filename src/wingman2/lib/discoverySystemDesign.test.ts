import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildSystemDesign,
  parseCount,
  productMatchesSlot,
  type SystemSlot,
} from "./discoverySystemDesign";
import { extractRawProducts, readClassificationFacts } from "./productStoryEngine";
import type { StoredDiscoveryBrief } from "../data/projectStore";

function brief(roomModel: Record<string, unknown>): StoredDiscoveryBrief {
  return { roomModel } as unknown as StoredDiscoveryBrief;
}

const rawProducts = extractRawProducts(
  JSON.parse(readFileSync("public/product-intelligence-index.json", "utf8")),
) as Array<Record<string, unknown>>;

function skusForSlot(slot: SystemSlot): string[] {
  return rawProducts
    .filter((raw) => productMatchesSlot(readClassificationFacts(raw), slot))
    .map((raw) => String(raw.sku));
}

describe("parseCount", () => {
  it("reads a count out of the free text a brief actually stores", () => {
    expect(parseCount("4")).toBe(4);
    expect(parseCount("6 displays")).toBe(6);
    expect(parseCount("6-10")).toBe(6);
  });

  it("returns null rather than guessing 1 when the answer is missing", () => {
    // Defaulting to 1 would silently undersize a system and hide the gap.
    expect(parseCount("")).toBeNull();
    expect(parseCount(undefined)).toBeNull();
    expect(parseCount("not sure")).toBeNull();
    expect(parseCount("0")).toBeNull();
  });
});

describe("a room brief produces a multi-product system, not one SKU", () => {
  it("decomposes a distributed room into encoders, decoders and a controller", () => {
    const design = buildSystemDesign(
      brief({
        application: "Distributed AV across a campus building",
        sourceCount: "4",
        displayCount: "12",
      }),
    );

    expect(design.architecture).toBe("avoip");

    const kinds = design.slots.map((slot) => slot.kind);
    expect(kinds).toContain("avoip-encoder");
    expect(kinds).toContain("avoip-decoder");
    expect(kinds).toContain("avoip-control");

    // Quantities come from the captured counts, which is the whole point of
    // asking for them during Discovery.
    const encoder = design.slots.find((slot) => slot.kind === "avoip-encoder");
    const decoder = design.slots.find((slot) => slot.kind === "avoip-decoder");
    expect(encoder?.quantity).toBe(4);
    expect(decoder?.quantity).toBe(12);
  });

  it("adds a receiver per display when a matrix system has a long cable run", () => {
    const design = buildSystemDesign(
      brief({ sourceCount: "4", displayCount: "4", cableRun: "60m to the far displays" }),
    );

    expect(design.architecture).toBe("matrix");

    const extension = design.slots.find((slot) => slot.kind === "extension");
    expect(extension, "a 60m run needs extension, not a direct HDMI cable").toBeDefined();
    expect(extension?.quantity).toBe(4);
  });

  it("does not add extension when everything is in the same room", () => {
    const design = buildSystemDesign(
      brief({ sourceCount: "3", displayCount: "2", cableRun: "5m" }),
    );

    expect(design.slots.map((slot) => slot.kind)).not.toContain("extension");
  });

  it("adds camera and microphone slots for a conferencing room", () => {
    const design = buildSystemDesign(
      brief({
        sourceCount: "2",
        displayCount: "1",
        unifiedCommunicationsRequirement: "Yes - Microsoft Teams",
        microphoneConnections: "2",
      }),
    );

    const kinds = design.slots.map((slot) => slot.kind);
    expect(kinds).toContain("camera");
    expect(kinds).toContain("microphone");
    expect(design.slots.find((slot) => slot.kind === "microphone")?.quantity).toBe(2);
  });

  it("raises open questions instead of inventing counts", () => {
    const design = buildSystemDesign(brief({ application: "Meeting room" }));

    expect(design.architecture).toBe("undetermined");
    expect(design.openQuestions).toContain("How many displays does the room have?");
    expect(design.openQuestions).toContain("How many sources need to reach the screens?");
  });

  it("survives an empty or absent brief without throwing", () => {
    expect(() => buildSystemDesign(null)).not.toThrow();
    expect(buildSystemDesign(null).slots).toEqual([]);
    expect(() => buildSystemDesign(brief({}))).not.toThrow();
  });
});

describe("slots resolve to real catalogue products", () => {
  const design = buildSystemDesign(
    brief({
      application: "Distributed AV",
      sourceCount: "4",
      displayCount: "12",
      unifiedCommunicationsRequirement: "Yes - Teams",
      cableRun: "70m",
      audioNeeds: "Ceiling speakers driven from the rack",
      controlNeeds: "Touch panel",
    }),
  );

  it("fills every slot it declares from the real catalogue", () => {
    const unfilled = design.slots.filter((slot) => skusForSlot(slot).length === 0);
    expect(unfilled.map((slot) => slot.kind)).toEqual([]);
  });

  it("keeps encoders and decoders in separate slots", () => {
    const encoderSlot = design.slots.find((slot) => slot.kind === "avoip-encoder")!;
    const decoderSlot = design.slots.find((slot) => slot.kind === "avoip-decoder")!;

    const encoders = skusForSlot(encoderSlot);
    const decoders = skusForSlot(decoderSlot);

    expect(encoders.length).toBeGreaterThan(0);
    expect(decoders.length).toBeGreaterThan(0);

    // A decoder must never be offered as the encoder, or the system will not
    // work and the quote will look complete.
    const overlap = encoders.filter((sku) => decoders.includes(sku));
    expect(overlap).toEqual([]);
  });

  it("never offers a cable or a mounting bracket as a system product", () => {
    for (const slot of design.slots) {
      const skus = skusForSlot(slot);
      expect(skus.filter((sku) => /^CAB-/i.test(sku)), slot.kind).toEqual([]);
    }
  });

  it("matches nothing when a product carries no governed classification", () => {
    const slot = design.slots[0];
    expect(productMatchesSlot(undefined, slot)).toBe(false);
    expect(productMatchesSlot({}, slot)).toBe(false);
  });
});
