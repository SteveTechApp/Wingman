import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-role-history-refine-${stamp}`);
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
  let braceIndex = text.indexOf("{", match.index);

  if (braceIndex < 0) {
    return null;
  }

  let depth = 0;

  for (let i = braceIndex; i < text.length; i++) {
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

function insertBeforeFunction(text, functionName, block, marker) {
  if (text.includes(marker)) {
    return text;
  }

  const bounds = functionBounds(text, functionName);

  if (!bounds) {
    return block + "\n" + text;
  }

  return text.slice(0, bounds.start) + block + "\n" + text.slice(bounds.start);
}

function patchCompareClient() {
  const relative = path.join("src", "wingman2", "lib", "compareIntelligenceClient.ts");
  let text = read(relative);

  if (!text) {
    return;
  }

  if (!/purposeRole\?:\s*string;/.test(text)) {
    text = text.replace(
      /wyrestormOverlap\?:\s*boolean;\s*specProfile\?:/,
      "wyrestormOverlap?: boolean;\n    purposeRole?: string;\n    purposeLabel?: string;\n    purposeConfidence?: string;\n    specProfile?:",
    );
  }

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

function patchComparePage() {
  const relative = path.join("src", "wingman2", "pages", "ComparePage.tsx");
  let text = read(relative);

  if (!text) {
    return;
  }

  text = text.replaceAll("setCompetitor brand", "setBrand");
  text = text.replaceAll("setCompetitor Brand", "setBrand");

  text = text.replace(
    /const HISTORY_KEY = "wingman\.compare\.inputHistory\.v\d+";/,
    'const HISTORY_KEY = "wingman.compare.inputHistory.v4";',
  );

  if (!text.includes("const LEGACY_HISTORY_KEYS")) {
    text = text.replace(
      /const HISTORY_KEY = "wingman\.compare\.inputHistory\.v4";/,
      `const HISTORY_KEY = "wingman.compare.inputHistory.v4";
const LEGACY_HISTORY_KEYS = [
  "wingman.compare.inputHistory.v1",
  "wingman.compare.inputHistory.v2",
  "wingman.compare.inputHistory.v3",
];`,
    );
  }

  if (!text.includes("LEGACY_HISTORY_KEYS.forEach")) {
    text = text.replace(
      /useEffect\(\(\) => \{\s*setHistory\(loadHistory\(\)\);\s*\}, \[\]\);/,
      `useEffect(() => {
    if (typeof window !== "undefined") {
      LEGACY_HISTORY_KEYS.forEach((key) => window.localStorage.removeItem(key));
    }

    setHistory(loadHistory());
  }, []);`,
    );
  }

  text = text.replace(
    /categoryLabel:\s*response\.competitor\?\.categoryLabel,/,
    "categoryLabel: response.competitor?.purposeLabel || response.competitor?.categoryLabel,",
  );

  text = text.replace(
    /\{result\.competitor\?\.categoryLabel \|\| "Need more product detail"\}/,
    '{result.competitor?.purposeLabel || result.competitor?.categoryLabel || "Need more product detail"}',
  );

  text = text.replace(
    "Enter the competitor brand, model, or product page. Wingman will work out what the product does and show whether WyreStorm has a credible alternative.",
    "Enter whatever you have: competitor brand, model, product name, pasted customer notes, or a product page. A URL is optional, but it can improve accuracy when available.",
  );

  text = text.replaceAll("Competitor Compare", "Competitor Product Check");
  text = text.replaceAll("Vendor or distributor product page", "Optional product page link");
  text = text.replaceAll(
    "Wingman will check this page first before looking elsewhere.",
    "Not required. A product page simply gives Wingman a stronger source when the exact link is available.",
  );

  save(relative, text);
}

function patchCompareIntelligence() {
  const relative = path.join("server", "competitor", "compare-intelligence.mjs");
  let text = read(relative);

  if (!text) {
    throw new Error(`Missing ${relative}`);
  }

  const helperBlock = `
function inferKnownProductPurposeFromText(category, sourceText) {
  const text = String(sourceText || "");
  const lowerText = text.toLowerCase();

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
}

function classifyWyrestormCandidateBySku(product) {
  const sku = String(product?.sku || "").toUpperCase();
  const text = String(product?.text || "");

  if (/^NHD[-_]/i.test(sku) || /NETWORKHD/i.test(text)) {
    return {
      category: "av_over_ip",
      categoryLabel: "AV over IP endpoint",
      confidence: 0.92,
      wyrestormOverlap: true,
      alternatives: []
    };
  }

  return null;
}

