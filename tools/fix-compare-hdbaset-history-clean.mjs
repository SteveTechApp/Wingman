import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-hdbaset-history-clean-${stamp}`);
const touched = [];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function read(relativePath) {
  const file = path.join(repoRoot, relativePath);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function write(relativePath, content) {
  const file = path.join(repoRoot, relativePath);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
}

function backup(relativePath) {
  const source = path.join(repoRoot, relativePath);

  if (!fs.existsSync(source)) {
    return;
  }

  const target = path.join(backupRoot, relativePath);
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function save(relativePath, content) {
  const current = read(relativePath);

  if (current === content) {
    return;
  }

  backup(relativePath);
  write(relativePath, content);
  touched.push(relativePath);
}

function functionBounds(text, functionName) {
  const re = new RegExp(`function\\s+${functionName}\\s*\\(`);
  const match = re.exec(text);

  if (!match) {
    return null;
  }

  const start = match.index;
  const openBrace = text.indexOf("{", match.index);

  if (openBrace < 0) {
    return null;
  }

  let depth = 0;

  for (let i = openBrace; i < text.length; i++) {
    if (text[i] === "{") {
      depth++;
    }

    if (text[i] === "}") {
      depth--;

      if (depth === 0) {
        return { start, end: i + 1 };
      }
    }
  }

  return null;
}

function replaceFunction(text, functionName, replacement) {
  const bounds = functionBounds(text, functionName);

  if (!bounds) {
    console.log(`[skip] function not found: ${functionName}`);
    return text;
  }

  return text.slice(0, bounds.start) + replacement + text.slice(bounds.end);
}

function cleanLiteralText(text) {
  return text
    .replaceAll("ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢", "-")
    .replaceAll("ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·", "-")
    .replaceAll("ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â", "-")
    .replaceAll("Ã¢â‚¬â€", "-")
    .replaceAll("Ã¢â‚¬â„¢", "'")
    .replaceAll("Ã¢â‚¬Å“", '"')
    .replaceAll("Ã¢â‚¬Â", '"')
    .replaceAll("Ãƒâ€šÃ‚Â¦", "...")
    .replaceAll("Ã‚Â¦", "...")
    .replaceAll("Ã‚Â·", "-")
    .replaceAll("ÃƒÂ¯Ã‚Â¿Ã‚Â½", "-")
    .replaceAll("WyreStorm’s", "WyreStorm's")
    .replaceAll("WyreStormâ€™s", "WyreStorm's")
    .replaceAll("Ã", "")
    .replaceAll("Â", "")
    .replaceAll("�", "-");
}

function patchComparePage() {
  const relative = path.join("src", "wingman2", "pages", "ComparePage.tsx");
  let text = read(relative);

  if (!text) {
    throw new Error(`Missing ${relative}`);
  }

  text = cleanLiteralText(text);

  text = text.replaceAll("setCompetitor brand", "setBrand");
  text = text.replaceAll("setCompetitor Brand", "setBrand");

  text = text.replace(
    /const HISTORY_KEY = "wingman\.compare\.inputHistory\.v\d+";/,
    'const HISTORY_KEY = "wingman.compare.inputHistory.v6";',
  );

  const legacyBlock = `const LEGACY_HISTORY_KEYS = [
  "wingman.compare.inputHistory.v1",
  "wingman.compare.inputHistory.v2",
  "wingman.compare.inputHistory.v3",
  "wingman.compare.inputHistory.v4",
  "wingman.compare.inputHistory.v5",
];`;

  if (/const LEGACY_HISTORY_KEYS = \[[\s\S]*?\];/.test(text)) {
    text = text.replace(/const LEGACY_HISTORY_KEYS = \[[\s\S]*?\];/, legacyBlock);
  } else {
    text = text.replace(
      /const HISTORY_KEY = "wingman\.compare\.inputHistory\.v6";/,
      `const HISTORY_KEY = "wingman.compare.inputHistory.v6";\n${legacyBlock}`,
    );
  }

  if (!text.includes("function purgeLegacyCompareHistory")) {
    text = text.replace(
      /function loadHistory\(\) \{/,
      `function purgeLegacyCompareHistory() {
  if (typeof window === "undefined") {
    return;
  }

  LEGACY_HISTORY_KEYS.forEach((key) => window.localStorage.removeItem(key));

  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("wingman.compare.inputHistory.") && key !== HISTORY_KEY)
    .forEach((key) => window.localStorage.removeItem(key));
}

