import { describe, expect, it } from "vitest";
import { buildCompareFeatureMatrixRows } from "../wingman2/lib/compareFeatureMatrix";
import type { CompareDecisionProfile } from "../wingman2/lib/competitorCompareDecision";

function rowStatus(rows: ReturnType<typeof buildCompareFeatureMatrixRows>, id: string) {
  const row = rows.find((item) => item.id === id);
  expect(row).toBeDefined();
  return row?.status;
}

function rowKind(rows: ReturnType<typeof buildCompareFeatureMatrixRows>, id: string) {
  const row = rows.find((item) => item.id === id);
  expect(row).toBeDefined();
  return row?.kind;
}

describe("buildCompareFeatureMatrixRows", () => {
  it("shows green matches for aligned core product facts", () => {
    const competitor: CompareDecisionProfile = {
      sku: "DM-NVX-350",
      domain: "AVOIP",
      role: "Transceiver",
      transport: "AVoIP",
      inputCount: 1,
      outputCount: 1,
      maxResolution: "4K60",
      chroma: "4:4:4",
      features: { usbRouting: true, tenGig: false },
    };
    const wyrestorm: CompareDecisionProfile = {
      sku: "NHD-600-TRX",
      domain: "AVOIP",
      role: "transceiver",
      transport: "AVoIP / SDVoE / 10G Ethernet",
      inputCount: 1,
      outputCount: 1,
      maxResolution: "4K60",
      chroma: "4:4:4",
      features: { usbRouting: true, tenGig: true },
    };

    const rows = buildCompareFeatureMatrixRows(competitor, wyrestorm);

    expect(rowStatus(rows, "productClass")).toBe("match");
    expect(rowStatus(rows, "role")).toBe("match");
    expect(rowStatus(rows, "hdmiInputs")).toBe("match");
    expect(rowKind(rows, "hdmiInputs")).toBe("quantity");
    expect(rowStatus(rows, "feature-usbRouting")).toBe("match");
    expect(rowStatus(rows, "feature-tenGig")).toBe("extra");
  });

  it("shows red misses for explicit feature and quantity mismatches", () => {
    const competitor: CompareDecisionProfile = {
      sku: "AT-OME-MS42",
      domain: "PRESENTATION",
      role: "presentation switcher",
      transport: "HDMI",
      inputCount: 4,
      outputCount: 2,
      features: { usbC: true, usbRouting: true },
    };
    const wyrestorm: CompareDecisionProfile = {
      sku: "SW-0401-HDBT",
      domain: "PRESENTATION",
      role: "presentation switcher",
      transport: "HDMI",
      inputCount: 4,
      outputCount: 1,
      features: { usbRouting: false },
    };

    const rows = buildCompareFeatureMatrixRows(competitor, wyrestorm);

    expect(rowStatus(rows, "feature-usbC")).toBe("partial");
    expect(rowStatus(rows, "feature-usbRouting")).toBe("miss");
    expect(rowStatus(rows, "hdmiOutputs")).toBe("miss");
  });

  it("marks unknown values as partial instead of pretending there is a match", () => {
    const competitor: CompareDecisionProfile = {
      sku: "DMNVX",
      domain: "AVOIP",
      role: "Transceiver",
      transport: "AVoIP",
    };
    const wyrestorm: CompareDecisionProfile = {
      sku: "NHD-500-TX",
      domain: "AVOIP",
      role: "encoder",
      transport: "AVoIP / 1G Ethernet",
      inputCount: 1,
      maxResolution: "4K60",
    };

    const rows = buildCompareFeatureMatrixRows(competitor, wyrestorm);

    expect(rowStatus(rows, "productClass")).toBe("match");
    expect(rowStatus(rows, "hdmiOutputs")).toBe("partial");
    expect(rowStatus(rows, "chroma")).toBe("partial");
  });
});
