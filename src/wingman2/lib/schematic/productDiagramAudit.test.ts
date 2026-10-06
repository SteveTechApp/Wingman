import { describe, expect, it } from "vitest";
import { roomTemplates } from "../roomTemplates";
import { templateBomToSchematicBrief } from "./templateBomToSchematicBrief";
import { buildWingmanSchematic } from "./wingmanSchematicEngine";
import { technicalConnectionRoute } from "./technicalDrawingLayout";
import { productNodeKind } from "./schematicProductRules";
describe("product diagram audit",()=>{
  it("allocates USB-C and HDMI inputs by connector rather than source order",()=>{
    const model=buildWingmanSchematic({title:"Two sources",products:[{sku:"NHD-510-TX"},{sku:"NHD-500-RX"}],sources:[{label:"USB-C laptop"},{label:"HDMI player"}],displays:[{label:"Display"}]});
    expect(model.connections.filter(c=>c.signal==="video" && c.from.startsWith("source")).map(c=>[c.fromPort,c.toPort,c.transport])).toEqual([["USB-C OUT","USB-C IN","unknown"],["HDMI OUT","HDMI IN","hdmi"]]);
    const excess=buildWingmanSchematic({title:"HDMI sources",products:[{sku:"NHD-510-TX"}],sources:[{label:"HDMI player",quantity:2}]});
    expect(excess.connections.filter(c=>c.from.startsWith("source"))).toHaveLength(1);
    expect(excess.warnings.some(w=>w.title==="Missing AV-over-IP encoder")).toBe(true);
  });
  it("does not classify USB-over-IP as a video endpoint or invent video transport from distance",()=>{
    expect(productNodeKind({sku:"NHD-USB-TRX"})).toBe("usb-bridge");
    const model=buildWingmanSchematic({title:"Long room",products:[{sku:"SW-620L-TX-W"},{sku:"CAM-420-PTZ",quantity:0}],sources:[{label:"Laptop"}],displays:[{label:"Display"}],maxSignalDistanceM:90,audioRequired:true,usbRequired:true,controlRequired:true});
    expect(model.nodes.some(n=>n.sku==="CAM-420-PTZ")).toBe(false);
    expect(model.connections.every(c=>c.signal==="video" && c.transport==="unknown")).toBe(true);
  });
  it("routes NetworkHD decoders into the multiview processor before its single display output",()=>{
    const model=buildWingmanSchematic({title:"Multiview",products:[{sku:"NHD-500-TX",quantity:4},{sku:"NHD-500-RX",quantity:4},{sku:"NHD-0401-MV"}],sources:[{label:"HDMI player",quantity:4}],displays:[{label:"Display"}]});
    const processor=model.nodes.find(n=>n.sku==="NHD-0401-MV")!;
    expect(processor.kind).toBe("video-wall-processor");
    expect(model.connections.filter(c=>c.to===processor.id && c.signal==="video")).toHaveLength(4);
    expect(model.connections.find(c=>c.to.startsWith("display") && c.signal==="video")?.from).toBe(processor.id);
  });
  it("preserves separately configured transmit and receive transceiver quantities",()=>{
    const template=roomTemplates.find(t=>t.id==="government-control-room-networkhd600")!;
    const brief=templateBomToSchematicBrief(template,template.bom);
    expect(new Set(brief.products?.filter(p=>p.sku==="NHD-600-TRX").map(p=>p.operatingMode))).toEqual(new Set(["transmit","receive"]));
    const model=buildWingmanSchematic(brief);
    for(const c of model.connections.filter(c=>c.signal==="video")){
      expect(model.nodes.find(n=>n.id===c.to)?.metadata?.operatingMode).not.toBe("receive");
      expect(model.nodes.find(n=>n.id===c.from)?.metadata?.operatingMode).not.toBe("transmit");
    }
    expect(model.nodes.some(n=>n.id==="transport-core")).toBe(false);
  });
  it("includes kit receivers, respects mixed HDMI/HDBaseT outputs and expands full extender sets",()=>{
    const eight=buildWingmanSchematic({title:"Eight zones",products:[{sku:"MX-0808-KIT-V2"}],sources:[{label:"HDMI player"}],displays:[{label:"Display",quantity:8}]});
    expect(eight.nodes.filter(n=>n.id.startsWith("kit-rx"))).toHaveLength(8);
    const runs=eight.connections.filter(c=>c.transport==="hdbaset");
    expect(new Set(runs.map((c,i)=>technicalConnectionRoute(eight,c,i)[1].x)).size).toBe(8);
    expect(eight.connections.filter(c=>c.transport==="hdbaset").every(c=>c.maxLengthM===35)).toBe(true);
    const four=buildWingmanSchematic({title:"Four zones",products:[{sku:"MX-0404-KIT"}],displays:[{label:"Display",quantity:4}]});
    expect(four.nodes.filter(n=>n.id.startsWith("kit-rx"))).toHaveLength(3);
    expect(four.connections.some(c=>c.fromPort==="HDMI OUT 4")).toBe(true);
    const extended=buildWingmanSchematic({title:"Extended zones",products:[{sku:"MX-0404-HDMI"},{sku:"EX-70-H2",quantity:2}],displays:[{label:"Display",quantity:2}]});
    expect(extended.nodes.filter(n=>n.id.startsWith("extender-tx"))).toHaveLength(2);
    expect(extended.nodes.filter(n=>n.id.startsWith("extender-rx"))).toHaveLength(2);
    expect(extended.nodes.some(n=>n.sku==="EX-70-H2")).toBe(false);
    const hybrid=buildWingmanSchematic({title:"Hybrid",products:[{sku:"MX-1007-HYB"},{sku:"EX-70-H2",quantity:4},{sku:"RX3-100",quantity:2}],displays:[{label:"Display",quantity:6}]});
    expect(hybrid.nodes.filter(n=>n.id.startsWith("extender-tx"))).toHaveLength(4);
    expect(hybrid.connections.filter(c=>c.label==="Native HDBaseT 3.0 to receiver")).toHaveLength(2);
    expect(hybrid.connections.filter(c=>c.fromPort?.startsWith("HDMI OUT") && c.from.includes("mx-1007")).length).toBe(4);
  });
  it("validates every built-in template graph and keeps unsupported ancillary routing open",()=>{
    for(const template of roomTemplates){
      const model=buildWingmanSchematic(templateBomToSchematicBrief(template,template.bom));
      const ids=new Set(model.nodes.map(n=>n.id));
      expect(ids.size,template.id).toBe(model.nodes.length);
      expect(new Set(model.connections.map(c=>c.id)).size,template.id).toBe(model.connections.length);
      model.connections.forEach(c=>{expect(ids.has(c.from)&&ids.has(c.to),template.id).toBe(true);expect(["usb","audio","control"].includes(c.signal),template.id).toBe(false);});
      expect(model.nodes.filter(n=>n.metadata?.unresolvedScope).every(n=>Number(n.metadata?.quantity)>0),template.id).toBe(true);
    }
    console.info(`Audited ${roomTemplates.length} built-in template graphs.`);
  });
});
