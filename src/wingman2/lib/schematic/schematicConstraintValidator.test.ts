import { describe, expect, it } from "vitest";
import { validateSchematicConstraints, violationsToWarnings } from "./schematicConstraintValidator";
import type { SchematicModel } from "./schematicTypes";

function makeModel(overrides: Partial<SchematicModel> = {}): SchematicModel {
  return {
    id: "test",
    title: "Test schematic",
    assumptions: [],
    nodes: [],
    connections: [],
    warnings: [],
    bomHints: [],
    ...overrides,
  };
}

describe("schematic constraint validator", () => {
  describe("cable length validation", () => {
    it("flags HDMI connection exceeding 15m", () => {
      const model = makeModel({
        nodes: [
          { id: "src", label: "Source", kind: "source", column: 0, lane: 0, x: 0, y: 0, required: true },
          { id: "dsp", label: "Display", kind: "display", column: 3, lane: 0, x: 300, y: 0, required: true },
        ],
        connections: [
          { id: "c1", from: "src", to: "dsp", signal: "video", transport: "hdmi", label: "HDMI", required: true, points: [] },
        ],
      });

      const violations = validateSchematicConstraints({ model, products: [], maxSignalDistanceM: 20 });
      const cable = violations.filter((v) => v.title.includes("exceeds maximum"));
      expect(cable.length).toBe(1);
      expect(cable[0].severity).toBe("blocker");
    });

    it("passes HDMI connection within 15m", () => {
      const model = makeModel({
        nodes: [
          { id: "src", label: "Source", kind: "source", column: 0, lane: 0, x: 0, y: 0, required: true },
          { id: "dsp", label: "Display", kind: "display", column: 3, lane: 0, x: 300, y: 0, required: true },
        ],
        connections: [
          { id: "c1", from: "src", to: "dsp", signal: "video", transport: "hdmi", label: "HDMI", required: true, points: [] },
        ],
      });

      const violations = validateSchematicConstraints({ model, products: [], maxSignalDistanceM: 10 });
      const cable = violations.filter((v) => v.title.includes("exceeds maximum"));
      expect(cable.length).toBe(0);
    });

    it("warns when cable length is not confirmed for required connections", () => {
      const model = makeModel({
        nodes: [
          { id: "src", label: "Source", kind: "source", column: 0, lane: 0, x: 0, y: 0, required: true },
          { id: "dsp", label: "Display", kind: "display", column: 3, lane: 0, x: 300, y: 0, required: true },
        ],
        connections: [
          { id: "c1", from: "src", to: "dsp", signal: "video", transport: "hdmi", label: "HDMI", required: true, points: [] },
        ],
      });

      const violations = validateSchematicConstraints({ model, products: [] });
      const cable = violations.filter((v) => v.title.includes("not confirmed"));
      expect(cable.length).toBe(1);
      expect(cable[0].severity).toBe("warning");
    });

    it("flags HDBaseT exceeding 100m", () => {
      const model = makeModel({
        nodes: [
          { id: "tx", label: "TX", kind: "switcher", column: 1, lane: 0, x: 100, y: 0, required: true },
          { id: "rx", label: "Display", kind: "display", column: 3, lane: 0, x: 300, y: 0, required: true },
        ],
        connections: [
          { id: "c1", from: "tx", to: "rx", signal: "video", transport: "hdbaset", label: "HDBaseT", required: true, points: [] },
        ],
      });

      const violations = validateSchematicConstraints({ model, products: [], maxSignalDistanceM: 120 });
      const cable = violations.filter((v) => v.title.includes("exceeds maximum"));
      expect(cable.length).toBe(1);
    });
  });

  describe("port compatibility validation", () => {
    it("flags video signal routed to audio device", () => {
      const model = makeModel({
        nodes: [
          { id: "src", label: "Source", kind: "source", column: 0, lane: 0, x: 0, y: 0, required: true },
          { id: "amp", label: "Amplifier", kind: "audio-device", column: 2, lane: 0, x: 200, y: 0, required: true },
        ],
        connections: [
          { id: "c1", from: "src", to: "amp", signal: "video", transport: "hdmi", label: "HDMI", required: true, points: [] },
        ],
      });

      const violations = validateSchematicConstraints({ model, products: [] });
      const port = violations.filter((v) => v.title.includes("non-video device"));
      expect(port.length).toBe(1);
      expect(port[0].severity).toBe("blocker");
    });

    it("allows video signal to display", () => {
      const model = makeModel({
        nodes: [
          { id: "src", label: "Source", kind: "source", column: 0, lane: 0, x: 0, y: 0, required: true },
          { id: "dsp", label: "Display", kind: "display", column: 3, lane: 0, x: 300, y: 0, required: true },
        ],
        connections: [
          { id: "c1", from: "src", to: "dsp", signal: "video", transport: "hdmi", label: "HDMI", required: true, points: [] },
        ],
      });

      const violations = validateSchematicConstraints({ model, products: [] });
      const port = violations.filter((v) => v.title.includes("non-video device"));
      expect(port.length).toBe(0);
    });

    it("warns about USB direction from source to display", () => {
      const model = makeModel({
        nodes: [
          { id: "src", label: "Camera", kind: "camera", column: 0, lane: 0, x: 0, y: 0, required: true },
          { id: "dsp", label: "Touch panel", kind: "touch-panel", column: 3, lane: 0, x: 300, y: 0, required: true },
        ],
        connections: [
          { id: "c1", from: "src", to: "dsp", signal: "usb", transport: "usb", label: "USB", required: true, points: [] },
        ],
      });

      const violations = validateSchematicConstraints({ model, products: [] });
      const usb = violations.filter((v) => v.title.includes("USB direction"));
      expect(usb.length).toBe(1);
      expect(usb[0].severity).toBe("warning");
    });
  });

  describe("power budget validation", () => {
    it("warns when required node has no power connection", () => {
      const model = makeModel({
        nodes: [
          { id: "enc", label: "NHD-120-TX", kind: "av-over-ip-encoder", sku: "NHD-120-TX", column: 1, lane: 0, x: 100, y: 0, required: true },
        ],
        connections: [],
      });

      const violations = validateSchematicConstraints({
        model,
        products: [{ sku: "NHD-120-TX", quantity: 1 }],
      });
      const power = violations.filter((v) => v.title.includes("Power source unconfirmed"));
      expect(power.length).toBe(1);
      expect(power[0].severity).toBe("warning");
    });

    it("does not warn when node has a power connection", () => {
      const model = makeModel({
        nodes: [
          { id: "sw", label: "Switch", kind: "network-switch", column: 2, lane: 0, x: 200, y: 0, required: true },
          { id: "enc", label: "NHD-120-TX", kind: "av-over-ip-encoder", sku: "NHD-120-TX", column: 1, lane: 0, x: 100, y: 0, required: true },
        ],
        connections: [
          { id: "c1", from: "enc", to: "sw", signal: "network", transport: "network", label: "PoE to switch", required: true, points: [] },
        ],
      });

      const violations = validateSchematicConstraints({
        model,
        products: [{ sku: "NHD-120-TX", quantity: 1 }],
      });
      const power = violations.filter((v) => v.title.includes("Power source unconfirmed"));
      expect(power.length).toBe(0);
    });
  });

  describe("violationsToWarnings", () => {
    it("converts violations to SchematicWarning format", () => {
      const warnings = violationsToWarnings([
        { severity: "blocker", title: "Test blocker", message: "Blocker message" },
        { severity: "warning", title: "Test warning", message: "Warning message" },
      ]);

      expect(warnings.length).toBe(2);
      expect(warnings[0]).toEqual({ severity: "blocker", title: "Test blocker", message: "Blocker message" });
      expect(warnings[1]).toEqual({ severity: "warning", title: "Test warning", message: "Warning message" });
    });
  });
});
