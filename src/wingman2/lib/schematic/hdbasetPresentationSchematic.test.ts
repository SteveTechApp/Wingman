import { describe, expect, it } from "vitest";
import { buildHdbasetPresentationSchematic } from "./hdbasetPresentationSchematic";
import { technicalConnectionRoute, technicalDevicePosition } from "./technicalDrawingLayout";
import type { SchematicProjectBrief } from "./schematicTypes";
import { roomTemplates } from "../roomTemplates";
import { templateBomToSchematicBrief } from "./templateBomToSchematicBrief";
const brief: SchematicProjectBrief = { title: "School hall", products: [{sku:"SW-130-TX-UK"},{sku:"RX-700"}], sources: [{label:"School PC HDMI output"},{label:"Guest laptop USB-C input"}], displays:[{label:"Projector and screen"}], usbRequired:true, audioRequired:true, controlRequired:true, equipmentScope:[{id:"pa",label:"Powered loudspeaker",quantity:2}] };
describe("HDBaseT presentation connection profile", () => {
  it("draws four separate pod paths without projector labels or shared ports", () => {
    const template = roomTemplates.find(item => item.id === "corporate-agile-collaboration-zone-networkhd500")!;
    const model = buildHdbasetPresentationSchematic(templateBomToSchematicBrief(template, template.bom))!;
    expect(model.nodes.filter(node => node.sku === "SW-130-TX-UK")).toHaveLength(4);
    expect(model.nodes.filter(node => node.sku === "RX-700")).toHaveLength(4);
    expect(model.connections).toHaveLength(12);
    for (let pod = 1; pod <= 4; pod++) {
      const prefix = `pod-${pod}-`;
      expect(model.connections.filter(connection => connection.from.startsWith(prefix))).toHaveLength(3);
      expect(model.connections.filter(connection => connection.from.startsWith(prefix)).every(connection => connection.to.startsWith(prefix))).toBe(true);
    }
    expect(JSON.stringify(model.nodes.filter(node => !node.metadata?.unresolvedScope))).not.toMatch(/projector/i);
    expect(model.assumptions.join(" ")).not.toMatch(/projector|projection screen/i);
    expect(model.warnings.some(warning => warning.severity === "blocker")).toBe(false);
    expect(new Set(model.nodes.map(node => node.id)).size).toBe(model.nodes.length);
  });
  it("routes actual source ports through transmitter and receiver to the projector", () => {
    const model=buildHdbasetPresentationSchematic(brief)!;
    expect(model.connections.map(c=>[c.fromPort,c.toPort])).toEqual([["HDMI OUT","HDMI IN 1"],["USB-C OUT","USB-C IN"],["HDBT OUT","HDBT IN"],["HDMI OUT","HDMI IN (confirm)"]]);
    expect(model.nodes.find(n=>n.id==="presentation-rx")?.sku).toBe("RX-700");
    expect(model.nodes.some(n=>/Room PC|USB bridge/.test(n.label))).toBe(false);
    expect(model.connections.every(c=>c.signal==="video")).toBe(true);
    expect(model.nodes.find(n=>n.id==="scope-pa")?.metadata?.quantity).toBe(2);
    expect(model.connections.some(c=>c.to==="scope-pa")).toBe(false);
  });
  it("never bypasses a missing HDBaseT receiver", () => {
    const model=buildHdbasetPresentationSchematic({...brief,products:[{sku:"SW-130-TX-UK"}]})!;
    expect(model.connections.some(c=>c.to==="presentation-display-1")).toBe(false);
    expect(model.warnings.some(w=>w.title==="Receiver not specified")).toBe(true);
  });
  it("does not share one physical input or receiver output across extra endpoints", () => {
    const model=buildHdbasetPresentationSchematic({...brief,sources:[{label:"HDMI source",quantity:3}],displays:[{label:"Projector",quantity:2}]})!;
    expect(model.connections.filter(c=>c.to==="presentation-tx")).toHaveLength(2);
    expect(model.connections.filter(c=>c.from==="presentation-rx")).toHaveLength(1);
    expect(model.warnings.filter(w=>w.severity==="blocker")).toHaveLength(2);
  });
  it("honours removed equipment quantities and flags multiple device pairing", () => {
    const removed=buildHdbasetPresentationSchematic({...brief,products:[{sku:"SW-130-TX-UK"},{sku:"RX-700",quantity:0}]})!;
    expect(removed.nodes.some(n=>n.sku==="RX-700")).toBe(false);
    const multiple=buildHdbasetPresentationSchematic({...brief,products:[{sku:"SW-130-TX-UK",quantity:2},{sku:"RX-700",quantity:2}]})!;
    expect(multiple.warnings.some(w=>w.title==="Pairing required" && w.severity==="blocker")).toBe(true);
  });
  it("routes cables orthogonally and ends exactly at the named equipment port", () => {
    const model=buildHdbasetPresentationSchematic(brief)!;
    model.connections.forEach((c,index)=>{
      const points=technicalConnectionRoute(model,c,index);
      points.slice(1).forEach((point,i)=>expect(point.x===points[i].x || point.y===points[i].y).toBe(true));
      const destination=technicalDevicePosition(model,model.nodes.find(n=>n.id===c.to)!);
      expect(points.at(-1)?.x).toBe(destination.x);
    });
  });
});
