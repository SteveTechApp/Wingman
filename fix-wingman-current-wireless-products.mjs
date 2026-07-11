import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = process.argv[2] || process.cwd();
process.chdir(repoRoot);

const pagePath = path.join(
  repoRoot,
  "src",
  "wingman2",
  "pages",
  "ProductCallCardsPage.tsx",
);
const classificationPath = path.join(
  repoRoot,
  "src",
  "wingman2",
  "lib",
  "productCallCardClassification.ts",
);
const testPath = path.join(
  repoRoot,
  "src",
  "wingman2",
  "lib",
  "productCallCardClassification.test.ts",
);
const adminDbPath = path.join(
  repoRoot,
  "data",
  "admin",
  "wingman-product-admin-db.json",
);

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }
}

function replaceFunction(text, functionName, replacement) {
  const markers = [
    `async function ${functionName}(`,
    `function ${functionName}(`,
    `export function ${functionName}(`,
  ];

  let start = -1;
  for (const marker of markers) {
    start = text.indexOf(marker);
    if (start >= 0) break;
  }

  if (start < 0) {
    throw new Error(`Could not find ${functionName}().`);
  }

  const braceStart = text.indexOf("{", start);
  if (braceStart < 0) {
    throw new Error(`Could not find opening brace for ${functionName}().`);
  }

  let depth = 0;
  let end = -1;

  for (let index = braceStart; index < text.length; index += 1) {
    const char = text[index];

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }

  if (end < 0) {
    throw new Error(`Could not find closing brace for ${functionName}().`);
  }

  return `${text.slice(0, start)}${replacement}${text.slice(end)}`;
}

function run(command) {
  execFileSync("cmd.exe", ["/d", "/s", "/c", command], {
    cwd: repoRoot,
    stdio: "inherit",
    windowsHide: true,
  });
}

for (const filePath of [
  pagePath,
  classificationPath,
  testPath,
  adminDbPath,
]) {
  requireFile(filePath);
}

const timestamp = new Date()
  .toISOString()
  .replace(/[-:TZ.]/g, "")
  .slice(0, 14);

const backupRoot = path.join(
  repoRoot,
  "docs",
  "backups",
  `wireless-current-products-${timestamp}`,
);

fs.mkdirSync(backupRoot, { recursive: true });
fs.copyFileSync(pagePath, path.join(backupRoot, "ProductCallCardsPage.tsx"));
fs.copyFileSync(
  classificationPath,
  path.join(backupRoot, "productCallCardClassification.ts"),
);
fs.copyFileSync(
  testPath,
  path.join(backupRoot, "productCallCardClassification.test.ts"),
);
fs.copyFileSync(
  adminDbPath,
  path.join(backupRoot, "wingman-product-admin-db.json"),
);

console.log("==> Block retired and invalid wireless/UC SKUs centrally");

const adminDb = JSON.parse(fs.readFileSync(adminDbPath, "utf8"));
adminDb.schemaVersion ??= 1;
adminDb.records ??= {};

const retiredSkus = [
  "APO-100-UC",
  "APO-200-UC",
  "APO-DG1",
  "APO-DG2-PRO",
  "HALO-VX10-V1",
  "SW-510-TX-W",
];

for (const sku of retiredSkus) {
  adminDb.records[sku] = {
    sku,
    statusOverride: "do-not-use",
    doNotUse: true,
    visibility: "hidden",
    adminNotes:
      "User-confirmed retired, invalid or non-current SKU. Hide from Wingman search, selection and recommendation surfaces.",
    evidenceUrl: "",
    updatedBy: "admin",
    updatedAt: new Date().toISOString(),
  };
}

const currentSkus = [
  "APO-VX20-UC-V2",
  "HALO-VX10-V2",
];

for (const sku of currentSkus) {
  const existing = adminDb.records[sku] || {};
  adminDb.records[sku] = {
    sku,
    statusOverride: "live",
    doNotUse: false,
    visibility: "default",
    adminNotes:
      sku === "APO-VX20-UC-V2"
        ? "Current Apollo VX20 v2 UC/wireless-casting host product."
        : "Current HALO VX10 v2 UC/wireless-casting host product.",
    evidenceUrl: existing.evidenceUrl || "",
    updatedBy: "admin",
    updatedAt: new Date().toISOString(),
  };
}

