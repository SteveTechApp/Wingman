import { normaliseSkuKey, resolveWyrestormSkuAlias } from "./skuAliasResolver";

export interface KnownWyrestormCompareProfile {
  sku: string;
  aliases: readonly string[];
  name: string;
  family: string;
  productClass: string;
  systemRole: string;
  matrixSize: string;
  routedInputCount: number;
  routedOutputCount: number;
  inputTypes: readonly string[];
  outputTypes: readonly string[];
  routedOutputTypes: readonly string[];
  transport: readonly string[];
  technologyFamily: string;
  maxResolution: string;
  resolution: string;
  chroma: string;
  hdmiVersion: string;
  hdcpVersion: string;
  distanceClass: string;
  mirroredOutputCount: number;
  mirroredOutputTypes: readonly string[];
  loopOutputCount: number;
  loopOutputTypes: readonly string[];
  receiverPackage: string;
  control: readonly string[];
  audio: readonly string[];
  power: readonly string[];
  comparisonNotes: readonly string[];
  dataSource: string;
}

const PROFILES: readonly KnownWyrestormCompareProfile[] = [
  {
    sku: "MXV-0808-H2A-V3",
    aliases: ["MXV-0808-H2A", "MXV0808H2A", "MXV-0808-H2A-V3"],
    name: "MXV-0808-H2A-V3 8x8 HDBaseT Matrix",
    family: "MXV Matrix",
    productClass: "HDBaseT matrix",
    systemRole: "8x8 fixed I/O matrix for routing HDMI sources to remote displays over HDBaseT.",
    matrixSize: "8x8",
    routedInputCount: 8,
    routedOutputCount: 8,
    inputTypes: ["HDMI"],
    outputTypes: ["HDBaseT"],
    routedOutputTypes: ["HDBaseT"],
    transport: ["HDMI", "HDBaseT"],
    technologyFamily: "HDBaseT Matrix",
    maxResolution: "Verify datasheet",
    resolution: "Verify datasheet",
    chroma: "Verify datasheet",
    hdmiVersion: "Verify datasheet",
    hdcpVersion: "Verify datasheet",
    distanceClass: "Standard HDBaseT matrix distance class - verify datasheet",
    mirroredOutputCount: 0,
    mirroredOutputTypes: [],
    loopOutputCount: 0,
    loopOutputTypes: [],
    receiverPackage: "Matrix product. Confirm receiver requirement separately.",
    control: ["IR - verify", "RS-232 - verify", "LAN/IP - verify"],
    audio: ["Audio support - verify datasheet"],
    power: ["PoC/PoH/PSU - verify datasheet"],
    comparisonNotes: ["Primary 8x8 HDBaseT matrix candidate for C88CS-style opportunities."],
    dataSource: "known-wyrestorm-compare-profile",
  },
  {
    sku: "MXV-0808-H2A-70-V3",
    aliases: ["MXV-0808-70-H2A", "MXV080870H2A", "MXV-0808-H2A-70", "MXV-0808-H2A-70-V3"],
    name: "MXV-0808-H2A-70-V3 8x8 Class A HDBaseT Matrix",
    family: "MXV Matrix",
    productClass: "HDBaseT matrix",
    systemRole: "8x8 fixed I/O matrix for longer-distance HDBaseT routing.",
    matrixSize: "8x8",
    routedInputCount: 8,
    routedOutputCount: 8,
    inputTypes: ["HDMI"],
    outputTypes: ["HDBaseT"],
    routedOutputTypes: ["HDBaseT"],
    transport: ["HDMI", "HDBaseT"],
    technologyFamily: "HDBaseT Matrix",
    maxResolution: "Verify datasheet",
    resolution: "Verify datasheet",
    chroma: "Verify datasheet",
    hdmiVersion: "Verify datasheet",
    hdcpVersion: "Verify datasheet",
    distanceClass: "Longer-distance / Class A HDBaseT direction - verify exact datasheet distance",
    mirroredOutputCount: 0,
    mirroredOutputTypes: [],
    loopOutputCount: 0,
    loopOutputTypes: [],
    receiverPackage: "Matrix product. Confirm receiver requirement separately.",
    control: ["IR - verify", "RS-232 - verify", "LAN/IP - verify"],
    audio: ["Audio support - verify datasheet"],
    power: ["PoC/PoH/PSU - verify datasheet"],
    comparisonNotes: ["Longer-distance 8x8 HDBaseT matrix candidate."],
    dataSource: "known-wyrestorm-compare-profile",
  },
  {
    sku: "MXV-0808-H2A-KIT",
    aliases: ["MXV-0808-H2A-KIT", "MXV0808H2AKIT"],
    name: "MXV-0808-H2A-KIT 8x8 HDBaseT Matrix Kit",
    family: "MXV Matrix Kit",
    productClass: "HDBaseT matrix kit",
    systemRole: "8x8 HDBaseT matrix package where receivers are included.",
    matrixSize: "8x8",
    routedInputCount: 8,
    routedOutputCount: 8,
    inputTypes: ["HDMI"],
    outputTypes: ["HDBaseT"],
    routedOutputTypes: ["HDBaseT"],
    transport: ["HDMI", "HDBaseT"],
    technologyFamily: "HDBaseT Matrix Kit",
    maxResolution: "Verify datasheet",
    resolution: "Verify datasheet",
    chroma: "Verify datasheet",
    hdmiVersion: "Verify datasheet",
    hdcpVersion: "Verify datasheet",
    distanceClass: "Verify kit distance class and receiver type",
    mirroredOutputCount: 0,
    mirroredOutputTypes: [],
    loopOutputCount: 0,
    loopOutputTypes: [],
    receiverPackage: "KIT SKU: receivers included. Do not classify as TX-only or RX-only.",
    control: ["IR - verify", "RS-232 - verify", "LAN/IP - verify"],
    audio: ["Audio support - verify datasheet"],
    power: ["PoC/PoH/PSU - verify datasheet"],
    comparisonNotes: ["Package/kit candidate where included receivers matter."],
    dataSource: "known-wyrestorm-compare-profile",
  },
  {
    sku: "MX-0808-KIT-V2",
    aliases: ["MX-0808-KIT", "MX0808KIT", "MX-0808-KIT-V2"],
    name: "MX-0808-KIT-V2 8x8 HDBaseT Matrix Kit",
    family: "MX Matrix Kit",
    productClass: "HDBaseT matrix kit",
    systemRole: "8x8 HDBaseT matrix package with mirrored HDMI outputs and included receiver package.",
    matrixSize: "8x8",
    routedInputCount: 8,
    routedOutputCount: 8,
    inputTypes: ["HDMI"],
    outputTypes: ["HDBaseT"],
    routedOutputTypes: ["HDBaseT"],
    transport: ["HDMI", "HDBaseT"],
    technologyFamily: "HDBaseT Matrix Kit",
    maxResolution: "4K60 4:2:0 - verify datasheet",
    resolution: "4K60 4:2:0 - verify datasheet",
    chroma: "4:2:0 - verify datasheet",
    hdmiVersion: "Verify datasheet",
    hdcpVersion: "Verify datasheet",
    distanceClass: "Verify kit distance class from datasheet",
    mirroredOutputCount: 8,
    mirroredOutputTypes: ["HDMI"],
    loopOutputCount: 0,
    loopOutputTypes: [],
    receiverPackage: "KIT SKU: receivers included in the box. Mirrored HDMI outputs are features, not extra matrix outputs.",
    control: ["IR - verify", "RS-232 - verify", "LAN/IP - verify"],
    audio: ["Audio support - verify datasheet"],
    power: ["PoC/PoH/PSU - verify datasheet"],
    comparisonNotes: ["Mirrored HDMI outputs must not be counted as independent routed outputs."],
    dataSource: "known-wyrestorm-compare-profile",
  },
];

