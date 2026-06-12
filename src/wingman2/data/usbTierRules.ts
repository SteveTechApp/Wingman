export type UsbStandard = "USB 1.1" | "USB 2.0" | "USB 3.0";
export type UsbTierStandard = UsbStandard | "USB 3.0/2.0";

export interface UsbTierRule {
  path: string;
  usbStandard: UsbTierStandard;
  tiers: number;
  hostType?: string;
  outputPath?: string;
  maxDownstreamHubs?: number;
  maxDevices?: number;
  maxEndpoints?: number;
  enhancedCascading?: boolean;
  wirelessConferencingNoHub?: boolean;
  notes?: readonly string[];
}

export interface UsbProductUsbRule {
  sku: string;
  aliases?: readonly string[];
  family?: string;
  supportsUsb: boolean;
  technicalReviewRequired?: boolean;
  enhancedCascading?: boolean;
  noAdditionalHubsRecommended?: boolean;
  notes?: readonly string[];
  tierRules: readonly UsbTierRule[];
}

export const USB_GLOBAL_RULES = {
  maxStandardUsbTiers: 5,
  testRecommendedAtTierCount: 5,
  hdbtForcesUsb2: true,
  productsNotListedDoNotSupportUsb: true,
} as const;

export const USB_PRODUCTS_WITH_ENHANCED_CASCADING = [
  "EX-100-KVM",
  "SW-120-TX3",
  "SW-120-TX3-UK",
  "SW-120-TX3-US",
  "RX3-100",
  "SWX-100-HDBT3",
  "SWX-100-IW-UK",
  "EX-40-KVM-5K",
  "NHD-500-TX",
  "NHD-500-TX V2",
  "NHD-500-RX",
  "NHD-500-RX V2",
  "NHD-500-DNT-TX",
  "NHD-510-TX",
] as const;