fs.writeFileSync(
  adminDbPath,
  `${JSON.stringify(adminDb, null, 2)}\n`,
  "utf8",
);

console.log("==> Merge Call Card seed sources and guarantee current UC hosts");

let page = fs.readFileSync(pagePath, "utf8");

const requiredSeedMarker =
  "const REQUIRED_CURRENT_PRODUCT_CALL_CARD_SEEDS: ProductSeed[]";

if (!page.includes(requiredSeedMarker)) {
  const loadMarker = "async function loadProductSeeds()";
  const loadIndex = page.indexOf(loadMarker);

  if (loadIndex < 0) {
    throw new Error("Could not find loadProductSeeds() insertion point.");
  }

  const requiredSeeds = `const REQUIRED_CURRENT_PRODUCT_CALL_CARD_SEEDS: ProductSeed[] = [
  {
    sku: "APO-VX20-UC-V2",
    name: "Apollo VX20 Video Bar for Conference Rooms",
    title: "Apollo VX20 Video Bar for Conference Rooms",
    family: "Unified Comms",
    category: "Unified Comms",
    productType: "Video bar / UC switcher",
    description:
      "Current Apollo VX20 v2 meeting-room video bar and UC product. Confirm the current room workflow, USB path and wireless-casting requirements before quoting.",
    tags: [
      "Unified Comms",
      "Video bar",
      "BYOD",
      "BYOM",
      "Wireless casting",
      "APO-DG2 compatible host",
    ],
    applications: [
      "Meeting room",
      "Hybrid conferencing",
      "Wireless presentation",
    ],
  },
  {
    sku: "HALO-VX10-V2",
    name: "HALO VX10 Video Bar",
    title: "HALO VX10 Video Bar",
    family: "Unified Comms",
    category: "Unified Comms",
    productType: "Video bar",
    description:
      "Current HALO VX10 v2 meeting-room video bar. Confirm the current conferencing, USB and wireless-casting workflow before quoting.",
    tags: [
      "Unified Comms",
      "Video bar",
      "Wireless casting",
      "HALO-VX10-UC-V2",
    ],
    applications: [
      "Meeting room",
      "Hybrid conferencing",
      "Wireless presentation",
    ],
  },
];

`;

  page =
    page.slice(0, loadIndex) +
    requiredSeeds +
    page.slice(loadIndex);
}

const mergedLoader = `async function loadProductSeeds(): Promise<ProductSeed[]> {
  const mergedSeeds: ProductSeed[] = [];

  try {
    const response = await fetch(PRODUCT_CALL_CARD_ENDPOINT, {
      cache: "no-store",
    });

    if (response.ok) {
      const payload = await response.json();
      mergedSeeds.push(...extractProductSeeds(payload));
    }
  } catch {
    // Continue to the shared product-intelligence index.
  }

  try {
    const payload = await loadProductIntelligenceIndex();
    mergedSeeds.push(...extractProductSeeds(payload));
  } catch {
    // Continue to the current-product fallback seeds.
  }

  mergedSeeds.push(...REQUIRED_CURRENT_PRODUCT_CALL_CARD_SEEDS);

  const merged = dedupeProductSeedsBySku(mergedSeeds);

  return merged.length > 0 ? merged : FALLBACK_PRODUCTS;
}`;

page = replaceFunction(page, "loadProductSeeds", mergedLoader);
fs.writeFileSync(pagePath, page, "utf8");

console.log("==> Add current UC hosts to Wireless Casting and Unified Comms");

let classification = fs.readFileSync(classificationPath, "utf8");

if (!classification.includes("const isHaloVideoBar =")) {
  const isApolloBlock = `  const isApollo =
    /^APO-/.test(sku) &&
    !/^APO-DG/.test(sku);`;

  if (!classification.includes(isApolloBlock)) {
    throw new Error("Could not locate the strict Apollo classification block.");
  }

  classification = classification.replace(
    isApolloBlock,
    `${isApolloBlock}
  const isHaloVideoBar = /^HALO-VX10(?:-UC)?-V2$/.test(sku);`,
  );
}

classification = classification.replace(
  /const isUnifiedComms =\s*\n\s*isCamera \|\|\s*\n\s*isApollo \|\|/,
  `const isUnifiedComms =
    isCamera ||
    isApollo ||
    isHaloVideoBar ||`,
);

