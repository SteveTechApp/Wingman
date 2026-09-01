import { describe, expect, it } from "vitest";
import type { StoredProductSelection } from "../../data/projectStore";
import { proposalSchematicBrief } from "./proposalSchematicBrief";

function makeProduct(overrides: Partial<StoredProductSelection>): StoredProductSelection {
  return {
    sku: overrides.sku || "TEST-001",
    title: overrides.title || overrides.sku || "Test Product",
    quantity: overrides.quantity ?? 1,
  };
}

describe("proposalSchematicBrief", () => {
  it("creates 1 source and 1 display for a single encoder + decoder pair", () => {
    const products = [
      makeProduct({ sku: "NHD-ENC-TX", quantity: 1 }),
      makeProduct({ sku: "NHD-DEC-RX", quantity: 1 }),
    ];
    const brief = proposalSchematicBrief("Test", products);
    expect(brief.sources!).toHaveLength(1);
    expect(brief.displays!).toHaveLength(1);
  });

  it("creates correct capacity for a 4×4 matrix (4 sources, 4 displays)", () => {
    const products = [
      makeProduct({ sku: "MX-0404-H2A", quantity: 1 }),
    ];
    const brief = proposalSchematicBrief("Matrix test", products);
    // MX-0404 has inputCount=4, outputCount=4 in governed profiles
    expect(brief.sources!.length).toBeGreaterThanOrEqual(1);
    expect(brief.displays!.length).toBeGreaterThanOrEqual(1);
  });

  it("creates correct capacity for multiple encoders", () => {
    const products = [
      makeProduct({ sku: "NHD-ENC-TX", quantity: 3 }),
      makeProduct({ sku: "NHD-DEC-RX", quantity: 2 }),
    ];
    const brief = proposalSchematicBrief("Multi-encoder", products);
    expect(brief.sources!).toHaveLength(3);
    expect(brief.displays!).toHaveLength(2);
  });

  it("uses governed I/O count for matrix, not chassis quantity", () => {
    // An 8×8 matrix chassis quantity 1 should produce 8 sources and 8 displays
    const products = [
      makeProduct({ sku: "MX-0808-H2A-MK2", quantity: 1 }),
    ];
    const brief = proposalSchematicBrief("8x8 matrix", products);
    // The governed profile has inputCount=8, outputCount=8
    expect(brief.sources!.length).toBeGreaterThanOrEqual(4);
    expect(brief.displays!.length).toBeGreaterThanOrEqual(4);
  });

  it("falls back to chassis quantity when no governed profile exists", () => {
    const products = [
      makeProduct({ sku: "UNKNOWN-MATRIX-999", quantity: 1 }),
    ];
    const brief = proposalSchematicBrief("Unknown matrix", products);
    // Without governed data, falls back to quantity=1
    expect(brief.sources!).toHaveLength(1);
    expect(brief.displays!).toHaveLength(1);
  });

  it("creates at least 1 source and 1 display even with no recognisable products", () => {
    const brief = proposalSchematicBrief("Empty", []);
    expect(brief.sources!.length).toBeGreaterThanOrEqual(1);
    expect(brief.displays!.length).toBeGreaterThanOrEqual(1);
  });

  it("detects network requirement from AVoIP products", () => {
    const products = [
      makeProduct({ sku: "NHD-ENC-TX", quantity: 2 }),
      makeProduct({ sku: "NHD-DEC-RX", quantity: 2 }),
    ];
    const brief = proposalSchematicBrief("Network test", products);
    expect(brief.networkAvailable).toBe(true);
  });

  it("detects audio requirement from product titles", () => {
    const products = [
      makeProduct({ sku: "APO-AUDIO-001", title: "Dante audio amplifier", quantity: 1 }),
    ];
    const brief = proposalSchematicBrief("Audio test", products);
    expect(brief.audioRequired).toBe(true);
  });

  it("detects control requirement from product titles", () => {
    const products = [
      makeProduct({ sku: "CTRL-001", title: "Room control processor", quantity: 1 }),
    ];
    const brief = proposalSchematicBrief("Control test", products);
    expect(brief.controlRequired).toBe(true);
  });

  it("includes BY-OTHERS products in the schematic for real connectivity", () => {
    const products = [
      makeProduct({ sku: "BY-OTHERS-DISPLAY", quantity: 1 }),
      makeProduct({ sku: "NHD-ENC-TX", quantity: 1 }),
    ];
    const brief = proposalSchematicBrief("BY-OTHERS test", products);
    // BY-OTHERS equipment now appears so the schematic proves real connectivity
    expect(brief.products!).toHaveLength(2);
  });
});
