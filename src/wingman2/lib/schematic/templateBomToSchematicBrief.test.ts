import { describe, expect, it } from "vitest";
import { templateBomToSchematicBrief } from "./templateBomToSchematicBrief";
import type { RoomTemplate, TemplateBomRow } from "../roomTemplates";

function makeTemplate(overrides: Partial<RoomTemplate> = {}): RoomTemplate {
  return {
    id: "test-template",
    name: "Test Template",
    vertical: "Corporate",
    application: "Small meeting room with USB-C, HDMI, wireless presentation, camera, and display.",
    scale: "4-6 people",
    summary: "Test meeting room.",
    customerNarrative: "Compact meeting room for collaboration.",
    architecture: "Local presentation with UC appliance.",
    bom: [],
    designNotes: [],
    assumptions: [],
    validationItems: [],
    upgradePaths: [],
    ...overrides,
  };
}

function makeRow(overrides: Partial<TemplateBomRow> = {}): TemplateBomRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sku: "NHD-120-TX",
    description: "NetworkHD 100 encoder",
    role: "Source encoder",
    qty: 1,
    type: "Required",
    status: "included",
    evidence: "Test evidence.",
    notes: "Test notes.",
    ...overrides,
  };
}

describe("templateBomToSchematicBrief", () => {
  it("produces a valid SchematicProjectBrief from a NetworkHD template", () => {
    const template = makeTemplate({
      application: "Large training room with NetworkHD distribution.",
    });
    const rows = [
      makeRow({ sku: "NHD-CTL-PRO-V2", description: "NetworkHD controller", role: "Controller" }),
      makeRow({ sku: "NHD-120-TX", description: "NetworkHD 100 encoder", role: "Source encoder", qty: 2 }),
      makeRow({ sku: "NHD-120-RX", description: "NetworkHD 100 decoder", role: "Display decoder", qty: 4 }),
    ];

    const brief = templateBomToSchematicBrief(template, rows);

    expect(brief.id).toBe("template-test-template");
    expect(brief.title).toBe("Test Template");
    expect(brief.products!.length).toBe(3);
    expect(brief.products!.some((p) => p.sku === "NHD-120-TX")).toBe(true);
    expect(brief.products!.some((p) => p.sku === "NHD-120-RX")).toBe(true);

    // Sources should include the encoders
    expect(brief.sources!.length).toBeGreaterThanOrEqual(2);
    // Displays should include the decoders
    expect(brief.displays!.length).toBeGreaterThanOrEqual(4);
  });

  it("excludes BY-OTHERS rows from products", () => {
    const template = makeTemplate();
    const rows = [
      makeRow({ sku: "NHD-120-TX", description: "Encoder", role: "Source encoder" }),
      makeRow({ sku: "BY-OTHERS", description: "Display mounting", role: "Mounting" }),
    ];

    const brief = templateBomToSchematicBrief(template, rows);

    expect(brief.products!.length).toBe(1);
    expect(brief.products![0].sku).toBe("NHD-120-TX");
  });

  it("infers USB and audio requirements from template text", () => {
    const template = makeTemplate({
      application: "Conference room with USB-C BYOD and Dante audio.",
      customerNarrative: "Users bring laptops with USB-C for wireless conferencing.",
    });
    const rows = [makeRow({ sku: "SW-130-TX", description: "HDBaseT TX", role: "Extender" })];

    const brief = templateBomToSchematicBrief(template, rows);

    expect(brief.usbRequired).toBe(true);
    expect(brief.audioRequired).toBe(true);
  });

  it("detects cameras from camera-like SKUs", () => {
    const template = makeTemplate();
    const rows = [
      makeRow({ sku: "CAM-420-PTZ", description: "PTZ camera", role: "Camera" }),
      makeRow({ sku: "NHD-120-TX", description: "Encoder", role: "Source encoder" }),
    ];

    const brief = templateBomToSchematicBrief(template, rows);

    expect(brief.cameras!.length).toBe(1);
    expect(brief.cameras![0].sku).toBe("CAM-420-PTZ");
    expect(brief.usbRequired).toBe(true);
  });

  it("detects speakerphones from speakerphone-like SKUs", () => {
    const template = makeTemplate();
    const rows = [
      makeRow({ sku: "APO-VX20-UC-V2", description: "Apollo video bar", role: "Room UC core" }),
    ];

    const brief = templateBomToSchematicBrief(template, rows);

    expect(brief.speakerphones!.length).toBe(1);
    expect(brief.usbRequired).toBe(true);
  });

  it("deduplicates products by normalised SKU", () => {
    const template = makeTemplate();
    const rows = [
      makeRow({ sku: "NHD-120-TX", description: "Encoder 1", role: "Source encoder", qty: 2 }),
      makeRow({ sku: "NHD-120-TX", description: "Encoder 2", role: "Source encoder", qty: 3 }),
    ];

    const brief = templateBomToSchematicBrief(template, rows);

    const txProducts = brief.products!.filter((p) => p.sku === "NHD-120-TX");
    expect(txProducts.length).toBe(1);
    expect(txProducts[0].quantity).toBe(5);
  });

  it("falls back to generic source when no source rows exist", () => {
    const template = makeTemplate({
      application: "Simple display room.",
      customerNarrative: "No specific sources mentioned.",
    });
    const rows = [makeRow({ sku: "NHD-120-RX", description: "Decoder", role: "Display decoder" })];

    const brief = templateBomToSchematicBrief(template, rows);

    expect(brief.sources!.length).toBe(1);
    expect(brief.sources![0].label).toBe("Room source");
  });

  it("infers display count from application text when no display rows exist", () => {
    const template = makeTemplate({
      application: "Dual display meeting room.",
      customerNarrative: "Two displays for content sharing.",
    });
    const rows = [makeRow({ sku: "NHD-120-TX", description: "Encoder", role: "Source encoder" })];

    const brief = templateBomToSchematicBrief(template, rows);

    expect(brief.displays!.length).toBe(1);
    expect(brief.displays![0].quantity).toBe(2);
  });

  it("infers control requirement from touch panel SKUs", () => {
    const template = makeTemplate();
    const rows = [
      makeRow({ sku: "SYN-TOUCH10-V2", description: "Touch panel", role: "Control" }),
      makeRow({ sku: "NHD-120-TX", description: "Encoder", role: "Source encoder" }),
    ];

    const brief = templateBomToSchematicBrief(template, rows);

    expect(brief.controlRequired).toBe(true);
  });
});
