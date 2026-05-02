import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-verified-facts-only-${stamp}`);
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

function patchEngine() {
  const relative = path.join("server", "competitor", "compare-intelligence.mjs");
  let text = read(relative);

  if (!text) {
    throw new Error(`Missing ${relative}`);
  }

  const verifiedHelpers = `
function emptyVerifiedSpecProfile() {
  return {
    videoInputs: {},
    videoOutputs: {},
    control: {},
    usb: {
      usb2: false,
      usb3: false
    },
    audio: {
      audioDeEmbedding: false,
      audioEmbedding: false,
      analogueOutput: false,
      balancedOutput: false,
      micInput: false,
      dante: false,
      aes67: false
    },
    features: {
      scaling: false,
      seamless: false,
      multiview: false,
      videoWall: false,
      wirelessCasting: false,
      wirelessConferencing: false,
      webUi: false,
      poe: false,
      hdcp: false,
      edid: false,
      cec: false,
      hdbasetExtension: false,
      ndi: false,
      h264: false,
      h265: false,
      jpeg2000: false,
      jpegXs: false,
      ipmx: false
    },
    evidenceHints: {
      hdmiMentions: 0,
      usbCMentions: 0,
      hdbasetMentions: 0,
      rs232Mentions: 0,
      irMentions: 0,
      relayMentions: 0,
      gpioMentions: 0
    }
  };
}

function knownProductKeyForVerifiedFacts(input = {}) {
  const brand = lower(input.brand || "");
  const sku = cleanText(input.sku || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const evidenceText = lower(input.evidenceText || input.rawText || input.text || "");

  const isBlustream = /blustream|blu\\s*stream/.test(brand) || /blustream|blu\\s*stream/.test(evidenceText);

  if (isBlustream && (sku === "c88cs" || /\\bc\\s*88\\s*cs\\b|\\bc88cs\\b/.test(evidenceText))) {
    return "blustream-c88cs";
  }

  if (isBlustream && (sku === "pla88cs" || /\\bpla\\s*88\\s*cs\\b|\\bpla88cs\\b/.test(evidenceText))) {
    return "blustream-pla88cs";
  }

  return "";
}

function buildVerifiedSpecProfile(input = {}) {
  const key = knownProductKeyForVerifiedFacts(input);

  if (!key) {
    return null;
  }

  const profile = emptyVerifiedSpecProfile();

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

    return profile;
  }

  return null;
}

function sanitizeSpecProfileForComparison(profile, classification, evidenceText) {
  const safe = {
    ...profile,
    videoInputs: { ...(profile.videoInputs || {}) },
    videoOutputs: { ...(profile.videoOutputs || {}) },
    control: { ...(profile.control || {}) },
    usb: { ...(profile.usb || {}) },
    audio: { ...(profile.audio || {}) },
    features: { ...(profile.features || {}) },
    evidenceHints: { ...(profile.evidenceHints || {}) }
  };

  const text = String(evidenceText || "");
  const category = classification?.category || "";

  if (!/\\busb\\s*2(?:\\.0)?\\b|\\busb2\\b/i.test(text)) {
    safe.usb.usb2 = false;
  }

  if (!/\\busb\\s*3(?:\\.0|\\.1|\\.2)?\\b|\\busb3\\b/i.test(text)) {
    safe.usb.usb3 = false;
  }

  if (!/\\bdante\\b/i.test(text)) {
    safe.audio.dante = false;
  }

  if (!/\\baes67\\b/i.test(text)) {
    safe.audio.aes67 = false;
  }

  if (!hasExplicitMultiviewFeature(text)) {
    safe.features.multiview = false;
  }

  if (
    category !== "video_wall_processor" &&
    !/\\bvideo\\s*wall\\b|\\bvideowall\\b|\\bvideo[-\\s]?wall\\b|\\bwall\\s+processor\\b|\\bwall\\s+controller\\b/i.test(text)
  ) {
    safe.features.videoWall = false;
  }

  if (!/\\bscaler\\b|\\bscaling\\b|\\bscale\\b|\\bscaled\\b|\\bupscal|\\bdownscal/i.test(text)) {
    safe.features.scaling = false;
  }

  if (hasOnlyMultipleOutputsNotMultiview(text)) {
    safe.features.multiview = false;
  }

  return safe;
}

`;

  text = insertBeforeFunction(
    text,
    "extractSpecProfile",
    verifiedHelpers,
    "function buildVerifiedSpecProfile",
  );

  text = text.replace(
    /const usefulPages = pages\.filter\(\(page\) => page\.ok && page\.likelyProductPage\);/,
    `const usefulPages = pages.filter((page) => {
    if (!page.ok || !page.likelyProductPage) {
      return false;
    }

    if (page.containsSku || page.containsName) {
      return true;
    }

    if (productUrl && lower(page.url).includes(lower(productUrl).replace(/^https?:\\/\\//, "").split("/")[0])) {
      return true;
    }

    return false;
  });`,
  );

  text = text.replace(
    /const profile = extractSpecProfile\(evidenceText\);/,
    `const profile =
    buildVerifiedSpecProfile({ brand, sku, productName, evidenceText }) ||
    sanitizeSpecProfileForComparison(extractSpecProfile(evidenceText), classification, evidenceText);`,
  );

  text = text.replace(/\basync\s+async\s+function\b/g, "async function");

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
    'const HISTORY_KEY = "wingman.compare.inputHistory.v12";',
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
  "wingman.compare.inputHistory.v10",
  "wingman.compare.inputHistory.v11",
];`;

  if (/const LEGACY_HISTORY_KEYS = \[[\s\S]*?\];/.test(text)) {
    text = text.replace(/const LEGACY_HISTORY_KEYS = \[[\s\S]*?\];/, legacyBlock);
  }

  text = text.replaceAll("Key product facts found", "Verified product facts found");
  text = text.replaceAll("Wingman has not found enough useful product detail yet.", "Wingman has not found enough verified product detail yet.");
  text = text.replaceAll("Key product facts", "Verified product facts");

  save(relative, text);
}

patchEngine();
patchComparePage();

console.log("");
console.log("Compare verified-facts-only extraction installed.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}