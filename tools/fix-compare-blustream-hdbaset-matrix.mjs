import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-blustream-hdbaset-matrix-${stamp}`);
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

const matrixHelpers = `
function identifyHdbasetMatrixSpecificity(sourceText) {
  const text = String(sourceText || "");

  const isPla88cs =
    /\\bPLA88CS\\b/i.test(text) ||
    (/\\bblustream\\b/i.test(text) && /\\bpla\\s*88\\s*cs\\b/i.test(text));

  const matrixMatch = text.match(/\\b(\\d+)\\s*[xX]\\s*(\\d+)\\b/);
  const inputs = matrixMatch ? Number(matrixMatch[1]) : null;
  const outputs = matrixMatch ? Number(matrixMatch[2]) : null;

  const isHdbasetMatrix =
    isPla88cs ||
    (/\\bhdbaset\\b/i.test(text) && /\\bmatrix\\b/i.test(text)) ||
    (/\\bhdbt\\b/i.test(text) && /\\bmatrix\\b/i.test(text));

  if (!isHdbasetMatrix) {
    return {
      isHdbasetMatrix: false,
      inputs,
      outputs,
      label: "HDBaseT matrix requirement not confirmed"
    };
  }

  if (isPla88cs) {
    return {
      isHdbasetMatrix: true,
      inputs: 8,
      outputs: 8,
      label: "Blustream PLA88CS 8x8 HDBaseT CSC matrix",
      leadWyrestormSku: "MXV-0808-H2A-KIT",
      confidence: "high"
    };
  }

  if (inputs === 8 && outputs === 8) {
    return {
      isHdbasetMatrix: true,
      inputs,
      outputs,
      label: "8x8 HDBaseT matrix requirement",
      leadWyrestormSku: "MXV-0808-H2A-KIT",
      confidence: "high"
    };
  }

  return {
    isHdbasetMatrix: true,
    inputs,
    outputs,
    label: "HDBaseT matrix requirement",
    leadWyrestormSku: outputs && outputs > 8 ? "MXV-0808-H2A-KIT" : "MXV-0808-H2A-KIT",
    confidence: "medium"
  };
}

function curatedHdbasetMatrixCandidates(classification, profile) {
  const evidenceText = String(profile?.__evidenceText || "");
  const specificity = identifyHdbasetMatrixSpecificity(evidenceText);

  if (!specificity.isHdbasetMatrix) {
    return [];
  }

  if (classification.category !== "matrix_switcher" && classification.category !== "hdbaset_extender") {
    return [];
  }

  return [
    {
      sku: "MXV-0808-H2A-KIT",
      name: "WyreStorm 8x8 HDBaseT matrix kit with 8 HDBaseT zone outputs",
      family: "HDBaseT Matrix Kit",
      sourceFile: "curated-hdbaset-matrix-role-map",
      score: 92,
      confidence: 0.92,
      candidateCategory: "matrix_switcher",
      candidateCategoryLabel: "8x8 HDBaseT matrix",
      competitorPurpose: specificity.label,
      candidatePurpose: "8x8 HDBaseT matrix / distribution role",
      purposeRole: "hdbaset_matrix",
      purposeMatch: "same 8x8 HDBaseT matrix role",
      reasons: [
        "lead option",
        "same 8x8 matrix scale",
        "same HDBaseT distribution role",
        "confirm receiver/package requirement, ARC/audio behaviour, control, distance and output mirroring before quoting"
      ]
    },
    {
      sku: "MXV-0808-H2L",
      name: "WyreStorm 8x8 4K60 HDBaseT matrix option",
      family: "HDBaseT Matrix",
      sourceFile: "curated-hdbaset-matrix-role-map",
      score: 82,
      confidence: 0.82,
      candidateCategory: "matrix_switcher",
      candidateCategoryLabel: "8x8 HDBaseT matrix",
      competitorPurpose: specificity.label,
      candidatePurpose: "8x8 HDBaseT matrix role",
      purposeRole: "hdbaset_matrix",
      purposeMatch: "same 8x8 HDBaseT matrix role, subject to package and receiver requirements",
      reasons: [
        "related option",
        "same 8x8 HDBaseT matrix role",
        "confirm whether this project needs kit receivers, ARC, audio downmixing and mirrored HDMI outputs"
      ]
    },
    {
      sku: "MX-0808-KIT V2",
      name: "WyreStorm 8x8 HDBaseT matrix kit for lite commercial distribution",
      family: "HDBaseT Matrix Kit",
      sourceFile: "curated-hdbaset-matrix-role-map",
      score: 70,
      confidence: 0.7,
      candidateCategory: "matrix_switcher",
      candidateCategoryLabel: "8x8 HDBaseT matrix kit",
      competitorPurpose: specificity.label,
      candidatePurpose: "8x8 HDBaseT matrix kit role",
      purposeRole: "hdbaset_matrix",
      purposeMatch: "related 8x8 HDBaseT matrix kit, but check bandwidth and feature parity carefully",
      reasons: [
        "related alternative",
        "same 8x8 matrix scale",
        "use only if the required feature set is closer to lite commercial distribution",
        "not automatically like-for-like for every PLA88CS feature"
      ]
    }
  ];
}

