import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8").replace(/^\uFEFF/, ""));
}

function skuKey(value) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function skuOf(match) {
  return String(match?.sku ?? match?.wyrestorm?.sku ?? "").trim();
}

function textOf(value) {
  if (Array.isArray(value)) return value.map(textOf).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(textOf).join(" ");
  return String(value ?? "");
}

function productText(product) {
  return [
    product?.sku,
    product?.name,
    product?.title,
    product?.family,
    product?.category,
    product?.role,
    product?.governanceRole,
    product?.technologies,
    product?.features,
    product?.tags,
    product?.description,
  ].map(textOf).join(" ").toLowerCase();
}

function classifyWyrestormProduct(product) {
  const sku = skuKey(product?.sku);
  const text = productText(product);

  if (/^CAB|CABLE|HAOC|HDMI\s*CABLE|USB-C\s*CABLE/.test(sku) || /\bcable\b/.test(text)) return "Cable";
  if (/\b(accessory|rack mount|mounting|bracket|power supply|psu)\b/.test(text)) return "Accessory";
  if (/^NHD/.test(sku) || text.includes("networkhd") || text.includes("av over ip") || text.includes("avoip")) return "AVoIP";
  if (/^MX/.test(sku) || text.includes("matrix")) return "Matrix";
  if (/^EX|^RX|^TX/.test(sku) || text.includes("hdbaset") || text.includes("hdbt")) return "HDBaseT / Extension";
  if (/^SW/.test(sku) || text.includes("presentation") || text.includes("switcher") || text.includes("byod") || text.includes("usb-c")) return "Presentation / UC";
  if (/^APO|speakerphone|conference/.test(sku) || text.includes("unified communication") || text.includes("byom")) return "UC / BYOD";
  if (/^AMP/.test(sku) || text.includes("amplifier") || text.includes("dante") || text.includes("audio")) return "Audio";
  if (/^CAM/.test(sku) || text.includes("camera")) return "Camera";
  if (/^NHD000CTL|controller|control processor/.test(sku) || text.includes("controller")) return "Control / Infrastructure";
  if (text.includes("video wall") || text.includes("videowall")) return "Video Wall";
  if (text.includes("multiview") || text.includes("multi-view")) return "Multiview";
  return "Unknown";
}

