import * as React from "react";

export type ProductCategory =
  | "switcher"
  | "matrix"
  | "extender"
  | "avoverip"
  | "processor"
  | "camera"
  | "accessory";

export type ProductLifecycle = "active" | "nrnd" | "eol";

export type VideoSpec = {
  maxResolution: "1080p" | "4K30" | "4K60";
  maxBandwidthGbps: number;
  chroma?: "4:2:0" | "4:4:4";
  hdrSupport?: boolean;
};

export type TransmissionSpec = {
  type: "hdmi" | "hdbaset" | "avoverip";
  maxDistanceMeters?: number;
};

export type CompatibilitySpec = {
  requiresCompanion?: string[];
  incompatibleWith?: string[];
};

export type ProductCapability = {
  sku: string;
  name: string;
  category: ProductCategory;
  lifecycle: ProductLifecycle;
  video?: VideoSpec;
  transmission?: TransmissionSpec;
  compatibility?: CompatibilitySpec;
};