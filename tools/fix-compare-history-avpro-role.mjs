import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-history-avpro-role-${stamp}`);
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

function patchComparePage() {
  const relative = path.join("src", "wingman2", "pages", "ComparePage.tsx");
  let text = read(relative);

  if (!text) {
    throw new Error(`Missing ${relative}`);
  }

  text = text.replaceAll("setCompetitor brand", "setBrand");
  text = text.replaceAll("setCompetitor Brand", "setBrand");

  text = text.replace(
    /const HISTORY_KEY = "wingman\.compare\.inputHistory\.v\d+";/,
    'const HISTORY_KEY = "wingman.compare.inputHistory.v5";',
  );

  const legacyBlock = `const LEGACY_HISTORY_KEYS = [
  "wingman.compare.inputHistory.v1",
  "wingman.compare.inputHistory.v2",
  "wingman.compare.inputHistory.v3",
  "wingman.compare.inputHistory.v4",
];`;

  if (/const LEGACY_HISTORY_KEYS = \[[\s\S]*?\];/.test(text)) {
    text = text.replace(/const LEGACY_HISTORY_KEYS = \[[\s\S]*?\];/, legacyBlock);
  } else {
    text = text.replace(
      /const HISTORY_KEY = "wingman\.compare\.inputHistory\.v5";/,
      `const HISTORY_KEY = "wingman.compare.inputHistory.v5";\n${legacyBlock}`,
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
    /useEffect\(\(\) => \{\s*(?:if \(typeof window !== "undefined"\) \{[\s\S]*?\}\s*)?setHistory\(loadHistory\(\)\);\s*\}, \[\]\);/,
    `useEffect(() => {
    purgeLegacyCompareHistory();
    setHistory(loadHistory());
  }, []);`,
  );

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
    /\{\[item\.brand, item\.sku\]\.filter\(Boolean\)\.join\(" · "\) \|\| "Untitled lookup"\}/,
    `{[displaySafe(item.brand), displaySafe(item.sku)].filter(Boolean).join(" · ") || "Untitled lookup"}`,
  );

  text = text.replace(
    /\{item\.productName\}/g,
    "{displaySafe(item.productName)}",
  );

  text = text.replace(
    /\{item\.categoryLabel\}/g,
    "{displaySafe(item.categoryLabel)}",
  );

  text = text.replace(
    "Competitor Compare",
    "Competitor Product Check",
  );

  save(relative, text);
}

function patchRouteCatalog() {
  const relative = path.join("src", "wingman2", "app", "routeCatalog.ts");
  let text = read(relative);

  if (!text) {
    return;
  }

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

  if (!text.includes("avpro edge AC-EX model prefix")) {
    text = text.replace(
      /const KNOWN_MODEL_HINTS = \[/,
      `const KNOWN_MODEL_HINTS = [
  {
    brand: /av\\s*pro\\s*edge|avproedge/i,
    sku: /^AC[-\\s]?EX/i,
    category: "hdbaset_extender",
    label: "HDBaseT extender / transmitter / receiver",
    confidence: 0.62,
    reason: "avpro edge AC-EX model prefix commonly maps to HDBaseT extender products."
  },`,
    );
  }

  if (!text.includes("function inferAvProEdgePurpose")) {
    const helper = `
function inferAvProEdgePurpose(category, sourceText) {
  const text = String(sourceText || "");

  if (category !== "hdbaset_extender") {
    return {
      role: "unknown",
      label: "Product role not confirmed",
      confidence: "unknown"
    };
  }

  if (/\\bAC[-\\s]?EX\\d+[-\\s]?\\d+[-\\s]?R\\d+\\b/i.test(text) || /extender\\s*kit/i.test(text) || /transmitter\\s*(?:and|\\+)\\s*receiver/i.test(text)) {
    return {
      role: "extender_set",
      label: "HDBaseT extender kit / TX+RX set",
      confidence: "high"
    };
  }

  if (/[-_\\s]TX\\b/i.test(text) || /\\btransmitter\\b/i.test(text)) {
    return {
      role: "transmitter",
      label: "HDBaseT transmitter / source-side unit",
      confidence: "high"
    };
  }

  if (/[-_\\s]RX\\b/i.test(text) || /\\breceiver\\b/i.test(text)) {
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
    text = bounds
      ? text.slice(0, bounds.start) + helper + text.slice(bounds.start)
      : helper + text;
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
    const avpro = inferAvProEdgePurpose(category, text);

    if (avpro.role !== "unknown") {
      return avpro;
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

  save(relative, text);
}

patchComparePage();
patchRouteCatalog();
patchCompareIntelligence();

console.log("");
console.log("Compare history cleanup and AVPro role refinement complete.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}