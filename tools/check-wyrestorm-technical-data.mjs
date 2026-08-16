import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const strict = process.argv.includes("--strict");
const updateBaseline = process.argv.includes("--update-baseline");
const profilePath = path.join(root, "data", "governance", "wyrestorm-technical-profiles.json");
const productPath = path.join(root, "data-sources", "wyrestorm", "products.csv");
const coverageBaselinePath = path.join(root, "tools", "wyrestorm-technical-data-coverage-baseline.json");

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  const [headers = [], ...dataRows] = rows.filter((item) => item.some((value) => value !== ""));
  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), String(values[index] ?? "").trim()])),
  );
}

function normaliseSku(value) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

if (!fs.existsSync(profilePath)) fail(`Missing governed technical profile source: ${profilePath}`);
if (!fs.existsSync(productPath)) fail(`Missing WyreStorm product source: ${productPath}`);

const payload = readJson(profilePath);
if (!Number.isInteger(payload.version) || payload.version < 1) fail("Technical profile version must be a positive integer.");
if (!Array.isArray(payload.profiles)) fail("Technical profile payload must contain a profiles array.");

const requiredProfileFields = [
  "sku",
  "status",
  "productClass",
  "role",
  "productType",
  "transport",
  "ports",
  "dependencies",
  "checks",
  "warnings",
  "evidence",
];

const seen = new Set();
// Status by SKU. `seen` alone cannot distinguish a fully verified profile from
// a review-required stub, and the two are not remotely equivalent downstream:
// governedProductTechnicalData.ts treats review-required as the weaker
// "official-structured" tier and refuses to present it as an automatic
// equivalent. Counting them together let coverage be inflated by adding stubs.
const statusBySku = new Map();
const errors = [];

for (const [index, profile] of payload.profiles.entries()) {
  const prefix = `profiles[${index}]`;
  const sku = normaliseSku(profile?.sku);

  for (const field of requiredProfileFields) {
    if (!(field in (profile ?? {}))) errors.push(`${prefix} is missing ${field}.`);
  }

  if (!sku) errors.push(`${prefix} has an empty SKU.`);
  if (seen.has(sku)) errors.push(`Duplicate governed technical profile for ${sku}.`);
  seen.add(sku);
  statusBySku.set(sku, String(profile?.status ?? ""));

  if (!["verified", "verified-with-warning", "review-required"].includes(profile?.status)) {
    errors.push(`${sku || prefix} has invalid status ${profile?.status}.`);
  }

  // "Verified" requires a human: a profile may only claim the verified status
  // when a human recorded confirmation of the spec-critical fields in
  // `verifiedBy`. Machine-transcribed profiles must stay at
  // verified-with-warning (which renders at the official-structured tier).
  if (profile?.status === "verified" && !String(profile?.verifiedBy ?? "").trim()) {
    errors.push(`${sku || prefix} claims verified status without a human verifiedBy - machine data must stay at verified-with-warning.`);
  }

  if (!nonEmptyArray(profile?.transport)) errors.push(`${sku || prefix} must define transport.`);
  if (!Array.isArray(profile?.ports)) errors.push(`${sku || prefix} ports must be an array.`);
  if (!Array.isArray(profile?.dependencies)) errors.push(`${sku || prefix} dependencies must be an array.`);
  if (!nonEmptyArray(profile?.evidence)) errors.push(`${sku || prefix} must have at least one evidence record.`);

  for (const evidence of profile?.evidence ?? []) {
    if (!String(evidence?.sourceUrl ?? "").startsWith("https://")) {
      errors.push(`${sku || prefix} evidence must contain an HTTPS source URL.`);
    }
    if (!String(evidence?.reviewedOn ?? "").match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push(`${sku || prefix} evidence reviewedOn must use YYYY-MM-DD.`);
    }
    if (!String(evidence?.reviewer ?? "").trim()) {
      errors.push(`${sku || prefix} evidence reviewer is required.`);
    }
  }

  if (profile?.status !== "review-required") {
    const hasVideoIo = (profile?.ports ?? []).some((port) => port?.category === "video");
    if (
      hasVideoIo &&
      !String(profile?.maxResolution ?? "").trim() &&
      ["AVOIP", "MATRIX", "VIDEO_WALL", "MULTIVIEW", "HDBASET", "PRESENTATION"].includes(profile?.productClass)
    ) {
      errors.push(`${sku || prefix} verified video profile must define maxResolution.`);
    }
    if (!nonEmptyArray(profile?.dependencies) && profile?.productClass === "AVOIP") {
      errors.push(`${sku || prefix} verified AVoIP profile must define dependencies.`);
    }
  }
}

const priority = ["NHD-120-RX", "NHD-120-TX", "NHD-124-TX", "NHD-150-RX"];
for (const sku of priority) {
  if (!seen.has(sku)) errors.push(`Priority technical profile missing: ${sku}.`);
}