export function findKnownWyrestormCompareProfile(sku: string): KnownWyrestormCompareProfile | undefined {
  const canonical = resolveWyrestormSkuAlias(sku);
  const key = normaliseSkuKey(canonical);

  return PROFILES.find((profile) => {
    return normaliseSkuKey(profile.sku) === key || profile.aliases.some((alias) => normaliseSkuKey(alias) === key);
  });
}

export function hydrateWyrestormCompareProfile<T extends Record<string, unknown>>(input: T): T & Record<string, unknown> {
  const rawSku = String(input.sku ?? input.model ?? input.partNumber ?? "");
  const profile = findKnownWyrestormCompareProfile(rawSku);

  if (!profile) {
    return input;
  }

  return {
    ...input,
    ...profile,
    sku: profile.sku,
    name: profile.name,
    title: profile.name,
    family: profile.family,
    category: profile.productClass,
    role: profile.systemRole,
    inputCount: profile.routedInputCount,
    outputCount: profile.routedOutputCount,
    inputs: profile.routedInputCount,
    outputs: profile.routedOutputCount,
    sourceCount: profile.routedInputCount,
    displayCount: profile.routedOutputCount,
    sourceType: profile.inputTypes.join(", "),
    outputTransport: profile.outputTypes.join(", "),
    specTier: profile.dataSource,
  };
}

export function knownWyrestormCompareProfileSkus(): string[] {
  return PROFILES.map((profile) => profile.sku);
}