import type { AvoipSubtype, DeviceRole, HdbtGeneration, TransportClass } from "./types";

export type FamilyRule = {
  id: string;
  skuPattern: RegExp;
  brandPattern?: RegExp;
  transport?: TransportClass;
  avoipSubtype?: AvoipSubtype;
  hdbtGeneration?: HdbtGeneration;
  role?: DeviceRole;
  multiview?: boolean;
  notes?: string;
};

export const FAMILY_RULES: FamilyRule[] = [
  {
    id: "wyrestorm-nhd-150-rx",
    skuPattern: /^NHD-150-RX/i,
    transport: "AVOIP",
    avoipSubtype: "MULTIVIEW",
    role: "MULTIVIEW_DECODER",
    multiview: true,
    notes: "WyreStorm NHD-150-RX is multiview-specific.",
  },
  {
    id: "wyrestorm-nhd-100-series",
    skuPattern: /^NHD-(100|110|120|140)/i,
    transport: "AVOIP",
    avoipSubtype: "JPEG2000",
    role: "DECODER",
  },
  {
    id: "wyrestorm-nhd-200-series",
    skuPattern: /^NHD-2\d{2}/i,
    transport: "AVOIP",
    avoipSubtype: "JPEG2000",
    role: "DECODER",
  },
  {
    id: "wyrestorm-nhd-500-series",
    skuPattern: /^NHD-5\d{2}/i,
    transport: "AVOIP",
    avoipSubtype: "JPEG2000",
    role: "DECODER",
  },
  {
    id: "wyrestorm-nhd-600-series",
    skuPattern: /^NHD-6\d{2}/i,
    transport: "AVOIP",
    avoipSubtype: "JPEG2000",
    role: "ENCODER",
  },
  {
    id: "wyrestorm-sw-tx3",
    skuPattern: /^SW-.*TX3/i,
    transport: "HDBASET",
    hdbtGeneration: "HDBT_3_0",
    role: "ENCODER",
  },
  {
    id: "wyrestorm-sw-rx3",
    skuPattern: /^SW-.*RX3/i,
    transport: "HDBASET",
    hdbtGeneration: "HDBT_3_0",
    role: "DECODER",
  },
  {
    id: "extron-dtp-t",
    skuPattern: /\bDTP\s+T\b/i,
    brandPattern: /\bExtron\b/i,
    transport: "HDBASET",
    hdbtGeneration: "HDBT_2_0",
    role: "ENCODER",
  },
  {
    id: "extron-dtp-r",
    skuPattern: /\bDTP\s+R\b/i,
    brandPattern: /\bExtron\b/i,
    transport: "HDBASET",
    hdbtGeneration: "HDBT_2_0",
    role: "DECODER",
  },
  {
    id: "extron-nav",
    skuPattern: /\bNAV\b/i,
    brandPattern: /\bExtron\b/i,
    transport: "AVOIP",
    avoipSubtype: "PROPRIETARY",
  },
  {
    id: "crestron-nvx",
    skuPattern: /\bNVX\b/i,
    brandPattern: /\bCrestron\b/i,
    transport: "AVOIP",
    avoipSubtype: "PROPRIETARY",
  },
  {
    id: "atlona-omni",
    skuPattern: /\bOMNI\b/i,
    brandPattern: /\bAtlona\b/i,
    transport: "AVOIP",
    avoipSubtype: "PROPRIETARY",
  },
  {
    id: "atlona-ome",
    skuPattern: /\bOME\b/i,
    brandPattern: /\bAtlona\b/i,
    transport: "HDBASET",
    hdbtGeneration: "HDBT_2_0",
  },
  {
    id: "kramer-kds",
    skuPattern: /\bKDS\b/i,
    brandPattern: /\bKramer\b/i,
    transport: "AVOIP",
    avoipSubtype: "H264_H265",
  },
  {
    id: "blustream-ip300",
    skuPattern: /\bIP300\b/i,
    brandPattern: /\bBluStream\b/i,
    transport: "AVOIP",
    avoipSubtype: "JPEG2000",
  },
  {
    id: "blustream-ip350",
    skuPattern: /\bIP350\b/i,
    brandPattern: /\bBluStream\b/i,
    transport: "AVOIP",
    avoipSubtype: "JPEG2000",
  },
  {
    id: "sdvoe-generic",
    skuPattern: /\bSDVOE\b/i,
    transport: "AVOIP",
    avoipSubtype: "SDVOE",
  }
];