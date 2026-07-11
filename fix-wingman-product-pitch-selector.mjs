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
  "ProductPitchPage.tsx",
);
const cssPath = path.join(
  repoRoot,
  "src",
  "wingman2",
  "styles",
  "wingman-style-stack.css",
);

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }
}

function replaceBetween(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);

  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Could not locate ${label}.`);
  }

  return `${text.slice(0, start)}${replacement}${text.slice(end)}`;
}

function replaceMarkedBlock(text, startMarker, endMarker, replacement) {
  const start = text.indexOf(startMarker);

  if (start < 0) {
    return `${text.trimEnd()}\n\n${replacement}\n`;
  }

  const end = text.indexOf(endMarker, start);

  if (end < 0) {
    throw new Error(`Found ${startMarker} without ${endMarker}.`);
  }

  return `${text.slice(0, start)}${replacement}${text.slice(end + endMarker.length)}`;
}

function run(command, args) {
  const executable =
    process.platform === "win32" && (command === "npm" || command === "npx")
      ? `${command}.cmd`
      : command;

  execFileSync(executable, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
  });
}

requireFile(pagePath);
requireFile(cssPath);

const stamp = new Date()
  .toISOString()
  .replace(/[-:TZ.]/g, "")
  .slice(0, 14);
const backupRoot = path.join(
  repoRoot,
  "docs",
  "backups",
  `product-pitch-selector-${stamp}`,
);

fs.mkdirSync(backupRoot, { recursive: true });
fs.copyFileSync(pagePath, path.join(backupRoot, "ProductPitchPage.tsx"));
fs.copyFileSync(cssPath, path.join(backupRoot, "wingman-style-stack.css"));

let page = fs.readFileSync(pagePath, "utf8");

const helperStart = "/* Wingman product selector helpers - START */";
const helperEnd = "/* Wingman product selector helpers - END */";

const helperBlock = `/* Wingman product selector helpers - START */

const PRODUCT_PITCH_CATEGORY_FILTERS = [
  "All",
  "AV over IP",
  "Matrix",
  "Extenders",
  "UC",
  "Cameras",
  "Video wall",
  "Audio",
  "Control",
  "Other",
] as const;

type ProductPitchCategoryFilter =
  (typeof PRODUCT_PITCH_CATEGORY_FILTERS)[number];

const PRODUCT_PITCH_INITIAL_RESULT_LIMIT = 24;

function productPitchCategory(product: ProductSpec): ProductPitchCategoryFilter {
  const text = productText(product);

  if (/\\b(camera|ptz|capture|ndi)\\b/.test(text)) {
    return "Cameras";
  }

  if (
    /\\b(networkhd|av[- ]?over[- ]?ip|avoip|sdvoe|jpeg[- ]?xs)\\b/.test(text) ||
    /\\b(encoder|decoder|transceiver)\\b/.test(text)
  ) {
    return "AV over IP";
  }

  if (/\\b(video wall|videowall|multi[- ]?view|multiview)\\b/.test(text) || /-vw\\b/.test(text)) {
    return "Video wall";
  }

  if (/\\b(matrix|matrix switcher|routing matrix)\\b/.test(text) || /^mx-/.test(product.sku.toLowerCase())) {
    return "Matrix";
  }

  if (/\\b(hdbaset|hdbt|extender|extension|balun)\\b/.test(text)) {
    return "Extenders";
  }

  if (
    /\\b(unified comms|unified communications|meeting room|conference|conferencing|byod|byom|speakerphone|video bar|presentation switcher)\\b/.test(text) ||
    /\\buc\\b/.test(text)
  ) {
    return "UC";
  }

  if (/\\b(amplifier|audio|dante|aes67|speaker|dsp|microphone|soundbar)\\b/.test(text)) {
    return "Audio";
  }

  if (/\\b(control|controller|touch panel|automation|gpio|rs-232)\\b/.test(text)) {
    return "Control";
  }

  return "Other";
}

