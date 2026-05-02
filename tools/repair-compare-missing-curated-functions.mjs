import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `repair-compare-missing-curated-functions-${stamp}`);
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

const relative = path.join("server", "competitor", "compare-intelligence.mjs");
let text = read(relative);

if (!text) {
  throw new Error(`Missing ${relative}`);
}

text = text.replace(/\basync\s+async\s+function\b/g, "async function");

const compatibilityHelpers = `
function safeMatrixMatch(sourceText) {
  const text = String(sourceText || "");
  const match = text.match(/\\b(\\d+)\\s*[xX]\\s*(\\d+)\\b/);

  return {
    inputs: match ? Number(match[1]) : null,
    outputs: match ? Number(match[2]) : null
  };
}

function identifyVideoWallSpecificity(sourceText) {
  const text = String(sourceText || "");
  const matrix = safeMatrixMatch(text);

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
      inputs: matrix.inputs,
      outputs: matrix.outputs,
      label: "Video wall requirement not confirmed"
    };
  }

  if (matrix.inputs === 8 && matrix.outputs === 8) {
    return {
      isVideoWall: true,
      inputs: 8,
      outputs: 8,
      label: "8x8 video wall processor / matrix requirement",
      leadWyrestormSku: "MX-0808-SCL"
    };
  }

  if (matrix.outputs !== null && matrix.outputs > 6) {
    return {
      isVideoWall: true,
      inputs: matrix.inputs,
      outputs: matrix.outputs,
      label: \`\${matrix.inputs || "multi-input"}x\${matrix.outputs} video wall / matrix requirement\`,
      leadWyrestormSku: matrix.outputs <= 8 ? "MX-0808-SCL" : "MX-0812-SCL"
    };
  }

  if (matrix.outputs !== null && matrix.outputs <= 6) {
    return {
      isVideoWall: true,
      inputs: matrix.inputs,
      outputs: matrix.outputs,
      label: \`\${matrix.inputs || "multi-input"}x\${matrix.outputs} video wall processor requirement\`,
      leadWyrestormSku: "SW-0206-VW"
    };
  }

  return {
    isVideoWall: true,
    inputs: matrix.inputs,
    outputs: matrix.outputs,
    label: "Video wall processor requirement",
    leadWyrestormSku: "SW-0206-VW"
  };
}

function identifyVideowallSpecificity(sourceText) {
  return identifyVideoWallSpecificity(sourceText);
}

function curatedVideoWallCandidates(classification, profile) {
  const evidenceText = String(profile?.__evidenceText || "");
  const specificity = identifyVideoWallSpecificity(evidenceText);

  if (!specificity.isVideoWall) {
    return [];
  }

  if (classification.category !== "video_wall_processor" && classification.category !== "multiview_processor") {
    return [];
  }

  if (specificity.leadWyrestormSku === "MX-0808-SCL") {
    return [
      {
        sku: "MX-0808-SCL",
        name: "WyreStorm 8x8 seamless matrix / scaling solution for video wall style requirements",
        family: "Seamless Matrix / Video Wall",
        sourceFile: "curated-videowall-role-map",
        score: 88,
        confidence: 0.88,
        candidateCategory: "video_wall_processor",
        candidateCategoryLabel: "Video wall processor / matrix",
        competitorPurpose: specificity.label,
        candidatePurpose: "8x8 video wall / seamless matrix role",
        purposeRole: "video_wall_matrix",
        purposeMatch: "direct 8x8 video wall / matrix scale match",
        reasons: [
          "lead option",
          "same video wall requirement",
          "same 8x8 scale",
          "confirm source count, display count, layout behaviour and control requirement before quoting"
        ]
      },
      {
        sku: "MX-0812-SCL",
        name: "WyreStorm 8x12 seamless matrix / scaling solution where additional outputs are needed",
        family: "Seamless Matrix / Video Wall",
        sourceFile: "curated-videowall-role-map",
        score: 76,
        confidence: 0.76,
        candidateCategory: "video_wall_processor",
        candidateCategoryLabel: "Video wall processor / matrix",
        competitorPurpose: specificity.label,
        candidatePurpose: "larger seamless matrix / video wall role",
        purposeRole: "video_wall_matrix",
        purposeMatch: "related video wall / matrix role with additional outputs",
        reasons: [
          "related alternative",
          "use when more than 8 outputs are required",
          "not a like-for-like 8x8 replacement unless the output count has changed"
        ]
      },
      {
        sku: "SW-0206-VW",
        name: "WyreStorm 2-input / 6-output dedicated video wall processor",
        family: "Dedicated Video Wall Processor",
        sourceFile: "curated-videowall-role-map",
        score: 54,
        confidence: 0.54,
        candidateCategory: "video_wall_processor",
        candidateCategoryLabel: "Dedicated video wall processor",
        competitorPurpose: specificity.label,
        candidatePurpose: "smaller dedicated LCD video wall processor role",
        purposeRole: "lcd_wall_processor",
        purposeMatch: "related video wall processor, but not an 8x8 matrix replacement",
        reasons: [
          "related alternative",
          "not like-for-like for an 8x8 requirement",
          "consider only if the real requirement is up to 6 display outputs"
        ]
      },
      {
        sku: "SW-0204-VW",
        name: "WyreStorm 2-input / 4-output dedicated video wall processor",
        family: "Dedicated Video Wall Processor",
        sourceFile: "curated-videowall-role-map",
        score: 48,
        confidence: 0.48,
        candidateCategory: "video_wall_processor",
        candidateCategoryLabel: "Dedicated video wall processor",
        competitorPurpose: specificity.label,
        candidatePurpose: "smaller dedicated LCD video wall processor role",
        purposeRole: "lcd_wall_processor",
        purposeMatch: "related video wall processor, but not an 8x8 matrix replacement",
        reasons: [
          "related alternative",
          "not like-for-like for an 8x8 requirement",
          "consider only if the real requirement is up to 4 display outputs"
        ]
      }
    ];
  }

  return [
    {
      sku: "SW-0206-VW",
      name: "WyreStorm 2-input / 6-output video wall processor",
      family: "Dedicated Video Wall Processor",
      sourceFile: "curated-videowall-role-map",
      score: 82,
      confidence: 0.82,
      candidateCategory: "video_wall_processor",
      candidateCategoryLabel: "Video wall processor",
      competitorPurpose: specificity.label,
      candidatePurpose: "small to medium LCD video wall processor role",
      purposeRole: "lcd_wall_processor",
      purposeMatch: "same dedicated video wall processor role, subject to output count",
      reasons: [
        "lead option for up to 6 outputs",
        "same video wall requirement",
        "dedicated video wall processor path",
        "confirm source count, display count and wall layout before quoting"
      ]
    },
    {
      sku: "SW-0204-VW",
      name: "WyreStorm 2-input / 4-output video wall processor",
      family: "Dedicated Video Wall Processor",
      sourceFile: "curated-videowall-role-map",
      score: 76,
      confidence: 0.76,
      candidateCategory: "video_wall_processor",
      candidateCategoryLabel: "Video wall processor",
      competitorPurpose: specificity.label,
      candidatePurpose: "small LCD video wall processor role",
      purposeRole: "lcd_wall_processor",
      purposeMatch: "same dedicated video wall processor role, subject to output count",
      reasons: [
        "related smaller-wall option",
        "same video wall requirement",
        "dedicated video wall processor path",
        "consider where 4 display outputs are sufficient"
      ]
    }
  ];
}

`;

text = insertBeforeFunction(
  text,
  "buildCuratedWyrestormCandidates",
  compatibilityHelpers,
  "function curatedVideoWallCandidates",
);

save(relative, text);

console.log("");
console.log("Missing curated video wall functions repaired.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}