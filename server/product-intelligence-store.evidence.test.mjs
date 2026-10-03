import { describe, expect, it } from "vitest";

import {
  mapCatalogRecord,
  sanitizeRecord,
} from "./product-intelligence-store.mjs";

const EVIDENCE = {
  routedInputs: 4,
  routedOutputs: 2,
  routedInputCount: 4,
  routedOutputCount: 2,
  matrixInputs: 4,
  matrixOutputs: 2,
  matrixSize: "4x2",
  matrixSizeEvidence: "SKU/title evidence: MX-0402-MST / 4x2 HDMI",
  ioEvidenceStatus: "derived",
  quoteSafety: "verify-before-quote",
  physicalOutputs: 5,
  physicalOutputCount: 5,
  mirroredOutputCount: 1,
  physicalVideoOutputCount: 2,
};

describe("product intelligence routed-I/O evidence", () => {
  it("mapCatalogRecord carries the evidence from catalog rows into seeded records", () => {
    const record = mapCatalogRecord(
      { sku: "MX-0402-MST", name: "Test Matrix", ...EVIDENCE },
      "wyrestorm",
      "2026-08-16T00:00:00.000Z",
    );

    expect(record.routedInputs).toBe(4);
    expect(record.routedOutputs).toBe(2);
    expect(record.matrixInputs).toBe(4);
    expect(record.matrixOutputs).toBe(2);
    expect(record.matrixSize).toBe("4x2");
    expect(record.matrixSizeEvidence).toContain("MX-0402-MST");
    expect(record.ioEvidenceStatus).toBe("derived");
    expect(record.quoteSafety).toBe("verify-before-quote");
    expect(record.physicalOutputs).toBe(5);
    expect(record.mirroredOutputCount).toBe(1);
    expect(record.physicalVideoOutputCount).toBe(2);
  });

  it("keeps the mirrored-output count as a number while mirroredOutputs stays the port-array shape", () => {
    const record = mapCatalogRecord(
      { sku: "MX-0808-KIT-V2", name: "Test Matrix", mirroredOutputs: 4, mirroredOutputCount: 4, matrixSize: "8x8" },
      "wyrestorm",
      "2026-08-16T00:00:00.000Z",
    );
    const sanitized = sanitizeRecord(record);

    expect(sanitized.mirroredOutputCount).toBe(4);
    expect(Array.isArray(sanitized.mirroredOutputs)).toBe(true);
  });

  it("sanitizeRecord keeps every evidence field on a seed round-trip", () => {
    const seed = mapCatalogRecord(
      { sku: "AT-OME-MS52W", brand: "Atlona", ...EVIDENCE },
      "competitor",
      "2026-08-16T00:00:00.000Z",
    );
    const sanitized = sanitizeRecord(seed);

    for (const key of Object.keys(EVIDENCE)) {
      expect(sanitized[key], key).toBe(EVIDENCE[key]);
    }
  });

  it("sanitizeRecord leaves evidence fields undefined when the record has none", () => {
    const record = sanitizeRecord({ sku: "SOME-UNIT", vendorType: "wyrestorm" });

    expect(record.routedInputs).toBeUndefined();
    expect(record.matrixSize).toBeUndefined();
    expect(record.ioEvidenceStatus).toBeUndefined();
    expect(record.quoteSafety).toBeUndefined();
  });
});
