import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const scanRoots = [
  "src/wingman2",
  "tools",
];

const priorityFiles = [
  "src/wingman2/pages/DiscoveryPage.tsx",
  "src/wingman2/pages/FinderPage.tsx",
  "src/wingman2/pages/ProjectDetailPage.tsx",
  "src/wingman2/pages/ProposalPage.tsx",
  "src/wingman2/lib/recommendationEvidence.ts",
  "src/wingman2/lib/avDecisionEvidence.ts",
  "src/wingman2/lib/salesReadiness.ts",
  "src/wingman2/logic/matrixOutputModel.ts",
];

const ignoredDirectories = new Set([
  "node_modules",
  "dist",
  ".git",
  ".vite",
  "coverage",
]);

const allowedExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
]);

function normalisePath(value) {
  return value.split(path.sep).join("/");
}

function fileExists(relativePath) {
  return existsSync(path.resolve(root, relativePath));
}

function read(relativePath) {
  return readFileSync(path.resolve(root, relativePath), "utf8");
}

function walk(relativePath, files = []) {
  const fullPath = path.resolve(root, relativePath);

  if (!existsSync(fullPath)) {
    return files;
  }

  const entries = readdirSync(fullPath);

  for (const entry of entries) {
    if (ignoredDirectories.has(entry)) {
      continue;
    }

    const entryPath = path.join(fullPath, entry);
    const relativeEntryPath = normalisePath(path.relative(root, entryPath));
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      walk(relativeEntryPath, files);
      continue;
    }

    const extension = path.extname(entryPath);

    if (allowedExtensions.has(extension)) {
      files.push(relativeEntryPath);
    }
  }

  return files;
}

function unique(values) {
  return Array.from(new Set(values));
}

function containsAny(content, markers) {
  return markers.some((marker) => content.toLowerCase().includes(marker.toLowerCase()));
}

function countMarkers(content, markers) {
  let score = 0;

  for (const marker of markers) {
    if (content.toLowerCase().includes(marker.toLowerCase())) {
      score += 1;
    }
  }

  return score;
}

function findEvidence(files, markers) {
  const evidence = [];

  for (const file of files) {
    const content = read(file);

    if (containsAny(content, markers)) {
      evidence.push(file);
    }
  }

  return unique(evidence).slice(0, 12);
}

function grade(score, maxScore) {
  const percent = Math.round((score / maxScore) * 100);

  if (percent >= 80) {
    return "strong";
  }

  if (percent >= 55) {
    return "partial";
  }

  return "weak";
}

function auditArea({ label, purpose, markers, requiredEvidence }) {
  const evidence = findEvidence(sourceFiles, markers);
  let markerScore = 0;

  for (const file of evidence) {
    markerScore += countMarkers(read(file), markers);
  }

  const cappedScore = Math.min(markerScore, markers.length);
  const hasRequiredEvidence = requiredEvidence ? evidence.some((file) => file.includes(requiredEvidence)) : true;
  const score = hasRequiredEvidence ? cappedScore : Math.max(0, cappedScore - 2);

  return {
    label,
    purpose,
    score,
    maxScore: markers.length,
    grade: grade(score, markers.length),
    evidence,
    requiredEvidence,
    hasRequiredEvidence,
  };
}

function printArea(area) {
  console.log("");
  console.log(`## ${area.label}`);
  console.log(`Purpose: ${area.purpose}`);
  console.log(`Score: ${area.score}/${area.maxScore} (${area.grade})`);

  if (area.requiredEvidence && !area.hasRequiredEvidence) {
    console.log(`Required evidence missing from expected area: ${area.requiredEvidence}`);
  }

  if (area.evidence.length === 0) {
    console.log("Evidence files: none found");
    return;
  }

  console.log("Evidence files:");
  for (const file of area.evidence) {
    console.log(`- ${file}`);
  }
}

const sourceFiles = unique(scanRoots.flatMap((scanRoot) => walk(scanRoot)));

const missingPriorityFiles = priorityFiles.filter((file) => !fileExists(file));