function isPassiveProductPitchItem(product: ProductSpec): boolean {
  const sku = product.sku.trim().toLowerCase();
  const category = String(product.category || "").toLowerCase();
  const type = String(product.productType || "").toLowerCase();
  const name = String(product.name || "").toLowerCase();
  const combined = \`\${category} \${type} \${name}\`;

  if (sku.startsWith("cab-")) return true;
  if (/\\b(cable|aoc|patch lead|patch cable)\\b/.test(combined)) return true;

  const isAccessoryCategory = /\\b(accessory|accessories|mounting)\\b/.test(
    \`\${category} \${type}\`,
  );

  if (
    isAccessoryCategory &&
    /\\b(mount|bracket|rack|shelf|plate|faceplate|bezel|stand|feet|foot|remote control|power supply|psu|replacement)\\b/.test(
      combined,
    )
  ) {
    return true;
  }

  return false;
}

function productMatchesCategory(
  product: ProductSpec,
  filter: ProductPitchCategoryFilter,
): boolean {
  return filter === "All" || productPitchCategory(product) === filter;
}

/* Wingman product selector helpers - END */

`;

if (page.includes(helperStart)) {
  const helperBlockStart = page.indexOf(helperStart);
  const helperBlockEnd = page.indexOf(helperEnd, helperBlockStart);

  if (helperBlockEnd < 0) {
    throw new Error("Existing product selector helper block is incomplete.");
  }

  page =
    page.slice(0, helperBlockStart) +
    helperBlock +
    page.slice(helperBlockEnd + helperEnd.length);
} else {
  const selectionMarker = "function SelectionPage({";
  const selectionIndex = page.indexOf(selectionMarker);

  if (selectionIndex < 0) {
    throw new Error("Could not locate SelectionPage().");
  }

  page = `${page.slice(0, selectionIndex)}${helperBlock}${page.slice(selectionIndex)}`;
}

const selectionStart = "function SelectionPage({";
const selectionEnd = "function TabButton({";

const selectionFunction = `function SelectionPage({
  products,
  searchTerm,
  setSearchTerm,
  activeQuickFilter,
  setActiveQuickFilter,
  openProduct
}: {
  products: ProductSpec[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  activeQuickFilter: ProductPitchQuickFilter;
  setActiveQuickFilter: (value: ProductPitchQuickFilter) => void;
  openProduct: (sku: string) => void;
}) {
  const term = searchTerm.trim().toLowerCase();
  const [activeCategory, setActiveCategory] =
    useState<ProductPitchCategoryFilter>("All");
  const [includePassiveItems, setIncludePassiveItems] = useState(false);
  const [visibleCount, setVisibleCount] = useState(
    PRODUCT_PITCH_INITIAL_RESULT_LIMIT,
  );

  const baseProducts = useMemo(
    () =>
      products.filter(
        (product) => includePassiveItems || !isPassiveProductPitchItem(product),
      ),
    [products, includePassiveItems],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<ProductPitchCategoryFilter, number>();

    PRODUCT_PITCH_CATEGORY_FILTERS.forEach((filter) => {
      counts.set(
        filter,
        baseProducts.filter((product) =>
          productMatchesCategory(product, filter),
        ).length,
      );
    });

    return counts;
  }, [baseProducts]);

  const quickFilterCounts = useMemo(() => {
    const counts = new Map<ProductPitchQuickFilter, number>();
    const categoryProducts = baseProducts.filter((product) =>
      productMatchesCategory(product, activeCategory),
    );

    PRODUCT_PITCH_FILTERS.forEach((filter) => {
      counts.set(
        filter,
        categoryProducts.filter((product) =>
          productMatchesProductPitchFilter(product, filter),
        ).length,
      );
    });

    return counts;
  }, [baseProducts, activeCategory]);

  const filtered = useMemo(() => {
    const categoryFiltered = baseProducts.filter((product) =>
      productMatchesCategory(product, activeCategory),
    );
    const quickFiltered = categoryFiltered.filter((product) =>
      productMatchesProductPitchFilter(product, activeQuickFilter),
    );

    if (!term) return quickFiltered;

    return quickFiltered.filter((product) => includesProduct(product, term));
  }, [baseProducts, term, activeCategory, activeQuickFilter]);

  useEffect(() => {
    setVisibleCount(PRODUCT_PITCH_INITIAL_RESULT_LIMIT);
  }, [term, activeCategory, activeQuickFilter, includePassiveItems]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const hiddenCount = Math.max(0, filtered.length - visibleProducts.length);

  return (
    <main className="wm-product-pitch-selection-page grid gap-4 pb-6 wm-ui-page wingman-page-host">
      <CompareBackToListButton />

      <section className={\`\${PRODUCT_PITCH_PANEL_CLASS} wm-product-pitch-selection-hero\`}>
        <div>
          <p className={\`\${PRODUCT_PITCH_KICKER_CLASS} text-cyan-300\`}>
            Product workspace
          </p>
          <h1 className={\`\${PRODUCT_PITCH_HERO_TITLE_CLASS} text-white\`}>
            Select one product
          </h1>
        </div>
        <p className="wm-product-pitch-selection-intro wm-ui-copy">
          Search the current WyreStorm catalogue, select one product, then
          continue directly into its Overview, Sales Cards, Technical Spec,
          Diagram and Room Visual workspace.
        </p>
      </section>

      <section className={\`\${PRODUCT_PITCH_PANEL_CLASS} wm-product-pitch-selector\`}>
        <label className="wm-product-pitch-search-label">
          <span className={\`\${PRODUCT_PITCH_KICKER_CLASS} text-cyan-300\`}>
            Search by SKU, product name or application
          </span>
          <input
            className="wm-product-pitch-search wm-ui-input"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Example: CAM-420-PTZ, NetworkHD, HDMI extender, meeting room"
            type="search"
            autoFocus
          />
        </label>

        <div
          className="wm-product-pitch-category-filters"
          aria-label="Product category filter"
        >
          {PRODUCT_PITCH_CATEGORY_FILTERS.map((filter) => {
            const count = categoryCounts.get(filter) || 0;
            const isActive = activeCategory === filter;
            const isDisabled = filter !== "All" && count === 0;

            return (
              <button
                key={filter}
                type="button"
                className="wm-product-pitch-category-button"
                data-active={isActive ? "true" : "false"}
                disabled={isDisabled}
                onClick={() => {
                  setActiveCategory(filter);
                  setActiveQuickFilter("All");
                }}
              >
                <span>{filter}</span>
                <small>{count}</small>
              </button>
            );
          })}

          <button
            type="button"
            className="wm-product-pitch-accessory-toggle"
            data-active={includePassiveItems ? "true" : "false"}
            onClick={() => setIncludePassiveItems((current) => !current)}
          >
            {includePassiveItems
              ? "Hide cables and passive accessories"
              : "Include cables and passive accessories"}
          </button>
        </div>

        <div className="wm-product-pitch-alpha-row">
          <div
            className="wm-product-pitch-alpha"
            aria-label="Alphabetical SKU filter"
          >
            {PRODUCT_PITCH_FILTERS.map((filter) => {
              const count = quickFilterCounts.get(filter) || 0;
              const isActive = activeQuickFilter === filter;
              const isDisabled = filter !== "All" && count === 0;

              return (
                <button
                  key={filter}
                  type="button"
                  className="wm-product-pitch-alpha-button"
                  data-active={isActive ? "true" : "false"}
                  disabled={isDisabled}
                  onClick={() => setActiveQuickFilter(filter)}
                  title={
                    isDisabled
                      ? \`No matching SKUs start with \${filter}\`
                      : \`\${count} matching SKU\${count === 1 ? "" : "s"}\`
                  }
                >
                  {filter}
                </button>
              );
            })}
          </div>

          <p className="wm-product-pitch-results-summary wm-ui-copy">
            <strong>{filtered.length}</strong> matching product
            {filtered.length === 1 ? "" : "s"}
            {activeCategory !== "All" ? \` · \${activeCategory}\` : ""}
            {activeQuickFilter !== "All"
              ? \` · Starts with \${activeQuickFilter}\`
              : ""}
          </p>
        </div>

        <div
          className="wm-product-pitch-results"
          aria-live="polite"
          aria-label="Product search results"
        >
          {visibleProducts.map((product) => {
            const category = productPitchCategory(product);

            return (
              <button
                className="wm-product-pitch-result"
                key={product.sku}
                type="button"
                onClick={() => openProduct(product.sku)}
              >
                <span className="wm-product-pitch-result-main">
                  <span className="wm-product-pitch-result-heading">
                    <strong>{product.sku}</strong>
                    <span className="wm-product-pitch-result-category">
                      {category}
                    </span>
                  </span>
                  <span className="wm-product-pitch-result-name">
                    {product.name}
                  </span>
                  <span className="wm-product-pitch-result-description">
                    {product.summary ||
                      product.description ||
                      product.productType ||
                      "Open the product workspace for governed positioning and technical detail."}
                  </span>
                </span>

                <span className="wm-product-pitch-result-action">
                  Select product
                  <span aria-hidden="true">→</span>
                </span>
              </button>
            );
          })}

          {!filtered.length ? (
            <div className="wm-product-pitch-empty wm-ui-copy">
              <strong>No matching product found.</strong>
              <span>
                Clear the search, select All, or include cables and passive
                accessories.
              </span>
            </div>
          ) : null}
        </div>

        {hiddenCount > 0 ? (
          <div className="wm-product-pitch-load-more">
            <span className="wm-ui-copy">
              Showing {visibleProducts.length} of {filtered.length}
            </span>
            <button
              type="button"
              onClick={() =>
                setVisibleCount((current) =>
                  Math.min(current + PRODUCT_PITCH_INITIAL_RESULT_LIMIT, filtered.length),
                )
              }
            >
              Show {Math.min(PRODUCT_PITCH_INITIAL_RESULT_LIMIT, hiddenCount)} more
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

`;

page = replaceBetween(
  page,
  selectionStart,
  selectionEnd,
  selectionFunction,
  "SelectionPage function",
);

fs.writeFileSync(pagePath, page, "utf8");

let css = fs.readFileSync(cssPath, "utf8");

const cssStart = "/* Wingman Product Pitch selector redesign - START */";
const cssEnd = "/* Wingman Product Pitch selector redesign - END */";

const cssBlock = `/* Wingman Product Pitch selector redesign - START */

.wm-product-pitch-selection-page {
  min-width: 0;
}

.wm-product-pitch-selection-hero,
.wm-product-pitch-selector {
  border-radius: 18px !important;
}

.wm-product-pitch-selection-hero {
  display: grid;
  grid-template-columns: minmax(260px, 0.42fr) minmax(420px, 1fr);
  align-items: end;
  gap: 24px;
  padding: 18px 20px !important;
}

.wm-product-pitch-selection-hero h1 {
  margin-top: 5px !important;
  color: var(--wm-heading, #66f2df) !important;
  font-size: clamp(1.6rem, 2.1vw, 2.15rem) !important;
  line-height: 1.05 !important;
}

.wm-product-pitch-selection-intro {
  max-width: 760px;
  margin: 0 !important;
  font-size: 0.9rem !important;
  line-height: 1.45 !important;
}

.wm-product-pitch-selector {
  display: grid;
  gap: 13px;
  min-height: 0;
  padding: 18px 20px 20px !important;
}

.wm-product-pitch-search-label {
  display: grid;
  gap: 7px;
}

.wm-product-pitch-search {
  width: 100%;
  min-height: 46px !important;
  border: 1px solid #31516b !important;
  border-radius: 10px !important;
  background: #0b1d30 !important;
  padding: 0 14px !important;
  color: #fff !important;
  font-size: 0.9rem !important;
  font-weight: 700 !important;
  outline: none !important;
}

.wm-product-pitch-search:focus {
  border-color: #67e8f9 !important;
  box-shadow: 0 0 0 2px rgba(103, 232, 249, 0.12) !important;
}

.wm-product-pitch-category-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.wm-product-pitch-category-button,
.wm-product-pitch-accessory-toggle,
.wm-product-pitch-alpha-button,
.wm-product-pitch-load-more button {
  appearance: none;
  border: 1px solid #31516b;
  border-radius: 8px;
  background: #0a1a2b;
  color: #dcecff;
  font: inherit;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background 140ms ease,
    color 140ms ease;
}

.wm-product-pitch-category-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 10px;
  font-size: 0.76rem;
  font-weight: 800;
}

.wm-product-pitch-category-button small {
  min-width: 20px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 5px;
  color: #a9bed1;
  font-size: 0.66rem;
  text-align: center;
}

.wm-product-pitch-category-button[data-active="true"],
.wm-product-pitch-alpha-button[data-active="true"],
.wm-product-pitch-accessory-toggle[data-active="true"] {
  border-color: #5eead4;
  background: rgba(45, 212, 191, 0.17);
  color: #8ff7e8;
}

.wm-product-pitch-category-button:disabled,
.wm-product-pitch-alpha-button:disabled {
  cursor: not-allowed;
  opacity: 0.32;
}

.wm-product-pitch-accessory-toggle {
  min-height: 34px;
  margin-left: auto;
  padding: 0 11px;
  color: #b6c8d8;
  font-size: 0.72rem;
  font-weight: 800;
}

.wm-product-pitch-alpha-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding-top: 2px;
}

.wm-product-pitch-alpha {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.wm-product-pitch-alpha-button {
  min-width: 28px;
  height: 28px;
  padding: 0 7px;
  font-size: 0.68rem;
  font-weight: 900;
  line-height: 1;
}

.wm-product-pitch-results-summary {
  margin: 0 !important;
  font-size: 0.75rem !important;
  white-space: nowrap;
}

.wm-product-pitch-results-summary strong {
  color: #fff;
}

.wm-product-pitch-results {
  display: grid;
  gap: 7px;
  max-height: min(58vh, 620px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 2px 6px 2px 0;
  scrollbar-gutter: stable;
}

.wm-product-pitch-result {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  width: 100%;
  min-height: 82px;
  border: 1px solid #29465e;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(10, 28, 46, 0.98), rgba(7, 21, 35, 0.98));
  padding: 12px 14px;
  color: #fff;
  text-align: left;
  cursor: pointer;
  transition:
    transform 120ms ease,
    border-color 120ms ease,
    background 120ms ease;
}

.wm-product-pitch-result:hover,
.wm-product-pitch-result:focus-visible {
  border-color: #5eead4;
  background: linear-gradient(135deg, rgba(12, 42, 58, 0.98), rgba(8, 28, 43, 0.98));
  outline: none;
  transform: translateY(-1px);
}

.wm-product-pitch-result-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.wm-product-pitch-result-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px;
}

.wm-product-pitch-result-heading strong {
  color: #7df4e4;
  font-size: 0.94rem;
  font-weight: 900;
  letter-spacing: 0.015em;
}

.wm-product-pitch-result-category {
  border: 1px solid rgba(125, 244, 228, 0.26);
  border-radius: 5px;
  background: rgba(45, 212, 191, 0.08);
  padding: 2px 6px;
  color: #b7fff4;
  font-size: 0.63rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.wm-product-pitch-result-name {
  overflow: hidden;
  color: #f6fbff;
  font-size: 0.86rem;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wm-product-pitch-result-description {
  display: -webkit-box;
  overflow: hidden;
  color: #9fb5c8;
  font-size: 0.74rem;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.wm-product-pitch-result-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 118px;
  justify-content: flex-end;
  color: #7df4e4;
  font-size: 0.72rem;
  font-weight: 900;
  white-space: nowrap;
}

.wm-product-pitch-result-action span {
  font-size: 1rem;
}

.wm-product-pitch-empty {
  display: grid;
  gap: 4px;
  border: 1px dashed #3b5870;
  border-radius: 10px;
  padding: 22px;
  text-align: center;
}

.wm-product-pitch-empty strong {
  color: #fff;
}

.wm-product-pitch-load-more {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-height: 32px;
}

.wm-product-pitch-load-more span {
  margin: 0 !important;
  font-size: 0.72rem !important;
}

.wm-product-pitch-load-more button {
  min-height: 32px;
  padding: 0 12px;
  color: #7df4e4;
  font-size: 0.72rem;
  font-weight: 900;
}

@media (max-width: 980px) {
  .wm-product-pitch-selection-hero,
  .wm-product-pitch-alpha-row {
    grid-template-columns: 1fr;
  }

  .wm-product-pitch-accessory-toggle {
    margin-left: 0;
  }

  .wm-product-pitch-results-summary {
    white-space: normal;
  }
}

@media (max-width: 640px) {
  .wm-product-pitch-selection-hero,
  .wm-product-pitch-selector {
    padding: 14px !important;
  }

  .wm-product-pitch-result {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .wm-product-pitch-result-action {
    justify-content: flex-start;
  }
}

/* Wingman Product Pitch selector redesign - END */`;

css = replaceMarkedBlock(css, cssStart, cssEnd, cssBlock);
fs.writeFileSync(cssPath, css, "utf8");

console.log("==> Typecheck");
run("npm", ["run", "typecheck"]);

console.log("");
console.log("Product Pitch selector redesign installed.");
console.log(`Backups: ${backupRoot}`);
console.log("");
console.log("Review:");
run("git", ["diff", "--", pagePath, cssPath]);
