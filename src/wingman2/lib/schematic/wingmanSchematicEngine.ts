import { expandMatrixDisplayPaths } from "./matrixDisplayPaths";
import { buildHdbasetPresentationSchematic } from "./hdbasetPresentationSchematic";
import type {
  SchematicBomHint,
  SchematicConnection,
  SchematicModel,
  SchematicNode,
  SchematicNodeKind,
  SchematicProductBrief,
  SchematicProjectBrief,
  SchematicSignalKind,
  SchematicTransportKind,
  SchematicWarning,
} from "./schematicTypes";
import { applySchematicLayout } from "./schematicLayoutEngine";
import { validateSchematicConstraints, violationsToWarnings } from "./schematicConstraintValidator";
import {
  hasAvoipProducts,
  hasDedicatedVideoWallProcessor,
  mixedNetworkHdSeriesWarning,
  normaliseSku,
  productNodeKind,
  proposalSafeSourceLabel,
  requiresNetworkHdController,
  schematicEndpointCapacity,
} from "./schematicProductRules";

type DraftConnection = Omit<SchematicConnection, "points">;
export function buildWingmanSchematic(brief: SchematicProjectBrief): SchematicModel {
  const presentation = buildHdbasetPresentationSchematic(brief);
  if (presentation) return presentation;
  const assumptions: string[] = [];
  const warnings: SchematicWarning[] = [];
  const bomHints: SchematicBomHint[] = [];
  const nodes: SchematicNode[] = [];
  const connections: DraftConnection[] = [];

  const products = expandProducts(brief.products ?? []);
  const usesAvoip = hasAvoipProducts(products);
  const hasVideoWall = Boolean(brief.videoWall?.enabled);
  const hasWallProcessor = hasDedicatedVideoWallProcessor(products);
  const transport: SchematicTransportKind = "unknown";

  if (!brief.sources?.length) {
    assumptions.push("No explicit source list was supplied, so the schematic uses one generic local source.");
  }

  if (!brief.displays?.length && !hasVideoWall) {
    assumptions.push("No explicit display list was supplied, so the schematic uses one generic room display.");
  }

  if (transport === "unknown") {
    assumptions.push("Transport is shown generically because signal distance or connector evidence is not confirmed.");
  }

  const mixedSeries = mixedNetworkHdSeriesWarning(products);
  if (mixedSeries) {
    warnings.push({
      severity: "warning",
      title: "NetworkHD series separation required",
      message: mixedSeries,
    });
  }

  if (requiresNetworkHdController(products)) {
    bomHints.push({
      sku: "NHD-CTL-PRO-V2",
      reason: "Required controller for NetworkHD AV-over-IP routing and system management.",
      required: true,
    });

    nodes.push(makeNode("nhd-controller", "NHD-CTL-PRO-V2", "av-over-ip-controller", 1, 0, {
      sku: "NHD-CTL-PRO-V2",
      required: true,
      note: "Required for NetworkHD system control.",
    }));
  }

  if (usesAvoip) {
    nodes.push(makeNode("network-switch", "Network switch / AV VLAN", "network-switch", 2, 1, {
      required: true,
      note: "Switching, VLAN and bandwidth requirements must be validated before quoting.",
    }));
  }

  const sourceNodes = createEndpointNodes({
    endpoints: brief.sources?.length ? brief.sources : [{ label: "Local source" }],
    fallbackKind: "source",
    idPrefix: "source",
    column: 0,
    startLane: 0,
    required: true,
  });

  nodes.push(...sourceNodes);

  const cameraNodes = createEndpointNodes({
    endpoints: brief.cameras ?? [],
    fallbackKind: "camera",
    idPrefix: "camera",
    column: 0,
    startLane: sourceNodes.length,
    required: Boolean(brief.usbRequired),
  });

  nodes.push(...cameraNodes);

  const speakerphoneNodes = createEndpointNodes({
    endpoints: brief.speakerphones ?? [],
    fallbackKind: "speakerphone",
    idPrefix: "speakerphone",
    column: 0,
    startLane: sourceNodes.length + cameraNodes.length,
    required: Boolean(brief.usbRequired || brief.audioRequired),
  });

  nodes.push(...speakerphoneNodes);

  const endpointSkus = new Set([...cameraNodes, ...speakerphoneNodes].map(node => node.sku).filter(Boolean));
  const productNodes = createProductNodes(products.filter(product => !endpointSkus.has(product.sku)), usesAvoip, hasVideoWall);
  nodes.push(...productNodes);

  const switchingNode = chooseSwitchingNode(productNodes, usesAvoip, hasVideoWall, hasWallProcessor);

  if (!switchingNode) {
    const genericKind: SchematicNodeKind = usesAvoip ? "av-over-ip-encoder" : "switcher";
    const genericLabel = usesAvoip ? "AV-over-IP transport" : "Switcher / transport";
    const genericNode = makeNode("transport-core", genericLabel, genericKind, 1, 0, {
      required: true,
      note: "Generic node used until the product selection is confirmed.",
    });

    nodes.push(genericNode);
  }

  const effectiveSwitchingNode = switchingNode ?? nodes.find((node) => node.id === "transport-core");

  const displayNodes = createEndpointNodes({
    endpoints: brief.displays?.length
      ? brief.displays
      : hasVideoWall
        ? [{ label: brief.videoWall?.layout ? `Video wall ${brief.videoWall.layout}` : "Video wall" }]
        : [{ label: "Room display" }],
    fallbackKind: hasVideoWall ? "display" : "display",
    idPrefix: "display",
    column: usesAvoip ? 4 : 3,
    startLane: 0,
    required: true,
  });

  nodes.push(...displayNodes);

  if (hasVideoWall && !hasWallProcessor && !usesAvoip) {
    warnings.push({
      severity: "warning",
      title: "Video wall processing not confirmed",
      message: "The brief mentions a video wall but no dedicated wall processor or AV-over-IP wall architecture is confirmed.",
    });
  }

  // A matrix/switcher/video-wall-processor node genuinely has multiple physical
  // input and output ports built into one box, so every source/display sharing
  // that single node is correct. A plain AV-over-IP encoder or decoder is a
  // single-port endpoint device - it has exactly one local HDMI in (encoder) or
  // out (decoder) - so every source normally needs its own encoder and every
  // display needs its own decoder. Wiring every source/display to one shared
  // encoder node (as the pre-fix version of this function did) draws a
  // topology no real installer would build: two independent HDMI sources
  // cannot both plug into the same encoder's single HDMI input.
  //
  // A few specific NetworkHD models are genuine exceptions with more than one
  // physical port on one box (NHD-510-TX's switchable HDMI+USB-C inputs, any
  // transceiver's simultaneous local in+out) - schematicEndpointCapacity()
  // says how many source/display slots each product node actually offers, and
  // buildEndpointSlots() expands that into one slot per real port so a single
  // 510-TX or TRX unit can legitimately absorb more than one connection
  // without a warning, while a plain single-port encoder still can't.
  const encoderInputSlots = buildEndpointSlots(productNodes, "localInputs");
  const decoderOutputSlots = buildEndpointSlots(productNodes, "localOutputs");
  const hasConfirmedAvoipEndpoints = usesAvoip && (encoderInputSlots.length > 0 || decoderOutputSlots.length > 0);

  if (hasConfirmedAvoipEndpoints) {
    sourceNodes.forEach((source) => {
      const requestedConnector = /USB[ -]?C/i.test(source.label) ? "usb-c" : /HDMI/i.test(source.label) ? "hdmi" : undefined;
      const slotIndex = encoderInputSlots.findIndex(candidate => !requestedConnector || candidate.connectorType === requestedConnector);
      const slot = slotIndex < 0 ? undefined : encoderInputSlots.splice(slotIndex,1)[0];
      if (slot) {
        const connection = makeConnection(source, slot.node, "video", slot.connectorType === "usb-c" ? "unknown" : "hdmi", slot.connectorType === "usb-c" ? "USB-C / DP Alt Mode to encoder" : `${proposalSafeSourceLabel(source.label)} to encoder`);
        connection.fromPort = requestedConnector === "usb-c" ? "USB-C OUT" : requestedConnector === "hdmi" ? "HDMI OUT" : "SOURCE PORT TBD";
        connection.toPort = slot.connectorType === "usb-c" ? "USB-C IN" : "HDMI IN";
        connection.evidence = "unresolved";
        connections.push(connection);
      } else {
        warnings.push({
          severity: "blocker",
          title: "Missing AV-over-IP encoder",
          message: `"${source.label}" has no dedicated NetworkHD encoder input in the product list. Every source needs a free compatible encoder input - confirm the connector and add an endpoint before quoting.`,
        });
      }
    });
  } else if (effectiveSwitchingNode) {
    sourceNodes.forEach((source,index) => {
      const capacity = effectiveSwitchingNode.sku === "NHD-0401-MV" ? 4 : /^SW-020[46]-VW$/.test(effectiveSwitchingNode.sku ?? "") ? 2 : undefined;
      if (capacity !== undefined && index >= capacity) {
        warnings.push({severity:"blocker",title:"Processor input capacity exceeded",message:`${source.label} has no free processor input.`}); return;
      }
      const connection = makeConnection(source, effectiveSwitchingNode, "video", capacity ? "hdmi" : transport, `${proposalSafeSourceLabel(source.label)} to system`);
      if (capacity) { connection.fromPort = "SOURCE OUTPUT (confirm)"; connection.toPort = `HDMI IN ${index+1}`; }
      connections.push(connection);
    });
  }

  if (usesAvoip) {
    wireAvoipNetwork(nodes, connections);
  }

  const processor = productNodes.find(node => node.kind === "video-wall-processor");
  if (processor) {
    const inputCapacity = processor.sku === "NHD-0401-MV" ? 4 : /^SW-020[46]-VW$/.test(processor.sku ?? "") ? 2 : undefined;
    const outputCapacity = processor.sku === "NHD-0401-MV" ? 1 : processor.sku === "SW-0204-VW" ? 4 : processor.sku === "SW-0206-VW" ? 6 : undefined;
    if (hasConfirmedAvoipEndpoints) decoderOutputSlots.forEach((slot,index) => {
      if (inputCapacity !== undefined && index >= inputCapacity) {
        warnings.push({severity:"blocker",title:"Processor input capacity exceeded",message:"Additional decoder feeds require a separate processor or a confirmed routing arrangement."}); return;
      }
      const connection = makeConnection(slot.node,processor,"video","hdmi","Decoder HDMI to processor");
      connection.fromPort = "HDMI OUT"; connection.toPort = `HDMI IN ${index+1}`; connections.push(connection);
    });
    displayNodes.forEach((display,index) => {
      display.column = processor.column+1;
      if (outputCapacity !== undefined && index >= outputCapacity) {
        warnings.push({severity:"blocker",title:"Processor output capacity exceeded",message:`${display.label} requires another physical output or distribution device.`}); return;
      }
      const connection = makeConnection(processor,display,"video","hdmi","Processor HDMI to display");
      connection.fromPort = `HDMI OUT ${index+1}`; connection.toPort = "DISPLAY INPUT (confirm)"; connections.push(connection);
    });
  } else if (hasConfirmedAvoipEndpoints) {
    displayNodes.forEach((display, index) => {
      const slot = decoderOutputSlots[index];
      if (slot) {
        const connection = makeConnection(slot.node, display, "video", "hdmi", "Decoder to display");
        connection.fromPort = "HDMI OUT"; connection.toPort = "DISPLAY INPUT (confirm)"; connections.push(connection);
      } else {
        warnings.push({ severity: "blocker", title: "Missing AV-over-IP decoder", message: `"${display.label}" has no dedicated NetworkHD decoder output in the product list. Every display needs its own decoder output - add one before quoting.` });
      }
    });
  } else if (effectiveSwitchingNode) {
    for (const display of displayNodes) connections.push(makeConnection(effectiveSwitchingNode, display, "video", transport, "Video to display"));
  }

  if (brief.usbRequired || cameraNodes.length || speakerphoneNodes.length) {
    warnings.push({ severity: "warning", title: "USB routing requires design", message: "Specify the computer host, peripheral ports and supported USB extension path. No USB connection is issued from the requirement alone." });
  }
  if (brief.audioRequired) {
    warnings.push({ severity: "warning", title: "Audio routing requires design", message: "Specify audio interfaces, signal levels and amplification. No switcher audio output is assumed from an audio requirement." });
  }
  if (brief.controlRequired) {
    warnings.push({ severity: "warning", title: "Control routing requires design", message: "Specify the controller and controlled-device interfaces before allocating control cables." });
  }
  for (const item of brief.equipmentScope ?? []) {
    nodes.push({ ...makeNode(`scope-${item.id}`, item.label, "accessory", 0, nodes.length, {sku:item.model}), metadata: { unresolvedScope: true, quantity: item.quantity } });
  }
  assumptions.push("Connections without a verified interface profile are proposed topology only. Confirm named ports, endpoint pairing, power and cable types before installation.");

  expandMatrixDisplayPaths(nodes, connections, warnings);

  const draftModel = {
    id: brief.id ?? makeStableId(brief.title),
    title: brief.title,
    assumptions,
    nodes: dedupeNodes(nodes),
    connections: dedupeConnections(connections),
    warnings,
    bomHints,
  };

  // Run constraint validation — cable lengths, power budgets, port compatibility.
  const constraintViolations = validateSchematicConstraints({
    model: draftModel,
    products: products.map((p) => ({ sku: p.sku, quantity: p.quantity })),
    maxSignalDistanceM: brief.maxSignalDistanceM,
  });
  draftModel.warnings.push(...violationsToWarnings(constraintViolations));

  return applySchematicLayout(draftModel);
}

