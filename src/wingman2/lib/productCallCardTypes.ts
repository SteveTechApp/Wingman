// Product Call Cards view-model and sales-helper types. Extracted from
// ProductCallCardsPage.tsx so the page, the sales-helper copy builder and its
// tests share one definition. No behaviour change.

import type { ClassifiedProductCallCardHeading } from "./productCallCardClassification";

export type ProductCard = {
  sku: string;
  name: string;
  family: string;
  category: string;
  description: string;
  fit: string;
  openingLine: string;
  questions: string[];
  proofPoints: string[];
  tags: string[];
  headings: ClassifiedProductCallCardHeading[];
  sourceSearchText: string;
  curated: boolean;
  technicalProfile?: unknown;
  sourceCatalog?: unknown;
};

export type ProductSalesHelperRole =
  | "audio"
  | "networkhd"
  | "matrix"
  | "presentation"
  | "uc"
  | "extender"
  | "camera"
  | "videoWall"
  | "multiview"
  | "control"
  | "accessory"
  | "general";

export type ProductSalesHelperCopy = {
  whatItDoes: string;
  realWorldJobs: string[];
  specWatchOuts: string[];
  fitHere: string;
  useWhen: string[];
  avoidWhen: string[];
  sayThis: string;
  proofPoints: string[];
  discoveryQuestions: string[];
};
