export type CatalogueTechnology =
  | "AV over IP"
  | "HDBaseT"
  | "Matrix Switching"
  | "Presentation / UC"
  | "USB / KVM"
  | "Cameras / Video Bars"
  | "Audio"
  | "Control"
  | "Accessories";

export type CatalogueStatus = "Current" | "New" | "Legacy" | "Coming Soon";

export type CatalogueProduct = {
  sku: string;
  name: string;
  technology: CatalogueTechnology;
  category: string;
  summary: string;
  status: CatalogueStatus;
  applications: string[];
  featureTags: string[];
  resolution?: string;
  distance?: string;
  transport?: string;
};

export type CatalogueFilters = {
  search: string;
  technology: CatalogueTechnology[];
  category: string[];
  featureTags: string[];
  status: CatalogueStatus[];
};

export type ProductCardView = CatalogueProduct & {
  score?: number;
};

export const TECHNOLOGY_OPTIONS: CatalogueTechnology[] = [
  "AV over IP",
  "HDBaseT",
  "Matrix Switching",
  "Presentation / UC",
  "USB / KVM",
  "Cameras / Video Bars",
  "Audio",
  "Control",
  "Accessories",
];