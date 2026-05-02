import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-videowall-related-alternatives-${stamp}`);
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
  "curatedVideoWallCandidates",
  `function curatedVideoWallCandidates(classification, profile) {
  const evidenceText = String(profile?.__evidenceText || "");
  const specificity = identifyVideoWallSpecificity(evidenceText);

  if (classification.category !== "video_wall_processor" && classification.category !== "multiview_processor") {
    return [];
  }

  if (!specificity.isVideoWall) {
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
          "scaling / seamless matrix route",
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
          "not a like-for-like 8x8 replacement unless the output count has changed",
          "confirm exact wall layout before quoting"
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
          "dedicated video wall processor path",
          "not like-for-like for an 8x8 requirement",
          "consider only if the real requirement is up to 6 display outputs",
          "use when the project is simpler than a full 8x8 matrix/video wall architecture"
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
          "dedicated video wall processor path",
          "not like-for-like for an 8x8 requirement",
          "consider only if the real requirement is up to 4 display outputs",
          "use when the customer needs a smaller simple wall rather than 8x8 routing"
        ]
      }
    ];
  }

  if (specificity.leadWyrestormSku === "MX-0812-SCL") {
    return [
      {
        sku: "MX-0812-SCL",
        name: "WyreStorm 8x12 seamless matrix / scaling solution for larger video wall requirements",
        family: "Seamless Matrix / Video Wall",
        sourceFile: "curated-videowall-role-map",
        score: 86,
        confidence: 0.86,
        candidateCategory: "video_wall_processor",
        candidateCategoryLabel: "Video wall processor / matrix",
        competitorPurpose: specificity.label,
        candidatePurpose: "larger seamless matrix / video wall role",
        purposeRole: "video_wall_matrix",
        purposeMatch: "same larger video wall / matrix role",
        reasons: [
          "lead option",
          "same video wall requirement",
          "supports larger output count than an 8x8 matrix",
          "confirm exact display count and layout before quoting"
        ]
      },
      {
        sku: "SW-0206-VW",
        name: "WyreStorm 2-input / 6-output dedicated video wall processor",
        family: "Dedicated Video Wall Processor",
        sourceFile: "curated-videowall-role-map",
        score: 46,
        confidence: 0.46,
        candidateCategory: "video_wall_processor",
        candidateCategoryLabel: "Dedicated video wall processor",
        competitorPurpose: specificity.label,
        candidatePurpose: "smaller dedicated LCD video wall processor role",
        purposeRole: "lcd_wall_processor",
        purposeMatch: "related video wall processor, but not a larger matrix replacement",
        reasons: [
          "related alternative",
          "not like-for-like for a larger video wall matrix requirement",
          "consider only if the real display output count is 6 or below"
        ]
      },
      {
        sku: "SW-0204-VW",
        name: "WyreStorm 2-input / 4-output dedicated video wall processor",
        family: "Dedicated Video Wall Processor",
        sourceFile: "curated-videowall-role-map",
        score: 42,
        confidence: 0.42,
        candidateCategory: "video_wall_processor",
        candidateCategoryLabel: "Dedicated video wall processor",
        competitorPurpose: specificity.label,
        candidatePurpose: "smaller dedicated LCD video wall processor role",
        purposeRole: "lcd_wall_processor",
        purposeMatch: "related video wall processor, but not a larger matrix replacement",
        reasons: [
          "related alternative",
          "not like-for-like for a larger video wall matrix requirement",
          "consider only if the real display output count is 4 or below"
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
}`
);

save(relative, text);

console.log("");
console.log("Video wall related alternatives installed.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}