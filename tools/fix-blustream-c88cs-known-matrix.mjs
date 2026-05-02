import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `blustream-c88cs-known-matrix-${stamp}`);
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

const relative = path.join("server", "competitor", "compare-intelligence.mjs");
let text = read(relative);

if (!text) {
  throw new Error(`Missing ${relative}`);
}

text = replaceFunction(
  text,
  "buildDirectVendorUrls",
  `function buildDirectVendorUrls(brand, sku, productUrl) {
  const known = normaliseKnownProductUrl(productUrl);
  const urls = [];

  if (known) {
    urls.push({ url: known, title: \`\${brand} \${sku} known product page\` });
  }

  const vendor = lower(brand);
  const variants = makeSkuVariants(sku);
  const skuLower = lower(sku).replace(/[^a-z0-9]/g, "");

  if (vendor.includes("kramer")) {
    urls.push(
      { url: \`https://www1.kramerav.com/product/\${variants.lower}\`, title: \`\${brand} \${sku}\` },
      { url: \`https://www1.kramerav.com/product/\${variants.upper}\`, title: \`\${brand} \${sku}\` }
    );
  }

  if (vendor.includes("extron")) {
    urls.push(
      { url: \`https://www.extron.com/product/\${variants.compactLower}\`, title: \`\${brand} \${sku}\` },
      { url: \`https://www.extron.com/product/\${variants.lower}\`, title: \`\${brand} \${sku}\` }
    );
  }

  if (vendor.includes("avpro") || vendor.includes("av pro")) {
    urls.push(
      { url: \`https://www.avproedge.com/\${variants.lower}.html\`, title: \`\${brand} \${sku}\` },
      { url: \`https://www.avproedge.com/\${variants.upper}.html\`, title: \`\${brand} \${sku}\` }
    );
  }

  if (vendor.includes("blustream") || vendor.includes("blu stream")) {
    if (skuLower === "c88cs") {
      urls.push({ url: "https://www.blustream.co.uk/8x8-hdbaset-matrix-c88cs", title: "Blustream C88CS" });
    }

    if (skuLower === "pla88cs") {
      urls.push({ url: "https://www.blustream.co.uk/8x8-hdbaset-matrix-pla88cs", title: "Blustream PLA88CS" });
    }

    urls.push(
      { url: \`https://www.blustream.co.uk/search?search=\${variants.encoded}\`, title: \`\${brand} \${sku}\` },
      { url: \`https://www.blustream.co.uk/\${variants.lower}\`, title: \`\${brand} \${sku}\` }
    );
  }

  return uniqueBy(urls, (item) => item.url);
}`
);

text = replaceFunction(
  text,
  "identifyHdbasetMatrixSpecificity",
  `function identifyHdbasetMatrixSpecificity(sourceText) {
  const text = String(sourceText || "");

  const isBlustreamC88cs =
    /\\bC88CS\\b/i.test(text) ||
    (/\\bblustream\\b/i.test(text) && /\\bc\\s*88\\s*cs\\b/i.test(text));

  const isBlustreamPla88cs =
    /\\bPLA88CS\\b/i.test(text) ||
    (/\\bblustream\\b/i.test(text) && /\\bpla\\s*88\\s*cs\\b/i.test(text));

  const matrixMatch = text.match(/\\b(\\d+)\\s*[xX]\\s*(\\d+)\\b/);
  const inputs = matrixMatch ? Number(matrixMatch[1]) : null;
  const outputs = matrixMatch ? Number(matrixMatch[2]) : null;

  const isHdbasetMatrix =
    isBlustreamC88cs ||
    isBlustreamPla88cs ||
    (/\\bhdbaset\\b/i.test(text) && /\\bmatrix\\b/i.test(text)) ||
    (/\\bhdbt\\b/i.test(text) && /\\bmatrix\\b/i.test(text)) ||
    (/\\b8\\s*[xX]\\s*8\\b/i.test(text) && /\\bmatrix\\b/i.test(text));

  if (!isHdbasetMatrix) {
    return {
      isHdbasetMatrix: false,
      inputs,
      outputs,
      label: "HDBaseT matrix requirement not confirmed"
    };
  }

  if (isBlustreamC88cs) {
    return {
      isHdbasetMatrix: true,
      inputs: 8,
      outputs: 8,
      label: "Blustream C88CS 8x8 HDBaseT CSC matrix",
      leadWyrestormSku: "MXV-0808-H2A-KIT",
      confidence: "high"
    };
  }

  if (isBlustreamPla88cs) {
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
    leadWyrestormSku: "MXV-0808-H2A-KIT",
    confidence: "medium"
  };
}`
);

text = replaceFunction(
  text,
  "classifyKnownModel",
  `function classifyKnownModel(input) {
  const brand = lower(input.brand || input.manufacturer || input.vendor);
  const sku = cleanText(input.sku || input.model || input.partNumber);
  const text = lower([brand, sku, input.productName, input.rawText, input.text].filter(Boolean).join(" "));
  const compactSku = lower(sku).replace(/[^a-z0-9]/g, "");

  if ((/blustream|blu\\s*stream/.test(brand) || /blustream|blu\\s*stream/.test(text)) && (compactSku === "c88cs" || /\\bc\\s*88\\s*cs\\b|\\bc88cs\\b/.test(text))) {
    return {
      category: "matrix_switcher",
      categoryLabel: "Blustream C88CS 8x8 HDBaseT CSC matrix",
      confidence: 0.9,
      wyrestormOverlap: true,
      reason: "Blustream C88CS is a known 8x8 HDBaseT CSC matrix product."
    };
  }

  if ((/blustream|blu\\s*stream/.test(brand) || /blustream|blu\\s*stream/.test(text)) && (compactSku === "pla88cs" || /\\bpla\\s*88\\s*cs\\b|\\bpla88cs\\b/.test(text))) {
    return {
      category: "matrix_switcher",
      categoryLabel: "Blustream PLA88CS 8x8 HDBaseT CSC matrix",
      confidence: 0.9,
      wyrestormOverlap: true,
      reason: "Blustream PLA88CS is a known 8x8 HDBaseT CSC matrix product."
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
}`
);

save(relative, text);

console.log("");
console.log("Blustream C88CS known-model classification installed.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}