function expandProducts(products: SchematicProductBrief[]): SchematicProductBrief[] {
  return products.flatMap((product) => {
    const quantity = Math.max(0, Math.floor(product.quantity ?? 1));
    return Array.from({ length: quantity }, (_, index) => ({
      ...product,
      sku: normaliseSku(product.sku),
      label: product.label,
      quantity: 1,
      instanceIndex: index + 1,
    } as SchematicProductBrief & { instanceIndex: number }));
  });
}

function createEndpointNodes(args: {
  endpoints: Array<{ label: string; sku?: string; quantity?: number }>;
  fallbackKind: SchematicNodeKind;
  idPrefix: string;
  column: number;
  startLane: number;
  required: boolean;
}): SchematicNode[] {
  const nodes: SchematicNode[] = [];

  args.endpoints.forEach((endpoint, endpointIndex) => {
    const quantity = Math.max(0, Math.floor(endpoint.quantity ?? 1));

    for (let index = 0; index < quantity; index += 1) {
      const suffix = quantity > 1 ? ` ${index + 1}` : "";
      const label = `${endpoint.label}${suffix}`;
      nodes.push(makeNode(
        `${args.idPrefix}-${endpointIndex + 1}-${index + 1}`,
        label,
        args.fallbackKind,
        args.column,
        args.startLane + nodes.length,
        {
          sku: endpoint.sku,
          required: args.required,
        },
      ));
    }
  });

  return nodes;
}

