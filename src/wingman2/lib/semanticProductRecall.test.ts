import { describe, expect, it } from "vitest";
import { buildAvProductSemanticProfile } from "./avProductSemanticProfiler";
import { recallSemanticCandidates, scoreSemanticCompatibility } from "./semanticProductRecall";

const products = [
  {sku:"SP-0104-H2",name:"1x4 4K HDMI splitter",family:"HDMI Distribution"},
  {sku:"SP-0108-SCL",name:"1x8 4K HDMI splitter with scaling",family:"HDMI Distribution"},
  {sku:"MX-0404-SCL",name:"4x4 seamless matrix switcher",family:"Matrix"},
  {sku:"NHD-500-TX",name:"1GbE AV-over-IP encoder transmitter",family:"NetworkHD"},
  {sku:"NHD-500-RX",name:"1GbE AV-over-IP decoder receiver",family:"NetworkHD"},
  {sku:"CAM-210-PTZ",name:"PTZ conference camera",family:"Camera"},
  {sku:"CAM-0402-BRG",name:"Multi-camera USB camera bridge",family:"Camera"},
  {sku:"NHD-0401-MV",name:"4 input HDMI multiview processor",family:"Multiview"},
];

describe("semantic all-products recall", () => {
  it("recalls the correctly sized 1x4 splitter before oversized and matrix products", () => {
    const r=recallSemanticCandidates({
      competitor:{manufacturer:"Atlona",sku:"AT-HDDA-4",name:"AT-HDDA-4 1x4 HDMI Distribution Amplifier",domain:"DISTRIBUTION",role:"distribution amplifier",inputCount:1,outputCount:4},
      products,limit:8
    });
    expect(r[0]?.sku).toBe("SP-0104-H2");
    expect(r.some(x=>x.sku==="MX-0404-SCL")).toBe(false);
  });

  it("hard-blocks encoder versus decoder", () => {
    const a=buildAvProductSemanticProfile("AV-over-IP encoder transmitter");
    const b=buildAvProductSemanticProfile("AV-over-IP decoder receiver");
    expect(scoreSemanticCompatibility(a,b).blockers.length).toBeGreaterThan(0);
  });

  it("hard-blocks camera versus bridge", () => {
    const a=buildAvProductSemanticProfile("PTZ conference camera");
    const b=buildAvProductSemanticProfile("multi-camera USB camera bridge");
    expect(scoreSemanticCompatibility(a,b).blockers.length).toBeGreaterThan(0);
  });

  it("hard-blocks multiview versus mirrored distribution", () => {
    const a=buildAvProductSemanticProfile("4 input multiview processor");
    const b=buildAvProductSemanticProfile("1x4 HDMI splitter");
    expect(scoreSemanticCompatibility(a,b).blockers.length).toBeGreaterThan(0);
  });
});
