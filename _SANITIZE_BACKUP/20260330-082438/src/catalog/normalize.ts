import type {
  CatalogDistanceClass,
  CatalogFilters,
  CatalogProduct,
  CatalogTransport,
} from "./types";
import { inferCatalogIo } from "./ioInference";
import { inferCatalogMetadata } from "./metadataInference";

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
function asCatalogDistanceClass(value: unknown): CatalogDistanceClass | undefined {
  const v = tidy(value).toLowerCase().replace(/\s+/g, "");

  if (!v) return undefined;

  if (v === "a" || v === "classa") return "Class A";
  if (v === "b" || v === "classb") return "Class B";

  return undefined;
}

function mapVideo(value: CatalogProduct["video"]): CatalogProduct["video"] {
  if (!value || typeof value !== "object") return undefined;

  const video = {
    maxResolution: tidy(value.maxResolution) || undefined,
    maxFramerate: tidy(value.maxFramerate) || undefined,
    chroma: tidy(value.chroma) || undefined,
    hdr: asOptionalBoolean(value.hdr),
    dolbyVision: asOptionalBoolean(value.dolbyVision),
    hdmi: tidy(value.hdmi) || undefined,
    hdmiVersion: tidy(value.hdmiVersion) || undefined,
    hdcpVersion: tidy(value.hdcpVersion) || undefined,
    bandwidthGbps: asOptionalNumber(value.bandwidthGbps),
    scaling: asOptionalBoolean(value.scaling),
    downscaling: asOptionalBoolean(value.downscaling),
    upscaling: asOptionalBoolean(value.upscaling),
    multiview: asOptionalBoolean(value.multiview),
    seamlessSwitching: asOptionalBoolean(value.seamlessSwitching),
  };

  return Object.values(video).some((entry) => entry != null && entry !== "")
    ? video
    : undefined;
}

function mapDistance(value: CatalogProduct["distance"]): CatalogProduct["distance"] {
  if (!value || typeof value !== "object") return undefined;

  const distance = {
    meters: asOptionalNumber(value.meters),
    meters1080p: asOptionalNumber(value.meters1080p),
    meters4k: asOptionalNumber(value.meters4k),
    hdbasetClass: asCatalogDistanceClass(value.hdbasetClass),
    networkSpeed: tidy(value.networkSpeed) || undefined,
    codec: tidy(value.codec) || undefined,
    latencyClass: tidy(value.latencyClass) || undefined,
    notes: tidy(value.notes) || undefined,
  };

  return Object.values(distance).some((entry) => entry != null && entry !== "")
    ? distance
    : undefined;
}

function mapUsb(value: CatalogProduct["usb"]): CatalogProduct["usb"] {
  if (!value || typeof value !== "object") return undefined;

  const usb = {
    passthrough: asOptionalBoolean(value.passthrough),
    hostPorts: asOptionalNumber(value.hostPorts),
    devicePorts: asOptionalNumber(value.devicePorts),
    usbCVideoInput: asOptionalBoolean(value.usbCVideoInput),
    usbCChargingWatts: asOptionalNumber(value.usbCChargingWatts),
    kvmSupport: asOptionalBoolean(value.kvmSupport),
    cameraSharing: asOptionalBoolean(value.cameraSharing),
    peripheralSwitching: asOptionalBoolean(value.peripheralSwitching),
  };

  return Object.values(usb).some((entry) => entry != null)
    ? usb
    : undefined;
}

function mapWireless(value: CatalogProduct["wireless"]): CatalogProduct["wireless"] {
  if (!value || typeof value !== "object") return undefined;

  const wireless = {
    airplay: asOptionalBoolean(value.airplay),
    miracast: asOptionalBoolean(value.miracast),
    googleCast: asOptionalBoolean(value.googleCast),
    wirelessPresentation: asOptionalBoolean(value.wirelessPresentation),
    wirelessConference: asOptionalBoolean(value.wirelessConference),
    mst: asOptionalBoolean(value.mst),
    byod: asOptionalBoolean(value.byod),
    byom: asOptionalBoolean(value.byom),
  };

  return Object.values(wireless).some((entry) => entry != null)
    ? wireless
    : undefined;
}

function mapIntegration(value: CatalogProduct["integration"]): CatalogProduct["integration"] {
  if (!value || typeof value !== "object") return undefined;

  const integration = {
    rs232: asOptionalBoolean(value.rs232),
    ir: asOptionalBoolean(value.ir),
    lanControl: asOptionalBoolean(value.lanControl),
    webUi: asOptionalBoolean(value.webUi),
    api: asOptionalBoolean(value.api),
    cec: asOptionalBoolean(value.cec),
    relayCount: asOptionalNumber(value.relayCount),
    gpioCount: asOptionalNumber(value.gpioCount),
    poe: asOptionalBoolean(value.poe),
    poePd: asOptionalBoolean(value.poePd),
  };

  return Object.values(integration).some((entry) => entry != null)
    ? integration
    : undefined;
}

