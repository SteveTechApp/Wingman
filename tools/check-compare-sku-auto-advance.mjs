import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const comparePagePath = path.join(root, "src", "wingman2", "pages", "ComparePageNew.tsx");
const compareText = fs.readFileSync(comparePagePath, "utf8");

function fail(prefix, items) {
  console.error(prefix + " Check failed:");
  for (const item of items) {
    console.error("- " + item);
  }
  process.exit(1);
}

function findMatching(text, openIndex, openChar, closeChar) {
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let escaped = false;

  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === stringChar) {
        inString = false;
        stringChar = "";
      }

      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === openChar) {
      depth += 1;
      continue;
    }

    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function extractHandler(name) {
  const marker = "const " + name + " = useCallback";
  const start = compareText.indexOf(marker);

  if (start < 0) return "";

  const openParen = compareText.indexOf("(", start);
  const closeParen = findMatching(compareText, openParen, "(", ")");

  if (closeParen < 0) return "";

  return compareText.slice(start, closeParen + 1);
}

const handleSkuSelect = extractHandler("handleSkuSelect");
const handleSubmit = extractHandler("handleSubmit");
const failures = [];

if (!compareText.includes("Viable product choices")) {
  failures.push("ComparePageNew missing result heading: Viable product choices");
}

if (!compareText.includes('data-wingman-compare-auto-advance="true"')) {
  failures.push("ComparePageNew missing auto-advance form marker.");
}

if (!handleSkuSelect) {
  failures.push("Could not isolate handleSkuSelect.");
}

if (handleSkuSelect) {
  if (!handleSkuSelect.includes("commitCompare(") && !handleSkuSelect.includes("runKnownProfileCompare(") && !handleSkuSelect.includes("runCompareRuntimePipeline(")) {
    failures.push("handleSkuSelect does not run compare directly.");
  }

  if (!handleSkuSelect.includes('setState("analyzing")')) {
    failures.push("handleSkuSelect does not enter analyzing state.");
  }

  if (!handleSkuSelect.includes('setState("results")')) {
    failures.push("handleSkuSelect does not advance to results.");
  }

  if (!handleSkuSelect.includes('setWorkflowStep("options")')) {
    failures.push("handleSkuSelect does not advance workflow to options.");
  }
}

if (!handleSubmit) {
  failures.push("Could not isolate handleSubmit.");
}

if (handleSubmit) {
  if (!handleSubmit.includes("commitCompare(") && !handleSubmit.includes("lookupCompareIntelligence(")) {
    failures.push("handleSubmit does not run compare or live lookup.");
  }

  if (!handleSubmit.includes('setState("analyzing")') || !handleSubmit.includes('setState("results")')) {
    failures.push("handleSubmit does not move through analyzing/results state.");
  }

  if (!handleSubmit.includes('setWorkflowStep("options")')) {
    failures.push("handleSubmit does not advance workflow to options.");
  }
}

if (!compareText.includes("lookupCompareIntelligence")) {
  failures.push("Live lookup path missing lookupCompareIntelligence.");
}

if (!compareText.includes("shouldRequestLiveLookupUrl")) {
  failures.push("Live lookup path missing shouldRequestLiveLookupUrl.");
}

if (!compareText.includes("handleRetryWithSourceUrl")) {
  failures.push("Live lookup retry path missing handleRetryWithSourceUrl.");
}

if (failures.length > 0) {
  fail("[compare-sku-auto-advance]", failures);
}

console.log("[compare-sku-auto-advance] Verified known SKU auto-advance native workflow.");
