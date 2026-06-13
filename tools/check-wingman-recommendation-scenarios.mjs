import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SCENARIO_PATH = path.join(ROOT, "data", "wingman-real-av-scenarios.json");
const PRODUCT_INDEX_PATH = path.join(ROOT, "public", "product-intelligence-index.json");
const QUOTE_SAFETY_RULES_PATH = path.join(ROOT, "data", "wingman-quote-safety-rules.json");

const failures = [];
const warnings = [];

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readJson(filePath, options = {}) {
  const required = options.required !== false;

  if (!fs.existsSync(filePath)) {
    if (required) {
      fail(`Missing required file: ${rel(filePath)}`);
    }

    if (!required) {
      warn(`Missing optional file: ${rel(filePath)}`);
    }

    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Invalid JSON in ${rel(filePath)}: ${error.message}`);
    return null;
  }
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "undefined" || value === null || value === "") {
    return [];
  }

  return [value];
}

function normalise(value) {
  return String(value ?? "").toLowerCase();
}

function getProducts(data) {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.products)) {
    return data.products;
  }

  if (Array.isArray(data.records)) {
    return data.records;
  }

  if (data.products && typeof data.products === "object") {
    return Object.values(data.products);
  }

  return [];
}

function getSku(product) {
  return String(
    product?.sku ??
    product?.SKU ??
    product?.model ??
    product?.modelNumber ??
    product?.partNumber ??
    product?.id ??
    ""
  ).trim().toUpperCase();
}

function productText(product) {
  return normalise(JSON.stringify(product));
}

function findProductBySku(products, sku) {
  const target = String(sku).trim().toUpperCase();

  if (!target) {
    return null;
  }

  return products.find((product) => getSku(product) === target) ?? null;
}

function productDataContains(products, term) {
  const needle = normalise(term);

  if (!needle) {
    return true;
  }

  return products.some((product) => productText(product).includes(needle));
}

function requireString(value, field, scenarioId) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${scenarioId}: missing or invalid ${field}`);
  }
}

