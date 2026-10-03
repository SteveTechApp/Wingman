import { describe, expect, it } from "vitest";
import { buildAvProductSemanticProfile } from "./avProductSemanticProfiler";

describe("AV product semantic profiler", () => {
  const cases = [
    ["1x4 HDMI Distribution Amplifier","distribution-amplifier","one-to-many-mirrored"],
    ["8x8 HDMI Matrix Switcher","matrix-switcher","many-to-many-routed"],
    ["4 input HDMI multiview quad viewer","multiview-processor","many-to-one-composited"],
    ["4K Video Wall Processor","video-wall-processor","canvas-to-many"],
    ["HDBaseT transmitter 70m","hdbaset-transmitter","point-to-point"],
    ["HDBaseT receiver 70m","hdbaset-receiver","point-to-point"],
    ["AV-over-IP encoder transmitter 1GbE","avoip-encoder","network-routed"],
    ["AV-over-IP decoder receiver 1GbE","avoip-decoder","network-routed"],
    ["AV-over-IP transceiver 10GbE","avoip-transceiver","bidirectional-endpoint"],
    ["Wireless presentation hub receiver","wireless-presentation-hub","room-core"],
    ["Wireless presentation casting dongle","casting-accessory","support-only"],
    ["PTZ conference camera with 12x optical zoom","ptz-camera","endpoint-source"],
    ["NDI PTZ camera","ndi-camera","endpoint-source"],
    ["Multi-camera USB camera bridge UVC","camera-bridge","bridge"],
    ["Audio DSP with AEC and Dante","audio-dsp","many-to-many-routed"],
    ["USB 3.0 extender over CAT","usb-extender","point-to-point"],
    ["Power amplifier 4 x 250W","power-amplifier","many-to-many-routed"],
    ["Managed AV network switch with PoE","network-switch","support-only"],
  ] as const;

  for (const [text, archetype, topology] of cases) {
    it(`${archetype}: ${text}`, () => {
      const p = buildAvProductSemanticProfile(text);
      expect(p.archetypeId).toBe(archetype);
      expect(p.topologyModel).toBe(topology);
    });
  }

  it("separates mirrored fan-out from routed matrix size", () => {
    const splitter=buildAvProductSemanticProfile({sku:"SP-0104-H2",name:"1x4 HDMI splitter"});
    const matrix=buildAvProductSemanticProfile({sku:"MX-0404-SCL",name:"4x4 seamless matrix"});
    expect(splitter.logicalInputCount).toBe(1);
    expect(splitter.logicalOutputCount).toBe(4);
    expect(splitter.mirroredOutputCount).toBe(4);
    expect(splitter.primaryOutputBehaviour).toBe("mirrored");
    expect(matrix.routedOutputCount).toBe(4);
    expect(matrix.primaryOutputBehaviour).toBe("routed");
  });

  it("separates connector type from logical function", () => {
    const p=buildAvProductSemanticProfile({
      name:"presentation switcher",
      technicalProfile:{io:{video:[
        {connector:"HDMI",direction:"input",count:2,category:"video"},
        {connector:"USB-C",direction:"input",count:1,category:"video"},
        {connector:"HDMI",direction:"output",count:1,category:"video"},
      ]}}
    });
    expect(p.inputConnectors).toEqual(expect.arrayContaining(["HDMI","USB-C"]));
    expect(p.outputConnectors).toContain("HDMI");
    expect(p.physicalInputConnectorCount).toBe(3);
  });
});
