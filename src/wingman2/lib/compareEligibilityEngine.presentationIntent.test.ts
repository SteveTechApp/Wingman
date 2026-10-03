import { describe, expect, it } from "vitest";
import { classifyCompareIntent } from "./compareEligibilityEngine";

// Regression: a compact USB-C / BYOD presentation switcher marketed as a
// "matrix switcher" must not be classified as a routing matrix (which injects an
// 8x8 MX candidate) - it should map to a presentation switcher / UC intent so an
// SW-/Apollo candidate leads. Genuine routing matrices must be unaffected.
describe("classifyCompareIntent - presentation switcher vs routing matrix", () => {
  const presentationCases = [
    "Atlona AT-OME-SW32 4x2 presentation matrix switcher 4K HDMI USB-C",
    "Kramer VP-440X presentation switcher scaler HDMI USB-C",
    "Atlona AT-HDVS-210U USB-C HDMI auto-switcher wall plate BYOD",
  ];

  for (const text of presentationCases) {
    it(`classifies "${text.slice(0, 32)}..." as a presentation/UC intent, not matrix`, () => {
      const intent = classifyCompareIntent(null, text);
      expect(["presentation-switcher", "uc-byod"]).toContain(intent);
      expect(intent).not.toBe("matrix");
    });
  }

  const matrixCases = [
    "Kramer VS-88H2 8x8 HDMI matrix switcher 4K",
    "Extron DTP CrossPoint 84 8x4 seamless matrix switcher",
    "Blustream 16x16 HDBaseT matrix",
  ];

  for (const text of matrixCases) {
    it(`still classifies "${text.slice(0, 32)}..." as a matrix`, () => {
      const intent = classifyCompareIntent(null, text);
      expect(["matrix", "hdbaset-matrix"]).toContain(intent);
    });
  }
});
