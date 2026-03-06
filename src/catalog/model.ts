import * as React from "react";

export type Lifecycle = "current" | "legacy" | "eol";

export type ProductCategory =
  | "AVoIP"
  | "Matrix"
  | "Switcher"
  | "Extender"
  | "VideoWall"
  | "KVM"
  | "Control"
  | "Audio"
  | "Accessories"
  | "Other";

export type ProductRole = "TX" | "RX" | "TRX" | "N/A";

export type VideoSpec = {
  maxResolution?: string; // "4K60 4:4:4"
  hdr?: boolean;
  hdmi?: string; // "2.0" / "2.1"
  bandwidthGbps?: number; // 18 / 48 etc
};

export type IoSpec = {
  inputs?: number;
  outputs?: number;
};

export type Pricing = {
  cost?: number;      // internal / distributor cost baseline
  msrp?: number;      // list
  targetSell?: number; // recommended sell
  currency?: string;  // "GBP"
};

export type Product = {
  sku: string;
  name: string;

  family?: string;       // "NHD", "MX", "SW", "APO"
  category?: ProductCategory | string;
  role?: ProductRole | string;

  lifecycle?: Lifecycle;

  tags?: string[];
  features?: string[];

  video?: VideoSpec;
  io?: IoSpec;

  latency?: string; // "low", "subframe", "1f", etc (catalog-side)
  notes?: string;

  pricing?: Pricing;
};