import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-extron-nav121-verified-profile-${stamp}`);
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

text = text.replace(/\basync\s+async\s+function\b/g, "async function");

text = replaceFunction(
  text,
  "knownProductKeyForVerifiedFacts",
  `function knownProductKeyForVerifiedFacts(input = {}) {
  const brand = lower(input.brand || "");
  const sku = cleanText(input.sku || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const evidenceText = lower(input.evidenceText || input.rawText || input.text || "");

  const isExtron = /extron/.test(brand) || /extron/.test(evidenceText);

  if (isExtron && (sku === "navd121" || /\\bnav\\s*d\\s*121\\b|\\bnavd121\\b/.test(evidenceText))) {
    return "extron-nav-d-121";
  }

  if (isExtron && (sku === "nave121" || /\\bnav\\s*e\\s*121\\b|\\bnave121\\b/.test(evidenceText))) {
    return "extron-nav-e-121";
  }

  const isBlustream = /blustream|blu\\s*stream/.test(brand) || /blustream|blu\\s*stream/.test(evidenceText);

  if (isBlustream && (sku === "c88cs" || /\\bc\\s*88\\s*cs\\b|\\bc88cs\\b/.test(evidenceText))) {
    return "blustream-c88cs";
  }

  if (isBlustream && (sku === "pla88cs" || /\\bpla\\s*88\\s*cs\\b|\\bpla88cs\\b/.test(evidenceText))) {
    return "blustream-pla88cs";
  }

  return "";
}`
);

text = replaceFunction(
  text,
  "buildVerifiedSpecProfile",
  `function buildVerifiedSpecProfile(input = {}) {
  const key = knownProductKeyForVerifiedFacts(input);

  if (!key) {
    return null;
  }

  const profile = emptyVerifiedSpecProfile();

  if (key === "extron-nav-d-121") {
    profile.videoOutputs = {
      hdmi: 1
    };

    profile.control = {
      rs232: 1,
      ir: 1,
      digitalIo: 1,
      lan: 1
    };

    profile.network = {
      transport: "1GbE copper Ethernet",
      codec: "PURE3",
      bitrateClass: "low-bitrate NAV stream"
    };

    profile.videoProcessing = {
      maxResolution: "4K60 4:4:4",
      role: "decoder / display-side endpoint",
      scaling: "No scaling on NAV D 121"
    };

    profile.power = {
      poePlus: true
    };

    profile.features = {
      ...profile.features,
      hdcp: true,
      edid: true,
      webUi: true,
      poe: true,
      scaling: false,
      multiview: false,
      videoWall: false,
      hdbasetExtension: false
    };

    profile.audio = {
      ...profile.audio,
      dante: false,
      aes67: false
    };

    profile.evidenceHints = {
      ...profile.evidenceHints,
      hdmiMentions: 1,
      rs232Mentions: 1,
      irMentions: 1
    };

    profile.verifiedSource = {
      product: "Extron NAV D 121",
      role: "1G Pro AV over IP compact decoder with HDMI output",
      confidence: "Known product profile"
    };

    return profile;
  }

  if (key === "extron-nav-e-121") {
    profile.videoInputs = {
      hdmi: 1
    };

    profile.videoOutputs = {
      hdmiLoopThrough: 1
    };

    profile.control = {
      rs232: 1,
      lan: 1
    };

    profile.network = {
      transport: "1GbE copper Ethernet",
      codec: "PURE3",
      bitrateClass: "low-bitrate NAV stream"
    };

    profile.videoProcessing = {
      maxResolution: "4K60 4:4:4",
      role: "encoder / source-side endpoint"
    };

    profile.power = {
      poePlus: true
    };

    profile.audio = {
      ...profile.audio,
      aes67: true
    };

    profile.features = {
      ...profile.features,
      hdcp: true,
      edid: true,
      webUi: true,
      poe: true,
      scaling: false,
      multiview: false,
      videoWall: false,
      hdbasetExtension: false
    };

    profile.evidenceHints = {
      ...profile.evidenceHints,
      hdmiMentions: 1,
      rs232Mentions: 1
    };

    profile.verifiedSource = {
      product: "Extron NAV E 121",
      role: "1G Pro AV over IP compact encoder with HDMI input and loop-through",
      confidence: "Known product profile"
    };

    return profile;
  }

  if (key === "blustream-c88cs" || key === "blustream-pla88cs") {
    profile.videoInputs = {
      hdmi: 8
    };

    profile.videoOutputs = {
      hdbaset: 8,
      hdmiMirrored: 1
    };

    profile.control = {
      rs232: 1,
      ir: 1,
      lan: 1
    };

    profile.features = {
      ...profile.features,
      hdcp: true,
      edid: true,
      webUi: true,
      hdbasetExtension: true,
      scaling: false,
      multiview: false,
      videoWall: false
    };

    profile.evidenceHints = {
      ...profile.evidenceHints,
      hdmiMentions: 1,
      hdbasetMentions: 1,
      rs232Mentions: 1,
      irMentions: 1
    };

    profile.verifiedSource = {
      product: key === "blustream-c88cs" ? "Blustream C88CS" : "Blustream PLA88CS",
      role: "8x8 HDBaseT CSC matrix",
      confidence: "Known product profile"
    };

    return profile;
  }

  return null;
}`
);

save(relative, text);

console.log("");
console.log("Extron NAV D/E 121 verified profiles installed.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}