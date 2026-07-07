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
import {
  defaultTransportForDistance,
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
  const assumptions: string[] = [];
  const warnings: SchematicWarning[] = [];
  const bomHints: SchematicBomHint[] = [];
  const nodes: SchematicNode[] = [];
  const connections: DraftConnection[] = [];

  const products = expandProducts(brief.products ?? []);
  const usesAvoip = hasAvoipProducts(products);
  const hasVideoWall = Boolean(brief.videoWall?.enabled);
  const hasWallProcessor = hasDedicatedVideoWallProcessor(products);
  const transport = usesAvoip
    ? "av-over-ip"
    : defaultTransportForDistance(brief.maxSignalDistanceM);

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
      sku: "NHD-CTL-PRO",
      reason: "Required controller for NetworkHD AV-over-IP routing and system management.",
      required: true,
    });

    nodes.push(makeNode("nhd-controller", "NHD-CTL-PRO", "av-over-ip-controller", 2, 0, {
      sku: "NHD-CTL-PRO",
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

  const productNodes = createProductNodes(products, usesAvoip, hasVideoWall);
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
    column: 3,
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
    sourceNodes.forEach((source, index) => {
      const slot = encoderInputSlots[index];
      if (slot) {
        connections.push(makeConnection(source, slot.node, "video", "hdmi", `${proposalSafeSourceLabel(source.label)} to encoder`));
      } else {
        warnings.push({
          severity: "blocker",
          title: "Missing AV-over-IP encoder",
          message: `"${source.label}" has no dedicated NetworkHD encoder input in the product list. Every source needs its own encoder input - add one before quoting.`,
        });
      }
    });
  } else if (effectiveSwitchingNode) {
    for (const source of sourceNodes) {
      connections.push(makeConnection(source, effectiveSwitchingNode, "video", transport, `${proposalSafeSourceLabel(source.label)} to system`));
    }
  }

  if (usesAvoip) {
    wireAvoipNetwork(nodes, connections);
  }

  if (hasConfirmedAvoipEndpoints) {
    displayNodes.forEach((display, index) => {
      const slot = decoderOutputSlots[index];
      if (slot) {
        connections.push(makeConnection(slot.node, display, "video", "hdmi", "Decoder to display"));
      } else {
        warnings.push({
          severity: "blocker",
          title: "Missing AV-over-IP decoder",
          message: `"${display.label}" has no dedicated NetworkHD decoder output in the product list. Every display needs its own decoder output - add one before quoting.`,
        });
      }
    });
  } else if (effectiveSwitchingNode) {
    for (const display of displayNodes) {
      connections.push(makeConnection(effectiveSwitchingNode, display, "video", transport, "Video to display"));
    }
  }

  if (brief.usbRequired || cameraNodes.length || speakerphoneNodes.length) {
    const usbBridge = nodes.find((node) => node.kind === "usb-bridge") ?? makeNode("usb-bridge", "USB path / BYOM bridge", "usb-bridge", 1, 2, {
      required: true,
      note: "USB transport is included because conferencing devices or BYOM/BYOD workflow is present.",
    });

    if (!nodes.some((node) => node.id === usbBridge.id)) {
      nodes.push(usbBridge);
    }

    for (const camera of cameraNodes) {
      connections.push(makeConnection(camera, usbBridge, "usb", "usb", "Camera USB"));
    }

    for (const speakerphone of speakerphoneNodes) {
      connections.push(makeConnection(speakerphone, usbBridge, "usb", "usb", "Speakerphone USB"));
    }

    if (effectiveSwitchingNode) {
      connections.push(makeConnection(usbBridge, effectiveSwitchingNode, "usb", "usb", "USB host/device path"));
    }
  }

  if (brief.audioRequired && speakerphoneNodes.length === 0) {
    const audioNode = makeNode("audio-system", "Audio system", "audio-device", 3, displayNodes.length, {
      required: true,
      note: "Audio path is shown because the brief requires audio but no speakerphone/audio device was supplied.",
    });

    nodes.push(audioNode);

    if (effectiveSwitchingNode) {
      connections.push(makeConnection(effectiveSwitchingNode, audioNode, "audio", "unknown", "Audio output"));
    }
  }

  if (brief.controlRequired) {
    const controlNode = nodes.find((node) => node.kind === "touch-panel" || node.kind === "control-device")
      ?? makeNode("control", "Control interface", "control-device", 2, 3, {
        required: true,
        note: "Control path shown because the brief requires control.",
      });

    if (!nodes.some((node) => node.id === controlNode.id)) {
      nodes.push(controlNode);
    }

    if (effectiveSwitchingNode) {
      connections.push(makeConnection(controlNode, effectiveSwitchingNode, "control", "control", "Control"));
    }
  }

  const draftModel = {
    id: brief.id ?? makeStableId(brief.title),
    title: brief.title,
    assumptions,
    nodes: dedupeNodes(nodes),
    connections: dedupeConnections(connections),
    warnings,
    bomHints,
  };

  return applySchematicLayout(draftModel);
}

function expandProducts(products: SchematicProductBrief[]): SchematicProductBrief[] {
  return products.flatMap((product) => {
    const quantity = Math.max(1, product.quantity ?? 1);
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
    const quantity = Math.max(1, endpoint.quantity ?? 1);

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
    const column = kind === "av-over-ip-decoder" || kind === "video-wall-processor"
      ? 2
      : kind === "av-over-ip-controller"
        ? 2
        : 1;

    const lane = column === 1 ? transportLane++ : endpointLane++;

    const label = product.label ?? product.sku;

    return makeNode(`product-${index + 1}-${normaliseSku(product.sku).toLowerCase()}`, label, kind, column, lane, {
      sku: normaliseSku(product.sku),
      required: true,
      note: usesAvoip || hasVideoWall ? undefined : "Product role inferred from SKU pattern.",
    });
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
    const capacity = schematicEndpointCapacity({ sku: node.sku ?? "" }, node.kind);
    const count = direction === "localInputs" ? capacity.localInputs : capacity.localOutputs;

    for (let slotIndex = 0; slotIndex < count; slotIndex += 1) {
      slots.push({
        node,
        slotIndex,
        connectorType: direction === "localInputs" ? capacity.inputConnectorTypes?.[slotIndex] : undefined,
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
      connections.push(makeConnection(node, network, "network", "network", "AV network"));
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