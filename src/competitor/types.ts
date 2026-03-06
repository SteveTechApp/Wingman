import * as React from "react";

export type CompetitorIO = {
  inputs?: string[];
  outputs?: string[];
};

export type CompetitorVideo = {
  maxResolution?: "1080p" | "4K30" | "4K60" | "8K";
  bandwidthGbps?: number;
};

export type CompetitorItem = {
  brand: string;
  sku: string;
  model?: string;
  latency?: string;

  // Broad grouping (switcher, matrix, extender, encoder, decoder, etc.)
  category?: string;

  // TX/RX/Encoder/Decoder/Matrix/Switcher/etc.
  role?: string;

  video?: CompetitorVideo;
  io?: CompetitorIO;

  // Simple capability tags: "usb", "kvm", "poe", "poh", "audioBreakout", etc.
  features?: string[];

  // Used to nudge within a product family (e.g., "NetworkHD", "HDBaseT", "Apollo")
  familyHint?: string;
};

export type ProductVideo = {
  maxResolution?: "1080p" | "4K30" | "4K60" | "8K";
  bandwidthGbps?: number;
};

export type Product = {
  brand: "WyreStorm";
  sku: string;
  name?: string;
  category?: string;
  role?: string;
  family?: string;
  video?: ProductVideo;
  features?: string[];
};

export type MatchReason = {
  key: string;
  score: number;   // 0..1 contribution
  text: string;
};

export type MatchResult = {
  competitor: CompetitorItem;
  product: Product;
  score: number;       // 0..1
  percent: number;     // 0..100
  reasons: MatchReason[];
};