if (errors.length) {
  console.error("[technical-data] Failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const products = parseCsv(fs.readFileSync(productPath, "utf8"));
const activeLeadProducts = products.filter((product) => {
  const lifecycle = String(product.lifecycle_status ?? "").toLowerCase();
  const doNotSpec = String(product.do_not_spec ?? "").toLowerCase() === "true";
  const role = String(product.role ?? "").toLowerCase();

  return lifecycle === "active" &&
    !doNotSpec &&
    !["cable", "accessory", "rack-mount", "power-accessory", "software-app"].includes(role);
});

const activeLeadSkus = activeLeadProducts
  .map((product) => normaliseSku(product.sku))
  .filter(Boolean);

const VERIFIED_STATUSES = new Set(["verified", "verified-with-warning"]);

const missing = activeLeadSkus.filter((sku) => !seen.has(sku));
// The number that actually matters. A review-required profile is a placeholder
// with evidence attached, not a checked specification, and must not be counted
// as coverage - otherwise the backlog can be "cleared" by adding stubs.
const verifiedSkus = activeLeadSkus.filter((sku) => VERIFIED_STATUSES.has(statusBySku.get(sku)));
const awaitingReview = activeLeadSkus.filter((sku) => seen.has(sku) && !VERIFIED_STATUSES.has(statusBySku.get(sku)));

console.log(
  `[technical-data] Validated ${payload.profiles.length} governed profiles. ` +
    `${verifiedSkus.length}/${activeLeadProducts.length} active lead SKUs have a VERIFIED governed profile.`,
);
console.log(
  `[technical-data] Coverage detail: ${verifiedSkus.length} verified, ` +
    `${awaitingReview.length} drafted awaiting review, ${missing.length} with no profile at all.`,
);

if (awaitingReview.length) {
  console.log(`[technical-data] Awaiting human review (${awaitingReview.length}): ${awaitingReview.slice(0, 40).join(", ")}${awaitingReview.length > 40 ? ", ..." : ""}`);
}

if (missing.length) {
  console.log(`[technical-data] No profile (${missing.length}): ${missing.slice(0, 40).join(", ")}${missing.length > 40 ? ", ..." : ""}`);
}

if (strict && (missing.length || awaitingReview.length)) {
  console.error(
    "[technical-data] Strict coverage failed: every active lead SKU needs a VERIFIED governed profile " +
      `(${missing.length} missing, ${awaitingReview.length} still awaiting review).`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Coverage ratchet
// ---------------------------------------------------------------------------
// Without this, the check reported a 118-SKU review backlog and still exited 0,
// so `npm run verify` went green while the technical claims behind customer
// proposals were ~7% governed. A green gate that does not mean what it appears
// to mean is worse than no gate.
//
// The ratchet makes progress monotonic: coverage may rise, never fall. It does
// not block work at today's level. Raise the floor after each batch with:
//   npm run check:technical-data -- --update-baseline
// The end goal is still `--strict` (100% of active lead SKUs), which becomes
// the verify gate once the agreed launch threshold is met.
//
// The floor tracks VERIFIED profiles specifically. It originally tracked "has
// any profile", which counted review-required stubs identically - so the
// backlog could have been driven to zero, and --strict made to pass, by adding
// 118 placeholder entries without checking a single specification. Ratcheting
// on the weaker number would have rewarded exactly the behaviour this gate
// exists to prevent.

const governedLeadSkus = verifiedSkus.length;

if (updateBaseline) {
  const next = {
    governedLeadSkus,
    activeLeadSkus: activeLeadProducts.length,
    countedStatuses: ["verified", "verified-with-warning"],
    note: "Verified-profile coverage floor for check:technical-data. Raise via --update-baseline; never lower by hand. review-required profiles deliberately do not count.",
  };
  fs.writeFileSync(coverageBaselinePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`[technical-data] Coverage baseline updated to ${governedLeadSkus}/${activeLeadProducts.length} verified.`);
  process.exit(0);
}

if (fs.existsSync(coverageBaselinePath)) {
  const baseline = readJson(coverageBaselinePath);
  const floor = Number(baseline.governedLeadSkus ?? 0);

  if (governedLeadSkus < floor) {
    console.error(
      `[technical-data] Coverage regressed: ${governedLeadSkus} governed lead SKUs, ` +
        `below the baseline of ${floor}.`,
    );
    console.error(
      "Governed technical coverage may rise but never fall - a proposal citing an ungoverned\n" +
        "SKU is an unverified technical claim to a customer. Restore the missing profiles, or\n" +
        "run `npm run check:technical-data -- --update-baseline` if the active range genuinely shrank.",
    );
    process.exit(1);
  }

  if (governedLeadSkus > floor) {
    console.log(
      `[technical-data] Coverage improved: ${governedLeadSkus} governed lead SKUs, above the ` +
        `baseline of ${floor}. Run \`npm run check:technical-data -- --update-baseline\` to lock it in.`,
    );
  }
}
