import type {
  SchematicConnection,
  SchematicModel,
  SchematicNode,
  SchematicPoint,
  SchematicSignalKind,
  SchematicTransportKind,
  SchematicWarning,
} from "./schematicTypes";

/* ------------------------------------------------------------------ */
/*  Transport-specific maximum cable lengths (metres)                  */
/* ------------------------------------------------------------------ */

const TRANSPORT_MAX_LENGTH_M: Partial<Record<SchematicTransportKind, number>> = {
  hdmi: 15,           // Standard HDMI copper
  hdbaset: 100,       // HDBaseT Cat6/Cat6A
  "av-over-ip": Infinity, // Network — limited by switch fabric, not cable
  usb: 5,             // USB 2.0/3.0 copper
  "usb-over-ip": Infinity,
  "analogue-audio": 100,  // Line-level analogue
  dante: Infinity,    // Network audio
  network: Infinity,  // Ethernet
  control: 100,       // RS-232/IR
};

/* ------------------------------------------------------------------ */
/*  PoE power classes (watts budget per port)                          */
/* ------------------------------------------------------------------ */

type PoeClass = { class_: string; watts: number };

const POE_CLASSES: PoeClass[] = [
  { class_: "802.3af (Class 0-3)", watts: 15.4 },
  { class_: "802.3at (PoE+)", watts: 30 },
  { class_: "802.3bt (PoE++)", watts: 60 },
];

/* ------------------------------------------------------------------ */
/*  Constraint check result                                            */
/* ------------------------------------------------------------------ */

export type ConstraintViolation = {
  severity: "warning" | "blocker";
  title: string;
  message: string;
  connectionId?: string;
  nodeId?: string;
};

/* ------------------------------------------------------------------ */
/*  Cable length validation                                            */
/* ------------------------------------------------------------------ */

type LooseConnection = { id: string; from: string; to: string; signal: string; transport: string; label: string; required: boolean };
type LooseModel = { nodes: SchematicNode[]; connections: LooseConnection[] };

function validateCableLengths(
  model: LooseModel,
  maxSignalDistanceM?: number,
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  for (const conn of model.connections) {
    const maxLen = TRANSPORT_MAX_LENGTH_M[conn.transport];
    if (maxLen === undefined || !Number.isFinite(maxLen)) continue;

    // Use the brief's max distance if available, otherwise flag for confirmation
    if (maxSignalDistanceM !== undefined && maxSignalDistanceM > maxLen) {
      violations.push({
        severity: "blocker",
        title: `${conn.transport.toUpperCase()} cable exceeds maximum length`,
        message: `The ${conn.label} connection uses ${conn.transport} transport, which supports up to ${maxLen}m. The project specifies ${maxSignalDistanceM}m, which exceeds this limit. Consider HDBaseT, fibre, or AV-over-IP for longer runs.`,
        connectionId: conn.id,
      });
    } else if (maxSignalDistanceM === undefined && conn.required) {
      // No distance specified for a required connection — warn for confirmation
      violations.push({
        severity: "warning",
        title: `Cable length not confirmed for ${conn.transport} run`,
        message: `The ${conn.label} connection uses ${conn.transport} transport (max ${maxLen}m). Confirm the actual cable run length is within spec before quoting.`,
        connectionId: conn.id,
      });
    }
  }

  return violations;
}

/* ------------------------------------------------------------------ */
/*  Power budget validation                                            */
/* ------------------------------------------------------------------ */

function validatePowerBudget(
  model: LooseModel,
  products: Array<{ sku: string; quantity?: number }>,
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  // Find PoE/PoH connections
  const poeConnections = model.connections.filter(
    (c) =>
      c.signal === "power" ||
      /poe|poh|power over/i.test(c.label) ||
      (c.transport === "network" && /poe|poh/i.test(c.label)),
  );

  if (poeConnections.length > 0) {
    // Group PoE connections by source node (switch)
    const switchNodes = model.nodes.filter((n) => n.kind === "network-switch");
    for (const sw of switchNodes) {
      const poeFromSwitch = poeConnections.filter(
        (c) => c.from === sw.id || c.to === sw.id,
      );
      if (poeFromSwitch.length > 8) {
        violations.push({
          severity: "warning",
          title: "High PoE port count on single switch",
          message: `${poeFromSwitch.length} PoE-powered devices are connected to "${sw.label}". A typical 24-port PoE switch provides 150-740W total budget. Confirm the switch PoE class and total power budget covers all connected endpoints.`,
          nodeId: sw.id,
        });
      }
    }
  }

  // Check for products with no power source proven
  for (const node of model.nodes) {
    if (
      node.kind === "accessory" ||
      node.kind === "network-switch" ||
      node.kind === "control-device"
    )
      continue;

    const hasPowerConnection = model.connections.some(
      (c) =>
        (c.from === node.id || c.to === node.id) &&
        (c.signal === "power" || /poe|poh/i.test(c.label)),
    );
    const isPoweredByProduct = products.some(
      (p) => p.sku && node.sku && p.sku !== node.sku,
    );

    // If a node has no power connection and no PSU mention, flag it
    if (!hasPowerConnection && node.required) {
      const product = products.find((p) => p.sku === node.sku);
      if (product) {
        violations.push({
          severity: "warning",
          title: `Power source unconfirmed for ${node.sku}`,
          message: `"${node.label}" (${node.sku}) has no power connection in the schematic. Confirm whether it is PoE-powered, has an included PSU, or requires a separate power supply.`,
          nodeId: node.id,
        });
      }
    }
  }

  return violations;
}

