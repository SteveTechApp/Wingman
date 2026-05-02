import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-clean-hdbaset-final-${stamp}`);
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
  const re = new RegExp(`(?:async\\s+)?function\\s+${functionName}\\s*\\(`);
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
    if (text[i] === "{") depth++;
    if (text[i] === "}") depth--;

    if (depth === 0) {
      return { start, end: i + 1 };
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

function cleanMojibake(text) {
  return text
    .replace(/\u00c3[\s\S]{0,20}\u00a0/g, "-")
    .replace(/\u00c3[\s\S]{0,20}\u00a6/g, "...")
    .replace(/\u00c3[\s\S]{0,20}\u00bd/g, "-")
    .replace(/\u00c2[\s\S]{0,5}/g, "")
    .replace(/\u00e2[\s\S]{0,8}/g, "-")
    .replace(/\uFFFD/g, "-")
    .replace(/WyreStorm[^a-zA-Z0-9\s]{1,40}s range/g, "WyreStorm's range")
    .replace(/WyreStorms range/g, "WyreStorm's range");
}

function patchComparePage() {
  const relative = path.join("src", "wingman2", "pages", "ComparePage.tsx");
  let text = read(relative);

  if (!text) {
    throw new Error(`Missing ${relative}`);
  }

  text = cleanMojibake(text);
  text = text.replaceAll("setCompetitor brand", "setBrand");
  text = text.replaceAll("setCompetitor Brand", "setBrand");
  text = text.replaceAll("Competitor Compare", "Competitor Product Check");
  text = text.replaceAll(
    "Replace competitor SKUs with a clear WyreStorm answer.",
    "Understand the competitor product and position a credible WyreStorm option.",
  );

  text = text.replace(
    /const HISTORY_KEY = "wingman\.compare\.inputHistory\.v\d+";/,
    'const HISTORY_KEY = "wingman.compare.inputHistory.v7";',
  );

  const legacyBlock = `const LEGACY_HISTORY_KEYS = [
  "wingman.compare.inputHistory.v1",
  "wingman.compare.inputHistory.v2",
  "wingman.compare.inputHistory.v3",
  "wingman.compare.inputHistory.v4",
  "wingman.compare.inputHistory.v5",
  "wingman.compare.inputHistory.v6",
];`;

  if (/const LEGACY_HISTORY_KEYS = \[[\s\S]*?\];/.test(text)) {
    text = text.replace(/const LEGACY_HISTORY_KEYS = \[[\s\S]*?\];/, legacyBlock);
  } else {
    text = text.replace(
      /const HISTORY_KEY = "wingman\.compare\.inputHistory\.v7";/,
      `const HISTORY_KEY = "wingman.compare.inputHistory.v7";\n${legacyBlock}`,
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

  text = text.replace(
    /No WyreStorm option is being forced\.[\s\S]*?credible recommendation\./g,
    "No WyreStorm option is being forced. This is correct when the competitor product is outside WyreStorm's range, or when there is not enough detail to make a credible recommendation.",
  );

  text = text.replace(
    /Do not force a WyreStorm comparison\.[\s\S]*?needed\./g,
    "Do not force a WyreStorm comparison. Use this result to explain that the competitor product may sit outside the best WyreStorm fit, or that more detail is needed.",
  );

  text = text.replace(
    /\{\[item\.brand, item\.sku\]\.filter\(Boolean\)\.join\(["'][^"']*["']\) \|\| "Untitled lookup"\}/,
    `{[displaySafe(item.brand), displaySafe(item.sku)].filter(Boolean).join(" - ") || "Untitled lookup"}`,
  );

  text = text.replace(/\{item\.categoryLabel\}/g, "{displaySafe(item.categoryLabel)}");
  text = text.replace(/\{item\.productName\}/g, "{displaySafe(item.productName)}");

  save(relative, text);
}

function patchRouteCopy() {
  const files = [
    path.join("src", "wingman2", "app", "routeCatalog.ts"),
    path.join("src", "wingman2", "app", "route-manifest.json"),
    path.join("src", "wingman2", "app", "routes.tsx"),
  ];

  for (const relative of files) {
    let text = read(relative);

    if (!text) {
      continue;
    }

    text = cleanMojibake(text);
    text = text.replaceAll("Competitor Compare", "Competitor Product Check");
    text = text.replaceAll(
      "Replace competitor SKUs with a clear WyreStorm answer.",
      "Understand the competitor product and position a credible WyreStorm option.",
    );

    save(relative, text);
  }
}

function patchCompareIntelligence() {
  const relative = path.join("server", "competitor", "compare-intelligence.mjs");
  let text = read(relative);

  if (!text) {
    throw new Error(`Missing ${relative}`);
  }

  text = cleanMojibake(text);
  text = text.replace(/\basync\s+async\s+function\b/g, "async function");

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

  if (!text.includes("function buildCuratedWyrestormCandidates")) {
    const helper = `
function buildCuratedWyrestormCandidates(classification, profile) {
  const evidenceText = String(profile?.__evidenceText || "");
  const competitorPurpose = inferProductPurpose(classification, evidenceText);

  if (classification.category !== "hdbaset_extender") {
    return [];
  }

  const isKit =
    competitorPurpose.role === "extender_set" ||
    /\\bAC[-\\s]?EX\\d+[-\\s]?\\d+[-\\s]?R\\d+\\b/i.test(evidenceText) ||
    /extender\\s*kit/i.test(evidenceText);

  if (!isKit) {
    return [];
  }

  return [
    {
      sku: "EX-100-H2",
      name: "WyreStorm 100m 4K HDR HDBaseT extender set",
      family: "HDBaseT Extender",
      sourceFile: "curated-hdbaset-role-map",
      score: 78,
      confidence: 0.78,
      candidateCategory: "hdbaset_extender",
      candidateCategoryLabel: "HDBaseT extender / transmitter / receiver",
      competitorPurpose: competitorPurpose.label,
      candidatePurpose: "HDBaseT extender kit / TX+RX set",
      purposeRole: "extender_set",
      purposeMatch: "same HDBaseT role: extender kit / TX+RX set",
      reasons: [
        "same type of product",
        "same HDBaseT role: extender kit / TX+RX set",
        "confirm distance, HDMI bandwidth, HDR, audio and control requirements before quoting"
      ]
    },
    {
      sku: "EX-70-H2",
      name: "WyreStorm 70m 4K HDR HDBaseT extender set",
      family: "HDBaseT Extender",
      sourceFile: "curated-hdbaset-role-map",
      score: 70,
      confidence: 0.7,
      candidateCategory: "hdbaset_extender",
      candidateCategoryLabel: "HDBaseT extender / transmitter / receiver",
      competitorPurpose: competitorPurpose.label,
      candidatePurpose: "HDBaseT extender kit / TX+RX set",
      purposeRole: "extender_set",
      purposeMatch: "same HDBaseT role: extender kit / TX+RX set",
      reasons: [
        "same type of product",
        "same HDBaseT role: extender kit / TX+RX set",
        "confirm whether 70m class distance is sufficient"
      ]
    }
  ];
}

`;

    const bounds = functionBounds(text, "matchWyrestormProducts");
    text = bounds ? text.slice(0, bounds.start) + helper + text.slice(bounds.start) : text + helper;
  }

  text = text.replace(
    /if\s*\(skuClassification\s*&&\s*candidateClassification\.category\s*===\s*"unknown"\)\s*\{\s*candidateClassification\s*=\s*skuClassification;\s*\}/g,
    `if (skuClassification) {
    candidateClassification = skuClassification;
  }`,
  );

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

  text = replaceFunction(
    text,
    "matchWyrestormProducts",
    `async function matchWyrestormProducts(classification, profile) {
  const products = await loadWyrestormProducts();
  const scoredCandidates = products
    .map((product) => scoreWyrestormCandidate(classification, profile, product, profile.__evidenceText || ""))
    .filter(Boolean);

  const curatedCandidates = buildCuratedWyrestormCandidates(classification, profile);

  const bySku = new Map();

  for (const candidate of [...scoredCandidates, ...curatedCandidates]) {
    const key = String(candidate.sku || candidate.name || "").toUpperCase();

    if (!key) {
      continue;
    }

    const existing = bySku.get(key);

    if (!existing || Number(candidate.score || 0) > Number(existing.score || 0)) {
      bySku.set(key, candidate);
    }
  }

  const candidates = Array.from(bySku.values())
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, 8);

  const top = candidates[0];

  if (!top || Number(top.score || 0) < 42) {
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

  text = text.replace(/\basync\s+async\s+function\b/g, "async function");

  save(relative, text);
}

patchComparePage();
patchRouteCopy();
patchCompareIntelligence();

console.log("");
console.log("Compare cleanup and HDBaseT fallback matching complete.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}