function createProductNodes(
  products: SchematicProductBrief[],
  usesAvoip: boolean,
  hasVideoWall: boolean,
): SchematicNode[] {
  let transportLane = 0;
  let endpointLane = 1;

  return products.map((product, index) => {
    const kind = productNodeKind(product);
    const column = kind === "av-over-ip-decoder" || (kind === "av-over-ip-transceiver" && product.operatingMode === "receive")
      ? 3
      : kind === "video-wall-processor"
        ? usesAvoip ? 4 : 2
      : kind === "av-over-ip-controller"
        ? 1
        : 1;

    const lane = column === 1 ? transportLane++ : endpointLane++;

    const label = product.label ?? product.sku;

    const node = makeNode(`product-${index + 1}-${normaliseSku(product.sku).toLowerCase()}`, label, kind, column, lane, {
      sku: normaliseSku(product.sku),
      required: true,
      note: usesAvoip || hasVideoWall ? undefined : "Product role inferred from SKU pattern.",
    });
    node.metadata = { operatingMode: product.operatingMode, equipmentRole: product.role };
    return node;
  });
}

function chooseSwitchingNode(
  productNodes: SchematicNode[],
  usesAvoip: boolean,
  hasVideoWall: boolean,
  hasWallProcessor: boolean,
): SchematicNode | undefined {
  if (hasVideoWall && hasWallProcessor) {
    return productNodes.find((node) => node.kind === "video-wall-processor");
  }

  if (usesAvoip) {
    return productNodes.find((node) => node.kind === "av-over-ip-encoder")
      ?? productNodes.find((node) => node.kind === "av-over-ip-transceiver")
      ?? productNodes.find((node) => node.kind === "network-switch");
  }

  return productNodes.find((node) => node.kind === "matrix")
    ?? productNodes.find((node) => node.kind === "switcher")
    ?? productNodes.find((node) => node.kind === "video-wall-processor");
}

