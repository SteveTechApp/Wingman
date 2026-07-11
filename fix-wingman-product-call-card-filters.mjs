import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = process.argv[2] || process.cwd();
process.chdir(repoRoot);

const classificationPath = path.join(
  repoRoot,
  "src",
  "wingman2",
  "lib",
  "productCallCardClassification.ts",
);
const pagePath = path.join(
  repoRoot,
  "src",
  "wingman2",
  "pages",
  "ProductCallCardsPage.tsx",
);
const testPath = path.join(
  repoRoot,
  "src",
  "wingman2",
  "lib",
  "productCallCardClassification.test.ts",
);
const indexPath = path.join(
  repoRoot,
  "public",
  "product-intelligence-index.json",
);
const auditPath = path.join(
  repoRoot,
  "docs",
  "product-call-card-filter-audit-latest.md",
);

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }
}

function replaceFunction(text, functionName, replacement) {
  const marker = `export function ${functionName}(`;
  const start = text.indexOf(marker);

  if (start < 0) {
    throw new Error(`Could not find exported function ${functionName}().`);
  }

  const braceStart = text.indexOf("{", start);
  if (braceStart < 0) {
    throw new Error(`Could not find opening brace for ${functionName}().`);
  }

  let depth = 0;
  let end = -1;

  for (let index = braceStart; index < text.length; index += 1) {
    const character = text[index];

    if (character === "{") depth += 1;
    if (character === "}") {
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
  const result = execFileSync(
    "cmd.exe",
    ["/d", "/s", "/c", command],
    {
      cwd: repoRoot,
      stdio: "inherit",
      windowsHide: true,
    },
  );

  return result;
}

for (const filePath of [
  classificationPath,
  pagePath,
  testPath,
  indexPath,
]) {
  requireFile(filePath);
}

const stamp = new Date()
  .toISOString()
  .replace(/[-:TZ.]/g, "")
  .slice(0, 14);
const backupRoot = path.join(
  repoRoot,
  "docs",
  "backups",
  `product-call-card-filters-${stamp}`,
);

fs.mkdirSync(backupRoot, { recursive: true });
fs.copyFileSync(
  classificationPath,
  path.join(backupRoot, "productCallCardClassification.ts"),
);
fs.copyFileSync(
  pagePath,
  path.join(backupRoot, "ProductCallCardsPage.tsx"),
);
fs.copyFileSync(
  testPath,
  path.join(backupRoot, "productCallCardClassification.test.ts"),
);

console.log("==> Replace broad keyword classification with strict identity rules");

let classification = fs.readFileSync(classificationPath, "utf8");

const strictClassifier = `export function classifyProductCallCard(
  product: ProductCallCardClassificationInput,
): ClassifiedProductCallCardHeading[] {
  const sku = fieldText(product.sku).toUpperCase();

  // Classification must describe what the product is, not every application,
  // feature or alternative mentioned in its marketing copy.
  const identityText = [
    product.sku,
    product.name,
    product.title,
    product.family,
    product.category,
    product.productType,
    product.role,
    product.productRole,
  ]
    .map(fieldText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const headings = new Set<ClassifiedProductCallCardHeading>();
  const identityHas = (terms: RegExp[]) =>
    terms.some((term) => term.test(identityText));

  const isNetworkHd = /^NHD-/.test(sku);
  const isCamera = /^CAM-/.test(sku);
  const isApollo =
    /^APO-/.test(sku) &&
    !/^APO-DG/.test(sku);

  const isUnifiedComms =
    isCamera ||
    isApollo ||
    identityHas([
      /\\bunified comm(?:s|unications?)\\b/,
      /\\bvideo bar\\b/,
      /\\bconference camera\\b/,
      /\\bconferencing camera\\b/,
      /\\bspeakerphone\\b/,
      /\\buc switcher\\b/,
      /\\bptz camera\\b/,
    ]);

  if (isUnifiedComms) {
    headings.add("Unified Comms");
  }

  const isAudioProduct =
    /^AMP-/.test(sku) ||
    identityHas([
      /\\baudio amplifier\\b/,
      /\\bnetwork amplifier\\b/,
      /\\bdante amplifier\\b/,
      /\\bdsp amplifier\\b/,
      /\\baudio processor\\b/,
      /\\baudio converter\\b/,
      /\\baudio breakout\\b/,
      /\\baudio extractor\\b/,
      /\\baudio de-?embed(?:der|ding)?\\b/,
    ]);

  if (isAudioProduct) {
    headings.add("Audio");
  }

  const hasKitSku = /(?:^|-)KIT(?:-|$)/.test(sku);
  const extenderIdentity = identityHas([
    /\\bextender kit\\b/,
    /\\bhdbaset kit\\b/,
    /\\bhdmi (?:extension|extender) kit\\b/,
    /\\btx\\s*\\/\\s*rx pair\\b/,
    /\\btransmitter\\s*(?:and|\\/)\\s*receiver (?:kit|pair)\\b/,
  ]);
  const kitCapableSku =
    /^(?:EXP-)?(?:EX|MX|MXV)-/.test(sku);

  if ((hasKitSku && kitCapableSku) || extenderIdentity) {
    headings.add("Extender Kits");
  }

  const isDistributionAmplifier =
    /^(?:EXP-)?SP-/.test(sku) ||
    /(?:^|[-/])DA(?:[-/]|$)/.test(sku) ||
    identityHas([
      /\\bsplitter\\b/,
      /\\bdistribution amplifier\\b/,
      /\\bhdmi splitter\\b/,
    ]);

  if (isDistributionAmplifier) {
    headings.add("DA / Splitters");
  }

  const isVideoWallSku = /(?:^|-)VW(?:-|$)/.test(sku);
  const isPresentationSwitcherSku =
    /^(?:EXP-)?SW-/.test(sku) &&
    !isVideoWallSku;
  const isPresentationMatrixSku =
    /^(?:EXP-)?MX(?:V)?-/.test(sku) &&
    /(?:^|-)(?:MST|EDU)(?:-|$)/.test(sku);
  const isPresentationIdentity = identityHas([
    /\\bpresentation switcher\\b/,
    /\\broom switcher\\b/,
    /\\bclassroom switcher\\b/,
    /\\busb-c switcher\\b/,
    /\\bmeeting-room switcher\\b/,
  ]);

  if (
    (isPresentationSwitcherSku &&
      identityHas([
        /\\bpresentation\\b/,
        /\\bswitcher\\b/,
        /\\bmeeting room\\b/,
        /\\bclassroom\\b/,
        /\\busb-c\\b/,
      ])) ||
    isPresentationMatrixSku ||
    isPresentationIdentity
  ) {
    headings.add("Presentation Switchers");
  }

  const isMatrix =
    /^(?:EXP-)?MX(?:V)?-/.test(sku) ||
    identityHas([
      /\\bmatrix switcher\\b/,
      /\\bseamless matrix\\b/,
      /\\bfixed i\\/o matrix\\b/,
      /\\brouting matrix\\b/,
    ]);

  if (isMatrix) {
    headings.add("Matrix Switchers");
  }

  const isWirelessCasting =
    /^APO-DG/.test(sku) ||
    (
      /-W$/.test(sku) &&
      /^(?:EXP-)?(?:SW|MX|MXV)-/.test(sku)
    ) ||
    identityHas([
      /\\bwireless casting dongle\\b/,
      /\\bwireless presentation dongle\\b/,
      /\\bwireless presentation receiver\\b/,
      /\\bwireless casting receiver\\b/,
    ]);

  if (isWirelessCasting) {
    headings.add("Wireless Casting");
  }

  // The AVoIP filter is the governed NetworkHD family. Descriptions that merely
  // mention an AVoIP application or alternative must not add this heading.
  if (isNetworkHd) {
    headings.add("AVoIP");
  }

  const isVideoWall =
    ["NHD-0401-MV", "NHD-150-RX", "SW-0204-VW", "SW-0206-VW"].includes(sku) ||
    isVideoWallSku ||
    identityHas([
      /\\bvideo wall processor\\b/,
      /\\bvideowall processor\\b/,
      /\\bmultiview processor\\b/,
      /\\bmulti-view processor\\b/,
      /\\bmultiview decoder\\b/,
    ]);

  if (isVideoWall) {
    headings.add("Video Wall");
  }

  const isControl =
    /^SYN-TOUCH/.test(sku) ||
    /^NHD-(?:000-)?CTL/.test(sku) ||
    identityHas([
      /\\btouch panel\\b/,
      /\\btouchpad controller\\b/,
      /\\bcontrol interface\\b/,
      /\\broom controller\\b/,
      /\\bav controller\\b/,
    ]);

  if (isControl) {
    headings.add("Control");
  }

  return [...headings];
}`;

classification = replaceFunction(
  classification,
  "classifyProductCallCard",
  strictClassifier,
);

fs.writeFileSync(classificationPath, classification, "utf8");

console.log("==> Enforce current/recommendable lifecycle on Call Card results");

let page = fs.readFileSync(pagePath, "utf8");

if (
  !page.includes(
    'import { resolveProductLifecycle } from "../lib/wyrestormProductLifecycle";',
  )
) {
  const importAnchor =
    'import { isSkuAdminBlocked } from "../lib/adminProductOverrides";';

  if (!page.includes(importAnchor)) {
    throw new Error("Could not find adminProductOverrides import.");
  }

  page = page.replace(
    importAnchor,
    `${importAnchor}\nimport { resolveProductLifecycle } from "../lib/wyrestormProductLifecycle";`,
  );
}

const oldFilter =
  '.filter((product) => product.sku && !isSkuAdminBlocked(product.sku))';

const newFilter = `.filter((product) => {
          if (!product.sku || isSkuAdminBlocked(product.sku)) {
            return false;
          }

          return resolveProductLifecycle(product.sku).recommendable;
        })`;

if (page.includes(oldFilter)) {
  page = page.replace(oldFilter, newFilter);
} else if (!page.includes("resolveProductLifecycle(product.sku).recommendable")) {
  throw new Error("Could not locate the current product visibility filter.");
}

fs.writeFileSync(pagePath, page, "utf8");

console.log("==> Add strict filter regression tests");

let test = fs.readFileSync(testPath, "utf8");
const marker = 'describe("Product Call Cards strict filter boundaries"';

if (!test.includes(marker)) {
  test += `

describe("Product Call Cards strict filter boundaries", () => {
  it("does not classify by incidental application wording", () => {
    expect(
      classifyProductCallCard({
        sku: "CAM-420-PTZ",
        name: "PTZ camera",
        applications: ["AV-over-IP, BYOD and video-wall workflows"],
        summary: "Can be used with NetworkHD and presentation switchers.",
      }),
    ).toEqual(["Unified Comms"]);

    expect(
      classifyProductCallCard({
        sku: "NHD-500-DNT-TX",
        name: "NetworkHD 500 encoder with Dante support",
        description: "Includes Dante audio integration.",
      }),
    ).toEqual(["AVoIP"]);

    expect(
      classifyProductCallCard({
        sku: "MX-1007-HYB",
        name: "Hybrid matrix switcher",
        summary: "Can be considered alongside AVoIP and wireless casting.",
      }),
    ).toEqual(["Matrix Switchers"]);
  });

  it("keeps representative products in their governed groups", () => {
    expect(
      classifyProductCallCard({
        sku: "AMP-260-DNT",
        name: "Network amplifier",
      }),
    ).toContain("Audio");

    expect(
      classifyProductCallCard({
        sku: "EXP-MX-0808-KIT",
        name: "8x8 HDBaseT matrix kit",
      }),
    ).toEqual(
      expect.arrayContaining(["Extender Kits", "Matrix Switchers"]),
    );

    expect(
      classifyProductCallCard({
        sku: "SP-0104-H2",
        name: "1x4 HDMI splitter",
      }),
    ).toContain("DA / Splitters");

    expect(
      classifyProductCallCard({
        sku: "SW-0401-H2",
        name: "Presentation switcher",
      }),
    ).toContain("Presentation Switchers");

    expect(
      classifyProductCallCard({
        sku: "APO-DG2",
        name: "Wireless casting dongle",
      }),
    ).toEqual(["Wireless Casting"]);

    expect(
      classifyProductCallCard({
        sku: "APO-VX20-UC-V2",
        name: "Video bar for conference rooms",
      }),
    ).toEqual(["Unified Comms"]);

    expect(
      classifyProductCallCard({
        sku: "NHD-0401-MV",
        name: "NetworkHD multiview processor",
      }),
    ).toEqual(expect.arrayContaining(["AVoIP", "Video Wall"]));

    expect(
      classifyProductCallCard({
        sku: "NHD-CTL-PRO-V2",
        name: "NetworkHD controller",
      }),
    ).toEqual(expect.arrayContaining(["AVoIP", "Control"]));
  });

  it("keeps every AVoIP result inside the NHD family", () => {
    const avoipSkus = productIndex.products
      .filter((product) =>
        classifyProductCallCard(product).includes("AVoIP"),
      )
      .map((product) => product.sku);

    expect(avoipSkus.length).toBeGreaterThan(0);
    expect(
      avoipSkus.every((sku) => String(sku).toUpperCase().startsWith("NHD-")),
    ).toBe(true);
  });

  it("does not leak obvious cross-family products into strict groups", () => {
    for (const product of productIndex.products) {
      const sku = String(product.sku || "").toUpperCase();
      const headings = classifyProductCallCard(product);

      if (headings.includes("Audio")) {
        expect(
          /^AMP-/.test(sku) ||
            /audio amplifier|network amplifier|dante amplifier|dsp amplifier|audio processor|audio converter|audio breakout|audio extractor/i.test(
              [
                product.name,
                product.title,
                product.family,
                product.category,
                product.productType,
                product.role,
                product.productRole,
              ]
                .filter(Boolean)
                .join(" "),
            ),
        ).toBe(true);
      }

      if (headings.includes("Matrix Switchers")) {
        expect(
          /^(?:EXP-)?MX(?:V)?-/.test(sku) ||
            /matrix switcher|seamless matrix|fixed i\/o matrix|routing matrix/i.test(
              [
                product.name,
                product.title,
                product.family,
                product.category,
                product.productType,
                product.role,
                product.productRole,
              ]
                .filter(Boolean)
                .join(" "),
            ),
        ).toBe(true);
      }

      if (headings.includes("Wireless Casting")) {
        expect(
          /^APO-DG/.test(sku) ||
            (/-W$/.test(sku) && /^(?:EXP-)?(?:SW|MX|MXV)-/.test(sku)) ||
            /wireless casting dongle|wireless presentation dongle|wireless presentation receiver|wireless casting receiver/i.test(
              [
                product.name,
                product.title,
                product.family,
                product.category,
                product.productType,
                product.role,
                product.productRole,
              ]
                .filter(Boolean)
                .join(" "),
            ),
        ).toBe(true);
      }
    }
  });
});
`;
}

fs.writeFileSync(testPath, test, "utf8");

console.log("==> Typecheck");
run("npm run typecheck");

console.log("==> Product Call Card classification tests");
run(
  "npx vitest run src/wingman2/lib/productCallCardClassification.test.ts",
);

console.log("==> Build filter audit");

const productIndex = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const headingNames = [
  "Audio",
  "Extender Kits",
  "DA / Splitters",
  "Presentation Switchers",
  "Matrix Switchers",
  "Wireless Casting",
  "Unified Comms",
  "AVoIP",
  "Video Wall",
  "Control",
];

const moduleUrl = new URL(
  `file:///${classificationPath.replace(/\\/g, "/")}`,
);

// The TS module cannot be imported directly by plain Node. Build the audit from
// a small Vitest invocation instead, and keep this markdown as a checklist.
const audit = [
  "# Product Call Card filter audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Enforced rules",
  "",
  "- Classification uses SKU/name/family/category/product type/role identity fields.",
  "- Description, summary, tags and applications do not assign product groups.",
  "- AVoIP is restricted to NHD SKUs.",
  "- Product Call Cards only load lifecycle-recommendable, non-admin-blocked SKUs.",
  "- Cross-family regression tests run against the current product intelligence index.",
  "",
  "## Filter headings",
  "",
  ...headingNames.map((heading) => `- ${heading}`),
  "",
  "## Validation",
  "",
  "- `npm run typecheck`",
  "- `npx vitest run src/wingman2/lib/productCallCardClassification.test.ts`",
  "",
].join("\n");

fs.mkdirSync(path.dirname(auditPath), { recursive: true });
fs.writeFileSync(auditPath, audit, "utf8");

console.log("");
console.log("Strict Product Call Card filter repair installed.");
console.log(`Backups: ${backupRoot}`);
console.log(`Audit: ${auditPath}`);
console.log("");
console.log("Review:");
run(
  `git diff --check -- "${classificationPath}" "${pagePath}" "${testPath}"`,
);
run(
  `git diff --stat -- "${classificationPath}" "${pagePath}" "${testPath}" "${auditPath}"`,
);
