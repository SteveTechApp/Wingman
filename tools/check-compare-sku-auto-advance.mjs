import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();

const wrapperPath = resolve(
  repoRoot,
  "src/wingman2/pages/ComparePageNew.tsx",
);
const advancedPath = resolve(
  repoRoot,
  "src/wingman2/pages/ComparePageNew.advanced.tsx",
);

function fail(failures) {
  console.error("[compare-sku-auto-advance] Check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

function readRequired(filePath, label) {
  if (!existsSync(filePath)) {
    fail([`Missing ${label}: ${filePath}`]);
  }
  return readFileSync(filePath, "utf8");
}

const wrapperSource = readRequired(wrapperPath, "ComparePageNew wrapper");
const advancedSource = readRequired(
  advancedPath,
  "ComparePageNew advanced implementation",
);

const failures = [];

function requireText(source, text, message) {
  if (!source.includes(text)) {
    failures.push(message);
  }
}

// Route bridge.
requireText(
  wrapperSource,
  "ComparePageNew.advanced",
  "Compare entry point should retain the structured Compare implementation.",
);

// Current minimum-card contract.
if (
  !advancedSource.includes("WINGMAN_MINIMUM_COMPARE_RENDER_V2") &&
  !advancedSource.includes("WINGMAN_MINIMUM_COMPARE_CARDS_V2")
) {
  failures.push(
    "Advanced Compare implementation should retain the minimum-card Compare contract.",
  );
}

// Exact known-SKU interaction.
requireText(
  advancedSource,
  'data-wingman-compare-auto-advance="true"',
  "Competitor SKU field should retain the auto-advance marker.",
);

requireText(
  advancedSource,
  "props.onSkuSelect(exact)",
  "Exact known SKU entries should continue through props.onSkuSelect(exact).",
);

// Typed / unknown-SKU interaction.
// A text input inside a form with onSubmit={handleSubmit} and a submit button
// provides Enter-to-submit semantics. Handler syntax/implementation is covered
// by TypeScript and rendered workflow tests rather than source-text parsing.
requireText(
  advancedSource,
  "onSubmit={handleSubmit}",
  "Typed competitor entries should remain wired to handleSubmit through the form.",
);

requireText(
  advancedSource,
  'type="submit"',
  "Compare should retain a submit control so typed entries can use Enter.",
);

requireText(
  advancedSource,
  ">Compare<",
  "Compare submit control should remain present on the minimum-card input surface.",
);

if (failures.length > 0) {
  fail(failures);
}

console.log(
  "[compare-sku-auto-advance] Verified minimum-card Compare wiring: exact known SKU auto-select plus typed/unknown SKU form submission.",
);