function competitorCatalogDomain(entry) {
  const technology = String(entry?.technology ?? "").toLowerCase();
  const category = String(entry?.category ?? "").toLowerCase();
  const summary = String(entry?.summary ?? "").toLowerCase();
  const blob = `${technology} ${category} ${summary}`;

  if (blob.includes("usb extension")) return "USB Extension";
  if (blob.includes("avoip") || blob.includes("av over ip")) return "AVoIP";
  if (blob.includes("hdbaset") || category === "extender") return "HDBaseT / Extension";
  if (blob.includes("matrix") || category === "matrix") return "Matrix";
  if (blob.includes("presentation") || blob.includes("switcher") || blob.includes("unified communications") || category === "uc") return "Presentation / UC";
  if (blob.includes("wireless")) return "Wireless / Collaboration";
  if (blob.includes("video wall")) return "Video Wall";
  if (blob.includes("multiview") || blob.includes("multi-view")) return "Multiview";
  if (blob.includes("audio") || blob.includes("dante") || blob.includes("aes67")) return "Audio";
  if (blob.includes("control")) return "Control";
  return "Unknown";
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function countBy(items, classifier) {
  const output = new Map();
  for (const item of items) increment(output, classifier(item));
  return Object.fromEntries([...output.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function hasTechnicalPorts(product) {
  const profile = product?.technicalProfile;
  const io = profile?.io;
  return Boolean(
    io &&
    Object.values(io).some((value) => Array.isArray(value) && value.length > 0),
  );
}

function hasOfficialSource(product) {
  return Number(product?.technicalProfile?.sourceQuality?.officialPageStatus) === 200 ||
    Boolean(product?.technicalProfile?.sourceQuality?.officialProductUrl);
}

function isSupportSku(value) {
  const key = skuKey(value);
  const primaryUcHardware = /^APO(?:100|200|210|VX20)UC/.test(key);
  return /^CAB/.test(key) || /^CAM/.test(key) || (/^APO/.test(key) && !primaryUcHardware) || key.includes("RACK") || key.includes("CTL");
}

function sourceTierOfMatch(match) {
  const explicitTier = match?.wyrestorm?.sourceTier ?? match?.sourceTier ?? match?.decision?.sourceTier;
  if (explicitTier) return explicitTier;

  const sourceQuality = match?.wyrestorm?.technicalProfile?.sourceQuality;
  if (Number(sourceQuality?.officialPageStatus) === 200 || sourceQuality?.officialProductUrl) {
    return "official";
  }

  if (match?.wyrestorm?.technicalProfile) {
    return "structured-profile";
  }

  return "missing";
}

const scenarios = [
  {
    id: "avoip-encoder",
    technology: "AVoIP",
    input: "NAV E 121",
    brand: "Extron",
    expectedIntent: ["av-over-ip-encoder"],
    expectedLead: [/^NHD-.*(?:TX|TRX)$/i],
  },
  {
    id: "avoip-decoder",
    technology: "AVoIP",
    input: "NAV D 121",
    brand: "Extron",
    expectedIntent: ["av-over-ip-decoder"],
    expectedLead: [/^NHD-.*(?:RX|TRX)$/i],
  },
  {
    id: "avoip-family",
    technology: "AVoIP",
    input: "DMNVX",
    brand: "Crestron",
    expectedIntent: ["av-over-ip"],
    expectedSpecTier: ["family-rule"],
    expectedLead: [/^NHD-/i],
  },
  {
    id: "hdbaset-transmitter",
    technology: "HDBaseT / Extension",
    input: "DTP3 T 203",
    brand: "Extron",
    expectedIntent: ["extender", "presentation-switcher"],
    expectedLead: [/^(EX|TX|RX|SW)-/i],
  },
  {
    id: "hdbaset-receiver",
    technology: "HDBaseT / Extension",
    input: "DTP3 R 201",
    brand: "Extron",
    expectedIntent: ["extender"],
    expectedLead: [/^(EX|RX|TX)-/i],
  },
  {
    id: "matrix-4x4",
    technology: "Matrix",
    input: "AC-MX-44HDBT",
    brand: "AVPro Edge",
    expectedIntent: ["hdbaset-matrix", "matrix"],
    expectedLead: [/^MXV-0404/i, /^MX-0404/i],
  },
  {
    id: "matrix-8x8",
    technology: "Matrix",
    input: "C88CS",
    brand: "Blustream",
    expectedIntent: ["hdbaset-matrix", "matrix"],
    expectedLead: [/^MXV-0808/i, /^MX-0808/i],
  },
  {
    id: "presentation-switcher",
    technology: "Presentation / UC",
    input: "AT-OME-CS31-SA",
    brand: "Atlona",
    expectedIntent: ["presentation-switcher", "extender"],
    expectedLead: [/^SW-/i, /^MX-/i, /^APO-/i],
  },
  {
    id: "wireless-collaboration",
    technology: "Wireless / Collaboration",
    input: "CX-50",
    brand: "Barco",
    expectedIntent: ["presentation-switcher", "uc-byod"],
    expectedLead: [/^SW-/i, /^APO-/i],
  },
  {
    id: "usb-extension",
    technology: "USB Extension",
    input: "KDS-USB2",
    brand: "Kramer",
    expectedIntent: ["presentation-switcher", "uc-byod", "extender"],
    expectedLead: [/^EX-.*USB/i, /^SW-/i, /^APO-/i, /^NHD-USB/i],
  },
  {
    id: "audio",
    technology: "Audio",
    input: "Dante amplifier audio DSP",
    brand: "QSC",
    expectedIntent: ["unknown"],
    expectedLead: [/^AMP-/i],
  },
  {
    id: "video-wall",
    technology: "Video Wall",
    input: "dedicated LCD video wall processor",
    brand: undefined,
    expectedIntent: ["video-wall-processor"],
    expectedLead: [/^SW-020[46]-VW$/i],
  },
  {
    id: "multiview",
    technology: "Multiview",
    input: "4 source multiview processor single output canvas",
    brand: undefined,
    expectedIntent: ["multiview"],
    expectedLead: [/^NHD-0401-MV$/i, /^NHD-150-RX$/i],
  },
  {
    id: "control",
    technology: "Control",
    input: "NX-2200",
    brand: "AMX",
    expectedIntent: ["controller-accessory"],
    expectedLead: [],
    shouldHaveNoDirectReplacement: true,
  },
];

function regexListMatches(regexes, value) {
  return regexes.some((pattern) => pattern.test(value));
}

function scenarioStatus(row, scenario) {
  const issues = [];
  const topSkus = row.topSkus;
  const leadSku = topSkus[0] ?? "";

  if (!row.matchCount && !scenario.shouldHaveNoDirectReplacement) issues.push("No WyreStorm candidates returned.");
  if (scenario.expectedIntent?.length && !scenario.expectedIntent.includes(row.intent)) {
    issues.push(`Unexpected intent ${row.intent}; expected ${scenario.expectedIntent.join(" or ")}.`);
  }
  if (scenario.expectedSpecTier?.length && !scenario.expectedSpecTier.includes(row.specTier)) {
    issues.push(`Unexpected competitor spec tier ${row.specTier}; expected ${scenario.expectedSpecTier.join(" or ")}.`);
  }
  if (!scenario.shouldHaveNoDirectReplacement && scenario.expectedLead?.length && !regexListMatches(scenario.expectedLead, leadSku)) {
    issues.push(`Lead candidate ${leadSku || "none"} is outside expected family.`);
  }
  if (!scenario.shouldHaveNoDirectReplacement && topSkus.slice(0, 5).some(isSupportSku) && !["wireless-collaboration", "usb-extension"].includes(scenario.id)) {
    issues.push("Support/accessory item appears in top five lead results.");
  }
  if (scenario.shouldHaveNoDirectReplacement && row.matchCount > 0 && !row.recommendation.toLowerCase().includes("does not manufacture dedicated control")) {
    issues.push("Control/accessory request returned candidates without clearly saying this is not a direct replacement.");
  }
  if (row.sourceTiers.length && row.sourceTiers.every((tier) => tier === "text-inferred" || tier === "missing")) {
    issues.push("Top candidates rely on text-inferred or missing WyreStorm facts.");
  }

  return {
    status: issues.length ? "needs-attention" : "pass",
    issues,
  };
}

function markdownTable(rows) {
  return [
    "| Technology | Input | Profile | Intent | Outcome | Lead | Status | Issues |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => [
      row.technology,
      `${row.brand ? `${row.brand} ` : ""}${row.input}`,
      `${row.competitorBrand ?? ""} ${row.competitorSku ?? ""} ${row.competitorDomain ? `(${row.competitorDomain}/${row.competitorRole ?? "unknown"})` : ""} ${row.specTier ? `[${row.specTier}]` : ""}`.trim(),
      row.intent,
      row.topOutcome,
      row.topSkus.slice(0, 3).join(", ") || "None",
      row.status,
      row.issues.join("; ") || "-",
    ].map((cell) => String(cell).replace(/\|/g, "\\|")).join(" | ")).map((line) => `| ${line} |`),
  ].join("\n");
}

const productIndex = readJson("public/product-intelligence-index.json");
const competitorCatalog = readJson("data/catalog/competitor-products.generated.json");

const vite = await createServer({
  root,
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true },
});

try {
  const runtime = await vite.ssrLoadModule("/src/wingman2/lib/compareRuntimePipeline.ts");
  const products = runtime.normaliseCompareProducts(productIndex);
  const rows = [];

  for (const scenario of scenarios) {
    const result = runtime.runCompareRuntimePipeline(scenario.input, products, scenario.brand, 12);
    const topMatches = Array.isArray(result.matches) ? result.matches.slice(0, 5) : [];
    const sourceTiers = topMatches.map(sourceTierOfMatch);

    const row = {
      id: scenario.id,
      technology: scenario.technology,
      input: scenario.input,
      brand: scenario.brand,
      competitorBrand: result.competitor?.brand,
      competitorSku: result.competitor?.sku,
      competitorDomain: result.competitor?.domain,
      competitorRole: result.competitor?.role,
      specTier: result.competitor?.specTier,
      readiness: result.competitor?.readiness,
      intent: result.compareIntent,
      topOutcome: result.topOutcome,
      matchCount: topMatches.length,
      topSkus: topMatches.map(skuOf).filter(Boolean),
      sourceTiers,
      recommendation: String(result.recommendation ?? ""),
      nextSteps: Array.isArray(result.nextSteps) ? result.nextSteps : [],
    };
    const status = scenarioStatus(row, scenario);
    rows.push({ ...row, ...status });
  }

  const productsByTechnology = countBy(products, classifyWyrestormProduct);
  const competitorByTechnology = countBy(competitorCatalog, competitorCatalogDomain);
  const productSourceQuality = {
    totalProducts: products.length,
    officialSourceProducts: products.filter(hasOfficialSource).length,
    productsWithTechnicalPorts: products.filter(hasTechnicalPorts).length,
    productsWithBothOfficialAndPorts: products.filter((product) => hasOfficialSource(product) && hasTechnicalPorts(product)).length,
  };
  const failingRows = rows.filter((row) => row.status !== "pass");
  const technologyFailures = countBy(failingRows, (row) => row.technology);

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      scenarioCount: rows.length,
      passingScenarios: rows.filter((row) => row.status === "pass").length,
      attentionScenarios: failingRows.length,
      productSourceQuality,
    },
    productsByTechnology,
    competitorByTechnology,
    technologyFailures,
    scenarios: rows,
    recommendations: [
      "Promote high-traffic competitor SKUs from family-rule/sku-only into verified profiles with source URL, role, transport, routed I/O, resolution, HDMI/HDCP, USB, audio and control facts.",
      "Keep routed I/O separate from physical connector counts; mirrored, preview, loop and local monitor outputs must not inflate matrix output counts.",
      "Create verified WyreStorm compare profiles for every active family lead SKU across NetworkHD, MX/MXV matrices, EX/RX/TX extension, SW presentation, SW video wall, NHD multiview, APO/UC and AMP audio.",
      "Treat pure USB extension, wireless sharing and control processors as workflow or architecture comparisons unless WyreStorm has a true direct product class.",
      "Use this audit plus product-database-quality audit after every data refresh before trusting Compare in live customer calls.",
    ],
  };

  const reportDir = path.join(root, "reports");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(path.join(reportDir, "compare-technology-coverage-audit.json"), JSON.stringify(report, null, 2), "utf8");

  const md = [
    "# Compare Technology Coverage Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Scenarios tested: ${report.summary.scenarioCount}`,
    `- Passing scenarios: ${report.summary.passingScenarios}`,
    `- Needs attention: ${report.summary.attentionScenarios}`,
    `- WyreStorm products scanned: ${productSourceQuality.totalProducts}`,
    `- Products with official source URL/status: ${productSourceQuality.officialSourceProducts}`,
    `- Products with technical port structures: ${productSourceQuality.productsWithTechnicalPorts}`,
    "",
    "## Scenario Results",
    "",
    markdownTable(rows),
    "",
    "## WyreStorm Product Coverage",
    "",
    ...Object.entries(productsByTechnology).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Competitor Catalog Coverage",
    "",
    ...Object.entries(competitorByTechnology).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Recommendations",
    "",
    ...report.recommendations.map((item) => `- ${item}`),
    "",
  ].join("\n");

  writeFileSync(path.join(reportDir, "compare-technology-coverage-audit.md"), md, "utf8");

  console.log("[compare-technology-coverage-audit] Wrote reports/compare-technology-coverage-audit.json");
  console.log("[compare-technology-coverage-audit] Wrote reports/compare-technology-coverage-audit.md");
  console.log(`[compare-technology-coverage-audit] Passing=${report.summary.passingScenarios} NeedsAttention=${report.summary.attentionScenarios}`);
} finally {
  await vite.close();
}
