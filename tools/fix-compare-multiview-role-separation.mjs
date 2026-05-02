import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-multiview-role-separation-${stamp}`);
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

const multiviewHelpers = `
function hasExplicitMultiviewFeature(sourceText) {
  const text = String(sourceText || "");

  return (
    /\\bmultiview\\b/i.test(text) ||
    /\\bmulti[-\\s]?view\\b/i.test(text) ||
    /\\bquad\\s+view\\b/i.test(text) ||
    /\\bpip\\b/i.test(text) ||
    /\\bpbp\\b/i.test(text) ||
    /picture[-\\s]?in[-\\s]?picture/i.test(text) ||
    /picture[-\\s]?by[-\\s]?picture/i.test(text) ||
    /\\bmosaic\\b/i.test(text) ||
    /windowed\\s+layout/i.test(text) ||
    /source\\s+windows/i.test(text) ||
    /multiple\\s+sources?\\s+on\\s+(?:a\\s+)?single\\s+(?:hdmi\\s+)?output/i.test(text) ||
    /single\\s+(?:hdmi\\s+)?output\\s+(?:showing|displaying|with)\\s+multiple\\s+sources?/i.test(text)
  );
}

function hasOnlyMultipleOutputsNotMultiview(sourceText) {
  const text = String(sourceText || "");

  const hasOutputCount =
    /\\b\\d+\\s*(?:x|X)?\\s*hdmi\\s*(?:outputs?|out\\b)/i.test(text) ||
    /\\b\\d+\\s*(?:x|X)?\\s*(?:hdbaset|hdbt)\\s*(?:outputs?|out\\b)/i.test(text) ||
    /\\b\\d+\\s*[xX]\\s*\\d+\\b/i.test(text) ||
    /\\bmatrix\\b/i.test(text);

  return hasOutputCount && !hasExplicitMultiviewFeature(text);
}

function wyrestormCandidateSupportsMultiviewRole(product) {
  const sku = String(product?.sku || "").toUpperCase();
  const text = String([product?.sku, product?.name, product?.family, product?.text].filter(Boolean).join(" "));

  return (
    sku === "NHD-0401-MV" ||
    sku === "NHD-150-RX" ||
    /\\bNHD[-_]?0401[-_]?MV\\b/i.test(text) ||
    /\\bNHD[-_]?150[-_]?RX\\b/i.test(text) ||
    hasExplicitMultiviewFeature(text)
  );
}

`;

text = insertBeforeFunction(
  text,
  "extractSpecProfile",
  multiviewHelpers,
  "function hasExplicitMultiviewFeature",
);

text = replaceFunction(
  text,
  "inferVideoWallRole",
  `function inferVideoWallRole(text) {
  const value = String(text ?? "");
  const specificity = identifyVideoWallSpecificity(value);

  if (specificity.isVideoWall && specificity.inputs === 8 && specificity.outputs === 8) {
    return {
      role: "video_wall_matrix",
      label: "8x8 video wall processor / matrix requirement",
      confidence: "high"
    };
  }

  if (specificity.isVideoWall && specificity.outputs !== null && specificity.outputs > 6) {
    return {
      role: "video_wall_matrix",
      label: specificity.label,
      confidence: "high"
    };
  }

  if (/led\\s+wall|led\\s+processor|pixel\\s+pitch/i.test(value)) {
    return { role: "led_wall_processor", label: "LED wall processor / controller", confidence: "high" };
  }

  if (hasExplicitMultiviewFeature(value)) {
    return {
      role: "multiview_processor",
      label: "multiview processor: multiple source inputs composited onto one HDMI output",
      confidence: "high"
    };
  }

  if (specificity.isVideoWall || /video\\s*wall|videowall|video[-\\s]?wall|wall\\s+processor|wall\\s+controller|bezel\\s+correction/i.test(value)) {
    return { role: "lcd_wall_processor", label: specificity.label || "LCD video wall processor", confidence: "medium" };
  }

  return { role: "unknown", label: "video wall role not confirmed", confidence: "unknown" };
}`
);

text = text.replace(
  /multiview:\s*hasAny\(text,\s*\[[\s\S]*?\]\),/,
  "multiview: hasExplicitMultiviewFeature(text),",
);

if (!text.includes('const initialBest = scored[0];')) {
  text = text.replace(
    'const best = scored[0];',
    `const initialBest = scored[0];
  const best =
    initialBest?.id === "multiview_processor" && !hasExplicitMultiviewFeature(text)
      ? scored.find((item) => item.id !== "multiview_processor" && item.score > 0) || initialBest
      : initialBest;`
  );
}

if (!text.includes('competitorClassification.category === "multiview_processor"') || !text.includes('wyrestormCandidateSupportsMultiviewRole(product)')) {
  text = text.replace(
    `  if (!categoriesAreCompatible(competitorClassification.category, candidateClassification.category)) {
    return null;
  }

`,
    `  if (!categoriesAreCompatible(competitorClassification.category, candidateClassification.category)) {
    return null;
  }

  if (
    competitorClassification.category === "multiview_processor" &&
    !wyrestormCandidateSupportsMultiviewRole(product)
  ) {
    return null;
  }

`
  );
}

text = text.replace(
  /const isVideoWall\s*=\s*[\s\S]*?;\s*\n\s*if \(!isVideoWall\)/,
  `const isVideoWall =
    /\\bvideo\\s*wall\\b/i.test(text) ||
    /\\bvideowall\\b/i.test(text) ||
    /\\bvideo[-\\s]?wall\\b/i.test(text) ||
    /\\bwall\\s+processor\\b/i.test(text) ||
    /\\bwall\\s+controller\\b/i.test(text) ||
    /\\bwall\\s+matrix\\b/i.test(text);

  if (!isVideoWall)`
);

text = text.replace(
  /\/multiview\|multi\[-\\s\]\?view\|pip\|pbp\|quad\\s\+view\/i\.test\(value\)/g,
  "hasExplicitMultiviewFeature(value)"
);

text = text.replace(/\basync\s+async\s+function\b/g, "async function");

save(relative, text);

console.log("");
console.log("Multiview role separation installed.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}