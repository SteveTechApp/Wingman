import {
  classifyCatalogProduct,
  type CatalogProduct,
} from "@/catalog";
import type {
  ComparisonDomain,
  ComparisonUseCase,
} from "@/competitor/fit/types";

export type MainProductCategory =
  | "Presentation"
  | "Matrix"
  | "Extender"
  | "AVoIP"
  | "Video Wall"
  | "Control"
  | "Distribution"
  | "Audio"
  | "Camera"
  | "Other";

type ComparisonLike = {
  comparisonDomain?: ComparisonDomain;
  comparisonUseCase?: ComparisonUseCase;
  category?: string;
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function fallbackMainCategory(category: string): MainProductCategory {
  const text = tidy(category).toLowerCase();
  if (!text) return "Other";
  if (
    /\bpresentation\b|\bswitcher\b|\bcollaboration\b|\bconference\b|\bwireless\b|\bbyod\b|\bbyom\b/.test(
      text,
    )
  ) {
    return "Presentation";
  }
  if (/\bmatrix\b/.test(text)) return "Matrix";
  if (/\bextender\b|\bhdbaset\b|\btransmitter\b|\breceiver\b/.test(text)) {
    return "Extender";
  }
  if (
    /\bav over ip\b|\bavoip\b|\bnetworkhd\b|\bencoder\b|\bdecoder\b|\bnvx\b|\bnav\b/.test(
      text,
    )
  ) {
    return "AVoIP";
  }
  if (/\bvideo wall\b|\bvideowall\b|\bmultiview\b|\bwindowing\b/.test(text)) {
    return "Video Wall";
  }
  if (/\bdistribution\b|\bsplitter\b/.test(text)) return "Distribution";
  if (/\bcontrol\b|\bcontroller\b|\bmanagement\b/.test(text)) return "Control";
  if (/\baudio\b|\bspeaker\b|\bmicrophone\b|\bamp/.test(text)) return "Audio";
  if (/\bcamera\b|\bptz\b/.test(text)) return "Camera";
  return "Other";
}

export function mainCategoryForCatalogProduct(
  product: Partial<CatalogProduct>,
): MainProductCategory {
  const classification = classifyCatalogProduct(product);
  switch (classification.group) {
    case "switcher":
    case "uc":
    case "casting":
      return "Presentation";
    case "matrix":
      return "Matrix";
    case "extender":
      return "Extender";
    case "avoip":
      return "AVoIP";
    case "videowall":
      return "Video Wall";
    case "control":
      return "Control";
    case "distribution":
      return "Distribution";
    case "audio":
      return "Audio";
    case "camera":
      return "Camera";
    default:
      return "Other";
  }
}

export function allowedMainCategoriesForComparison(
  comparison: ComparisonLike,
): MainProductCategory[] {
  switch (comparison.comparisonDomain) {
    case "PRESENTATION":
      return ["Presentation"];
    case "MATRIX":
      return ["Matrix"];
    case "EXTENDER":
      return ["Extender"];
    case "VIDEO_WALL":
      return ["Video Wall"];
    case "CONTROL":
      return ["Control"];
    case "AVOIP":
      if (
        comparison.comparisonUseCase === "MULTIVIEW" ||
        comparison.comparisonUseCase === "WALL_PROCESSING"
      ) {
        return ["AVoIP", "Video Wall"];
      }
      return ["AVoIP"];
    default:
      return [fallbackMainCategory(comparison.category || "")];
  }
}

export function mainCategoryLabelForComparison(
  comparison: ComparisonLike,
): MainProductCategory {
  return allowedMainCategoriesForComparison(comparison)[0] || "Other";
}

