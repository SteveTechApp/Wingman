import { describe, expect, it } from "vitest";
import { auditTemplates } from "./check-template-realism.mjs";

const catalogue = { products: [{ sku: "RX-1", lifecycleStatus: "active", doNotSpec: false }] };
const fixture = (overrides = {}) => ({
  id: "fixture", vertical: "Corporate",
  bom: [{ id: "core", sku: "RX-1", role: "Display receiver", description: "Receiver", qty: 1, type: "Required" }],
  applicationProfile: { canonicalMarket: "Corporate", architectureFamily: "HDBaseT", imageKey: "room.jpg", sizingBasis: ["One display."], capabilities: ["video"], reviewStatus: "reviewed" },
  ...overrides,
});

describe("template realism audit", () => {
  it("checks supplied microphone scope without mistaking interface guidance for a microphone purchase", () => {
    const base = fixture();
    const audio = { ...base.applicationProfile, capabilities: ["video", "audio"] };
    const processor = { sku: "BY-OTHERS-DSP", role: "Audio DSP", description: "Zone processor", notes: "Analogue microphones need separate interfaces if added." };
    expect(auditTemplates([fixture({ applicationProfile: audio, bom: [...base.bom, processor] })], catalogue)).toEqual([]);
    expect(auditTemplates([fixture({ applicationProfile: audio, bom: [...base.bom, { ...processor, description: "Lectern microphone" }] })], catalogue)).toContainEqual(expect.objectContaining({ code: "capability-scope-mismatch" }));
  });
  it("rejects an unknown required SKU", () => {
    const template = fixture({ bom: [{ id: "bad", sku: "NOT-A-SKU", role: "Core", description: "Core", qty: 1, type: "Required" }] });
    expect(auditTemplates([template], catalogue)).toContainEqual(expect.objectContaining({ code: "unknown-sku", severity: "error" }));
  });

  it("rejects an output quantity with no sizing statement", () => {
    const base = fixture();
    const template = fixture({ applicationProfile: { ...base.applicationProfile, sizingBasis: [] } });
    expect(auditTemplates([template], catalogue)).toContainEqual(expect.objectContaining({ code: "missing-sizing-basis", severity: "error" }));
  });

  it("rejects lifecycle-blocked products and implausible AV-over-IP output designs", () => {
    const base = fixture();
    const template = fixture({
      bom: [{ id: "core", sku: "RX-1", role: "Network core", description: "Network core", qty: 1, type: "Required" }],
      applicationProfile: { ...base.applicationProfile, architectureFamily: "AV over IP" },
    });
    const findings = auditTemplates([template], { products: [{ sku: "RX-1", lifecycleStatus: "discontinued" }] });
    expect(findings.map((finding) => finding.code)).toEqual(expect.arrayContaining(["suppressed-sku", "implausible-endpoint-ratio"]));
  });
});
