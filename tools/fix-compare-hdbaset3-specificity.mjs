import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-hdbaset3-specificity-${stamp}`);
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
    throw new Error(`Could not find function ${functionName}`);
  }

  return text.slice(0, bounds.start) + replacement + text.slice(bounds.end);
}

function insertBeforeFunction(text, functionName, block, marker) {
  if (text.includes(marker)) {
    return text;
  }

  const bounds = functionBounds(text, functionName);

  if (!bounds) {
    throw new Error(`Could not find function ${functionName}`);
  }

  return text.slice(0, bounds.start) + block + "\n" + text.slice(bounds.start);
}

const relative = path.join("server", "competitor", "compare-intelligence.mjs");
let text = read(relative);

if (!text) {
  throw new Error(`Missing ${relative}`);
}

const specificityHelpers = `
function identifyHdbasetSpecificity(sourceText) {
  const text = String(sourceText || "");

  const isHdbaset3 =
    /\\bhdbaset\\s*3(?:\\.0)?\\b/i.test(text) ||
    /\\bhdbt\\s*3(?:\\.0)?\\b/i.test(text) ||
    /\\bvalens\\s*vs3000\\b/i.test(text) ||
    /\\b4k\\s*60\\s*4\\s*:?4\\s*:?4\\b/i.test(text) ||
    /\\b18\\s*gbps\\b/i.test(text) ||
    /\\busb\\s*3(?:\\.0|\\.1|\\.2)?\\b/i.test(text) ||
    /\\busb3\\b/i.test(text) ||
    /\\bAC[-\\s]?EX100[-\\s]?444[-\\s]?R3\\b/i.test(text);

  if (isHdbaset3) {
    return {
      standard: "hdbaset_3",
      label: "HDBaseT 3.0 / 4K60 4:4:4 extender set",
      requiredWyrestormSku: "EX-100-USB3",
      confidence: "high"
    };
  }

  return {
    standard: "general_hdbaset",
    label: "HDBaseT extender set",
    requiredWyrestormSku: "",
    confidence: "medium"
  };
}

function wyrestormCandidateSupportsHdbasetSpecificity(product, specificity) {
  if (!specificity || specificity.standard !== "hdbaset_3") {
    return true;
  }

  const sku = String(product?.sku || "").toUpperCase();
  const text = String([product?.sku, product?.name, product?.family, product?.text].filter(Boolean).join(" "));

  return (
    sku === "EX-100-USB3" ||
    /\\bEX[-\\s]?100[-\\s]?USB3\\b/i.test(text) ||
    /\\bhdbaset\\s*3(?:\\.0)?\\b/i.test(text) ||
    /\\bhdbt\\s*3(?:\\.0)?\\b/i.test(text) ||
    /\\busb\\s*3(?:\\.0|\\.1|\\.2)?\\b/i.test(text) ||
    /\\busb3\\b/i.test(text)
  );
}

