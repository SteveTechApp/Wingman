import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const scanRoots = [
  "src/wingman2",
  "src/__tests__",
  "tools",
];

const priorityFiles = [
  "src/wingman2/lib/recommendationEvidence.ts",
  "src/wingman2/lib/recommendationEvidence.priority3.test.ts",
  "src/__tests__/recommendationEvidence.test.ts",
  "src/wingman2/lib/avDecisionEvidence.ts",
  "src/wingman2/pages/DiscoveryPage.tsx",
  "src/wingman2/pages/ProjectDetailPage.tsx",
  "src/wingman2/pages/FinderPage.tsx",
  "src/wingman2/pages/ProposalPage.tsx",
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

function lower(value) {
  return String(value ?? "").toLowerCase();
}

function containsAny(content, markers) {
  const contentText = lower(content);
  return markers.some((marker) => contentText.includes(lower(marker)));
}

function countMarkers(content, markers) {
  const contentText = lower(content);
  let score = 0;

  for (const marker of markers) {
    if (contentText.includes(lower(marker))) {
      score += 1;
    }
  }

  return score;
}

function sortEvidence(files, expectedEvidencePath) {
  if (!expectedEvidencePath) {
    return files;
  }

  const expected = lower(expectedEvidencePath);

  return [...files].sort((a, b) => {
    const aExpected = lower(a).includes(expected) ? 0 : 1;
    const bExpected = lower(b).includes(expected) ? 0 : 1;

    if (aExpected !== bExpected) {
      return aExpected - bExpected;
    }

    return a.localeCompare(b);
  });
}

function findEvidence(files, markers, expectedEvidencePath) {
  const evidence = [];

  for (const file of files) {
    const content = read(file);

    if (containsAny(content, markers)) {
      evidence.push(file);
    }
  }

  return sortEvidence(unique(evidence), expectedEvidencePath);
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

function expectedFileHasEvidence(expectedEvidencePath, markers) {
  if (!expectedEvidencePath) {
    return true;
  }

  const expectedFile = sourceFiles.find((file) => lower(file).includes(lower(expectedEvidencePath)));

  if (!expectedFile) {
    return false;
  }

  return containsAny(read(expectedFile), markers);
}

function auditArea({ label, purpose, markers, expectedEvidencePath }) {
  const evidence = findEvidence(sourceFiles, markers, expectedEvidencePath);
  let markerScore = 0;

  for (const file of evidence) {
    markerScore += countMarkers(read(file), markers);
  }

  const cappedScore = Math.min(markerScore, markers.length);
  const hasExpectedEvidence = expectedFileHasEvidence(expectedEvidencePath, markers);

  const score = hasExpectedEvidence ? cappedScore : Math.max(0, cappedScore - 2);

  return {
    label,
    purpose,
    score,
    maxScore: markers.length,
    grade: grade(score, markers.length),
    evidence: evidence.slice(0, 12),
    expectedEvidencePath,
    hasExpectedEvidence,
  };
}

function printArea(area) {
  console.log("");
  console.log(`## ${area.label}`);
  console.log(`Purpose: ${area.purpose}`);
  console.log(`Score: ${area.score}/${area.maxScore} (${area.grade})`);

  if (area.expectedEvidencePath) {
    const status = area.hasExpectedEvidence ? "found" : "missing";
    console.log(`Expected implementation evidence: ${area.expectedEvidencePath} (${status})`);
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

const walkedFiles = unique(scanRoots.flatMap((scanRoot) => walk(scanRoot)));
const sourceFiles = unique([
  ...priorityFiles.filter(fileExists),
  ...walkedFiles,
]);

const missingPriorityFiles = priorityFiles.filter((file) => !fileExists(file));

const areas = [
  auditArea({
    label: "Architecture decision logic",
    purpose: "Wingman should decide between AV-over-IP, matrix switching, HDBaseT, USB extension, and dedicated processing from the application rather than from SKU preference.",
    expectedEvidencePath: "src/wingman2/lib/recommendationEvidence.ts",
    markers: [
      "RecommendationArchitectureDecision",
      "architectureDecision",
      "networkhd-avoip",
      "contained-routing",
      "dedicated-wall-processor",
      "meeting-room",
      "education-hybrid",
      "hdbaset",
      "matrix",
      "usb",
      "byom",
      "dependency",
      "quoteChecks",
    ],
  }),
  auditArea({
    label: "Scenario regression coverage",
    purpose: "Recommendation logic should be protected by AV scenarios, not just broad marker checks.",
    expectedEvidencePath: "src/wingman2/lib/recommendationEvidence.priority3.test.ts",
    markers: [
      "meeting room",
      "byom",
      "hospitality",
      "teaching room",
      "led wall",
      "NetworkHD",
      "managed-network",
      "scenario",
      "not.toContain",
      "NHD-CTL-PRO",
    ],
  }),
  auditArea({
    label: "Application and room context",
    purpose: "Recommendations should react to room type, source/display count, vertical, workflow, and project stage.",
    expectedEvidencePath: "src/wingman2/pages/DiscoveryPage.tsx",
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
    expectedEvidencePath: "src/wingman2/lib/recommendationEvidence.ts",
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
    expectedEvidencePath: "src/wingman2/lib/recommendationEvidence.ts",
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
    expectedEvidencePath: "src/wingman2/lib/recommendationEvidence.ts",
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
    expectedEvidencePath: "src/wingman2/pages/ProjectDetailPage.tsx",
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
    expectedEvidencePath: "src/wingman2/pages/ProjectDetailPage.tsx",
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
const missingExpectedEvidence = areas.filter((area) => area.expectedEvidencePath && !area.hasExpectedEvidence);

console.log("");
console.log("## Priority 3 conclusion");

if (weakAreas.length === 0 && partialAreas.length === 0 && missingExpectedEvidence.length === 0) {
  console.log("The recommendation layer has structured architecture logic, scenario regression coverage, product-family scoring, structured score storage, and project/proposal surfacing evidence in the right files.");
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

if (missingExpectedEvidence.length > 0) {
  console.log("Areas where evidence is still not concentrated in the expected implementation file:");
  for (const area of missingExpectedEvidence) {
    console.log(`- ${area.label}: ${area.expectedEvidencePath}`);
  }
}

console.log("");
console.log("Recommended next engineering step:");
console.log("Use the stored product-family scores to improve SKU shortlist ranking and add UI-level regression coverage for Project Detail and Proposal outputs.");

if (totalPercent < 70 || missingExpectedEvidence.length > 0) {
  process.exitCode = 1;
}
