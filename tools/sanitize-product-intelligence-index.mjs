import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const indexPath = path.join(root, "public", "product-intelligence-index.json");
const suppressionPath = path.join(root, "data", "wingman-product-suppression-list.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  let lastError;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      fs.writeFileSync(filePath, content, "utf8");
      return;
    } catch (error) {
      lastError = error;
      if (!["UNKNOWN", "EBUSY", "EPERM"].includes(error?.code) || attempt === 20) break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  throw lastError;
}

function normalise(value) {
  return String(value || "").trim().toUpperCase();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const suppression = fs.existsSync(suppressionPath)
  ? readJson(suppressionPath)
  : { suppressedSkus: [] };

const suppressedSkus = (suppression.suppressedSkus || [])
  .map((entry) => normalise(typeof entry === "string" ? entry : entry.sku))
  .filter(Boolean)
  .sort((a, b) => b.length - a.length);

const suppressedSet = new Set(suppressedSkus);
const suppressedPatterns = suppressedSkus.map((sku) => new RegExp(escapeRegExp(sku), "gi"));

function containsSuppressed(value) {
  const text = normalise(value);
  return suppressedSkus.some((sku) => text.includes(sku));
}

function directSuppressed(value) {
  return suppressedSet.has(normalise(value));
}

function scrubString(value) {
  let output = String(value);

  for (const pattern of suppressedPatterns) {
    output = output.replace(pattern, "suppressed discontinued product");
  }

  return output;
}

function isSuppressedProductObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const fields = [
    "id",
    "sku",
    "canonicalSku",
    "model",
    "modelNumber",
    "partNumber",
    "slug"
  ];

  for (const field of fields) {
    if (directSuppressed(value[field])) {
      return true;
    }
  }

  const urlText = [
    value.url,
    value.officialProductUrl,
    value.productUrl
  ].filter(Boolean).join(" ");

  if (containsSuppressed(urlText)) {
    return true;
  }

  const lifecycleText = [
    value.status,
    value.lifecycle,
    value.catalogVisibility,
    value.title,
    value.name,
    value.description,
    value.summary
  ].filter(Boolean).join(" ");

  if (/DISCONTINUED|END OF LIFE|EOL|SUPPRESSED/i.test(lifecycleText) && containsSuppressed(lifecycleText)) {
    return true;
  }

  return false;
}

function sanitise(value) {
  if (typeof value === "string") {
    if (directSuppressed(value)) {
      return undefined;
    }

    if (containsSuppressed(value)) {
      return scrubString(value);
    }

    return value;
  }

  if (Array.isArray(value)) {
    const output = [];

    for (const item of value) {
      if (isSuppressedProductObject(item)) {
        continue;
      }

      const cleaned = sanitise(item);

      if (cleaned !== undefined) {
        output.push(cleaned);
      }
    }

    return output;
  }

  if (value && typeof value === "object") {
    if (isSuppressedProductObject(value)) {
      return undefined;
    }

    const output = {};

    for (const [key, child] of Object.entries(value)) {
      if (directSuppressed(key) || containsSuppressed(key)) {
        continue;
      }

      const cleaned = sanitise(child);

      if (cleaned !== undefined) {
        output[key] = cleaned;
      }
    }

    return output;
  }

  return value;
}

if (!fs.existsSync(indexPath)) {
  throw new Error(`Missing public index: ${indexPath}`);
}

const before = fs.readFileSync(indexPath, "utf8");
const beforeMatches = suppressedSkus.filter((sku) => before.toUpperCase().includes(sku));

console.log(`[product-intelligence-sanitise] Suppressed SKUs: ${suppressedSkus.join(", ") || "none"}`);
console.log(`[product-intelligence-sanitise] Matches before: ${beforeMatches.join(", ") || "none"}`);

const parsed = JSON.parse(before);
const cleaned = sanitise(parsed);

writeJson(indexPath, cleaned);

const after = fs.readFileSync(indexPath, "utf8");
const afterMatches = suppressedSkus.filter((sku) => after.toUpperCase().includes(sku));

if (afterMatches.length > 0) {
  throw new Error(`[product-intelligence-sanitise] Suppressed SKUs still present: ${afterMatches.join(", ")}`);
}

console.log("[product-intelligence-sanitise] Public index clean.");