`;

text = insertBeforeFunction(
  text,
  "buildCuratedWyrestormCandidates",
  specificityHelpers,
  "function identifyHdbasetSpecificity",
);

text = replaceFunction(
  text,
  "buildCuratedWyrestormCandidates",
  `function buildCuratedWyrestormCandidates(classification, profile) {
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

  const specificity = identifyHdbasetSpecificity(evidenceText);

  if (specificity.standard === "hdbaset_3") {
    return [
      {
        sku: "EX-100-USB3",
        name: "WyreStorm 100m HDBaseT 3.0 extender set with USB 3 support",
        family: "HDBaseT 3.0 Extender",
        sourceFile: "curated-hdbaset3-role-map",
        score: 94,
        confidence: 0.94,
        candidateCategory: "hdbaset_extender",
        candidateCategoryLabel: "HDBaseT extender / transmitter / receiver",
        competitorPurpose: specificity.label,
        candidatePurpose: "HDBaseT 3.0 extender kit / TX+RX set",
        purposeRole: "extender_set",
        purposeMatch: "same HDBaseT 3.0 role: extender kit / TX+RX set",
        reasons: [
          "same type of product",
          "same HDBaseT 3.0 standard",
          "same extender kit / TX+RX role",
          "required match for AC-EX100-444-R3 style products",
          "confirm final distance, USB mode, audio and control requirements before quoting"
        ]
      }
    ];
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

  const knownCandidate = classifyKnownModel({
    brand: "WyreStorm",
    sku: product.sku,
    productName: product.name,
    rawText: product.text
  });

  if (knownCandidate) {
    candidateClassification = {
      category: knownCandidate.category,
      categoryLabel: knownCandidate.categoryLabel,
      confidence: knownCandidate.confidence,
      wyrestormOverlap: knownCandidate.wyrestormOverlap,
      alternatives: []
    };
  }

  if (!categoriesAreCompatible(competitorClassification.category, candidateClassification.category)) {
    return null;
  }

  const hdbasetSpecificity = identifyHdbasetSpecificity(competitorEvidenceText);

  if (
    competitorClassification.category === "hdbaset_extender" &&
    hdbasetSpecificity.standard === "hdbaset_3" &&
    !wyrestormCandidateSupportsHdbasetSpecificity(product, hdbasetSpecificity)
  ) {
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
  const purposeScore = competitorPurpose.role !== "unknown" && candidatePurpose.role !== "unknown" ? 32 : 8;

  const matchedFeatures = featureNames(competitorProfile).filter((feature) => candidateProfile.features?.[feature] === true);
  const featureScore = matchedFeatures.length * 3;
  const scoredPorts = portScore(competitorProfile, candidateProfile);
  const specificityScore = hdbasetSpecificity.standard === "hdbaset_3" ? 14 : 0;
  const total = Math.min(100, categoryScore + purposeScore + specificityScore + featureScore + scoredPorts.score);

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
    purposeMatch: hdbasetSpecificity.standard === "hdbaset_3"
      ? "same HDBaseT 3.0 standard and same extender kit role"
      : purposeCompatibility.reason,
    reasons: [
      directCategory ? "same type of product" : "related product type",
      hdbasetSpecificity.standard === "hdbaset_3" ? "same HDBaseT 3.0 standard" : purposeCompatibility.reason,
      ...matchedFeatures.map((feature) => \`matches \${feature}\`),
      ...scoredPorts.reasons.map((reason) => \`similar ports: \${reason}\`)
    ].filter(Boolean).slice(0, 12)
  };
}`,
);

text = replaceFunction(
  text,
  "matchWyrestormProducts",
  `async function matchWyrestormProducts(classification, profile) {
  const products = await loadWyrestormProducts();
  const hdbasetSpecificity = identifyHdbasetSpecificity(profile.__evidenceText || "");

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

    if (
      classification.category === "hdbaset_extender" &&
      hdbasetSpecificity.standard === "hdbaset_3" &&
      key !== "EX-100-USB3"
    ) {
      continue;
    }

    const existing = bySku.get(key);

    if (!existing || Number(candidate.score || 0) > Number(existing.score || 0)) {
      bySku.set(key, candidate);
    }
  }

  const candidates = Array.from(bySku.values())
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, hdbasetSpecificity.standard === "hdbaset_3" ? 1 : 8);

  const top = candidates[0];

  if (!top || Number(top.score || 0) < 42) {
    return {
      attempted: true,
      matchStatus: "no_genuine_match",
      candidates,
      message: hdbasetSpecificity.standard === "hdbaset_3"
        ? "Wingman identified an HDBaseT 3.0 competitor product, but could not confirm the required WyreStorm EX-100-USB3 match from the current product list."
        : "Wingman identified the competitor product type, but no WyreStorm product reached the minimum confidence threshold for a professional comparison."
    };
  }

  return {
    attempted: true,
    matchStatus: "candidate_match",
    candidates,
    message: hdbasetSpecificity.standard === "hdbaset_3"
      ? "Wingman found the HDBaseT 3.0 like-for-like WyreStorm option. Other HDBaseT products have been discounted because they are not the same standard."
      : "Wingman found one or more WyreStorm options in the same or closely related product role."
  };
}`,
);

save(relative, text);

console.log("");
console.log("HDBaseT 3.0 specificity rule installed.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}

if (touched.length === 0) {
  console.log(" - No files changed.");
}