const areas = [
  auditArea({
    label: "Architecture decision logic",
    purpose: "Wingman should decide between AV-over-IP, matrix switching, HDBaseT, USB extension, and dedicated processing from the application rather than from SKU preference.",
    requiredEvidence: "recommendationEvidence",
    markers: [
      "avoip",
      "av-over-ip",
      "matrix",
      "hdbaset",
      "hdmi",
      "distance",
      "latency",
      "scaling",
      "multiview",
      "video wall",
      "wall processor",
      "usb",
      "byom",
    ],
  }),
  auditArea({
    label: "Application and room context",
    purpose: "Recommendations should react to room type, source/display count, vertical, workflow, and project stage.",
    requiredEvidence: "DiscoveryPage",
    markers: [
      "room",
      "application",
      "vertical",
      "hospitality",
      "education",
      "meeting",
      "classroom",
      "source",
      "display",
      "project stage",
      "timeline",
      "budget",
    ],
  }),
  auditArea({
    label: "USB and conferencing discipline",
    purpose: "Meeting and classroom recommendations should include camera, speakerphone, USB host/device, BYOM/BYOD, and extension checks.",
    requiredEvidence: "DiscoveryPage",
    markers: [
      "usb",
      "camera",
      "microphone",
      "speakerphone",
      "teams",
      "zoom",
      "byom",
      "byod",
      "uc",
      "host",
      "device",
      "conferencing",
    ],
  }),
  auditArea({
    label: "Audio, control, and dependencies",
    purpose: "A real proposal needs audio breakout, amplifier/DSP needs, control, controller, receiver, transmitter, network, and power dependencies.",
    requiredEvidence: "recommendationEvidence",
    markers: [
      "audio",
      "dsp",
      "amplifier",
      "control",
      "rs232",
      "ir",
      "relay",
      "controller",
      "receiver",
      "transmitter",
      "switch",
      "poe",
      "network",
      "dependency",
      "dependencies",
    ],
  }),
  auditArea({
    label: "Product-family mapping",
    purpose: "Wingman should map requirements to the correct WyreStorm family before naming a SKU.",
    requiredEvidence: "recommendationEvidence",
    markers: [
      "networkhd 100",
      "networkhd 500",
      "networkhd 600",
      "nhd-150",
      "nhd-0401-mv",
      "sw-0206-vw",
      "sw-0204-vw",
      "presentation",
      "uc",
      "hdbaset",
      "matrix",
      "mx-",
      "sw-",
      "apo-",
    ],
  }),
  auditArea({
    label: "Missing-information and quote safety",
    purpose: "The engine should expose unknowns, weak assumptions, validation warnings, and quote-safety status before proposal output.",
    requiredEvidence: "ProjectDetailPage",
    markers: [
      "missingInformation",
      "missing information",
      "unknown",
      "assumption",
      "validate",
      "do not quote",
      "quoteSafety",
      "readiness",
      "blocker",
      "proposal-ready",
      "review",
    ],
  }),
  auditArea({
    label: "Project evidence handoff",
    purpose: "Discovery, Finder, Compare, Product Pitch, Visual Studio, and Proposal should feed or read the project record.",
    requiredEvidence: "ProjectDetailPage",
    markers: [
      "project",
      "discoveryBrief",
      "recommendationEvidence",
      "productSelections",
      "compareRuns",
      "proposal",
      "projectEvidenceTimeline",
      "projectReadinessGate",
      "routeCatalogByKey",
      "visualStudio",
    ],
  }),
];

const totalScore = areas.reduce((sum, area) => sum + area.score, 0);
const totalMax = areas.reduce((sum, area) => sum + area.maxScore, 0);
const totalPercent = Math.round((totalScore / totalMax) * 100);

console.log("[priority3-recommendation-audit] Wingman recommendation accuracy audit");
console.log("");
console.log(`Files scanned: ${sourceFiles.length}`);
console.log(`Overall score: ${totalScore}/${totalMax} (${totalPercent}%)`);

if (missingPriorityFiles.length > 0) {
  console.log("");
  console.log("Missing expected priority files:");
  for (const file of missingPriorityFiles) {
    console.log(`- ${file}`);
  }
}

for (const area of areas) {
  printArea(area);
}

const weakAreas = areas.filter((area) => area.grade === "weak");
const partialAreas = areas.filter((area) => area.grade === "partial");

console.log("");
console.log("## Priority 3 conclusion");

if (weakAreas.length === 0 && partialAreas.length === 0) {
  console.log("The recommendation layer has broad marker coverage. Next step: scenario-based behavioural tests.");
}

if (weakAreas.length > 0) {
  console.log("Weak areas to improve first:");
  for (const area of weakAreas) {
    console.log(`- ${area.label}`);
  }
}

if (partialAreas.length > 0) {
  console.log("Partial areas needing stronger evidence:");
  for (const area of partialAreas) {
    console.log(`- ${area.label}`);
  }
}

console.log("");
console.log("Recommended next engineering step:");
console.log("Add scenario tests that assert the correct architecture path before product/SKU selection: meeting room USB-C/BYOM, hospitality TV distribution, HE teaching room, LED wall processor, and flexible multi-room AVoIP.");

if (totalPercent < 55) {
  process.exitCode = 1;
}