interface EndpointSlot {
  node: SchematicNode;
  slotIndex: number;
  connectorType?: string;
}

/**
 * Expands each product node into one slot per physical port it actually has
 * (per schematicEndpointCapacity()), so a single NHD-510-TX contributes two
 * source-side slots and a transceiver contributes one source-side slot and
 * one display-side slot, instead of every product node being assumed to have
 * exactly one port.
 */
function buildEndpointSlots(productNodes: SchematicNode[], direction: "localInputs" | "localOutputs"): EndpointSlot[] {
  const slots: EndpointSlot[] = [];

  for (const node of productNodes) {
    if ((direction === "localInputs" && node.metadata?.operatingMode === "receive") || (direction === "localOutputs" && node.metadata?.operatingMode === "transmit")) continue;
    const capacity = schematicEndpointCapacity({ sku: node.sku ?? "" }, node.kind);
    const count = direction === "localInputs" ? capacity.localInputs : capacity.localOutputs;

    for (let slotIndex = 0; slotIndex < count; slotIndex += 1) {
      slots.push({
        node,
        slotIndex,
        connectorType: direction === "localInputs" ? capacity.inputConnectorTypes?.[slotIndex] ?? "hdmi" : "hdmi",
      });
    }
  }

  return slots;
}

function wireAvoipNetwork(nodes: SchematicNode[], connections: DraftConnection[]) {
  const network = nodes.find((node) => node.kind === "network-switch");
  if (!network) {
    return;
  }

  for (const node of nodes) {
    if (
      node.kind === "av-over-ip-encoder"
      || node.kind === "av-over-ip-decoder"
      || node.kind === "av-over-ip-transceiver"
      || node.kind === "av-over-ip-controller"
    ) {
      const receiving = node.column > network.column;
      const connection = makeConnection(receiving ? network : node, receiving ? node : network, "network", "network", "AV network · bidirectional");
      const port = `SWITCH PORT ${connections.filter(c => c.from === network.id || c.to === network.id).length+1}`;
      connection.fromPort = receiving ? port : "AV LAN (confirm)";
      connection.toPort = receiving ? "AV LAN (confirm)" : port;
      connection.bidirectional = true;
      connections.push(connection);
    }
  }
}