function mapPower(value: CatalogProduct["power"]): CatalogProduct["power"] {
  if (!value || typeof value !== "object") return undefined;

  const power = {
    powerSupplyType: tidy(value.powerSupplyType) || undefined,
    poc: asOptionalBoolean(value.poc),
    poh: asOptionalBoolean(value.poh),
    rackWidth: tidy(value.rackWidth) || undefined,
    formFactor: tidy(value.formFactor) || undefined,
    wallPlate: asOptionalBoolean(value.wallPlate),
    tableMount: asOptionalBoolean(value.tableMount),
  };

  return Object.values(power).some((entry) => entry != null && entry !== "")
    ? power
    : undefined;
}

export function normalizeTransport(value: unknown): CatalogTransport {
  const v = tidy(value).toLowerCase();

  if (v.includes("hdbaset")) return "HDBaseT";
  if (v.includes("avoip") || v.includes("networkhd")) return "AVoIP";
  if (v.includes("usb")) return "USB Extension";
  if (v.includes("local")) return "Local";

  return "Unknown";
}

export function normalizeFamily(value: unknown): string {
  const v = tidy(value);
  if (!v) return "Unknown";

  const lower = v.toLowerCase();

  if (lower.includes("apollo")) return "Apollo";
  if (lower.includes("networkhd")) return "NetworkHD";
  if (lower.includes("hdbaset")) return "HDBaseT";

  return v;
}

export function normalizeCategory(value: unknown): string {
  const v = tidy(value);
  if (!v) return "Uncategorized";
  return v;
}

export function normalizeCatalogProduct(input: CatalogProduct): CatalogProduct {
  const normalized: CatalogProduct = {
    ...input,
    sku: tidy(input.sku).toUpperCase(),
    name: tidy(input.name),
    family: normalizeFamily(input.family),
    category: normalizeCategory(input.category),
    subcategory: tidy(input.subcategory),
    summary: tidy(input.summary),
    sourceUrl: tidy(input.sourceUrl),
    technology: tidy(input.technology),
    topology: tidy(input.topology),
    role: tidy(input.role),
    directionality: tidy(input.directionality),
    outputBehavior: tidy(input.outputBehavior),
    inputTotal: asOptionalNumber(input.inputTotal),
    outputTotal: asOptionalNumber(input.outputTotal),
    latency: tidy(input.latency),
    transport: normalizeTransport(input.transport),
    video: mapVideo(input.video),
    distance: mapDistance(input.distance),
    usb: mapUsb(input.usb),
    wireless: mapWireless(input.wireless),
    integration: mapIntegration(input.integration),
    power: mapPower(input.power),

    features: Array.isArray(input.features)
      ? input.features.map((x) => tidy(x)).filter(Boolean)
      : [],

    control: Array.isArray(input.control)
      ? input.control.map((x) => tidy(x)).filter(Boolean)
      : [],

    audio: Array.isArray(input.audio)
      ? input.audio.map((x) => tidy(x)).filter(Boolean)
      : [],

    inputs: Array.isArray(input.inputs)
      ? input.inputs.map((x) => ({
          type: tidy(x.type),
          count: Number(x.count || 0),
        })).filter((x) => x.type && x.count > 0)
      : [],

    outputs: Array.isArray(input.outputs)
      ? input.outputs.map((x) => ({
          type: tidy(x.type),
          count: Number(x.count || 0),
        })).filter((x) => x.type && x.count > 0)
      : [],
  };

  const inferredIo = inferCatalogIo(normalized);
  const inferredMetadata = inferCatalogMetadata({
    ...normalized,
    inputs: inferredIo.inputs,
    outputs: inferredIo.outputs,
  });
  return {
    ...normalized,
    technology: normalized.technology || inferredMetadata.technology,
    topology: normalized.topology || inferredMetadata.topology,
    role: normalized.role || inferredMetadata.role,
    directionality: normalized.directionality || inferredMetadata.directionality,
    outputBehavior: normalized.outputBehavior || inferredMetadata.outputBehavior,
    distance: inferredMetadata.distance || normalized.distance,
    inputTotal: normalized.inputTotal ?? inferredIo.inputs.reduce((sum, entry) => sum + entry.count, 0),
    outputTotal: normalized.outputTotal ?? inferredIo.outputs.reduce((sum, entry) => sum + entry.count, 0),
    inputs: inferredIo.inputs,
    outputs: inferredIo.outputs,
  };
}

export function filterCatalog(
  products: CatalogProduct[],
  filters?: CatalogFilters
): CatalogProduct[] {
  if (!filters) return products;

  const q = tidy(filters.q).toLowerCase();

  return products.filter((p) => {
    if (filters.family && filters.family !== "All" && p.family !== filters.family)
      return false;

    if (filters.category && filters.category !== "All" && p.category !== filters.category)
      return false;

    if (filters.transport && filters.transport !== "All" && p.transport !== filters.transport)
      return false;

    if (filters.status && filters.status !== "All" && p.status !== filters.status)
      return false;

    if (!q) return true;

    const blob = [
      p.sku,
      p.name,
      p.family,
      p.category,
      p.subcategory,
      p.summary,
      ...(p.features || []),
      ...(p.control || []),
      ...(p.audio || []),
    ]
      .join(" ")
      .toLowerCase();

    return blob.includes(q);
  });
}
