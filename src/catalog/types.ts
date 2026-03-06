import * as React from "react";

export type Product = {
  sku: string;
  name: string;
  category?: string;
  role?: "TX" | "RX" | "TRX" | string;
  lifecycle?: "current" | "legacy" | "eol" | string;
  video?: { maxResolution?: string };
  features?: string[];
  io?: { inputs?: number; outputs?: number };
  [key: string]: unknown;
};
