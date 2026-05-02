import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-clean-search-state-${stamp}`);
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

function insertBeforeFunction(text, functionName, block, marker) {
  if (text.includes(marker)) {
    return text;
  }

  const bounds = functionBounds(text, functionName);

  if (!bounds) {
    return `${block}\n${text}`;
  }

  return text.slice(0, bounds.start) + block + "\n" + text.slice(bounds.start);
}

function patchEngine() {
  const relative = path.join("server", "competitor", "compare-intelligence.mjs");
  let text = read(relative);

  if (!text) {
    throw new Error(`Missing ${relative}`);
  }

  text = text.replace(/\basync\s+async\s+function\b/g, "async function");

  const hasCorrectVideoWallFunction = /function\s+identifyVideoWallSpecificity\s*\(/.test(text);

  if (!hasCorrectVideoWallFunction) {
    const block = `
function identifyVideoWallSpecificity(sourceText) {
  const text = String(sourceText || "");

  const matrixMatch = text.match(/\\b(\\d+)\\s*[xX]\\s*(\\d+)\\b/);
  const inputs = matrixMatch ? Number(matrixMatch[1]) : null;
  const outputs = matrixMatch ? Number(matrixMatch[2]) : null;

  const isVideoWall =
    /\\bvideo\\s*wall\\b/i.test(text) ||
    /\\bvideowall\\b/i.test(text) ||
    /\\bvideo[-\\s]?wall\\b/i.test(text) ||
    /\\bwall\\s+processor\\b/i.test(text) ||
    /\\bwall\\s+controller\\b/i.test(text) ||
    /\\bwall\\s+matrix\\b/i.test(text);

  if (!isVideoWall) {
    return {
      isVideoWall: false,
      inputs,
      outputs,
      label: "Video wall requirement not confirmed"
    };
  }

  if (inputs === 8 && outputs === 8) {
    return {
      isVideoWall: true,
      inputs,
      outputs,
      label: "8x8 video wall processor / matrix requirement",
      leadWyrestormSku: "MX-0808-SCL"
    };
  }

  if (outputs !== null && outputs > 6) {
    return {
      isVideoWall: true,
      inputs,
      outputs,
      label: \`\${inputs || "multi-input"}x\${outputs} video wall / matrix requirement\`,
      leadWyrestormSku: outputs <= 8 ? "MX-0808-SCL" : "MX-0812-SCL"
    };
  }

  if (outputs !== null && outputs <= 6) {
    return {
      isVideoWall: true,
      inputs,
      outputs,
      label: \`\${inputs || "multi-input"}x\${outputs} video wall processor requirement\`,
      leadWyrestormSku: "SW-0206-VW"
    };
  }

  return {
    isVideoWall: true,
    inputs,
    outputs,
    label: "Video wall processor requirement",
    leadWyrestormSku: "SW-0206-VW"
  };
}
`;
    text = insertBeforeFunction(text, "curatedVideoWallCandidates", block, "function identifyVideoWallSpecificity");
  }

  if (!/function\s+identifyVideowallSpecificity\s*\(/.test(text)) {
    const alias = `
function identifyVideowallSpecificity(sourceText) {
  return identifyVideoWallSpecificity(sourceText);
}
`;
    text = insertBeforeFunction(text, "curatedVideoWallCandidates", alias, "function identifyVideowallSpecificity");
  }

  save(relative, text);
}

function patchComparePage() {
  const relative = path.join("src", "wingman2", "pages", "ComparePage.tsx");
  let text = read(relative);

  if (!text) {
    throw new Error(`Missing ${relative}`);
  }

  text = text.replace(
    /const HISTORY_KEY = "wingman\.compare\.inputHistory\.v\d+";/,
    'const HISTORY_KEY = "wingman.compare.inputHistory.v10";',
  );

  const legacyBlock = `const LEGACY_HISTORY_KEYS = [
  "wingman.compare.inputHistory.v1",
  "wingman.compare.inputHistory.v2",
  "wingman.compare.inputHistory.v3",
  "wingman.compare.inputHistory.v4",
  "wingman.compare.inputHistory.v5",
  "wingman.compare.inputHistory.v6",
  "wingman.compare.inputHistory.v7",
  "wingman.compare.inputHistory.v8",
  "wingman.compare.inputHistory.v9",
];`;

  if (/const LEGACY_HISTORY_KEYS = \[[\s\S]*?\];/.test(text)) {
    text = text.replace(/const LEGACY_HISTORY_KEYS = \[[\s\S]*?\];/, legacyBlock);
  } else {
    text = text.replace(
      /const HISTORY_KEY = "wingman\.compare\.inputHistory\.v10";/,
      `const HISTORY_KEY = "wingman.compare.inputHistory.v10";\n${legacyBlock}`,
    );
  }

  if (!text.includes("function clearCurrentCompareOutput")) {
    text = text.replace(
      /function rememberLookup\(response: CompareIntelligenceResult\) \{/,
      `function clearCurrentCompareOutput() {
    setResult(null);
    setError("");
  }

  function updateBrand(value: string) {
    setBrand(value);
    clearCurrentCompareOutput();
  }

  function updateSku(value: string) {
    setSku(value);
    clearCurrentCompareOutput();
  }

  function updateProductName(value: string) {
    setProductName(value);
    clearCurrentCompareOutput();
  }

  function updateProductUrl(value: string) {
    setProductUrl(value);
    clearCurrentCompareOutput();
  }

  function updateRawText(value: string) {
    setRawText(value);
    clearCurrentCompareOutput();
  }

  function rememberLookup(response: CompareIntelligenceResult) {`,
    );
  }

  text = text.replace(/onChange=\{\(event\) => setBrand\(event\.target\.value\)\}/g, "onChange={(event) => updateBrand(event.target.value)}");
  text = text.replace(/onChange=\{\(event\) => setSku\(event\.target\.value\)\}/g, "onChange={(event) => updateSku(event.target.value)}");
  text = text.replace(/onChange=\{\(event\) => setProductName\(event\.target\.value\)\}/g, "onChange={(event) => updateProductName(event.target.value)}");
  text = text.replace(/onChange=\{\(event\) => setProductUrl\(event\.target\.value\)\}/g, "onChange={(event) => updateProductUrl(event.target.value)}");
  text = text.replace(/onChange=\{\(event\) => setRawText\(event\.target\.value\)\}/g, "onChange={(event) => updateRawText(event.target.value)}");

  text = text.replace(
    /async function runLookup\(event: FormEvent\) \{\s*event\.preventDefault\(\);\s*setBusy\(true\);\s*setError\(""\);\s*setResult\(null\);/,
    `async function runLookup(event: FormEvent) {
    event.preventDefault();

    const requestBrand = brand.trim();
    const requestSku = sku.trim();
    const requestProductName = productName.trim();
    const requestProductUrl = productUrl.trim();
    const requestRawText = rawText.trim();

    setBusy(true);
    setError("");
    setResult(null);`,
  );

  text = text.replace(
    /const response = await lookupCompareIntelligence\(\{\s*brand,\s*sku,\s*productName,\s*productUrl,\s*rawText,\s*allowWeb,\s*\}\);/,
    `const response = await lookupCompareIntelligence({
        brand: requestBrand,
        sku: requestSku,
        productName: requestProductName,
        productUrl: requestProductUrl,
        rawText: requestRawText,
        allowWeb,
      });`,
  );

  save(relative, text);
}

patchEngine();
patchComparePage();

console.log("");
console.log("Compare clean-search state and video wall alias repair applied.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}