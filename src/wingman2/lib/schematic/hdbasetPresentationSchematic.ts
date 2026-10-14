import type { SchematicConnection, SchematicModel, SchematicNode, SchematicProjectBrief } from "./schematicTypes";
import { applySchematicLayout } from "./schematicLayoutEngine";

// Interface basis: https://www.wyrestorm.com/product/sw-130-tx-uk/
// https://www.wyrestorm.com/product/rx-700/
// Only the SW-130-TX-US/UK + RX-700 pair is covered by this connection profile.
export function buildHdbasetPresentationSchematic(brief: SchematicProjectBrief): SchematicModel | undefined {
  const transmitters = (brief.products ?? []).filter(p => (p.quantity ?? 1) > 0 && /^SW-130-TX-(UK|US)$/i.test(p.sku));
  if (!transmitters.length) return undefined;
  const receivers = (brief.products ?? []).filter(p => (p.quantity ?? 1) > 0 && p.sku.toUpperCase() === "RX-700");
  if (brief.independentPresentationLinks) {
    const expand = <T extends { quantity?: number }>(items: T[]) => items.flatMap(item => Array.from({ length: item.quantity ?? 1 }, () => ({ ...item, quantity: 1 })));
    const sources = expand(brief.sources ?? []), displays = expand(brief.displays ?? []);
    const txs = expand(transmitters), rxs = expand(receivers);
    if ([...transmitters, ...receivers, ...(brief.sources ?? []), ...(brief.displays ?? [])].every(item => Number.isInteger(item.quantity ?? 1)) && txs.length === rxs.length && txs.length === sources.length && txs.length === displays.length && txs.length > 0) {
      const models = txs.map((tx, index) => {
        const prefix = `pod-${index + 1}-`;
        const model = buildHdbasetPresentationSchematic({ ...brief, independentPresentationLinks: false, sources: [sources[index]], displays: [displays[index]], products: [tx, rxs[index], ...(index === 0 ? (brief.products ?? []).filter(p => !/^SW-130-TX-(UK|US)$|^RX-700$/i.test(p.sku)) : [])], equipmentScope: index === 0 ? brief.equipmentScope : [] })!;
        return { ...model, nodes: model.nodes.map(n => ({ ...n, id: prefix + n.id, label: n.metadata?.unresolvedScope ? n.label : `Pod ${index + 1} · ${n.label}`, lane: n.metadata?.unresolvedScope ? txs.length * 2 + n.lane : index * 2 + n.lane, metadata: { ...n.metadata, deviceRole: n.metadata?.deviceRole ? `Pod ${index + 1} · ${n.metadata.deviceRole}` : undefined, location: n.metadata?.unresolvedScope ? undefined : ["Pod source positions", "Pod transmitter positions", "Pod receiver positions", "Pod display positions"][n.column] } })), connections: model.connections.map(c => ({ ...c, id: prefix + c.id, cableId: prefix + c.cableId, from: prefix + c.from, to: prefix + c.to })) };
      });
      const warnings = models.flatMap(model => model.warnings).filter((warning, index, all) => all.findIndex(item => item.title === warning.title && item.message === warning.message) === index);
      return applySchematicLayout({ ...models[0], id: brief.id ?? "independent-pods", title: brief.title, nodes: models.flatMap(model => model.nodes), connections: models.flatMap(model => model.connections), warnings, assumptions: [...models[0].assumptions, "Each pod has a dedicated transmitter, receiver and display path. No cross-pod routing is included."] });
    }
  }
  const nodes: SchematicNode[] = [];
  const connections: Omit<SchematicConnection, "points">[] = [];
  const warnings: SchematicModel["warnings"] = [];
  const node = (id: string, label: string, kind: SchematicNode["kind"], column: number, lane: number, sku?: string) => {
    const result: SchematicNode = { id, label, kind, column, lane, x: 0, y: 0, required: true, sku };
    nodes.push(result); return result;
  };
  const tx = node("presentation-tx", "Switching transmitter", "switcher", 1, 0, transmitters[0].sku.toUpperCase());
  const rx = receivers.length ? node("presentation-rx", "HDBaseT receiver", "accessory", 2, 0, "RX-700") : undefined;
  const projector = (brief.displays ?? []).some(display => /projector/i.test(display.label));
  if (rx) rx.metadata = { deviceRole: "HDBaseT receiver", location: projector ? "Projector position" : "Display position" };
  tx.metadata = { deviceRole: "Switching transmitter", location: "Presentation position" };
  const wire = (from: SchematicNode, fromPort: string, to: SchematicNode, toPort: string, transport: SchematicConnection["transport"], label: string, cableId: string) => connections.push({ id: cableId, cableId, from: from.id, to: to.id, fromPort, toPort, signal: "video", transport, label, required: true, evidence: "manufacturer" });
  let hdmiInput = 0, usbInput = 0, sourceIndex = 0;
  for (const endpoint of brief.sources ?? []) {
    for (let count = 0; count < (endpoint.quantity ?? 1); count++) {
      const source = node(`presentation-source-${++sourceIndex}`, `${endpoint.label}${(endpoint.quantity ?? 1) > 1 ? ` ${count + 1}` : ""}`, "source", 0, sourceIndex - 1);
      const usbC = /USB[ -]?C/i.test(endpoint.label);
      const hdmi = /HDMI/i.test(endpoint.label);
      if (usbC && usbInput++ === 0) wire(source, "USB-C OUT", tx, "USB-C IN", "unknown", "USB-C / DP Alt Mode", `V-${String(sourceIndex).padStart(3,"0")}`);
      else if (hdmi && hdmiInput < 2) wire(source, "HDMI OUT", tx, `HDMI IN ${++hdmiInput}`, "hdmi", "HDMI", `V-${String(sourceIndex).padStart(3,"0")}`);
      else warnings.push({ severity: "blocker", title: "Source port requires confirmation", message: `${source.label}: specify its connector and a free compatible transmitter input.` });
    }
  }
  const txCount = transmitters.reduce((sum,p) => sum + (p.quantity ?? 1),0);
  const rxCount = receivers.reduce((sum,p) => sum + (p.quantity ?? 1),0);
  if (txCount !== 1 || rxCount > 1) warnings.push({ severity: "blocker", title: "Pairing required", message: "Multiple transmitters or receivers require explicit device-to-device pairing. This sheet documents the first pair only." });
  if (rx) wire(tx, "HDBT OUT", rx, "HDBT IN", "hdbaset", "HDBaseT / shielded category cable", "V-101");
  else warnings.push({ severity: "blocker", title: "Receiver not specified", message: "Specify the compatible HDBaseT receiver and HDMI output path. No direct transmitter-to-projector connection is drawn." });
  let displayIndex = 0;
  for (const endpoint of brief.displays ?? []) for (let count = 0; count < (endpoint.quantity ?? 1); count++) {
    const display = node(`presentation-display-${++displayIndex}`, /projector/i.test(endpoint.label) ? "Projector" : endpoint.label, "display", 3, displayIndex - 1);
    display.proposalSafeNote = `HDMI input assumed; confirm ${/projector/i.test(endpoint.label) ? "projector" : "display"} model.`;
    if (rx && displayIndex === 1) wire(rx, "HDMI OUT", display, "HDMI IN (confirm)", "hdmi", "HDMI", "V-102");
    else warnings.push({ severity: "blocker", title: "Display routing required", message: `${display.label}: a separate distribution/output path is required.` });
  }
  for (const product of brief.products ?? []) if (!/^SW-130-TX-(UK|US)$|^RX-700$/i.test(product.sku)) {
    const extra = node(`scope-product-${product.sku}`, product.label ?? product.sku, "accessory", 0, nodes.length, product.sku);
    extra.metadata = { unresolvedScope: true, quantity: product.quantity ?? 1 };
  }
  for (const item of brief.equipmentScope ?? []) {
    const extra = node(`scope-${item.id}`, item.label, "accessory", 0, nodes.length, item.model);
    extra.metadata = { unresolvedScope: true, quantity: item.quantity };
  }
  if (brief.audioRequired) warnings.push({ severity: "warning", title: "Audio routing not issued", message: "Specify microphone inputs, mixer/DSP, programme-audio interface and powered loudspeaker feeds. An audio requirement does not establish their physical connections." });
  if (brief.controlRequired) warnings.push({ severity: "warning", title: "Control routing not issued", message: "Confirm controller, controlled equipment and CEC/RS-232 interfaces before adding control cables." });
  if (brief.usbRequired || brief.cameras?.length || brief.speakerphones?.length) warnings.push({ severity: "warning", title: "USB peripheral routing not issued", message: "Confirm the actual computer host and required peripherals. USB-C video input alone does not require an extra room PC or USB bridge." });
  return applySchematicLayout({ id: brief.id ?? "presentation-hdbaset", title: brief.title, nodes, connections, warnings, bomHints: [], assumptions: [`Design development: manufacturer interfaces verified; source allocation, ${projector ? "projector" : "display"} input and cable lengths require site confirmation.`, "Each RX-700 requires its local 12 V DC supply. PoH powers its transmitter over the paired HDBaseT cable; power direction is opposite to video direction.", ...(projector ? ["A projection screen is a physical room item. Motor/control connections are not included without a specified control interface."] : [])] });
}