function requireArray(value, field, scenarioId) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${scenarioId}: missing or empty ${field}`);
  }
}

function quoteSafetyFromProduct(product) {
  return String(
    product?.quoteSafety ??
    product?.quoteSafetyStatus ??
    product?.verificationStatus ??
    ""
  ).trim();
}

function quoteSafetyFromRules(quoteSafetyRules, sku) {
  const target = String(sku).trim().toUpperCase();

  if (!target) {
    return "";
  }

  const rule = quoteSafetyRules?.rulesBySku?.[target];

  return String(rule?.quoteSafety ?? "").trim();
}

function quoteSafetyReasonFromRules(quoteSafetyRules, sku) {
  const target = String(sku).trim().toUpperCase();

  if (!target) {
    return "";
  }

  const rule = quoteSafetyRules?.rulesBySku?.[target];

  return String(rule?.reason ?? "").trim();
}

function effectiveQuoteSafety(product, sku, quoteSafetyRules) {
  const productSafety = quoteSafetyFromProduct(product);

  if (productSafety) {
    return {
      value: productSafety,
      source: "product"
    };
  }

  const ruleSafety = quoteSafetyFromRules(quoteSafetyRules, sku);

  if (ruleSafety) {
    return {
      value: ruleSafety,
      source: "safety-rule"
    };
  }

  return {
    value: "",
    source: "missing"
  };
}

function checkScenarioShape(scenario) {
  const scenarioId = scenario?.id ?? "unknown-scenario";

  requireString(scenario.id, "id", scenarioId);
  requireString(scenario.name, "name", scenarioId);

  if (!scenario.input || typeof scenario.input !== "object") {
    fail(`${scenarioId}: missing input object`);
  }

  if (!scenario.expected || typeof scenario.expected !== "object") {
    fail(`${scenarioId}: missing expected object`);
    return;
  }

  requireString(scenario.expected.primaryArchitecture, "expected.primaryArchitecture", scenarioId);
  requireArray(scenario.expected.acceptableArchitectures, "expected.acceptableArchitectures", scenarioId);
  requireArray(scenario.expected.productFamilies, "expected.productFamilies", scenarioId);
  requireArray(scenario.expected.requiredDependencies, "expected.requiredDependencies", scenarioId);
  requireArray(scenario.expected.missingInfo, "expected.missingInfo", scenarioId);
  requireString(scenario.expected.quoteSafety, "expected.quoteSafety", scenarioId);
  requireArray(scenario.expected.mustNotRecommend, "expected.mustNotRecommend", scenarioId);
}

function checkScenarioProductEvidence(scenario, products, quoteSafetyRules) {
  const scenarioId = scenario.id;
  const expected = scenario.expected;

  for (const sku of asArray(expected.leadProducts)) {
    const product = findProductBySku(products, sku);

    if (!product) {
      warn(`${scenarioId}: lead product SKU not found in product index yet: ${sku}`);
      continue;
    }

    const safety = effectiveQuoteSafety(product, sku, quoteSafetyRules);

    if (!safety.value) {
      fail(`${scenarioId}: lead product ${sku} has no quoteSafety field or quote-safety rule`);
      continue;
    }

    if (safety.value !== expected.quoteSafety) {
      warn(`${scenarioId}: lead product ${sku} uses quoteSafety '${safety.value}' from ${safety.source}; scenario expects '${expected.quoteSafety}'`);
    }

    if (safety.source === "safety-rule" && !quoteSafetyReasonFromRules(quoteSafetyRules, sku)) {
      fail(`${scenarioId}: quote-safety rule for ${sku} is missing a reason`);
    }
  }

  for (const family of asArray(expected.productFamilies)) {
    if (productDataContains(products, family)) {
      continue;
    }

    warn(`${scenarioId}: product family evidence not obvious in product index: ${family}`);
  }

  for (const dependency of asArray(expected.requiredDependencies)) {
    const dependencyText = normalise(dependency);

    if (dependencyText.includes("managed network")) {
      continue;
    }

    if (dependencyText.includes("network design")) {
      continue;
    }

    if (dependencyText.includes("source layout")) {
      continue;
    }

    if (dependencyText.includes("canvas resolution")) {
      continue;
    }

    if (dependencyText.includes("usb host")) {
      continue;
    }

    if (dependencyText.includes("control panel")) {
      continue;
    }

    if (dependencyText.includes("processor input format")) {
      continue;
    }

    if (dependencyText.includes("processor outputs")) {
      continue;
    }

    if (dependencyText.includes("ndi source confirmation")) {
      continue;
    }

    if (dependencyText.includes("multiview output path")) {
      continue;
    }

    if (productDataContains(products, dependency)) {
      continue;
    }

    warn(`${scenarioId}: dependency not obvious in product index: ${dependency}`);
  }
}

function checkCommercialSafety(scenario) {
  const scenarioId = scenario.id;
  const expected = scenario.expected;

  if (normalise(expected.quoteSafety).includes("verify")) {
    return;
  }

  fail(`${scenarioId}: quoteSafety should include a verify/check safety posture`);
}

function checkCoreScenarioCoverage(scenarios) {
  const ids = new Set(scenarios.map((scenario) => scenario.id));

  const requiredIds = [
    "hospitality-sports-bar-8x8",
    "hospitality-large-venue-av-over-ip",
    "small-byod-meeting-room",
    "teams-boardroom-usb-camera-mic",
    "higher-education-teaching-room",
    "simple-hdmi-extension",
    "lcd-video-wall-basic",
    "led-wall-novastar-processor",
    "networkhd-distributed-campus",
    "ndi-camera-multiview-workflow",
    "competitor-io-close-but-not-equivalent"
  ];

  for (const id of requiredIds) {
    if (ids.has(id)) {
      continue;
    }

    fail(`Missing required scenario: ${id}`);
  }
}

function checkQuoteSafetyRuleCoverage(scenarios, quoteSafetyRules) {
  const missing = [];

  for (const scenario of scenarios) {
    for (const sku of asArray(scenario?.expected?.leadProducts)) {
      const target = String(sku).trim().toUpperCase();

      if (!target) {
        continue;
      }

      const rule = quoteSafetyRules?.rulesBySku?.[target];

      if (!rule) {
        missing.push(`${scenario.id}: ${target}`);
        continue;
      }

      if (!String(rule.quoteSafety ?? "").trim()) {
        fail(`${scenario.id}: quote-safety rule missing quoteSafety for ${target}`);
      }

      if (!String(rule.reason ?? "").trim()) {
        fail(`${scenario.id}: quote-safety rule missing reason for ${target}`);
      }
    }
  }

  for (const item of missing) {
    fail(`Missing quote-safety rule for scenario lead product: ${item}`);
  }
}

const scenarioData = readJson(SCENARIO_PATH);
const productData = readJson(PRODUCT_INDEX_PATH);
const quoteSafetyRules = readJson(QUOTE_SAFETY_RULES_PATH);

const scenarios = Array.isArray(scenarioData?.scenarios) ? scenarioData.scenarios : [];
const products = getProducts(productData);

if (scenarios.length === 0) {
  fail("No scenarios found in data/wingman-real-av-scenarios.json");
}

if (products.length === 0) {
  fail("No product records found in public/product-intelligence-index.json");
}

console.log(`[wingman-recommendation-scenarios] Scenarios: ${scenarios.length}`);
console.log(`[wingman-recommendation-scenarios] Product records: ${products.length}`);

checkCoreScenarioCoverage(scenarios);
checkQuoteSafetyRuleCoverage(scenarios, quoteSafetyRules);

for (const scenario of scenarios) {
  checkScenarioShape(scenario);

  if (scenario?.expected) {
    checkCommercialSafety(scenario);
    checkScenarioProductEvidence(scenario, products, quoteSafetyRules);
  }
}

const duplicateIds = scenarios
  .map((scenario) => scenario.id)
  .filter((id, index, ids) => ids.indexOf(id) !== index);

for (const id of new Set(duplicateIds)) {
  fail(`Duplicate scenario id: ${id}`);
}

if (warnings.length > 0) {
  console.log("");
  console.log("[wingman-recommendation-scenarios] Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (failures.length > 0) {
  console.log("");
  console.error("[wingman-recommendation-scenarios] Check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("");
console.log("[wingman-recommendation-scenarios] Verified real AV scenario contract, quote-safety rules, expected recommendation shape, and product evidence hooks.");