function loadHistory() {`,
    );
  }

  text = text.replace(
    /useEffect\(\(\) => \{\s*[\s\S]*?setHistory\(loadHistory\(\)\);\s*\}, \[\]\);/,
    `useEffect(() => {
    purgeLegacyCompareHistory();
    setHistory(loadHistory());
  }, []);`,
  );

  const badEncodingRegexLine = `const BAD_ENCODING_RE = /(?:Ã|Â|â|�|Æ|¢|€|š|¬|ƒ|Å|œ|™|¦)/;`;

  if (/const BAD_ENCODING_RE = .*?;/.test(text)) {
    text = text.replace(/const BAD_ENCODING_RE = .*?;/, badEncodingRegexLine);
  } else {
    text = text.replace(
      /const MAX_HISTORY_ITEMS = 20;/,
      `const MAX_HISTORY_ITEMS = 20;\n${badEncodingRegexLine}`,
    );
  }

  if (!text.includes("function displaySafe")) {
    text = text.replace(
      /function percent\(value\?: number\) \{/,
      `function displaySafe(value: unknown, fallback = "") {
  const text = cleanText(value);

  if (!text || hasBadEncoding(text)) {
    return fallback;
  }

  return text;
}

function percent(value?: number) {`,
    );
  }

  text = text.replace(
    /\{\[item\.brand, item\.sku\]\.filter\(Boolean\)\.join\(["'][^"']*["']\) \|\| "Untitled lookup"\}/,
    `{[displaySafe(item.brand), displaySafe(item.sku)].filter(Boolean).join(" - ") || "Untitled lookup"}`,
  );

  text = text.replace(/\{item\.productName\}/g, "{displaySafe(item.productName)}");
  text = text.replace(/\{item\.categoryLabel\}/g, "{displaySafe(item.categoryLabel)}");

  text = text.replaceAll("Competitor Compare", "Competitor Product Check");
  text = text.replaceAll("Replace competitor SKUs with a clear WyreStorm answer.", "Understand the competitor product and position a credible WyreStorm option.");
  text = text.replaceAll("WyreStorm’s range", "WyreStorm's range");
  text = text.replaceAll("outside WyreStorm range", "outside WyreStorm's range");

  save(relative, text);
}

function patchRouteCatalog() {
  const relative = path.join("src", "wingman2", "app", "routeCatalog.ts");
  let text = read(relative);

  if (!text) {
    return;
  }

  text = cleanLiteralText(text);
  text = text.replaceAll("Competitor Compare", "Competitor Product Check");
  text = text.replaceAll(
    "Replace competitor SKUs with a clear WyreStorm answer.",
    "Understand the competitor product and position a credible WyreStorm option.",
  );

  save(relative, text);
}

function patchCompareIntelligence() {
  const relative = path.join("server", "competitor", "compare-intelligence.mjs");
  let text = read(relative);

  if (!text) {
    throw new Error(`Missing ${relative}`);
  }

  text = cleanLiteralText(text);

  if (!text.includes("avpro edge AC-EX model prefix")) {
    text = text.replace(
      /const KNOWN_MODEL_HINTS = \[/,
      `const KNOWN_MODEL_HINTS = [
  {
    brand: /av\\s*pro\\s*edge|avproedge/i,
    sku: /^AC[-\\s]?EX/i,
    category: "hdbaset_extender",
    label: "HDBaseT extender / transmitter / receiver",
    confidence: 0.72,
    reason: "avpro edge AC-EX model prefix commonly maps to HDBaseT extender products."
  },`,
    );
  }

  text = replaceFunction(
    text,
    "classifyWyrestormCandidateBySku",
    `function classifyWyrestormCandidateBySku(product) {
  const sku = String(product?.sku || "").toUpperCase();
  const name = String(product?.name || "").toUpperCase();
  const sourceText = String(product?.text || "").toUpperCase();
  const combined = [sku, name, sourceText].join(" ");

  if (/^NHD[-_]/i.test(sku) || /NETWORKHD/i.test(combined)) {
    return {
      category: "av_over_ip",
      categoryLabel: "AV over IP endpoint",
      confidence: 0.92,
      wyrestormOverlap: true,
      alternatives: []
    };
  }

  if (/^EX[-_]/i.test(sku) || /HDBASET|HDBT|HDMI\\s+OVER\\s+CAT|EXTENDER/i.test(combined)) {
    return {
      category: "hdbaset_extender",
      categoryLabel: "HDBaseT extender / transmitter / receiver",
      confidence: 0.9,
      wyrestormOverlap: true,
      alternatives: []
    };
  }

  return null;
}`,
  );

  if (!text.includes("function inferWyrestormExtenderPurpose")) {
    const helper = `
function inferWyrestormExtenderPurpose(category, sourceText) {
  const text = String(sourceText || "");
  const upper = text.toUpperCase();

  if (category !== "hdbaset_extender") {
    return {
      role: "unknown",
      label: "Product role not confirmed",
      confidence: "unknown"
    };
  }

  if (/\\bEX[-_]/i.test(upper) && !/[-_\\s]TX\\b/i.test(upper) && !/[-_\\s]RX\\b/i.test(upper)) {
    return {
      role: "extender_set",
      label: "HDBaseT extender kit / TX+RX set",
      confidence: "high"
    };
  }

  if (/[-_\\s]TX\\b/i.test(upper) || /\\bTRANSMITTER\\b/i.test(upper)) {
    return {
      role: "transmitter",
      label: "HDBaseT transmitter / source-side unit",
      confidence: "high"
    };
  }

  if (/[-_\\s]RX\\b/i.test(upper) || /\\bRECEIVER\\b/i.test(upper)) {
    return {
      role: "receiver",
      label: "HDBaseT receiver / display-side unit",
      confidence: "high"
    };
  }

  return {
    role: "unknown",
    label: "Product role not confirmed",
    confidence: "unknown"
  };
}

`;
    const bounds = functionBounds(text, "inferKnownProductPurposeFromText");
    text = bounds ? text.slice(0, bounds.start) + helper + text.slice(bounds.start) : helper + text;
  }

  text = replaceFunction(
    text,
    "inferKnownProductPurposeFromText",
    `function inferKnownProductPurposeFromText(category, sourceText) {
  const text = String(sourceText || "");

  if (category === "av_over_ip") {
    if (/\\bnav\\s*d\\s*\\d+/i.test(text) || /\\bnav-d-?\\d+/i.test(text) || /\\bdecoder\\b/i.test(text) || /[-_\\s]rx\\b/i.test(text)) {
      return {
        role: "decoder",
        label: "AVoIP decoder / display-side endpoint",
        confidence: "high",
        sourceSideScore: 0,
        displaySideScore: 4,
        transceiverScore: 0
      };
    }

    if (/\\bnav\\s*e\\s*\\d+/i.test(text) || /\\bnav-e-?\\d+/i.test(text) || /\\bencoder\\b/i.test(text) || /[-_\\s]tx\\b/i.test(text)) {
      return {
        role: "encoder",
        label: "AVoIP encoder / source-side endpoint",
        confidence: "high",
        sourceSideScore: 4,
        displaySideScore: 0,
        transceiverScore: 0
      };
    }

    if (/\\btrx\\b/i.test(text) || /[-_\\s]trx\\b/i.test(text) || /\\btransceiver\\b/i.test(text)) {
      return {
        role: "transceiver",
        label: "AVoIP transceiver",
        confidence: "high",
        sourceSideScore: 2,
        displaySideScore: 2,
        transceiverScore: 4
      };
    }
  }

  if (category === "hdbaset_extender") {
    const wyrestorm = inferWyrestormExtenderPurpose(category, text);

    if (wyrestorm.role !== "unknown") {
      return wyrestorm;
    }

    if (/\\bAC[-\\s]?EX\\d+[-\\s]?\\d+[-\\s]?R\\d+\\b/i.test(text) || /extender\\s*kit/i.test(text) || /transmitter\\s*(?:and|\\+)\\s*receiver/i.test(text)) {
      return {
        role: "extender_set",
        label: "HDBaseT extender kit / TX+RX set",
        confidence: "high"
      };
    }

    if (/[-_\\s]rx\\b/i.test(text) || /\\breceiver\\b/i.test(text)) {
      return {
        role: "receiver",
        label: "HDBaseT receiver / display-side unit",
        confidence: "high"
      };
    }

    if (/[-_\\s]tx\\b/i.test(text) || /\\btransmitter\\b/i.test(text)) {
      return {
        role: "transmitter",
        label: "HDBaseT transmitter / source-side unit",
        confidence: "high"
      };
    }
  }

  return {
    role: "unknown",
    label: "Product role not confirmed",
    confidence: "unknown"
  };
}`,
  );

  text = replaceFunction(
    text,
    "matchWyrestormProducts",
    `async function matchWyrestormProducts(classification, profile) {
  const products = await loadWyrestormProducts();

  if (!products.length) {
    return {
      attempted: true,
      matchStatus: "product_index_empty",
      candidates: [],
      message: "Wingman could not find a usable WyreStorm product list. The product type check still worked, but product matching cannot run until the product list is restored."
    };
  }

  const candidates = products
    .map((product) => scoreWyrestormCandidate(classification, profile, product, profile.__evidenceText || ""))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const top = candidates[0];

  if (!top || top.score < 42) {
    return {
      attempted: true,
      matchStatus: "no_genuine_match",
      candidates,
      message: "Wingman identified the competitor product type, but no WyreStorm product reached the minimum confidence threshold for a professional comparison."
    };
  }

  return {
    attempted: true,
    matchStatus: "candidate_match",
    candidates,
    message: "Wingman found one or more WyreStorm options in the same or closely related product role."
  };
}`,
  );

  save(relative, text);
}

patchComparePage();
patchRouteCatalog();
patchCompareIntelligence();

console.log("");
console.log("Compare HDBaseT matching and history cleanup complete.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}