/* ------------------------------------------------------------------ */
/*  Port compatibility validation                                      */
/* ------------------------------------------------------------------ */

function validatePortCompatibility(
  model: LooseModel,
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  for (const conn of model.connections) {
    const fromNode = model.nodes.find((n) => n.id === conn.from);
    const toNode = model.nodes.find((n) => n.id === conn.to);
    if (!fromNode || !toNode) continue;

    // Check signal type mismatch
    if (conn.signal === "video") {
      // Video connections should not go to audio-only or control-only devices
      if (toNode.kind === "audio-device" || toNode.kind === "control-device") {
        violations.push({
          severity: "blocker",
          title: "Video signal routed to non-video device",
          message: `A video connection is routed from "${fromNode.label}" to "${toNode.label}", but the destination is a ${toNode.kind} that cannot accept video input.`,
          connectionId: conn.id,
        });
      }
    }

    // Check transport mismatch for HDBaseT
    if (conn.transport === "hdbaset") {
      // HDBaseT requires a TX and RX pair — check that endpoints are compatible
      const fromIsTx =
        fromNode.kind === "switcher" ||
        fromNode.kind === "matrix" ||
        fromNode.kind === "av-over-ip-encoder";
      const toIsRx =
        toNode.kind === "display" ||
        toNode.kind === "av-over-ip-decoder";

      if (!fromIsTx && !toIsRx) {
        violations.push({
          severity: "warning",
          title: "HDBaseT connection between non-standard endpoints",
          message: `The HDBaseT connection from "${fromNode.label}" to "${toNode.label}" connects non-standard endpoint types. Confirm that both devices support HDBaseT TX/RX roles.`,
          connectionId: conn.id,
        });
      }
    }

    // Check USB direction — USB connections should flow from host to device
    if (conn.signal === "usb" && conn.transport === "usb") {
      const fromIsSource =
        fromNode.kind === "source" || fromNode.kind === "camera";
      const toIsDisplay =
        toNode.kind === "display" || toNode.kind === "touch-panel";

      if (fromIsSource && toIsDisplay) {
        violations.push({
          severity: "warning",
          title: "USB direction may be reversed",
          message: `The USB connection flows from "${fromNode.label}" to "${toNode.label}". Confirm the USB host/device roles — typically the PC is the host and the camera/display is the device.`,
          connectionId: conn.id,
        });
      }
    }

    // Check network bandwidth for AV-over-IP
    if (conn.transport === "av-over-ip") {
      const fromIsEncoder = fromNode.kind === "av-over-ip-encoder";
      const toIsSwitch = toNode.kind === "network-switch";
      const fromIsSwitch = fromNode.kind === "network-switch";
      const toIsDecoder = toNode.kind === "av-over-ip-decoder";

      if (fromIsEncoder && toIsSwitch) {
        // Check if this is a 10G connection (NHD-600 series)
        const is10G =
          fromNode.sku?.includes("600") || fromNode.sku?.includes("610");
        if (is10G) {
          violations.push({
            severity: "warning",
            title: "10G AVoIP connection requires confirmed switch capability",
            message: `"${fromNode.label}" (${fromNode.sku}) uses 10G SDVoE transport. Confirm the network switch supports 10GbE ports and has sufficient PoE+ budget for the encoder.`,
            connectionId: conn.id,
          });
        }
      }
    }
  }

  return violations;
}

/* ------------------------------------------------------------------ */
/*  Main validator                                                     */
/* ------------------------------------------------------------------ */

export type SchematicConstraintInput = {
  model: Omit<SchematicModel, "connections"> & { connections: Array<{ id: string; from: string; to: string; signal: SchematicSignalKind; transport: SchematicTransportKind; label: string; required: boolean; points?: SchematicPoint[] }> };
  products: Array<{ sku: string; quantity?: number }>;
  maxSignalDistanceM?: number;
};

/**
 * Validate a SchematicModel against real-world constraints:
 * - Cable lengths vs transport maximums
 * - Power budgets (PoE/PoH port counts, missing power sources)
 * - Port compatibility (signal type mismatches, USB direction, HDBaseT roles)
 *
 * Returns ConstraintViolation[] which should be mapped to SchematicWarning[]
 * and appended to the model's warnings array.
 */
export function validateSchematicConstraints(
  input: SchematicConstraintInput,
): ConstraintViolation[] {
  const { model, products, maxSignalDistanceM } = input;

  const cableViolations = validateCableLengths(model, maxSignalDistanceM);
  const powerViolations = validatePowerBudget(model, products);
  const portViolations = validatePortCompatibility(model);

  return [...cableViolations, ...powerViolations, ...portViolations];
}

/**
 * Convert ConstraintViolation[] to SchematicWarning[] for embedding in the model.
 */
export function violationsToWarnings(
  violations: ConstraintViolation[],
): SchematicWarning[] {
  return violations.map((v) => ({
    severity: v.severity === "blocker" ? "blocker" : "warning",
    title: v.title,
    message: v.message,
  }));
}