`;

text = insertBeforeFunction(
  text,
  "buildCuratedWyrestormCandidates",
  matrixHelpers,
  "function identifyHdbasetMatrixSpecificity",
);

text = replaceFunction(
  text,
  "classifyKnownModel",
  `function classifyKnownModel(input) {
  const brand = lower(input.brand || input.manufacturer || input.vendor);
  const sku = cleanText(input.sku || input.model || input.partNumber);
  const text = lower([brand, sku, input.productName, input.rawText, input.text].filter(Boolean).join(" "));

  if ((/blustream|blu\\s*stream/.test(brand) || /blustream|blu\\s*stream/.test(text)) && /\\bpla\\s*88\\s*cs\\b|\\bpla88cs\\b/.test(text)) {
    return {
      category: "matrix_switcher",
      categoryLabel: "8x8 HDBaseT matrix",
      confidence: 0.86,
      wyrestormOverlap: true,
      reason: "Blustream PLA88CS is an 8x8 HDBaseT CSC matrix product."
    };
  }

  if ((/turtle\\s*av|turtleav/.test(brand) || /turtle\\s*av|turtleav/.test(text)) && /video\\s*wall|videowall|video[-\\s]?wall|\\b\\d+\\s*[xX]\\s*\\d+\\b/.test(text)) {
    return {
      category: "video_wall_processor",
      categoryLabel: "Video wall processor / matrix",
      confidence: 0.78,
      wyrestormOverlap: true,
      reason: "TurtleAV video wall wording indicates a video wall processor or matrix-style video wall requirement."
    };
  }

  if (/av\\s*pro\\s*edge|avproedge/.test(brand) && /^ac[-\\s]?ex/i.test(sku)) {
    return {
      category: "hdbaset_extender",
      categoryLabel: "HDBaseT extender / transmitter / receiver",
      confidence: 0.72,
      wyrestormOverlap: true,
      reason: "AVPro Edge AC-EX model prefix commonly maps to HDBaseT extender products."
    };
  }

  if (/extron/.test(brand) && /\\bnav\\s*d\\s*\\d+/i.test(sku)) {
    return {
      category: "av_over_ip",
      categoryLabel: "AV over IP endpoint",
      confidence: 0.82,
      wyrestormOverlap: true,
      reason: "Extron NAV D model prefix indicates an AVoIP decoder/display-side endpoint."
    };
  }

  if (/extron/.test(brand) && /\\bnav\\s*e\\s*\\d+/i.test(sku)) {
    return {
      category: "av_over_ip",
      categoryLabel: "AV over IP endpoint",
      confidence: 0.82,
      wyrestormOverlap: true,
      reason: "Extron NAV E model prefix indicates an AVoIP encoder/source-side endpoint."
    };
  }

  if (/kramer/.test(brand) && /^vp[-\\s]?\\d+/i.test(sku)) {
    return {
      category: "presentation_switcher",
      categoryLabel: "Presentation switcher / scaler / room switcher",
      confidence: 0.55,
      wyrestormOverlap: true,
      reason: "Kramer VP model prefix commonly maps to presentation scaler/switcher products."
    };
  }

  if (/^nhd[-_]/i.test(sku) || text.includes("networkhd")) {
    return {
      category: "av_over_ip",
      categoryLabel: "AV over IP endpoint",
      confidence: 0.9,
      wyrestormOverlap: true,
      reason: "WyreStorm NHD/NetworkHD products are AVoIP endpoints."
    };
  }

  if (/^ex[-_]/i.test(sku) || text.includes("hdbaset")) {
    return {
      category: "hdbaset_extender",
      categoryLabel: "HDBaseT extender / transmitter / receiver",
      confidence: 0.88,
      wyrestormOverlap: true,
      reason: "WyreStorm EX products are HDBaseT/extender products."
    };
  }

  if (/^mxv[-_]?0808/i.test(sku) || /^mx[-_]?0808[-_]?kit/i.test(sku) || /^mx[-_]?0808[-_]?hdbt/i.test(sku)) {
    return {
      category: "matrix_switcher",
      categoryLabel: "8x8 HDBaseT matrix",
      confidence: 0.88,
      wyrestormOverlap: true,
      reason: "WyreStorm MX/MXV 0808 HDBaseT products are 8x8 matrix products."
    };
  }

  return null;
}`,
);

text = replaceFunction(
  text,
  "inferPresentationRole",
  `function inferPresentationRole(text) {
  const value = String(text ?? "");
  const hdbasetMatrix = identifyHdbasetMatrixSpecificity(value);

  if (hdbasetMatrix.isHdbasetMatrix) {
    return {
      role: "hdbaset_matrix",
      label: hdbasetMatrix.label,
      confidence: hdbasetMatrix.confidence || "high"
    };
  }

  const presentationScore = scorePatterns(value, [/presentation\\s+switch/i, /presentation\\s+scaler/i, /room\\s+switcher/i, /\\bbyod\\b/i, /\\bbyom\\b/i]);
  const matrixScore = scorePatterns(value, [/\\bmatrix\\b/i, /\\b\\d+\\s*[xX]\\s*\\d+\\b/i, /crosspoint/i]);
  const scalerScore = scorePatterns(value, [/\\bscaler\\b/i, /\\bscaling\\b/i, /upscale/i, /downscale/i]);

  if (presentationScore >= matrixScore && presentationScore > 0) {
    return {
      role: scalerScore > 0 ? "presentation_scaler_switcher" : "presentation_switcher",
      label: scalerScore > 0 ? "presentation switcher with scaling" : "presentation switcher",
      confidence: roleConfidence(presentationScore + scalerScore)
    };
  }

  if (matrixScore > 0) {
    return {
      role: "matrix_switcher",
      label: "matrix switcher",
      confidence: roleConfidence(matrixScore)
    };
  }

  return {
    role: "unknown",
    label: "presentation role not confirmed",
    confidence: "unknown"
  };
}`,
);

text = replaceFunction(
  text,
  "buildCuratedWyrestormCandidates",
  `function buildCuratedWyrestormCandidates(classification, profile) {
  const evidenceText = String(profile?.__evidenceText || "");
  const hdbasetMatrixCandidates = curatedHdbasetMatrixCandidates(classification, profile);

  if (hdbasetMatrixCandidates.length) {
    return hdbasetMatrixCandidates;
  }

  const videoWallCandidates = curatedVideoWallCandidates(classification, profile);

  if (videoWallCandidates.length) {
    return videoWallCandidates;
  }

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
  "matchWyrestormProducts",
  `async function matchWyrestormProducts(classification, profile) {
  const products = await loadWyrestormProducts();
  const hdbasetSpecificity = identifyHdbasetSpecificity(profile.__evidenceText || "");
  const videoWallSpecificity = identifyVideoWallSpecificity(profile.__evidenceText || "");
  const hdbasetMatrixSpecificity = identifyHdbasetMatrixSpecificity(profile.__evidenceText || "");

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

    if (
      hdbasetMatrixSpecificity.isHdbasetMatrix &&
      hdbasetMatrixSpecificity.inputs === 8 &&
      hdbasetMatrixSpecificity.outputs === 8 &&
      !["MXV-0808-H2A-KIT", "MXV-0808-H2L", "MX-0808-KIT V2", "MX-0808-HDBT-H2"].includes(key)
    ) {
      continue;
    }

    if (
      classification.category === "video_wall_processor" &&
      videoWallSpecificity.isVideoWall &&
      videoWallSpecificity.inputs === 8 &&
      videoWallSpecificity.outputs === 8 &&
      !["MX-0808-SCL", "MX-0812-SCL", "SW-0206-VW", "SW-0204-VW"].includes(key)
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
      message: hdbasetMatrixSpecificity.isHdbasetMatrix
        ? "Wingman identified an HDBaseT matrix requirement, but could not confirm a strong WyreStorm matrix option from the current product list."
        : videoWallSpecificity.isVideoWall
          ? "Wingman identified a video wall requirement, but could not confirm a strong WyreStorm option from the current product list."
          : hdbasetSpecificity.standard === "hdbaset_3"
            ? "Wingman identified an HDBaseT 3.0 competitor product, but could not confirm the required WyreStorm EX-100-USB3 match from the current product list."
            : "Wingman identified the competitor product type, but no WyreStorm product reached the minimum confidence threshold for a professional comparison."
    };
  }

  return {
    attempted: true,
    matchStatus: "candidate_match",
    candidates,
    message: hdbasetMatrixSpecificity.isHdbasetMatrix
      ? "Wingman found WyreStorm HDBaseT matrix options to consider. Confirm receiver package, output mirroring, audio/ARC behaviour, control and distance before quoting."
      : videoWallSpecificity.isVideoWall
        ? "Wingman found a WyreStorm video wall / matrix option to consider. Confirm source count, display count and layout behaviour before quoting."
        : hdbasetSpecificity.standard === "hdbaset_3"
          ? "Wingman found the HDBaseT 3.0 like-for-like WyreStorm option. Other HDBaseT products have been discounted because they are not the same standard."
          : "Wingman found one or more WyreStorm options in the same or closely related product role."
  };
}`,
);

save(relative, text);

console.log("");
console.log("Blustream PLA88CS HDBaseT matrix recognition installed.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}