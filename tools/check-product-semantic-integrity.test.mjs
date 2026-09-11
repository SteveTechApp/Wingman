import { describe, expect, it } from "vitest";
import {
  isAnalogueAudioConnector,
  isAnalogueAudioEvidence,
  isExplicitAudioOutputEvidence,
  isEthernetConnector,
} from "./lib/product-port-semantics.mjs";

describe("product port semantics", () => {
  it.each([
    "1 x Line In (balanced)",
    "1 x Line Out (balanced, max +4 dBu)",
    "1x 5-pin Phoenix Female | unbalanced | Left and Right channels output",
    "1x 3-pin Phoenix Female | Balanced Input",
    "1x 3.5 mm TRS jack connector, Analog audio output",
    "Euroblock balanced terminal output",
  ])("recognises analogue audio evidence: %s", (text) => {
    expect(isAnalogueAudioEvidence(text)).toBe(true);
  });

  it.each(["RJ45 / Ethernet", "RJ-45", "10GbE 8-pin RJ45"])(
    "recognises Ethernet connectors: %s",
    (text) => {
      expect(isEthernetConnector(text)).toBe(true);
    },
  );

  it("does not classify a microphone transport RJ45 as analogue solely from its purpose", () => {
    expect(
      isAnalogueAudioEvidence("RJ45 | connect and power the ceiling microphone"),
    ).toBe(false);
  });

  it.each(["Phoenix / Euroblock", "3.5 mm TRS", "XLR"])(
    "recognises analogue audio connectors: %s",
    (text) => {
      expect(isAnalogueAudioConnector(text)).toBe(true);
    },
  );

  it.each([
    "1 x Line Out (balanced, max +4 dBu)",
    "Analog audio output (de-embed from HDMI input)",
  ])("recognises explicit audio output evidence: %s", (text) => {
    expect(isExplicitAudioOutputEvidence(text)).toBe(true);
  });
});