`;

  text = insertBeforeFunction(
    text,
    "inferProductPurpose",
    helperBlock,
    "function inferKnownProductPurposeFromText",
  );

  text = replaceFunction(
    text,
    "inferProductPurpose",
    `function inferProductPurpose(classification, text) {
  const combinedText = String(text ?? "");
  const category = classification?.category || "unknown";
  const known = inferKnownProductPurposeFromText(category, combinedText);

  if (known.role !== "unknown") {
    return known;
  }

  if (category === "av_over_ip") {
    return inferAvOverIpRole(combinedText);
  }

  if (category === "hdbaset_extender") {
    return inferHdbasetRole(combinedText);
  }

  if (category === "usb_kvm_extension") {
    return inferUsbKvmRole(combinedText);
  }

  if (category === "presentation_switcher" || category === "matrix_switcher") {
    return inferPresentationRole(combinedText);
  }

  if (category === "video_wall_processor" || category === "multiview_processor") {
    return inferVideoWallRole(combinedText);
  }

  return {
    role: "not_directional",
    label: "Role check not required for this product type",
    confidence: "medium"
  };
}`,
  );

  text = replaceFunction(
    text,
    "scoreWyrestormCandidate",
    `function scoreWyrestormCandidate(competitorClassification, competitorProfile, product, competitorEvidenceText = "") {
  let candidateClassification = classifyProduct({
    brand: "WyreStorm",
    sku: product.sku,
    productName: product.name,
    rawText: product.text
  });

  const skuClassification = classifyWyrestormCandidateBySku(product);

  if (skuClassification && candidateClassification.category === "unknown") {
    candidateClassification = skuClassification;
  }

  if (!categoriesAreCompatible(competitorClassification.category, candidateClassification.category)) {
    return null;
  }

  const competitorPurpose = inferProductPurpose(competitorClassification, competitorEvidenceText);
  const candidatePurpose = inferProductPurpose(candidateClassification, [product.sku, product.name, product.text].join(" "));
  const purposeCompatibility = purposeRolesAreCompatible(
    competitorClassification.category,
    competitorPurpose,
    candidatePurpose
  );

  if (!purposeCompatibility.ok) {
    return null;
  }

  const candidateProfile = extractSpecProfile(product.text);
  const directCategory = competitorClassification.category === candidateClassification.category;
  const categoryScore = directCategory ? 48 : 22;
  const purposeScore =
    competitorPurpose.role !== "unknown" &&
    candidatePurpose.role !== "unknown"
      ? 32
      : 8;

  const matchedFeatures = featureNames(competitorProfile).filter((feature) => {
    return candidateProfile.features?.[feature] === true;
  });

  const featureScore = matchedFeatures.length * 3;
  const scoredPorts = portScore(competitorProfile, candidateProfile);
  const total = Math.min(100, categoryScore + purposeScore + featureScore + scoredPorts.score);

  return {
    sku: product.sku,
    name: product.name,
    family: product.family,
    sourceFile: product.sourceFile,
    score: total,
    confidence: Math.min(0.96, total / 100),
    candidateCategory: candidateClassification.category,
    candidateCategoryLabel: candidateClassification.categoryLabel,
    competitorPurpose: competitorPurpose.label,
    candidatePurpose: candidatePurpose.label,
    purposeRole: candidatePurpose.role,
    purposeMatch: purposeCompatibility.reason,
    reasons: [
      directCategory ? "same type of product" : "related product type",
      purposeCompatibility.reason,
      ...matchedFeatures.map((feature) => \`matches \${feature}\`),
      ...scoredPorts.reasons.map((reason) => \`similar ports: \${reason}\`)
    ].slice(0, 12)
  };
}`,
  );

  text = text.replace(
    /\.map\(\(product\) => scoreWyrestormCandidate\(classification, profile, product\)\)/g,
    '.map((product) => scoreWyrestormCandidate(classification, profile, product, profile.__evidenceText || ""))',
  );

  text = text.replace(
    /\.map\(\(product\) => scoreWyrestormCandidate\(classification, profile, product, profile\.__evidenceText \|\| " "\)\)/g,
    '.map((product) => scoreWyrestormCandidate(classification, profile, product, profile.__evidenceText || ""))',
  );

  if (!text.includes("const competitorPurpose = inferProductPurpose(classification, evidenceText);")) {
    text = text.replace(
      "const gate = assessWyrestormGate(classification);",
      `const competitorPurpose = inferProductPurpose(classification, evidenceText);
  const gate = assessWyrestormGate(classification);`,
    );
  }

  if (!text.includes("purposeRole: competitorPurpose.role")) {
    text = text.replace(
      /wyrestormOverlap:\s*classification\.wyrestormOverlap,\s*alternatives:/,
      `wyrestormOverlap: classification.wyrestormOverlap,
      purposeRole: competitorPurpose.role,
      purposeLabel: competitorPurpose.label,
      purposeConfidence: competitorPurpose.confidence,
      alternatives:`,
    );
  }

  save(relative, text);
}

patchCompareClient();
patchComparePage();
patchRouteCatalog();
patchCompareIntelligence();

console.log("");
console.log("Compare role and history refinement complete.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}