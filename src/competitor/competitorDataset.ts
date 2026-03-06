import * as React from "react";
import type { CompetitorItem, Product } from "./types";

/**
 * AUTO-GENERATED from repo JSON candidates by tools\wingman-build-competitor-dataset.ps1
 * Review and curate as needed.
 */

export const WYRESTORM_PRODUCTS: Product[] = [
  {
    brand: "WyreStorm",
    sku: "CAM-420-PTZ",
    name: "4K dual-lens AI PTZ Camera",
    family: "Camera",
    features: ["camera", "ndi", "ptz", "usb"],
  },
  {
    brand: "WyreStorm",
    sku: "NHD-150-RX",
    name: "NetworkHD 150 Decoder",
    category: "av-over-ip",
    role: "RX",
    family: "NetworkHD",
    video: { maxResolution: "4K60", bandwidthGbps: 18 },
    features: ["AVoIP", "Multiview"],
  },
  {
    brand: "WyreStorm",
    sku: "NHD-150-TX",
    name: "NetworkHD 150 Encoder",
    category: "av-over-ip",
    role: "TX",
    family: "NetworkHD",
    video: { maxResolution: "4K60", bandwidthGbps: 18 },
    features: ["AVoIP", "H.264/265"],
  },
  {
    brand: "WyreStorm",
    sku: "SW-620-TX-W",
    name: "Synergy 2-Input 4K60Hz Presentation Switcher",
    category: "extender",
    role: "tx",
    family: "HDBaseT",
    features: ["multiview", "presentation", "usb-c", "wireless"],
  },
];

export const COMPETITOR_SAMPLES: CompetitorItem[] = [];
