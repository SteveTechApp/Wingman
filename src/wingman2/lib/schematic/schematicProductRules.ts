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