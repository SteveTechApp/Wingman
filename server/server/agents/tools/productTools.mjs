import {
  defaultCatalog,
  defaultCompatibilityRules,
  defaultVideoWallRules,
  defaultProductIntelligenceNotes,
} from "./defaultData.mjs";

export async function searchSkuCatalog({ query = "", solutionIntent = "", videoWall = false, preferValueEngineering = false, deps = {} }) {
  if (typeof deps.searchSkuCatalog === "function") {
    return deps.searchSkuCatalog({ query, solutionIntent, videoWall, preferValueEngineering });
  }

  const searchText = `${query} ${solutionIntent}`.toLowerCase();
  return defaultCatalog.filter((item) => {
    if (videoWall && item.families.includes("video-wall")) return true;
    if (preferValueEngineering && item.sku === "NHD-0401-MV") return true;
    return item.sku.toLowerCase().includes(searchText) || item.families.some((family) => searchText.includes(String(family).toLowerCase()));
  });
}

export async function getProductDetails({ sku, deps = {} }) {
  if (typeof deps.getProductDetails === "function") {
    return deps.getProductDetails({ sku });
  }

  return defaultCatalog.find((item) => item.sku === sku) || null;
}

export async function getCompatibilityRules({ deps = {} }) {
  if (typeof deps.getCompatibilityRules === "function") {
    return deps.getCompatibilityRules();
  }

  return defaultCompatibilityRules;
}

export async function getVideoWallRules({ deps = {} }) {
  if (typeof deps.getVideoWallRules === "function") {
    return deps.getVideoWallRules();
  }

  return defaultVideoWallRules;
}

export async function getProductIntelligenceSummary({ deps = {} }) {
  if (typeof deps.getProductIntelligenceSummary === "function") {
    return deps.getProductIntelligenceSummary();
  }

  return defaultProductIntelligenceNotes;
}