function makeNode(
  id: string,
  label: string,
  kind: SchematicNodeKind,
  column: number,
  lane: number,
  options: {
    sku?: string;
    required?: boolean;
    note?: string;
  } = {},
): SchematicNode {
  return {
    id,
    label,
    kind,
    sku: options.sku,
    column,
    lane,
    x: 0,
    y: 0,
    required: options.required ?? true,
    proposalSafeNote: options.note,
  };
}

function makeConnection(
  from: SchematicNode,
  to: SchematicNode,
  signal: SchematicSignalKind,
  transport: SchematicTransportKind,
  label: string,
): DraftConnection {
  return {
    id: `${from.id}__${signal}__${to.id}`,
    from: from.id,
    to: to.id,
    signal,
    transport,
    label,
    required: true,
    proposalSafeNote: transport === "unknown" ? "Transport must be confirmed before quoting." : undefined,
  };
}

function dedupeNodes(nodes: SchematicNode[]): SchematicNode[] {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    if (seen.has(node.id)) {
      return false;
    }

    seen.add(node.id);
    return true;
  });
}

function dedupeConnections(connections: DraftConnection[]): DraftConnection[] {
  const seen = new Set<string>();
  return connections.filter((connection) => {
    if (seen.has(connection.id)) {
      return false;
    }

    seen.add(connection.id);
    return true;
  });
}

function makeStableId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    || "wingman-schematic";
}