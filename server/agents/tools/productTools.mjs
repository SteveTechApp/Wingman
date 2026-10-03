import {
  defaultCatalog,
  defaultCompatibilityRules,
  defaultVideoWallRules,
  defaultProductIntelligenceNotes,
} from "./defaultData.mjs";
import fs from "node:fs/promises";

const canonicalStoreUrl = new URL("../../../../data/wingman-canonical-product-store.json", import.meta.url);
const governedProfilesUrl = new URL("../../../../data/governance/wyrestorm-technical-profiles.json", import.meta.url);
let repositoryPromise;

function text(value) {
  return String(value ?? "").trim();
}

function skuKey(value) {
  return text(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

async function loadRepository() {
  if (!repositoryPromise) {
    repositoryPromise = Promise.all([
      fs.readFile(canonicalStoreUrl, "utf8"),
      fs.readFile(governedProfilesUrl, "utf8"),
    ]).then(([canonicalRaw, profilesRaw]) => {
      const canonicalPayload = JSON.parse(canonicalRaw);
      const profilesPayload = JSON.parse(profilesRaw);
      const products = Array.isArray(canonicalPayload) ? canonicalPayload : canonicalPayload.products ?? [];
      const profileBySku = new Map((profilesPayload.profiles ?? []).map((profile) => [skuKey(profile.sku), profile]));
      return { products, profileBySku };
    });
  }
  return repositoryPromise;
}

function activeSpecifiable(product) {
  const lifecycle = text(product.lifecycleStatus ?? product.lifecycle).toLowerCase();
  return product.doNotSpec !== true && (!lifecycle || ["active", "current", "new", "launch"].includes(lifecycle));
}

function publicProduct(product, profile) {
  return {
    sku: product.sku,
    name: product.name ?? product.title,
    family: product.family,
    category: product.category,
    summary: product.summary ?? product.description,
    lifecycleStatus: product.lifecycleStatus ?? "unknown",
    technicalStatus: profile?.status ?? "missing",
    transports: profile?.transport ?? [],
    dependencies: profile?.dependencies ?? [],
    checks: profile?.checks ?? [],
    warnings: profile?.warnings ?? [],
  };
}

export async function searchSkuCatalog({ query = "", solutionIntent = "", videoWall = false, preferValueEngineering = false, deps = {} }) {
  if (typeof deps.searchSkuCatalog === "function") {
    return deps.searchSkuCatalog({ query, solutionIntent, videoWall, preferValueEngineering });
  }

  try {
    const { products, profileBySku } = await loadRepository();
    const terms = `${query} ${solutionIntent}`.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
    return products
      .filter(activeSpecifiable)
      .map((product) => {
        const blob = [product.sku, product.name, product.title, product.family, product.category, product.summary, ...(product.tags ?? [])].join(" ").toLowerCase();
        const score = terms.reduce((total, term) => total + (blob.includes(term) ? 1 : 0), 0);
        return { product, score };
      })
      .filter(({ product, score }) => score > 0 || (videoWall && /video.?wall/i.test(JSON.stringify(product))))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ product }) => publicProduct(product, profileBySku.get(skuKey(product.sku))));
  } catch {
    return defaultCatalog;
  }
}

export async function getProductDetails({ sku, deps = {} }) {
  if (typeof deps.getProductDetails === "function") {
    return deps.getProductDetails({ sku });
  }

  try {
    const { products, profileBySku } = await loadRepository();
    const product = products.find((item) => skuKey(item.sku) === skuKey(sku));
    return product ? publicProduct(product, profileBySku.get(skuKey(product.sku))) : null;
  } catch {
    return defaultCatalog.find((item) => item.sku === sku) || null;
  }
}

export async function getCompatibilityRules({ deps = {} }) {
  if (typeof deps.getCompatibilityRules === "function") {
    return deps.getCompatibilityRules();
  }

  try {
    const { profileBySku } = await loadRepository();
    return [
      ...defaultCompatibilityRules,
      `Governed technical profiles loaded: ${profileBySku.size}.`,
      "Only verified or verified-with-warning profiles may support customer-ready product claims.",
      "Review-required or missing profiles must be treated as design blockers, not as equivalent products.",
    ];
  } catch {
    return defaultCompatibilityRules;
  }
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

  try {
    const { products, profileBySku } = await loadRepository();
    const statuses = [...profileBySku.values()].reduce((counts, profile) => {
      counts[profile.status] = (counts[profile.status] ?? 0) + 1;
      return counts;
    }, {});
    return [
      `Canonical products available: ${products.length}.`,
      `Governed profile status: ${JSON.stringify(statuses)}.`,
      ...defaultProductIntelligenceNotes,
    ];
  } catch {
    return defaultProductIntelligenceNotes;
  }
}
