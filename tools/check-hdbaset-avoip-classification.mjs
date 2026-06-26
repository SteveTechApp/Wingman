import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const scanRoots = ["src", "public", "tools"];
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json"]);

const failures = [];
const warnings = [];

const extensionCue = /\b(DTP2?|HDBaseT|HDBT|twisted[- ]pair|category[- ]cable|CATx|DTP\s*\/\s*HDBaseT|HDBaseT-style)\b/i;
const trueAvoipCue = /\b(multicast|IGMP|SDVoE|JPEG[- ]XS|H\.?264|H\.?265|NDI|NetworkHD|AV[- ]over[- ]IP\s+system|IP\s+video|encoder\s*\/\s*decoder\s+ecosystem)\b/i;

const unsafePatterns = [
  /source-side AV[- ]over[- ]IP encoder\s*\|\s*HDBaseT/i,
  /AVoIP encoder\s*\|\s*HDBaseT/i,
  /AV[- ]over[- ]IP encoder\s*\|\s*HDBaseT/i,
  /DTP2?\s+T\s+\d+[\s\S]{0,260}AV[- ]over[- ]IP encoder/i,
  /DTP2?\s+T\s+\d+[\s\S]{0,260}AVoIP encoder/i,
  /DTP2?\s+T\s+\d+[\s\S]{0,260}encoder path/i,
  /HDBaseT[\s\S]{0,180}AV[- ]over[- ]IP encoder/i,
  /HDBT[\s\S]{0,180}AV[- ]over[- ]IP encoder/i
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const output = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
      continue;
    }

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      output.push(...walk(full));
      continue;
    }

    if (!entry.isFile()) continue;

    if (allowedExtensions.has(path.extname(entry.name))) {
      output.push(full);
    }
  }

  return output;
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function addFailure(file, text, index, message) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  failures.push(`${rel}:${lineNumber(text, index)} ${message}`);
}

function addWarning(file, text, index, message) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  warnings.push(`${rel}:${lineNumber(text, index)} ${message}`);
}

for (const scanRoot of scanRoots) {
  const fullRoot = path.join(root, scanRoot);

  for (const file of walk(fullRoot)) {
    const text = fs.readFileSync(file, "utf8");

    for (const pattern of unsafePatterns) {
      const match = text.match(pattern);
      if (match) {
        addFailure(
          file,
          text,
          match.index ?? 0,
          `HDBaseT/DTP extension wording is mixed with AVoIP encoder language: "${match[0].slice(0, 140).replace(/\s+/g, " ")}"`
        );
      }
    }

    const hasExtensionCue = extensionCue.test(text);
    const hasTrueAvoipCue = trueAvoipCue.test(text);

    if (hasExtensionCue && !hasTrueAvoipCue) {
      const suspicious = text.match(/\b(source-side\s*\/\s*encoder\s+path|encoder\s+path)\b/i);
      if (suspicious) {
        addFailure(
          file,
          text,
          suspicious.index ?? 0,
          "Extension-class product uses encoder-path language without a true AVoIP cue."
        );
      }
    }

    if (/DTP2?\s+T\s+\d+/i.test(text) && /EX-100-KVM/i.test(text) && !/\bUSB\b/i.test(text)) {
      const match = text.match(/EX-100-KVM/i);
      addWarning(
        file,
        text,
        match?.index ?? 0,
        "DTP transmitter appears near EX-100-KVM without explicit USB evidence. KVM should only be selected when USB/KVM is required."
      );
    }
  }
}

if (warnings.length > 0) {
  console.warn("[hdbaset-avoip-classification] Warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (failures.length > 0) {
  console.error("[hdbaset-avoip-classification] Check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[hdbaset-avoip-classification] HDBaseT / DTP classification checks passed.");