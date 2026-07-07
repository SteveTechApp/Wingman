import type {
  SchematicNodeKind,
  SchematicProductBrief,
  SchematicTransportKind,
} from "./schematicTypes";

export function normaliseSku(sku: string): string {
  return sku.trim().toUpperCase().replace(/\s+/g, "-");
}

export function isNetworkHdSku(sku: string): boolean {
  const normalized = normaliseSku(sku);
  return normalized.startsWith("NHD-") || normalized.startsWith("NETWORKHD");
}

export function networkHdSeries(sku: string): "100" | "150" | "500" | "600" | "unknown" | undefined {
  const normalized = normaliseSku(sku);

  if (!isNetworkHdSku(normalized)) {
    return undefined;
  }

  if (normalized.startsWith("NHD-1") || normalized.includes("NETWORKHD-100")) {
    return normalized.startsWith("NHD-150") ? "150" : "100";
  }

  if (normalized.startsWith("NHD-5") || normalized.includes("NETWORKHD-500")) {
    return "500";
  }

  if (normalized.startsWith("NHD-6") || normalized.includes("NETWORKHD-600")) {
    return "600";
  }

  return "unknown";
}

export function productNodeKind(product: SchematicProductBrief): SchematicNodeKind {
  const sku = normaliseSku(product.sku);

  if (sku.includes("CTL")) {
    return "av-over-ip-controller";
  }

  // Must be checked before the plain -TX/-T check below: "NHD-600-TRX"
  // contains "-T" as a substring, so without this it silently classified as
  // a plain encoder and lost its local decode/display capability entirely.
  // A transceiver (TRX) transmits its local HDMI input AND can drive its
  // local HDMI output from any encoder on the network, simultaneously or as
  // a dedicated TX/RX - see schematicEndpointCapacity().
  if (sku.includes("-TRX") && isNetworkHdSku(sku)) {
    return "av-over-ip-transceiver";
  }

  if (sku.includes("-TX") || sku.includes("-T")) {
    if (isNetworkHdSku(sku)) {
      return "av-over-ip-encoder";
    }
  }

  if (sku.includes("-RX") || sku.includes("-R")) {
    if (isNetworkHdSku(sku)) {
      return "av-over-ip-decoder";
    }
  }

  if (sku.includes("NHD-0401-MV") || sku.includes("SW-020") || sku.includes("-VW")) {
    return "video-wall-processor";
  }

  if (sku.startsWith("MX-") || sku.startsWith("MXV-")) {
    return "matrix";
  }

  if (sku.startsWith("SW-")) {
    return "switcher";
  }

  if (sku.startsWith("APO-") || sku.startsWith("HALO-")) {
    return "speakerphone";
  }

  if (sku.startsWith("CAM-")) {
    return "camera";
  }

  if (sku.startsWith("SYN-TOUCH")) {
    return "touch-panel";
  }

  if (sku.includes("USB")) {
    return "usb-bridge";
  }

  return "accessory";
}

export interface SchematicEndpointCapacity {
  /** How many independent local sources this one physical device can accept. */
  localInputs: number;
  /** How many independent local displays this one physical device can drive. */
  localOutputs: number;
  /** Connector types of each local input slot, in order - only set when localInputs > 1 and the ports differ. */
  inputConnectorTypes?: string[];
}

/**
 * Most NetworkHD endpoints are single-port: one encoder takes exactly one
 * local source, one decoder drives exactly one local display - see the
 * topology comment in wingmanSchematicEngine.ts for why that matters. A few
 * specific models are genuine exceptions with more than one physical port on
 * one box, and treating them as single-port would wrongly demand an extra
 * device (or, worse, silently share a port that doesn't exist):
 *
 * - NHD-510-TX: one encoder, but two switchable local inputs (HDMI + USB-C)
 *   that auto-switch in under a second - it legitimately serves two
 *   independent local sources on its own.
 * - Any NetworkHD transceiver (TRX): transmits its local HDMI input AND can
 *   drive its local HDMI output from any encoder on the network - one box,
 *   one source-side slot and one display-side slot.
 */
export function schematicEndpointCapacity(product: SchematicProductBrief, kind: SchematicNodeKind): SchematicEndpointCapacity {
  const sku = normaliseSku(product.sku);

  if (sku === "NHD-510-TX") {
    return { localInputs: 2, localOutputs: 0, inputConnectorTypes: ["hdmi", "usb-c"] };
  }

  if (kind === "av-over-ip-transceiver") {
    return { localInputs: 1, localOutputs: 1 };
  }

  if (kind === "av-over-ip-encoder") {
    return { localInputs: 1, localOutputs: 0 };
  }

  if (kind === "av-over-ip-decoder") {
    return { localInputs: 0, localOutputs: 1 };
  }

  return { localInputs: 0, localOutputs: 0 };
}

export function defaultTransportForDistance(distanceM: number | undefined): SchematicTransportKind {
  if (distanceM === undefined) {
    return "unknown";
  }

  if (distanceM <= 7) {
    return "hdmi";
  }

  if (distanceM <= 100) {
    return "hdbaset";
  }

  return "av-over-ip";
}

export function hasAvoipProducts(products: SchematicProductBrief[] = []): boolean {
  return products.some((product) => isNetworkHdSku(product.sku));
}

export function hasDedicatedVideoWallProcessor(products: SchematicProductBrief[] = []): boolean {
  return products.some((product) => {
    const sku = normaliseSku(product.sku);
    return sku.includes("SW-0204-VW") || sku.includes("SW-0206-VW") || sku.includes("NHD-0401-MV");
  });
}

export function requiresNetworkHdController(products: SchematicProductBrief[] = []): boolean {
  return hasAvoipProducts(products) && !products.some((product) => normaliseSku(product.sku).includes("NHD-CTL"));
}

export function mixedNetworkHdSeriesWarning(products: SchematicProductBrief[] = []): string | undefined {
  const series = new Set(
    products
      .map((product) => networkHdSeries(product.sku))
      .filter((value): value is "100" | "150" | "500" | "600" | "unknown" => Boolean(value)),
  );

  const materialSeries = [...series].filter((value) => value !== "unknown");

  if (materialSeries.length > 1) {
    return `NetworkHD series are mixed in this schematic (${materialSeries.join(", ")}). Do not assume cross-series interoperability. Use separate VLANs/systems unless the design is explicitly validated.`;
  }

  return undefined;
}

export function proposalSafeSourceLabel(label: string): string {
  const lower = label.toLowerCase();

  if (lower.includes("usb-c") || lower.includes("usbc")) {
    return "USB-C source";
  }

  if (lower.includes("hdmi")) {
    return "HDMI source";
  }

  if (lower.includes("wireless")) {
    return "wireless presentation source";
  }

  return "local source";
}