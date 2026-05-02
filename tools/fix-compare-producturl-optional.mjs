import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-producturl-optional-end-to-end-${stamp}`);
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

function replaceOnce(text, pattern, replacement, label) {
  const next = text.replace(pattern, replacement);

  if (next === text) {
    console.log(`[skip] ${label}`);
  }

  return next;
}

function functionBounds(text, functionName) {
  const re = new RegExp(`(?:async\\s+)?function\\s+${functionName}\\s*\\(`);
  const match = re.exec(text);

  if (!match) {
    return null;
  }

  const start = match.index;
  const nextRe = /\n(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(/g;
  nextRe.lastIndex = start + 1;
  const next = nextRe.exec(text);

  return {
    start,
    end: next ? next.index : text.length,
  };
}

function patchFunction(text, functionName, patcher) {
  const bounds = functionBounds(text, functionName);

  if (!bounds) {
    console.log(`[skip] function not found: ${functionName}`);
    return text;
  }

  const before = text.slice(0, bounds.start);
  const body = text.slice(bounds.start, bounds.end);
  const after = text.slice(bounds.end);
  const nextBody = patcher(body);

  return before + nextBody + after;
}

function ensureLineAfter(body, anchor, line) {
  if (body.includes(line.trim())) {
    return body;
  }

  if (!body.includes(anchor)) {
    return body;
  }

  return body.replace(anchor, `${anchor}\n  ${line}`);
}

function patchCompareClient() {
  const relative = path.join("src", "wingman2", "lib", "compareIntelligenceClient.ts");
  let text = read(relative);

  if (!text) {
    return;
  }

  if (!/productUrl\?:\s*string;/.test(text)) {
    text = text.replace(
      /rawText\?:\s*string;\s*allowWeb\?:\s*boolean;/,
      "rawText?: string;\n  productUrl?: string;\n  allowWeb?: boolean;",
    );
  }

  text = text.replace(
    /productName\?:\s*string;\s*allowWeb\?:\s*boolean;/,
    "productName?: string;\n    productUrl?: string;\n    allowWeb?: boolean;",
  );

  save(relative, text);
}

function patchNativeCompareServer() {
  const relative = path.join("server", "compare-intelligence-server.mjs");
  let text = read(relative);

  if (!text) {
    return;
  }

  if (!text.includes('productUrl: url.searchParams.get("productUrl")')) {
    text = text.replace(
      /rawText:\s*url\.searchParams\.get\("rawText"\)\s*\|\|\s*"",\s*allowWeb:/,
      'rawText: url.searchParams.get("rawText") || "",\n    productUrl: url.searchParams.get("productUrl") || "",\n    allowWeb:',
    );
  }

  save(relative, text);
}

function patchOptionalExpressRoute() {
  const relative = path.join("server", "competitor", "compare-api-route.mjs");
  let text = read(relative);

  if (!text) {
    return;
  }

  if (!text.includes("productUrl: req.query.productUrl")) {
    text = text.replace(
      /rawText:\s*req\.query\.rawText,\s*allowWeb:/,
      "rawText: req.query.rawText,\n        productUrl: req.query.productUrl,\n        allowWeb:",
    );
  }

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
    'const HISTORY_KEY = "wingman.compare.inputHistory.v3";',
  );

  if (!text.includes("const [productUrl, setProductUrl]")) {
    text = text.replace(
      /const \[productName, setProductName\] = useState\(""\);\s*/,
      'const [productName, setProductName] = useState("");\n  const [productUrl, setProductUrl] = useState("");\n  ',
    );
  }

  if (!/productUrl:\s*string;/.test(text)) {
    text = text.replace(
      /rawText:\s*string;\s*allowWeb:\s*boolean;/,
      "rawText: string;\n  productUrl: string;\n  allowWeb: boolean;",
    );
  }

  if (!text.includes("setProductUrl(item.productUrl")) {
    text = text.replace(
      /setRawText\(item\.rawText\);\s*setAllowWeb\(item\.allowWeb\);/,
      'setRawText(item.rawText);\n    setProductUrl(item.productUrl || "");\n    setAllowWeb(item.allowWeb);',
    );
  }

  text = text.replace(
    /disabled=\{busy \|\| \(!brand\.trim\(\) && !sku\.trim\(\) && !productName\.trim\(\)(?: && !rawText\.trim\(\))?(?: && !productUrl\.trim\(\))?\)\}/,
    'disabled={busy || (!brand.trim() && !sku.trim() && !productName.trim() && !rawText.trim() && !productUrl.trim())}',
  );

  text = text.replace(
    "Enter the competitor brand, model, or product page. Wingman will work out what the product does and show whether WyreStorm has a credible alternative.",
    "Enter whatever you have: competitor brand, model, product name, pasted customer notes, or a product page. A URL is optional, but it can improve accuracy when available.",
  );

  text = text.replace(
    "Let Wingman look online when you do not have a datasheet or product page.",
    "Let Wingman look online when you only have a brand, model, or partial product detail.",
  );

  text = text.replace("Vendor or distributor product page", "Optional product page link");

  text = text.replace(
    "Optional. Paste a manufacturer page, distributor listing, or saved product link.",
    "Optional. Paste a manufacturer page, distributor listing, or saved product link if you have one.",
  );

  text = text.replace(
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

  if (!text.includes("function normaliseKnownProductUrl")) {
    const helper = `
function normaliseKnownProductUrl(value) {
  const trimmed = cleanText(value);

  if (!trimmed) {
    return "";
  }

  if (/^https?:\\/\\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^[a-z0-9.-]+\\.[a-z]{2,}/i.test(trimmed)) {
    return \`https://\${trimmed}\`;
  }

  return "";
}

function buildKnownProductUrlSource(productUrl, brand, sku) {
  const url = normaliseKnownProductUrl(productUrl);

  if (!url) {
    return null;
  }

  return {
    url,
    title: cleanText(\`\${brand} \${sku} known product page\`) || url,
    priority: "known-product-url",
  };
}

`;

    const anchor = "function buildDirectVendorUrls";
    const index = text.indexOf(anchor);

    if (index >= 0) {
      text = text.slice(0, index) + helper + text.slice(index);
    } else {
      text = helper + text;
    }
  }

  text = patchFunction(text, "lookupPublicWebSpecs", (body) => {
    body = ensureLineAfter(
      body,
      "const productName = cleanText(input.productName || input.name);",
      "const productUrl = cleanText(input.productUrl || input.url || input.vendorUrl || input.productPageUrl);",
    );

    if (!body.includes("const knownProductUrlSource = buildKnownProductUrlSource(productUrl, brand, sku);")) {
      body = body.replace(
        "const sourceMap = new Map();",
        `const sourceMap = new Map();

  const knownProductUrlSource = buildKnownProductUrlSource(productUrl, brand, sku);

  if (knownProductUrlSource) {
    sourceMap.set(knownProductUrlSource.url, knownProductUrlSource);
  }`,
      );
    }

    return body;
  });

  text = patchFunction(text, "resolveCompetitorIntelligence", (body) => {
    body = ensureLineAfter(
      body,
      "const rawNotes = cleanText(input.rawText || input.notes || input.description);",
      "const productUrl = cleanText(input.productUrl || input.url || input.vendorUrl || input.productPageUrl);",
    );

    body = body.replace(
      /lookupPublicWebSpecs\(\{\s*brand,\s*sku,\s*productName\s*\}\)/g,
      "lookupPublicWebSpecs({ brand, sku, productName, productUrl })",
    );

    if (!body.includes("lookupPublicWebSpecs({ brand, sku, productName, productUrl })")) {
      body = body.replace(
        /lookupPublicWebSpecs\(\{\s*brand,\s*sku,\s*productName,\s*[^}]*\}\)/g,
        "lookupPublicWebSpecs({ brand, sku, productName, productUrl })",
      );
    }

    if (!/query:\s*\{[\s\S]*?productUrl/.test(body)) {
      body = body.replace(
        /productName,\s*allowWeb/g,
        "productName,\n      productUrl,\n      allowWeb",
      );
    }

    return body;
  });

  save(relative, text);
}

function patchRouteCatalog() {
  const relative = path.join("src", "wingman2", "app", "routeCatalog.ts");
  let text = read(relative);

  if (!text) {
    return;
  }

  text = text.replace("Competitor Compare", "Competitor Product Check");
  text = text.replace(
    "Replace competitor SKUs with a clear WyreStorm answer.",
    "Understand the competitor product and position a credible WyreStorm option.",
  );

  save(relative, text);
}

patchCompareClient();
patchNativeCompareServer();
patchOptionalExpressRoute();
patchComparePage();
patchCompareIntelligence();
patchRouteCatalog();

console.log("");
console.log("Compare product URL optional repair complete.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}