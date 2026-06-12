import { hydrateWyrestormCompareProfile, knownWyrestormCompareProfileSkus } from "./knownWyrestormCompareProfiles";

const KNOWN_WYRESTORM_MATRIX_PROFILE_ALIASES = [
  "MXV-0808-H2A",
  "MXV-0808-70-H2A",
  "MX-0808-KIT",
] as const;

const KNOWN_WYRESTORM_MATRIX_PROFILE_SOURCE = "known-wyrestorm-profile";

export interface KnownWyrestormMatrixProfile {
  sku: string;
  name: string;
  family: string;
  productClass: string;
  systemRole: string;
  matrixSize: string;
  inputCount: number;
  outputCount: number;
  inputTypes: readonly string[];
  outputTypes: readonly string[];
  transport: readonly string[];
  technologyFamily: string;
  resolution: string;
  chroma: string;
  hdmiVersion: string;
  hdcpVersion: string;
  distanceClass: string;
  receiverPackage: string;
  control: readonly string[];
  audio: readonly string[];
  power: readonly string[];
  comparisonNotes: readonly string[];
}

export function findKnownWyrestormMatrixProfile(sku: string): KnownWyrestormMatrixProfile | undefined {
  const hydrated = hydrateWyrestormCompareProfile({ sku });

  if (!hydrated || hydrated.sku === sku && !hydrated.productClass) {
    return undefined;
  }

  return {
    sku: String(hydrated.sku ?? sku),
    name: String(hydrated.name ?? sku),
    family: String(hydrated.family ?? "WyreStorm matrix"),
    productClass: String(hydrated.productClass ?? "HDBaseT matrix"),
    systemRole: String(hydrated.systemRole ?? "Matrix routing product"),
    matrixSize: String(hydrated.matrixSize ?? "8x8"),
    inputCount: Number(hydrated.routedInputCount ?? hydrated.inputCount ?? 8),
    outputCount: Number(hydrated.routedOutputCount ?? hydrated.outputCount ?? 8),
    inputTypes: Array.isArray(hydrated.inputTypes) ? hydrated.inputTypes as string[] : ["HDMI"],
    outputTypes: Array.isArray(hydrated.outputTypes) ? hydrated.outputTypes as string[] : ["HDBaseT"],
    transport: Array.isArray(hydrated.transport) ? hydrated.transport as string[] : ["HDMI", "HDBaseT"],
    technologyFamily: String(hydrated.technologyFamily ?? "HDBaseT Matrix"),
    resolution: String(hydrated.resolution ?? "Verify datasheet"),
    chroma: String(hydrated.chroma ?? "Verify datasheet"),
    hdmiVersion: String(hydrated.hdmiVersion ?? "Verify datasheet"),
    hdcpVersion: String(hydrated.hdcpVersion ?? "Verify datasheet"),
    distanceClass: String(hydrated.distanceClass ?? "Verify datasheet"),
    receiverPackage: String(hydrated.receiverPackage ?? "Confirm receiver requirement separately."),
    control: Array.isArray(hydrated.control) ? hydrated.control as string[] : ["IR - verify", "RS-232 - verify", "LAN/IP - verify"],
    audio: Array.isArray(hydrated.audio) ? hydrated.audio as string[] : ["Audio support - verify datasheet"],
    power: Array.isArray(hydrated.power) ? hydrated.power as string[] : ["Power method - verify datasheet"],
    comparisonNotes: Array.isArray(hydrated.comparisonNotes) ? hydrated.comparisonNotes as string[] : [],
  };
}

export function enrichWyrestormProductWithKnownMatrixProfile<T extends Record<string, unknown>>(product: T, skuOverride?: string): T & Record<string, unknown> {
  const sku = skuOverride ?? String(product.sku ?? product.model ?? product.partNumber ?? "");
  return hydrateWyrestormCompareProfile({ ...product, sku });
}

export function knownWyrestormMatrixProfileSummary(): string[] {
  return [
    ...knownWyrestormCompareProfileSkus(),
    ...KNOWN_WYRESTORM_MATRIX_PROFILE_ALIASES,
    KNOWN_WYRESTORM_MATRIX_PROFILE_SOURCE,
  ];
}
