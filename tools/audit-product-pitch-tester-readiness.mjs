import fs from "node:fs";

const file = "src/wingman2/pages/ProductPitchPage.tsx";

if (!fs.existsSync(file)) {
  console.error(`[product-pitch-readiness] Missing ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const requiredMarkers = [
  {
    name: "customer requirement",
    patterns: [/customer requirement/i, /customer need/i, /requirement/i],
  },
  {
    name: "product direction",
    patterns: [/product direction/i, /recommended direction/i, /direction/i],
  },
  {
    name: "why this fits",
    patterns: [/why this fits/i, /why it fits/i, /fit rationale/i],
  },
  {
    name: "check before quoting",
    patterns: [/check before quoting/i, /before quoting/i, /pre-quote/i, /quote blocker/i],
  },
  {
    name: "alternatives",
    patterns: [/alternative/i, /other option/i],
  },
  {
    name: "customer-safe wording",
    patterns: [/customer-safe/i, /customer safe/i, /customer wording/i],
  },
  {
    name: "internal guidance",
    patterns: [/internal guidance/i, /sales guidance/i, /positioning/i],
  },
  {
    name: "pre-sales review warning",
    patterns: [/pre-sales review/i, /presales review/i, /pre sales review/i, /not quote-final/i, /not final/i],
  },
];

const bannedOverconfidence = [
  /complete solution/i,
  /guaranteed fit/i,
  /direct replacement/i,
  /fully equivalent/i,
  /quote-ready/i,
];

const missing = requiredMarkers.filter(
  (marker) => !marker.patterns.some((pattern) => pattern.test(source)),
);

const overconfident = bannedOverconfidence.filter((pattern) => pattern.test(source));

console.log("[product-pitch-readiness] Product Pitch tester-readiness audit");

if (missing.length) {
  console.log("");
  console.log("Missing or weak sections:");
  for (const marker of missing) {
    console.log(`- ${marker.name}`);
  }
}

if (overconfident.length) {
  console.log("");
  console.log("Potentially over-confident wording patterns found:");
  for (const pattern of overconfident) {
    console.log(`- ${pattern}`);
  }
}

if (missing.length || overconfident.length) {
  console.log("");
  console.log("[product-pitch-readiness] Audit requires Product Pitch implementation work.");
  process.exit(1);
}

console.log("[product-pitch-readiness] Product Pitch has the required tester-readiness markers.");