export const USB_TIER_RULES: readonly UsbProductUsbRule[] = [
  {
    sku: "EX-60-USB2",
    supportsUsb: true,
    noAdditionalHubsRecommended: true,
    notes: ["Built-in 4-level USB hub. Cascading additional hubs or extenders is not recommended."],
    tierRules: [
      { path: "USB 2.0 extension", usbStandard: "USB 2.0", tiers: 4 },
    ],
  },
  {
    sku: "EX-80-KVM",
    supportsUsb: true,
    noAdditionalHubsRecommended: true,
    notes: ["Additional hubs not recommended."],
    tierRules: [
      { path: "USB 2.0 KVM extension", usbStandard: "USB 2.0", tiers: 4 },
    ],
  },
  {
    sku: "EX-100-USB3",
    supportsUsb: true,
    tierRules: [
      { path: "USB 3.0 extension", usbStandard: "USB 3.0", tiers: 2, maxDevices: 127 },
      { path: "USB 2.0 extension", usbStandard: "USB 2.0", tiers: 1, maxDevices: 7, maxEndpoints: 13 },
    ],
  },
  {
    sku: "EX-40-KVM-5K",
    supportsUsb: true,
    enhancedCascading: true,
    tierRules: [
      { path: "USB 2.0 KVM extension", usbStandard: "USB 2.0", tiers: 1, maxDownstreamHubs: 8, maxDevices: 7, maxEndpoints: 13, enhancedCascading: true },
    ],
  },
  {
    sku: "EX-100-KVM",
    supportsUsb: true,
    enhancedCascading: true,
    tierRules: [
      { path: "USB 2.0 KVM extension", usbStandard: "USB 2.0", tiers: 1, maxDownstreamHubs: 6, maxDevices: 7, maxEndpoints: 11, enhancedCascading: true },
    ],
  },
  {
    sku: "EX-100-IW-USBC",
    supportsUsb: true,
    tierRules: [
      { path: "USB 3.0 extension", usbStandard: "USB 3.0", tiers: 2, maxDevices: 127 },
      { path: "USB 2.0 extension", usbStandard: "USB 2.0", tiers: 1, maxDevices: 7, maxEndpoints: 13 },
    ],
  },
  {
    sku: "TX-35-IWC-KVM",
    supportsUsb: true,
    notes: ["Use with RX-500."],
    tierRules: [
      { path: "USB 2.0 KVM transmitter", usbStandard: "USB 2.0", tiers: 1, maxDevices: 7, maxEndpoints: 11 },
    ],
  },
  {
    sku: "TX-35-IW-KVM",
    supportsUsb: true,
    notes: ["Use with RX-500."],
    tierRules: [
      { path: "USB 2.0 KVM transmitter", usbStandard: "USB 2.0", tiers: 1, maxDevices: 7, maxEndpoints: 11 },
    ],
  },
  {
    sku: "SW-120-TX3",
    aliases: ["SW-120-TX3-UK", "SW-120-TX3-US"],
    supportsUsb: true,
    enhancedCascading: true,
    notes: ["Use with RX3-100."],
    tierRules: [
      { path: "USB 2.0 HDBaseT transmitter", usbStandard: "USB 2.0", tiers: 1, maxDevices: 7, maxEndpoints: 13, enhancedCascading: true },
    ],
  },
  {
    sku: "SW-120-TX3-UK",
    aliases: ["SW-120-TX3"],
    supportsUsb: true,
    enhancedCascading: true,
    notes: ["Use with RX3-100."],
    tierRules: [
      { path: "USB 2.0 HDBaseT transmitter", usbStandard: "USB 2.0", tiers: 1, maxDevices: 7, maxEndpoints: 13, enhancedCascading: true },
    ],
  },
  {
    sku: "SW-120-TX3-US",
    aliases: ["SW-120-TX3"],
    supportsUsb: true,
    enhancedCascading: true,
    notes: ["Use with RX3-100."],
    tierRules: [
      { path: "USB 2.0 HDBaseT transmitter", usbStandard: "USB 2.0", tiers: 1, maxDevices: 7, maxEndpoints: 13, enhancedCascading: true },
    ],
  },
  {
    sku: "SW-130-TX-UK",
    supportsUsb: true,
    notes: ["Use with RX-500."],
    tierRules: [
      { path: "USB 2.0 HDBaseT transmitter", usbStandard: "USB 2.0", tiers: 1, maxDevices: 7, maxEndpoints: 11 },
    ],
  },
  {
    sku: "SW-130-TX-US",
    supportsUsb: true,
    notes: ["Use with RX-500."],
    tierRules: [
      { path: "USB 2.0 HDBaseT transmitter", usbStandard: "USB 2.0", tiers: 1, maxDevices: 7, maxEndpoints: 11 },
    ],
  },
  {
    sku: "RX3-100",
    supportsUsb: true,
    enhancedCascading: true,
    notes: ["Use with SW-120-TX series."],
    tierRules: [
      { path: "USB 2.0 HDBaseT receiver", usbStandard: "USB 2.0", tiers: 1, maxDownstreamHubs: 8, maxDevices: 7, maxEndpoints: 13, enhancedCascading: true },
    ],
  },
  {
    sku: "RX-700",
    supportsUsb: true,
    notes: ["Use with SW-130-TX series."],
    tierRules: [
      { path: "USB 2.0 receiver", usbStandard: "USB 2.0", tiers: 1, maxDownstreamHubs: 6, maxDevices: 7, maxEndpoints: 11 },
    ],
  },
  {
    sku: "RX-500",
    supportsUsb: true,
    notes: ["Use with SW-130-TX series."],
    tierRules: [
      { path: "USB 2.0 receiver", usbStandard: "USB 2.0", tiers: 1, maxDownstreamHubs: 6, maxDevices: 7, maxEndpoints: 11 },
    ],
  },
  {
    sku: "MX-0403-H3-MST",
    supportsUsb: true,
    tierRules: [
      { path: "USB-C local", usbStandard: "USB 3.0/2.0", tiers: 2, maxDevices: 127 },
      { path: "USB-B local", usbStandard: "USB 3.0/2.0", tiers: 2, maxDevices: 127 },
      { path: "HDBaseT extension", usbStandard: "USB 2.0", tiers: 4, maxDevices: 7, maxEndpoints: 13 },
    ],
  },
  {
    sku: "MX-0403-H3-MST V2",
    aliases: ["MX-0403-H3-MST v2"],
    supportsUsb: true,
    tierRules: [
      { path: "USB-C local", usbStandard: "USB 3.0/2.0", tiers: 2, maxDevices: 127 },
      { path: "USB-B local", usbStandard: "USB 3.0/2.0", tiers: 2, maxDevices: 127 },
      { path: "HDBaseT extension", usbStandard: "USB 2.0", tiers: 3, maxDevices: 7, maxEndpoints: 13 },
    ],
  },
  {
    sku: "MX-0402-MST",
    supportsUsb: true,
    tierRules: [
      { path: "USB-C local", usbStandard: "USB 3.0/2.0", tiers: 2, maxDevices: 127 },
      { path: "USB-B local", usbStandard: "USB 3.0/2.0", tiers: 2, maxDevices: 127 },
    ],
  },
  {
    sku: "SW-515-RX",
    supportsUsb: true,
    notes: ["Use with SW-510-TX."],
    tierRules: [
      { path: "Local USB 2.0", usbStandard: "USB 2.0", tiers: 1 },
      { path: "HDBaseT extension", usbStandard: "USB 2.0", tiers: 2, maxDownstreamHubs: 5, maxEndpoints: 11 },
    ],
  },
  {
    sku: "SW-510-TX",
    aliases: ["SW-510-TX V1", "SW-510-TX v1"],
    supportsUsb: true,
    notes: ["Use with SW-515-RX."],
    tierRules: [
      { path: "Local USB 2.0", usbStandard: "USB 2.0", tiers: 1 },
      { path: "HDBaseT extension", usbStandard: "USB 2.0", tiers: 2, maxEndpoints: 11 },
    ],
  },
  {
    sku: "MX-0804-SCL",
    supportsUsb: true,
    tierRules: [
      { path: "USB-C local", hostType: "USB-C", usbStandard: "USB 3.0", tiers: 2, maxDevices: 127 },
      { path: "USB-C local", hostType: "USB-C", usbStandard: "USB 2.0", tiers: 2, maxDevices: 127 },
      { path: "USB-B local", hostType: "USB-B", usbStandard: "USB 3.0", tiers: 1, maxDevices: 127 },
      { path: "USB-B local", hostType: "USB-B", usbStandard: "USB 2.0", tiers: 1, maxDevices: 127 },
    ],
  },
  {
    sku: "MX-1007-HYB",
    supportsUsb: true,
    technicalReviewRequired: true,
    notes: ["Complex USB configuration. Confirm final setup with WyreStorm technical support before installation."],
    tierRules: [
      { path: "USB-C local", hostType: "USB-C", outputPath: "Local", usbStandard: "USB 3.0/2.0", tiers: 2 },
      { path: "USB-C HDBT RX3-100", hostType: "USB-C", outputPath: "HDBT", usbStandard: "USB 2.0", tiers: 4 },
      { path: "USB-C NHD NHD-500-RX v2", hostType: "USB-C", outputPath: "NHD", usbStandard: "USB 2.0", tiers: 4 },
      { path: "USB-B local", hostType: "USB-B", outputPath: "Local", usbStandard: "USB 3.0/2.0", tiers: 1 },
      { path: "USB-B HDBT RX3-100", hostType: "USB-B", outputPath: "HDBT", usbStandard: "USB 2.0", tiers: 3 },
      { path: "USB-B NHD NHD-500-RX v2", hostType: "USB-B", outputPath: "NHD", usbStandard: "USB 2.0", tiers: 3 },
      { path: "HDBT host to local USB-A device", hostType: "HDBT", outputPath: "Local", usbStandard: "USB 2.0", tiers: 1, maxDownstreamHubs: 3 },
      { path: "HDBT host to HDBT output RX3-100", hostType: "HDBT", outputPath: "HDBT", usbStandard: "USB 2.0", tiers: 1, maxDownstreamHubs: 8 },
      { path: "HDBT host to NHD output NHD-500-RX v2", hostType: "HDBT", outputPath: "NHD", usbStandard: "USB 2.0", tiers: 1 },
      { path: "NHD host to local USB-A device", hostType: "NHD", outputPath: "Local", usbStandard: "USB 2.0", tiers: 1 },
      { path: "NHD host to HDBT output RX3-100", hostType: "NHD", outputPath: "HDBT", usbStandard: "USB 2.0", tiers: 1 },
      { path: "NHD host to NHD output NHD-500-RX v2", hostType: "NHD", outputPath: "NHD", usbStandard: "USB 2.0", tiers: 1 },
    ],
  },
  {
    sku: "MX-0808-SCL",
    supportsUsb: true,
    tierRules: [
      { path: "USB-C local", hostType: "USB-C", usbStandard: "USB 3.0/2.0", tiers: 2, maxDevices: 127 },
      { path: "USB-B local", hostType: "USB-B", usbStandard: "USB 3.0/2.0", tiers: 1, maxDevices: 127 },
    ],
  },
  {
    sku: "MX-0812-SCL",
    supportsUsb: true,
    tierRules: [
      { path: "USB-B local", hostType: "USB-B", usbStandard: "USB 3.0/2.0", tiers: 1, maxDevices: 127 },
    ],
  },
  {
    sku: "NHD-500-TX V2",
    aliases: ["NHD-500-TX v2", "NHD-500-TX"],
    family: "NetworkHD 500",
    supportsUsb: true,
    enhancedCascading: true,
    tierRules: [
      { path: "NetworkHD 500 USB 2.0 transmitter", usbStandard: "USB 2.0", tiers: 2, maxDevices: 7, maxEndpoints: 21, enhancedCascading: true },
    ],
  },
  {
    sku: "NHD-500-RX V2",
    aliases: ["NHD-500-RX v2", "NHD-500-RX"],
    family: "NetworkHD 500",
    supportsUsb: true,
    enhancedCascading: true,
    notes: ["Receiver-side path should be validated with the paired NetworkHD 500 transmitter rule."],
    tierRules: [
      { path: "NetworkHD 500 receiver path", usbStandard: "USB 2.0", tiers: 0, enhancedCascading: true },
    ],
  },
  {
    sku: "NHD-500-DNT-TX",
    family: "NetworkHD 500",
    supportsUsb: true,
    enhancedCascading: true,
    tierRules: [
      { path: "NetworkHD 500 Dante transmitter", usbStandard: "USB 2.0", tiers: 2, maxDevices: 7, maxEndpoints: 21, enhancedCascading: true },
    ],
  },
  {
    sku: "NHD-510-TX",
    family: "NetworkHD 500",
    supportsUsb: true,
    enhancedCascading: true,
    tierRules: [
      { path: "NetworkHD 510 transmitter", usbStandard: "USB 2.0", tiers: 2, maxDevices: 7, maxEndpoints: 21, enhancedCascading: true },
    ],
  },
  {
    sku: "NHD-500-IW-TX",
    family: "NetworkHD 500",
    supportsUsb: true,
    tierRules: [
      { path: "NetworkHD 500 in-wall transmitter", usbStandard: "USB 2.0", tiers: 1, maxDevices: 7, maxEndpoints: 21 },
    ],
  },
  {
    sku: "NHD-USB-TRX",
    family: "NetworkHD",
    supportsUsb: true,
    tierRules: [
      { path: "NetworkHD USB transceiver", usbStandard: "USB 2.0", tiers: 2, maxDevices: 7, maxEndpoints: 21 },
    ],
  },
  {
    sku: "NHD-600-TRX",
    family: "NetworkHD 600",
    supportsUsb: true,
    tierRules: [
      { path: "NetworkHD 600 USB 1.1", usbStandard: "USB 1.1", tiers: 1, maxDownstreamHubs: 8, maxDevices: 3, maxEndpoints: 15 },
    ],
  },
  {
    sku: "NHD-600-TRXF",
    family: "NetworkHD 600",
    supportsUsb: true,
    tierRules: [
      { path: "NetworkHD 600 fibre USB 2.0", usbStandard: "USB 2.0", tiers: 1, maxDownstreamHubs: 4, maxDevices: 29 },
    ],
  },
  {
    sku: "NHD-610-TX-V2",
    aliases: ["NHD-610-TX v2"],
    family: "NetworkHD 600",
    supportsUsb: true,
    tierRules: [
      { path: "NetworkHD 610 USB 1.1", usbStandard: "USB 1.1", tiers: 1, maxDownstreamHubs: 8, maxDevices: 3, maxEndpoints: 15 },
    ],
  },
  {
    sku: "SW-620-TX-W",
    supportsUsb: true,
    tierRules: [
      { path: "USB-C input", hostType: "USB-C", usbStandard: "USB 3.0/2.0", tiers: 2 },
      { path: "USB host", hostType: "USB Host", usbStandard: "USB 3.0/2.0", tiers: 2 },
      { path: "Wireless conferencing mode", usbStandard: "USB 3.0/2.0", tiers: 0, wirelessConferencingNoHub: true },
    ],
  },
  {
    sku: "SW-640L-TX-W",
    supportsUsb: true,
    tierRules: [
      { path: "USB-C input", hostType: "USB-C", usbStandard: "USB 3.0/2.0", tiers: 2 },
      { path: "USB host", hostType: "USB Host", usbStandard: "USB 3.0/2.0", tiers: 1 },
      { path: "Wireless conferencing mode", usbStandard: "USB 3.0/2.0", tiers: 0, wirelessConferencingNoHub: true },
    ],
  },
  {
    sku: "CAM-0402-NDI-BRG",
    supportsUsb: true,
    tierRules: [
      { path: "Camera port", usbStandard: "USB 2.0", tiers: 0 },
      { path: "Device port", usbStandard: "USB 2.0", tiers: 1, notes: ["1 tier applies to USB device ports such as speakerphones."] },
    ],
  },
  {
    sku: "CAM-0402-BRG",
    supportsUsb: true,
    tierRules: [
      { path: "Camera port", usbStandard: "USB 2.0", tiers: 0 },
      { path: "Device port", usbStandard: "USB 2.0", tiers: 1, notes: ["1 tier applies to USB device ports such as speakerphones."] },
    ],
  },
  {
    sku: "EX-100-KVM-IP",
    supportsUsb: true,
    tierRules: [
      { path: "USB 2.0 IP KVM", usbStandard: "USB 2.0", tiers: 1, maxDevices: 16, maxEndpoints: 256 },
      { path: "USB 1.1 IP KVM", usbStandard: "USB 1.1", tiers: 1, maxEndpoints: 16 },
    ],
  },
  {
    sku: "CAB-USBC-15",
    supportsUsb: true,
    tierRules: [
      { path: "USB-C active cable", usbStandard: "USB 3.0", tiers: 0 },
      { path: "USB-C active cable", usbStandard: "USB 2.0", tiers: 2 },
    ],
  },
  {
    sku: "CAB-UAOC-USBC-10",
    supportsUsb: true,
    tierRules: [
      { path: "USB-C active optical cable", usbStandard: "USB 3.0", tiers: 0 },
      { path: "USB-C active optical cable", usbStandard: "USB 2.0", tiers: 2 },
    ],
  },
] as const;

export function normaliseUsbSku(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/_/g, "-")
    .toUpperCase();
}

export function findUsbProductRule(sku: string): UsbProductUsbRule | undefined {
  const target = normaliseUsbSku(sku);

  return USB_TIER_RULES.find((product) => {
    if (normaliseUsbSku(product.sku) === target) {
      return true;
    }

    return Boolean(product.aliases?.some((alias) => normaliseUsbSku(alias) === target));
  });
}