if (!classification.includes("const isWirelessCastingHost =")) {
  const wirelessMarker = "  const isWirelessCasting =";

  if (!classification.includes(wirelessMarker)) {
    throw new Error("Could not locate Wireless Casting classification.");
  }

  classification = classification.replace(
    wirelessMarker,
    `  const isWirelessCastingHost = [
    "APO-VX20-UC-V2",
    "HALO-VX10-V2",
  ].includes(sku);

  const isWirelessCasting =
    isWirelessCastingHost ||`,
  );

  classification = classification.replace(
    /const isWirelessCasting =\s*\n\s*isWirelessCastingHost \|\|\s*\n\s*\^\/APO-DG/,
    `const isWirelessCasting =
    isWirelessCastingHost ||
    /^APO-DG`,
  );
}

fs.writeFileSync(classificationPath, classification, "utf8");

console.log("==> Add regression coverage");

let test = fs.readFileSync(testPath, "utf8");
const testMarker =
  'describe("Product Call Cards current wireless products"';

if (!test.includes(testMarker)) {
  test += `

describe("Product Call Cards current wireless products", () => {
  it("includes the current Apollo and HALO video bars in the correct groups", () => {
    expect(
      classifyProductCallCard({
        sku: "APO-VX20-UC-V2",
        name: "Apollo VX20 Video Bar for Conference Rooms",
        productType: "Video bar / UC switcher",
      }),
    ).toEqual(
      expect.arrayContaining(["Unified Comms", "Wireless Casting"]),
    );

    expect(
      classifyProductCallCard({
        sku: "HALO-VX10-V2",
        name: "HALO VX10 Video Bar",
        productType: "Video bar",
      }),
    ).toEqual(
      expect.arrayContaining(["Unified Comms", "Wireless Casting"]),
    );
  });

  it("does not classify retired wireless products as current replacements", () => {
    const retired = [
      "APO-100-UC",
      "APO-200-UC",
      "APO-DG1",
      "APO-DG2-PRO",
      "HALO-VX10-V1",
      "SW-510-TX-W",
    ];

    const adminDb = JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          "data/admin/wingman-product-admin-db.json",
        ),
        "utf8",
      ),
    ) as {
      records: Record<
        string,
        {
          doNotUse?: boolean;
          visibility?: string;
        }
      >;
    };

    retired.forEach((sku) => {
      expect(adminDb.records[sku]?.doNotUse, sku).toBe(true);
      expect(adminDb.records[sku]?.visibility, sku).toBe("hidden");
    });
  });
});
`;
}

fs.writeFileSync(testPath, test, "utf8");

console.log("==> Static validation");

const finalPage = fs.readFileSync(pagePath, "utf8");
const finalClassification = fs.readFileSync(classificationPath, "utf8");
const finalAdminDb = JSON.parse(fs.readFileSync(adminDbPath, "utf8"));

for (const sku of currentSkus) {
  if (!finalPage.includes(`sku: "${sku}"`)) {
    throw new Error(`Current product fallback missing: ${sku}`);
  }

  const record = finalAdminDb.records[sku];
  if (!record || record.doNotUse || record.visibility === "hidden") {
    throw new Error(`Current product is still blocked: ${sku}`);
  }
}

for (const sku of retiredSkus) {
  const record = finalAdminDb.records[sku];
  if (!record?.doNotUse || record.visibility !== "hidden") {
    throw new Error(`Retired product is not blocked: ${sku}`);
  }
}

if (
  !finalClassification.includes('"APO-VX20-UC-V2"') ||
  !finalClassification.includes('"HALO-VX10-V2"')
) {
  throw new Error("Current wireless-casting hosts are missing from classification.");
}

console.log("==> Typecheck");
run("npm run typecheck");

console.log("==> Product Call Card tests");
run(
  "npx vitest run src/wingman2/lib/productCallCardClassification.test.ts",
);

console.log("==> Admin database validation");
run("node tools/admin-product-db.mjs validate");

console.log("==> Diff validation");
run(
  'git diff --check -- "src/wingman2/pages/ProductCallCardsPage.tsx" "src/wingman2/lib/productCallCardClassification.ts" "src/wingman2/lib/productCallCardClassification.test.ts" "data/admin/wingman-product-admin-db.json"',
);

console.log("");
console.log("Wireless/UC catalogue correction installed.");
console.log(`Backups: ${backupRoot}`);
console.log("");
console.log("Restart the Vite development server before reviewing the page.");
