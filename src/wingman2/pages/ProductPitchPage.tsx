import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { getCurrentWorkflowProject, readProjectStore } from "../data/projectStore";
import { readProductWorkspaceHandoff, writeProductWorkspaceHandoff } from "../data/productWorkspaceHandoff";
import {
  buildProductNarrative,
  applyProductStoryToSpec,
  cleanUsefulList,
  extractRawProducts,
  normaliseProductRecord,
  type ProductNarrative,
  type ProductSpec
} from "../lib/productStoryEngine";
import {
  buildProductPitchSalesGuidance,
  type ProductSalesContext,
} from "../lib/productPitchGuidance";
import { CompareBackToListButton } from "../components/compare/CompareBackToListButton";
import { ProductFilterPanel, ProductSearchField, ProductWorkspaceHeader, ProductWorkspaceNav } from "../components/ProductWorkspaceChrome";
import { ReportProblemButton } from "../components/ReportProblemButton";
import { AdminProductRecordEditor } from "../components/AdminProductRecordEditor";
import { ProductMediaPanel } from "../components/ProductMediaPanel";
import { validateUsbPath, usbValidationIsRequired } from "../logic/usbPathValidator";
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";
import { buildProductCheatSheetHtml } from "../lib/productCheatSheet";
import { hydrateProductSpecWithTechnicalData } from "../lib/governedProductTechnicalData";
import { selectWingmanProducts, type ProductSelectorDecision } from "../lib/productSelectorEngine";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { normaliseSkuKey } from "../lib/skuAliasResolver";
import { resolveProductLifecycle } from "../lib/wyrestormProductLifecycle";
import { getProductMediaBySku, loadProductMediaIndex } from "../data/productMedia";
import { getCompetitorLandscape } from "../lib/competitorLandscape";


function useProductPitchDensityClass() {
  useEffect(() => {
    document.body.classList.add("wm-product-pitch-page-open");

    return () => {
      document.body.classList.remove("wm-product-pitch-page-open");
    };
  }, []);
}

function openProductCheatSheet(product: ProductSpec, narrative: ProductNarrative, imageUrl?: string) {
  const html = buildProductCheatSheetHtml({
    product,
    narrative,
    imageUrl,
    generatedOn: new Date().toLocaleDateString(),
  });

  const win = window.open("", "_blank", "noopener,noreferrer");

  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    return;
  }

  // Pop-up blocked: fall back to downloading the cheat-sheet as a file so it is
  // still available offline.
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${product.sku}-cheat-sheet.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type ProductTab = "overview" | "features" | "design" | "spec" | "competitors" | "workflow";

const PRODUCT_PITCH_PANEL_CLASS = "rounded-3xl border border-[#29465e] bg-[#071522]";
const PRODUCT_PITCH_KICKER_CLASS = "text-xs font-bold uppercase tracking-[0.12em]";
const PRODUCT_PITCH_CARD_KICKER_CLASS = "text-xs font-bold uppercase tracking-[0.11em]";
const PRODUCT_PITCH_HERO_TITLE_CLASS = "mt-2 text-3xl font-extrabold tracking-tight";
const PRODUCT_PITCH_SECTION_TITLE_CLASS = "text-xl font-extrabold";
const PRODUCT_PITCH_CARD_TITLE_CLASS = "text-lg font-extrabold";
const PRODUCT_PITCH_SMALL_PRIMARY_BUTTON_CLASS = "rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950";
const PRODUCT_PITCH_SMALL_SECONDARY_BUTTON_CLASS = "rounded-full border border-cyan-300 px-4 py-2 text-sm font-bold text-cyan-100";
const PRODUCT_PITCH_FORWARD_BUTTON_CLASS = "wm-ui-button wm-ui-button-forward px-4 py-2 text-sm font-bold";
const PRODUCT_PITCH_RESULT_LIMIT = 12;

const fallbackProducts: ProductSpec[] = [
  {
    sku: "CAM-210-NDI-PTZ",
    name: "1080p60 PTZ Camera",
    family: "WyreStorm",
    category: "NDI / camera",
    productType: "PTZ camera",
    description: "PTZ camera for conferencing, streaming, capture and network video workflows.",
    purpose: "Use this when the customer needs a controllable room camera with more flexibility than a fixed webcam.",
    summary: "A flexible PTZ camera for UC, lecture capture and streaming workflows with USB, HDMI and NDI output paths.",
    keyFeatures: ["1080p60 PTZ camera", "USB 3.0 connectivity", "HDMI output", "NDI workflow support", "Auto-framing support", "Optical zoom for room coverage"],
    applications: ["Meeting room / UC", "Lecture capture", "Streaming", "Training room", "Classroom / lecture", "BYOM / UC"],
    ioSummary: ["USB 3.0 host connection", "HDMI output", "NDI / network video path", "PTZ control path to confirm"],
    video: ["1080p60 camera workflow", "HDMI output", "NDI / network video support"],
    audio: ["Audio path must be confirmed separately from the camera."],
    usb: ["USB 3.0 path to host"],
    network: ["NDI / network video path"],
    control: ["PTZ control and preset requirement to confirm"],
    power: ["Confirm power method from current datasheet"],
    physical: ["Confirm mounting position and field of view"],
    checks: ["Confirm host location", "Confirm USB distance", "Confirm NDI network readiness", "Confirm camera mounting position", "Confirm microphone and speaker path separately"],
    related: ["CAM-0402-BRG", "NHD-128-NDI-TRX", "NHD-150-RX"]
  },
  {
    sku: "AMP-260-DNT",
    name: "120W Network Amplifier",
    family: "WyreStorm",
    category: "Audio / control",
    productType: "Network amplifier",
    description: "Networked DSP amplifier for distributed and room-based audio reinforcement workflows.",
    purpose: "Use this where the customer needs a compact amplification and DSP platform with Dante-based audio integration.",
    summary: "A compact DSP amplifier for room audio and distributed audio applications where networked audio and simple deployment matter.",
    keyFeatures: ["120W network amplifier", "Advanced DSP", "Dante integration", "Compact installation format", "Room and distributed audio applications"],
    applications: ["Room audio reinforcement", "Distributed audio", "Boardroom", "Education", "Lecture hall", "Hospitality"],
    ioSummary: ["Amplifier output path", "Audio input path", "Dante / network audio integration", "Control path to confirm"],
    video: ["No direct video role. Confirm wider system context separately."],
    audio: ["Amplifier workflow", "Dante audio support", "DSP-based audio processing"],
    usb: ["No USB role unless part of wider system workflow"],
    network: ["Dante / Ethernet network integration"],
    control: ["Control and DSP configuration path to confirm"],
    power: ["Amplifier power specification must be confirmed from current datasheet"],
    physical: ["Confirm install location, rack or local placement and speaker load"],
    checks: ["Confirm speaker load and room requirement", "Confirm Dante network availability", "Confirm control requirement", "Confirm wider audio system context"],
    related: []
  }
];

const PRODUCT_PITCH_FILTERS = [
  "All",
  "1-9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z"
] as const;

type ProductPitchQuickFilter = (typeof PRODUCT_PITCH_FILTERS)[number];

function normaliseSelectorText(value: string | undefined) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normaliseSelectorSku(value: string | undefined) {
  return normaliseSelectorText(value).toUpperCase();
}

function productCategoryFamily(product: ProductSpec) {
  const category = normaliseSelectorText(product.category || product.productType || "Product");
  const family = normaliseSelectorText(product.family);

  if (!family || /^wyrestorm$/i.test(family) || family.toLowerCase() === category.toLowerCase()) {
    return category;
  }

  return `${category} / ${family}`;
}

function displayProductResultName(product: ProductSpec) {
  const sku = normaliseSelectorSku(product.sku).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return normaliseSelectorText(product.name)
    .replace(/^WyreStorm\s+/i, "")
    .replace(new RegExp(`^${sku}\\s*[-:/]?\\s*`, "i"), "");
}

function usefulSearchLength(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").length;
}

function DisplayList({ items, max = 6 }: { items: string[]; max?: number }) {
  const useful = cleanUsefulList(items, max);

  return (
    <ul className="grid gap-2 text-sm leading-6 wm-ui-copy">
      {useful.map((item, index) => (
        <li key={`${item}-${index}`} className="rounded-2xl border px-3 py-2 wm-ui-card">
          {item}
        </li>
      ))}
    </ul>
  );
}

function conciseSalesCopy(value: string, maxWords = 28) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ").replace(/[,:;.-]+$/, "")}…`;
}

function WorkCard({
  title,
  children,
  tone = "standard",
}: {
  title: string;
  children: ReactNode;
  tone?: "standard" | "caution";
}) {
  return (
    <section className="wm-ui-card rounded-lg border p-5 wm-ui-section" data-ui-tone={tone}>
      <h3 className={`${PRODUCT_PITCH_CARD_TITLE_CLASS} ${tone === "caution" ? "text-amber-200" : "text-cyan-300"}`}>
        {title}
      </h3>
      <div className="mt-3 text-sm leading-6 wm-ui-copy">{children}</div>
    </section>
  );
}

function currentProductSalesContext(): ProductSalesContext {
  const project = getCurrentWorkflowProject(readProjectStore());
  const roomModel = project?.discoveryBrief?.roomModel;
  const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

  return {
    roomType: text(roomModel?.roomType),
    application: text(roomModel?.outcome) || text(roomModel?.application),
  };
}

function SelectionPage({
  products,
  searchTerm,
  setSearchTerm,
  activeQuickFilter,
  setActiveQuickFilter,
  includeAccessories,
  setIncludeAccessories,
  includeCables,
  setIncludeCables,
  openProduct
}: {
  products: ProductSpec[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  activeQuickFilter: ProductPitchQuickFilter;
  setActiveQuickFilter: (value: ProductPitchQuickFilter) => void;
  includeAccessories: boolean;
  setIncludeAccessories: (value: boolean) => void;
  includeCables: boolean;
  setIncludeCables: (value: boolean) => void;
  openProduct: (sku: string) => void;
}) {
  const term = searchTerm.trim().toLowerCase();
  const debouncedTerm = useDebouncedValue(term);
  const [selectedFamily, setSelectedFamily] = useState("");
  const [browseAll, setBrowseAll] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(PRODUCT_PITCH_RESULT_LIMIT);
  const currentProject = useMemo(() => getCurrentWorkflowProject(readProjectStore()), []);
  const recentSku = useMemo(() => readProductWorkspaceHandoff()?.sku ?? "", []);
  const searchIsUseful = usefulSearchLength(debouncedTerm) >= 2;
  const baseDecisions = useMemo(
    () =>
      selectWingmanProducts(products, {
        mode: "product-pitch",
        includeAccessories,
        includeCables,
        includeDependencies: includeAccessories,
        includeBrowseOnly: true,
      }),
    [products, includeAccessories, includeCables],
  );
  const defaultLeadDecisions = useMemo(
    () =>
      selectWingmanProducts(products, {
        mode: "product-pitch",
        includeBrowseOnly: false,
      }),
    [products],
  );
  const decisionBySku = useMemo(() => {
    const map = new Map<string, ProductSelectorDecision<ProductSpec>>();
    baseDecisions.forEach((decision) => {
      map.set(normaliseSkuKey(decision.sku), decision);
      map.set(normaliseSkuKey(decision.product.sku), decision);
    });
    return map;
  }, [baseDecisions]);
  const suggestedProducts = useMemo(() => {
    const selections = currentProject?.productSelections ?? currentProject?.proposal?.products ?? [];
    const skus = selections.map((selection) => normaliseSelectorSku(selection.sku)).filter(Boolean);
    const leadBySku = new Map(defaultLeadDecisions.map((decision) => [normaliseSkuKey(decision.sku), decision]));

    return skus
      .map((sku) => {
        const decision = leadBySku.get(normaliseSkuKey(sku));
        return decision?.eligible && decision.status === "compatible" ? decision.product : null;
      })
      .filter((product): product is ProductSpec => {
        return Boolean(product);
      })
      .slice(0, 3);
  }, [currentProject, defaultLeadDecisions]);
  const recentProducts = useMemo(() => {
    const sku = normaliseSelectorSku(recentSku);
    if (!sku) return [];
    const recent = products.find((product) => normaliseSelectorSku(product.sku) === sku);
    return recent ? [recent] : [];
  }, [products, recentSku]);
  const browseFamilies = useMemo(() => {
    const counts = new Map<string, number>();
    defaultLeadDecisions.forEach((decision) => {
      if (!decision.eligible || decision.status !== "compatible") return;
      const product = decision.product;
      const family = normaliseSelectorText(product.family);
      const label = family && !/^wyrestorm$/i.test(family) ? family : normaliseSelectorText(product.category || product.productType);
      if (!label) return;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8);
  }, [defaultLeadDecisions]);

  const quickFilterCounts = useMemo(() => {
    const counts = new Map<ProductPitchQuickFilter, number>();

    PRODUCT_PITCH_FILTERS.forEach((filter) => {
      counts.set(filter, 0);
    });

    PRODUCT_PITCH_FILTERS.forEach((filter) => {
      const count = selectWingmanProducts(products, {
        mode: "product-pitch",
        alphaFilter: filter,
        includeAccessories,
        includeCables,
        includeDependencies: includeAccessories,
        includeBrowseOnly: true,
      }).filter((decision) => decision.eligible).length;
      counts.set(filter, count);
    });

    return counts;
  }, [products, includeAccessories, includeCables]);

  const matchingProducts = useMemo(() => {
    return selectWingmanProducts(products, {
      mode: "product-pitch",
      query: searchIsUseful ? debouncedTerm : "",
      family: selectedFamily,
      alphaFilter: activeQuickFilter,
      includeAccessories,
      includeCables,
      includeDependencies: includeAccessories,
      includeBrowseOnly: true,
    })
      .filter((decision) => decision.eligible)
      .map((decision) => decision.product);
  }, [products, includeAccessories, includeCables, debouncedTerm, searchIsUseful, activeQuickFilter, selectedFamily]);

  const shouldShowResults = searchIsUseful || Boolean(selectedFamily) || activeQuickFilter !== "All" || browseAll;
  const visibleResults = shouldShowResults ? matchingProducts.slice(0, visibleLimit) : [];
  const hiddenCount = Math.max(0, matchingProducts.length - visibleResults.length);

  const openFamily = (family: string) => {
    setSelectedFamily(family);
    setActiveQuickFilter("All");
    setBrowseAll(false);
    setVisibleLimit(PRODUCT_PITCH_RESULT_LIMIT);
  };

  const updateSearchTerm = (value: string) => {
    setSearchTerm(value);
    setSelectedFamily("");
    setBrowseAll(false);
    setVisibleLimit(PRODUCT_PITCH_RESULT_LIMIT);
  };

  const chooseQuickFilter = (filter: ProductPitchQuickFilter) => {
    setActiveQuickFilter(filter);
    setSelectedFamily("");
    setBrowseAll(false);
    setVisibleLimit(PRODUCT_PITCH_RESULT_LIMIT);
  };

  const showBrowseAll = () => {
    setSearchTerm("");
    setSelectedFamily("");
    setActiveQuickFilter("All");
    setBrowseAll(true);
    setVisibleLimit(PRODUCT_PITCH_RESULT_LIMIT);
  };

  const ResultButton = ({ product }: { product: ProductSpec }) => (
    <button
      className="wm-product-pitch-result-card wm-ui-button wm-ui-button-secondary"
      type="button"
      onClick={() => openProduct(product.sku)}
    >
      <span className="wm-product-pitch-result-sku" data-label="SKU">{product.sku}{" "}</span>
      <span className="wm-product-pitch-result-name" data-label="Product name">{displayProductResultName(product)}{" "}</span>
      <span className="wm-product-pitch-result-family" data-label="Category">{productCategoryFamily(product)}{" "}</span>
      <span className="wm-product-pitch-result-status" data-label="Status">
        {decisionBySku.get(normaliseSkuKey(product.sku))?.lifecycleLabel ?? "Needs verification"}
      </span>
    </button>
  );

  return (
    <main data-product-pitch-view="selector" className="grid gap-4 pb-6 wm-ui-page wingman-page-host wm-product-pitch-page">
      <ProductWorkspaceHeader
        eyebrow="Products / Positioning"
        title="Find the right product workspace"
        description="Search by SKU, product name, family or application, then open its facts and sales guidance."
        actions={<CompareBackToListButton />}
      />
      <ProductWorkspaceNav />

      <ProductFilterPanel>
        <ProductSearchField
          value={searchTerm}
          onChange={updateSearchTerm}
          placeholder="Example: MXV-0404-H2A-KIT, NetworkHD, HDMI extender, USB KVM, video wall"
        />

        <div className="mt-4 flex flex-wrap gap-3" aria-label="Catalogue include controls">
          <label className="wm-product-pitch-toggle">
            <input
              type="checkbox"
              checked={includeAccessories}
              onChange={(event) => setIncludeAccessories(event.target.checked)}
            />
            <span>Include accessories</span>
          </label>
          <label className="wm-product-pitch-toggle">
            <input
              type="checkbox"
              checked={includeCables}
              onChange={(event) => setIncludeCables(event.target.checked)}
            />
            <span>Include cables</span>
          </label>
        </div>

        <details className="mt-4 wm-product-pitch-browse" open>
          <summary className="cursor-pointer text-xs font-extrabold uppercase text-cyan-200">Browse A-Z</summary>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Product quick filter">
          {PRODUCT_PITCH_FILTERS.map((filter) => {
            const count = quickFilterCounts.get(filter) || 0;
            const isActive = activeQuickFilter === filter;
            const isDisabled = filter !== "All" && count === 0;

            return (
              <button className={["wm-ui-button wm-ui-button-secondary", `min-h-8 rounded-xl border px-3 text-xs font-extrabold transition ${
                  isActive
                    ? "border-cyan-200 bg-cyan-300 text-slate-950"
                    : isDisabled
                      ? "cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-600"
                      : "border-[#29465e] bg-[#081724] text-cyan-100 hover:border-cyan-300 hover:bg-cyan-500/10"
                }`].filter(Boolean).join(" ")}
                key={filter}
                type="button"
                disabled={isDisabled}
                onClick={() => chooseQuickFilter(filter)}
                title={isDisabled ? `No SKUs currently start with ${filter}` : `${count} matching SKU${count === 1 ? "" : "s"}`}

              >
                {filter}
              </button>
            );
          })}
          </div>
        </details>

        {!shouldShowResults ? (
          <div className="wm-product-pitch-empty-state">
            <div className="wm-ui-card rounded-3xl border p-4">
            <h2 className="wm-card-title">Suggested from current project</h2>
            <div className="mt-3 grid gap-2">
              {suggestedProducts.length ? suggestedProducts.map((product) => <ResultButton key={product.sku} product={product} />) : (
                <p className="text-sm wm-ui-copy">No saved project product selection yet.</p>
              )}
            </div>
          </div>

            <div className="wm-ui-card rounded-3xl border p-4">
            <h2 className="wm-card-title">Recently viewed</h2>
            <div className="mt-3 grid gap-2">
              {recentProducts.length ? recentProducts.map((product) => <ResultButton key={product.sku} product={product} />) : (
                <p className="text-sm wm-ui-copy">No recent product workspace yet.</p>
              )}
            </div>
          </div>

            <div className="wm-ui-card rounded-3xl border p-4 wm-product-pitch-family-panel">
            <h2 className="wm-card-title">Browse by product family</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {browseFamilies.map(([family, count]) => (
                <button
                  key={family}
                  type="button"
                  className="wm-ui-button wm-ui-button-secondary wm-product-pitch-family-button"
                  onClick={() => openFamily(family)}
                >
                  <span>{family}</span>
                  <strong>{count}</strong>
                </button>
              ))}
            </div>
          </div>

            <div className="wm-ui-card rounded-3xl border p-4">
              <h2 className="wm-card-title">Search guidance</h2>
              <p className="mt-2 text-sm leading-6 wm-ui-copy">
                Type at least two characters from a SKU, product name, family or application to search the current product index.
              </p>
            </div>

            <div className="wm-ui-card rounded-3xl border p-4">
              <h2 className="wm-card-title">Browse all products</h2>
              <p className="mt-2 text-sm leading-6 wm-ui-copy">
                Use this only when you want a wider catalogue browse instead of a focused product lookup.
              </p>
              <button type="button" className="mt-3 wm-ui-button wm-ui-button-secondary wm-product-pitch-browse-all" onClick={showBrowseAll}>
                Browse all
              </button>
            </div>
          </div>
        ) : (
          <>
            {suggestedProducts.length || recentProducts.length ? (
              <div className="wm-product-pitch-result-prelude">
                {suggestedProducts.length ? (
                  <div className="wm-ui-card rounded-3xl border p-4">
                    <h2 className="wm-card-title">Suggested from current project</h2>
                    <div className="mt-3 grid gap-2">
                      {suggestedProducts.map((product) => <ResultButton key={product.sku} product={product} />)}
                    </div>
                  </div>
                ) : null}
                {recentProducts.length ? (
                  <div className="wm-ui-card rounded-3xl border p-4">
                    <h2 className="wm-card-title">Recently viewed</h2>
                    <div className="mt-3 grid gap-2">
                      {recentProducts.map((product) => <ResultButton key={product.sku} product={product} />)}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <p className="mt-3 text-xs font-semibold wm-ui-copy">
              Showing {visibleResults.length} of {matchingProducts.length} matching products
              {activeQuickFilter !== "All" ? ` · Filter: ${activeQuickFilter}` : ""}
              {selectedFamily ? ` · Family: ${selectedFamily}` : ""}
              {browseAll ? " · Browse all" : ""}
              {term ? ` · Search: ${searchTerm.trim()}` : ""}
            </p>

            <div className="mt-4 wm-product-pitch-result-table">
              <div className="wm-product-pitch-result-header" aria-hidden="true">
                <span>SKU</span>
                <span>Product name</span>
                <span>Category</span>
                <span>Status</span>
              </div>
              <div className="wm-product-pitch-result-list" role="list" aria-label="Product results">
                {visibleResults.map((product) => (
                  <ResultButton key={product.sku} product={product} />
                ))}
              </div>
            </div>

            {hiddenCount ? (
              <button
                type="button"
                className="mt-3 wm-ui-button wm-ui-button-secondary wm-product-pitch-show-more"
                onClick={() => setVisibleLimit((value) => value + PRODUCT_PITCH_RESULT_LIMIT)}
              >
                Show more
              </button>
            ) : null}

            {!matchingProducts.length ? (
              <div className="mt-5 rounded-2xl border p-4 text-sm wm-ui-card wm-ui-copy wm-ui-title">
                No matching product found. Try a broader term, or include accessories and cables if you are looking for supporting items.
              </div>
            ) : null}
          </>
        )}
      </ProductFilterPanel>
    </main>
  );
}

function TabButton({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
        active
          ? "bg-cyan-300 text-slate-950"
          : "border border-[#29465e] bg-[#081724] text-cyan-100 hover:border-cyan-300"
      }`}
    >
      {label}
    </button>
  );
}

function OverviewTab({
  product,
  narrative,
  context,
}: {
  product: ProductSpec;
  narrative: ProductNarrative;
  context: ProductSalesContext;
}) {
  const guidance = buildProductPitchSalesGuidance(product, narrative, context);
  const topBenefits = cleanUsefulList(guidance.featureBenefits, 3)
    .map((benefit) => conciseSalesCopy(benefit, 18));

  return (
    <div className="grid gap-3">
      <section className="wm-ui-section rounded-lg border p-5 wm-ui-card">
        <p className={`${PRODUCT_PITCH_KICKER_CLASS} wm-ui-kicker`}>Sales quick view</p>
        <h2 className="mt-1 text-xl font-extrabold wm-ui-title">The customer outcome</h2>
        <p className="mt-2 max-w-4xl text-base font-bold leading-6 wm-ui-copy">
          {conciseSalesCopy(guidance.plainDescription, 32)}
        </p>
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <WorkCard title="Why it matters">
          <p className="wm-ui-copy">{conciseSalesCopy(guidance.customerProblem, 24)}</p>
        </WorkCard>

        <WorkCard title="Best fit">
          <p className="wm-ui-copy">{conciseSalesCopy(guidance.scenarioFit, 24)}</p>
        </WorkCard>

        <WorkCard title="Top benefits">
          <DisplayList items={topBenefits} max={3} />
        </WorkCard>
      </div>

      <section className="wm-ui-section rounded-lg border p-5 wm-ui-card">
        <p className={`${PRODUCT_PITCH_CARD_KICKER_CLASS} text-cyan-300`}>Say it like this</p>
        <p className="mt-2 max-w-5xl text-base leading-6 wm-ui-copy">
          “{conciseSalesCopy(guidance.customerSafeWording, 36)}”
        </p>
      </section>

      <details className="wm-ui-card rounded-lg border p-5">
        <summary className="cursor-pointer font-extrabold">
          Technical and quote detail
        </summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <WorkCard title="Technical description">
            <p className="wm-ui-copy">{guidance.productRole}</p>
          </WorkCard>

          <WorkCard title="Confirm before recommending" tone="caution">
            <p className="wm-ui-copy">{guidance.confirmationQuestion}</p>
          </WorkCard>

          <WorkCard title="Best-fit applications">
            <DisplayList items={guidance.bestFitApplications} max={4} />
          </WorkCard>

          <WorkCard title="Poor fit / avoid leading with this" tone="caution">
            <DisplayList items={guidance.poorFitApplications} max={4} />
          </WorkCard>

          <WorkCard title="Discovery questions">
            <DisplayList items={guidance.discoveryQuestions} max={6} />
          </WorkCard>

          <WorkCard title="Quote checks" tone="caution">
            <DisplayList items={guidance.quoteChecks} max={4} />
          </WorkCard>

          <WorkCard title="What not to promise" tone="caution">
            <DisplayList items={guidance.doNotPromise} max={4} />
          </WorkCard>

          <WorkCard title="Attach / companion products">
            <DisplayList items={guidance.attachProducts} max={4} />
          </WorkCard>

          <WorkCard title="Alternatives inside WyreStorm">
            <DisplayList items={guidance.alternatives} max={3} />
          </WorkCard>

          <WorkCard title="Customer-safe wording">
            <p className="wm-ui-copy">{guidance.customerSafeWording}</p>
          </WorkCard>

          <WorkCard title="Internal sales notes" tone="caution">
            <DisplayList items={guidance.internalSalesNotes} max={4} />
          </WorkCard>

          <div className="lg:col-span-2">
            <ProductMediaPanel sku={product.sku} title={product.name} />
          </div>
        </div>
      </details>
    </div>
  );
}

function FeaturesTab({
  product,
  narrative,
  context,
}: {
  product: ProductSpec;
  narrative: ProductNarrative;
  context: ProductSalesContext;
}) {
  const guidance = buildProductPitchSalesGuidance(product, narrative, context);

  const featureBenefits = cleanUsefulList(guidance.featureBenefits, 6);

  return (
    <div className="grid gap-4">
      <section className={`${PRODUCT_PITCH_PANEL_CLASS} p-5`}>
        <h2 className={PRODUCT_PITCH_SECTION_TITLE_CLASS}>Features that matter</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 wm-ui-copy">
          Use these points in a customer conversation. Open Technical overview only when exact values are needed.
        </p>
      </section>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {featureBenefits.map((feature) => (
          <WorkCard title={conciseSalesCopy(feature, 8)} key={feature}>
            <p className="wm-ui-copy">{conciseSalesCopy(feature, 24)}</p>
          </WorkCard>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <WorkCard title="Use it here"><p className="wm-ui-copy">{guidance.scenarioFit}</p></WorkCard>
        <WorkCard title="Confirm before promising" tone="caution"><p className="wm-ui-copy">{guidance.confirmationQuestion}</p></WorkCard>
      </div>
    </div>
  );
}

function CompetitorsTab({ product }: { product: ProductSpec }) {
  const landscape = useMemo(() => getCompetitorLandscape(product), [product]);

  return (
    <div className="grid gap-4">
      <WorkCard title="Market context">
        <p className="wm-ui-copy">{landscape.note}</p>
      </WorkCard>

      {landscape.entries.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {landscape.entries.map((entry) => (
            <WorkCard title={`${entry.brand} ${entry.sku}`} key={`${entry.brand}-${entry.sku}`}>
              <div className="grid gap-2">
                {entry.category ? <p className="wm-ui-copy"><strong>Category:</strong> {entry.category}</p> : null}
                {entry.summary ? <p className="wm-ui-copy">{entry.summary}</p> : null}
                {entry.knownLimitations ? (
                  <p className="wm-ui-copy"><strong>Known limitation:</strong> {entry.knownLimitations}</p>
                ) : null}
                {entry.wingmanEquivalent ? (
                  <p className="wm-ui-copy"><strong>Logged WyreStorm equivalent:</strong> {entry.wingmanEquivalent}</p>
                ) : null}
                <p className="wm-ui-copy text-xs opacity-80">Evidence confidence: {entry.confidence}</p>
              </div>
            </WorkCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SpecTable({ product }: { product: ProductSpec }) {
  const technical = product.technicalData;
  const rows = [
    [
      "Data status",
      technical
        ? [`${technical.statusLabel} - ${technical.completeness}% complete`]
        : [],
    ],
    ["Product class", technical?.productClass ? [technical.productClass] : []],
    ["Endpoint / system role", technical?.role ? [technical.role] : []],
    ["Transport", technical?.transport ?? []],
    ["Product type", [product.productType]],
    ["I/O summary", product.ioSummary],
    ["Video / signal", product.video],
    ["Audio", product.audio],
    ["USB", product.usb],
    ["Network", product.network],
    ["Control / integration", product.control],
    ["Power", product.power],
    ["Physical / install", product.physical],
    ["Required dependencies", technical?.dependencies ?? []],
    ["Compatible families", technical?.compatibleFamilies ?? []],
    ["Evidence", technical?.evidence ?? []],
    [
      "Missing / needs review",
      [...(technical?.missingFields ?? []), ...(technical?.warnings ?? [])],
    ],
    ["Checks before recommending", product.checks],
  ] as const;

  return (
    <div className="overflow-hidden rounded-3xl border wm-ui-card wm-ui-title">
      {rows.map(([label, rawItems]) => {
        const items = cleanUsefulList([...rawItems], 8);
        const displayItems = items.length ? items : ["Not confirmed"];

        return (
          <div key={label} className="grid gap-3 border-b p-4 last:border-b-0 lg:grid-cols-[220px_minmax(0,1fr)] wm-ui-card wm-ui-title">
            <strong className="text-sm font-extrabold wm-ui-copy">{label}</strong>
            <div className="flex flex-wrap gap-2">
              {displayItems.map((item) => (
                <span key={item} className="rounded-lg border px-3 py-1.5 text-sm wm-ui-card wm-ui-copy">
                  {item}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SpecTab({ product }: { product: ProductSpec }) {
  const usbContextText = [product.category, product.productType, product.name, ...(product.applications ?? [])].join(" ");
  const usbResult = usbValidationIsRequired(usbContextText)
    ? validateUsbPath({ path: [{ sku: product.sku }] })
    : null;

  return (
    <div className="grid gap-4">
      <section className="rounded-3xl border p-5 wm-ui-section wm-ui-card">
        <h2 className={`${PRODUCT_PITCH_SECTION_TITLE_CLASS} text-white`}>Technical specification view</h2>
        <p className="mt-2 text-sm leading-6 wm-ui-copy">
          Use this tab to confirm details. It is separated from the sales view so the salesperson is not forced to interpret technical data during a live conversation.
        </p>
      </section>

      {product.technicalData && !product.technicalData.compareReady ? (
        <section className="rounded-3xl border p-5 wm-ui-section wm-ui-card">
          <h3 className={PRODUCT_PITCH_CARD_TITLE_CLASS}>Technical data review required</h3>
          <p className="mt-2 text-sm leading-6 wm-ui-copy">
            This SKU does not yet have enough verified structured data for automatic
            competitor-equivalence use. Product Pitch may show available official facts,
            but Compare must remain review-only until the missing fields are resolved.
          </p>
        </section>
      ) : null}

      {usbResult ? (
        <section className={`${PRODUCT_PITCH_PANEL_CLASS} p-5`}>
          <h3 className={`${PRODUCT_PITCH_CARD_TITLE_CLASS} text-cyan-300`}>USB path check</h3>
          <p className="mt-1 text-sm leading-6 wm-ui-copy">
            USB standard <strong className="text-white">{usbResult.usbStandardUsed}</strong> · up to{" "}
            {usbResult.maxAllowedTiers} cascaded tier{usbResult.maxAllowedTiers === 1 ? "" : "s"}
            {usbResult.downstreamHubLimit ? ` · hub limit ${usbResult.downstreamHubLimit}` : ""}.
          </p>
          {usbResult.warnings.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm wm-ui-copy">
              {usbResult.warnings.map((warning) => (
                <li key={warning}>Warning: {warning}</li>
              ))}
            </ul>
          ) : null}
          {usbResult.blockers.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm wm-ui-copy">
              {usbResult.blockers.map((blocker) => (
                <li key={blocker}>Blocked: {blocker}</li>
              ))}
            </ul>
          ) : null}
          {usbResult.recommendationImpact ? (
            <p className="mt-2 text-sm leading-6 wm-ui-copy">{usbResult.recommendationImpact}</p>
          ) : null}
        </section>
      ) : null}

      <SpecTable product={product} />
    </div>
  );
}

function likelyLocation(product: ProductSpec) {
  const text = [product.productType, product.category, ...product.physical].join(" ").toLowerCase();
  if (/wall.?plate|in.?wall/.test(text)) return "At the connection point, installed in the wall or furniture.";
  if (/camera|ptz/.test(text)) return "At the display wall or room sightline, positioned for the required field of view.";
  if (/speaker|amplifier/.test(text)) return "Amplifier in the rack or local equipment position; loudspeakers in the room.";
  if (/receiver|decoder/.test(text)) return "At the destination display, projector or local equipment position.";
  if (/transmitter|encoder/.test(text)) return "At the source, lectern, table box or central equipment position.";
  if (/matrix|switcher|controller|processor/.test(text)) return "In the room rack or central equipment position, accessible for service and control.";
  return "Confirm the room, rack or endpoint location during Discovery before allowing for cables.";
}

function DesignTab({ product, narrative }: { product: ProductSpec; narrative: ProductNarrative }) {
  const groups = [
    ["Source-side connections", product.ioSummary],
    ["Video and display path", product.video],
    ["USB / conferencing path", product.usb],
    ["Audio path", product.audio],
    ["Network and control", [...product.network, ...product.control]],
    ["Power and installation", [...product.power, ...product.physical]],
  ] as const;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <WorkCard title="Role in the design"><p className="wm-ui-copy">{narrative.whereItSits}</p></WorkCard>
        <WorkCard title="Likely location"><p className="wm-ui-copy">{likelyLocation(product)}</p></WorkCard>
        <WorkCard title="Application position"><p className="wm-ui-copy">{narrative.familyFit}</p></WorkCard>
      </div>
      <section className={`${PRODUCT_PITCH_PANEL_CLASS} p-5`}>
        <h2 className={PRODUCT_PITCH_SECTION_TITLE_CLASS}>Connectivity and cable planning</h2>
        <p className="mt-2 text-sm wm-ui-copy">Confirmed product-record information only. Cable lengths, connector gender and endpoint quantities still need room discovery.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map(([title, values]) => (
            <WorkCard title={title} key={title}><DisplayList items={cleanUsefulList([...values], 6)} max={6} /></WorkCard>
          ))}
        </div>
      </section>
      <WorkCard title="Checks before it is put on a quote" tone="caution">
        <DisplayList items={product.checks} max={8} />
      </WorkCard>
    </div>
  );
}

function WorkflowTab({ product, narrative }: { product: ProductSpec; narrative: ProductNarrative }) {
  const saveHandoff = () => writeProductWorkspaceHandoff(product, narrative);
  const steps = [
    { number: "1", title: "Complete room discovery", copy: "Capture the application, room size, sources, displays, USB, audio, control and cable distances.", to: routeCatalogByKey.discovery.path, action: "Open Discovery" },
    { number: "2", title: "Select the product and schematic", copy: `${product.sku} is already loaded as the product context. Build the real signal path around it.`, to: routeCatalogByKey.visualDesign.path, action: "Build schematic" },
    { number: "3", title: "Create the representative visual", copy: "In Visual Design Studio, use the discovered room context and export the completed visual as PNG or SVG.", to: routeCatalogByKey.visualDesign.path, action: "Open visual studio" },
    { number: "4", title: "Add it to the customer response", copy: "Open the active response pack or proposal with the product and visual context retained.", to: routeCatalogByKey.responsePack.path, action: "Open Response Pack" },
  ];

  return (
    <div className="grid gap-4">
      <section className={`${PRODUCT_PITCH_PANEL_CLASS} p-5`}>
        <h2 className={PRODUCT_PITCH_SECTION_TITLE_CLASS}>Move from product discussion to a customer response</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 wm-ui-copy">These are live workflow actions. The selected SKU, sales context and visual brief are passed into the next stage.</p>
      </section>
      <div className="grid gap-3 md:grid-cols-2">
        {steps.map((step) => (
          <section className={`${PRODUCT_PITCH_PANEL_CLASS} flex flex-col p-5`} key={step.number}>
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-300 font-extrabold text-slate-950">{step.number}</span>
              <div><h3 className={PRODUCT_PITCH_CARD_TITLE_CLASS}>{step.title}</h3><p className="mt-2 text-sm leading-6 wm-ui-copy">{step.copy}</p></div>
            </div>
            <Link to={step.to} onClick={saveHandoff} className={`mt-5 self-start ${PRODUCT_PITCH_FORWARD_BUTTON_CLASS}`}>{step.action}</Link>
          </section>
        ))}
      </div>
    </div>
  );
}

function ProductWorkspace({
  product,
  backToSelection
}: {
  product: ProductSpec;
  backToSelection: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ProductTab>("overview");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const narrative = useMemo(() => buildProductNarrative(product), [product]);
  const salesContext = useMemo(() => currentProductSalesContext(), []);
  const lifecycle = useMemo(() => resolveProductLifecycle(product.sku), [product.sku]);

  useEffect(() => {
    writeProductWorkspaceHandoff(product, narrative);
  }, [product, narrative]);

  useEffect(() => {
    let cancelled = false;

    loadProductMediaIndex()
      .then((index) => {
        if (cancelled || !index) return;
        const media = getProductMediaBySku(index, product.sku);
        setImageUrl(media?.front?.url ?? media?.gallery?.[0]?.url);
      })
      .catch(() => {
        if (!cancelled) setImageUrl(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [product.sku]);

  return (
    <main data-product-pitch-view="workspace" className="grid gap-4 pb-6 wm-ui-page wingman-page-host wm-product-pitch-page">
      <section className={`${PRODUCT_PITCH_PANEL_CLASS} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={`${PRODUCT_PITCH_KICKER_CLASS} text-cyan-300`}>Product positioning</p>
            <h1 className={`${PRODUCT_PITCH_HERO_TITLE_CLASS} text-cyan-200`}>{product.sku}</h1>
            <h2 className={`mt-1 ${PRODUCT_PITCH_SECTION_TITLE_CLASS} text-white`}>{product.name}</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 wm-ui-copy">{narrative.headline}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className={["wm-ui-button wm-ui-button-secondary", `${PRODUCT_PITCH_SMALL_PRIMARY_BUTTON_CLASS} transition hover:bg-cyan-200`].filter(Boolean).join(" ")}
              type="button"
              onClick={() => openProductCheatSheet(product, narrative, imageUrl)}

            >
              Print cheat-sheet
            </button>
            <ReportProblemButton sku={product.sku} productName={product.name} />
            <AdminProductRecordEditor
              product={{
                sku: product.sku,
                name: product.name,
                family: product.family,
                category: product.category,
                summary: product.summary,
              }}
              onSaved={() => window.location.reload()}
              onRemoved={backToSelection}
            />
            <button
              type="button"
              onClick={backToSelection}
              className={PRODUCT_PITCH_SMALL_SECONDARY_BUTTON_CLASS}
            >
              Change product
            </button>
          </div>
        </div>
      </section>

      {!lifecycle.recommendable ? (
        <section
          className={`rounded-3xl border p-4 ${
            lifecycle.adminBlocked ||
            lifecycle.status === "discontinued" ||
            lifecycle.status === "do-not-spec" ||
            lifecycle.status === "cable"
              ? "border-rose-400/50 bg-rose-500/10"
              : lifecycle.supersededBy
                ? "border-amber-400/50 bg-amber-400/10"
                : "border-cyan-400/40 bg-cyan-500/5"
          }`}
        >
          <p
            className={`${PRODUCT_PITCH_CARD_KICKER_CLASS} ${
              lifecycle.adminBlocked ||
              lifecycle.status === "discontinued" ||
              lifecycle.status === "do-not-spec" ||
              lifecycle.status === "cable"
                ? "text-rose-200"
                : lifecycle.supersededBy
                  ? "text-amber-200"
                  : "text-cyan-200"
            }`}
          >
            {lifecycle.adminBlocked
              ? "Admin blocked"
              : lifecycle.supersededBy
                ? "Superseded product"
                : lifecycle.status === "discontinued"
                  ? "Discontinued product"
                  : lifecycle.status === "do-not-spec"
                    ? "Do not specify"
                    : lifecycle.status === "cable"
                      ? "Cable / accessory"
                      : "Not on the current business list"}
          </p>
          <p className="mt-1 max-w-4xl text-sm leading-6 wm-ui-copy">{lifecycle.note}</p>
        </section>
      ) : null}

      {narrative.confidence && narrative.confidence !== "high" && narrative.reviewNote ? (
        <section
          className={`rounded-3xl border p-4 ${
            narrative.confidence === "low"
              ? "border-amber-400/50 bg-amber-400/10"
              : "border-cyan-400/40 bg-cyan-500/5"
          }`}
        >
          <p
            className={`${PRODUCT_PITCH_CARD_KICKER_CLASS} ${
              narrative.confidence === "low" ? "text-amber-200" : "text-cyan-200"
            }`}
          >
            {narrative.confidence === "low" ? "Check before quoting" : "Auto-generated positioning"}
          </p>
          <p className="mt-1 max-w-4xl text-sm leading-6 wm-ui-copy">{narrative.reviewNote}</p>
        </section>
      ) : null}

      <ProductPitchSafetyPanel />

      <section data-product-pitch-tabs className={`${PRODUCT_PITCH_PANEL_CLASS} p-4`}>
        <div className="flex flex-wrap gap-2">
          <TabButton label="Purpose & Position" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
          <TabButton label="Features" active={activeTab === "features"} onClick={() => setActiveTab("features")} />
          <TabButton label="Design & Connectivity" active={activeTab === "design"} onClick={() => setActiveTab("design")} />
          <TabButton label="Technical Overview" active={activeTab === "spec"} onClick={() => setActiveTab("spec")} />
          <TabButton label="Competitors" active={activeTab === "competitors"} onClick={() => setActiveTab("competitors")} />
          <TabButton label="Next Steps" active={activeTab === "workflow"} onClick={() => setActiveTab("workflow")} />
        </div>
      </section>

      {activeTab === "overview" ? <OverviewTab product={product} narrative={narrative} context={salesContext} /> : null}
      {activeTab === "features" ? <FeaturesTab product={product} narrative={narrative} context={salesContext} /> : null}
      {activeTab === "design" ? <DesignTab product={product} narrative={narrative} /> : null}
      {activeTab === "competitors" ? <CompetitorsTab product={product} /> : null}
      {activeTab === "spec" ? <SpecTab product={product} /> : null}
      {activeTab === "workflow" ? <WorkflowTab product={product} narrative={narrative} /> : null}
    </main>
  );
}


function ProductPitchSafetyPanel() {
  return (
    <details className="wm-section-card wm-product-pitch-safety-panel" aria-labelledby="product-pitch-safety-title">
      <summary className="cursor-pointer list-none">
        <span className="wm-ui-kicker">Design status</span>
        <strong id="product-pitch-safety-title" className="ml-3 wm-card-title">Sales guidance — confirm before quote</strong>
        <span className="ml-3 text-sm wm-copy">Open the review rules</span>
      </summary>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <p className="wm-copy"><strong>Qualify:</strong> Confirm application, signal path, endpoint count, USB, audio, control and distance.</p>
        <p className="wm-copy"><strong>Evidence:</strong> Match the product class, role, dependencies and known gaps to the brief.</p>
        <p className="wm-copy"><strong>Escalate:</strong> Review AVoIP, USB transport, video walls, substitutions and non-standard designs before quotation.</p>
      </div>
    </details>
  );
}

export function ProductPitchPage() {
  useProductPitchDensityClass();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedSku = searchParams.get("sku") || "";
  // A family / "range" entry point (e.g. from Product Families) arrives with
  // ?q=<family> rather than a specific ?sku=. Carry it into the picker so the
  // page opens pre-filtered to that range instead of a blank search, and so a
  // sku that isn't in the current catalogue can recover to the range picker
  // instead of dead-ending.
  const rangeQuery = searchParams.get("q") || "";

  const [products, setProducts] = useState<ProductSpec[]>(fallbackProducts);
  const [searchTerm, setSearchTerm] = useState(rangeQuery);
  const [activeQuickFilter, setActiveQuickFilter] = useState<ProductPitchQuickFilter>("All");
  const [includeAccessories, setIncludeAccessories] = useState(false);
  const [includeCables, setIncludeCables] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadProductIntelligenceIndex()
      .then((data) => {
        if (cancelled) return;

        const indexed = extractRawProducts(data)
          .map((entry, index) => {
            const normalised = normaliseProductRecord(entry, index);
            return normalised
              ? hydrateProductSpecWithTechnicalData(normalised, entry)
              : null;
          })
          .filter((product): product is ProductSpec => Boolean(product));

        if (indexed.length) {
          setProducts(indexed);
        }

        setLoaded(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[wingman] ProductPitch: product intelligence index load failed, using fallback catalogue", error);
        setProducts(fallbackProducts.map(applyProductStoryToSpec));
        setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProduct = useMemo(() => {
    if (!selectedSku) return null;

    return products.find((product) => product.sku.toLowerCase() === selectedSku.toLowerCase()) || null;
  }, [products, selectedSku]);

  // Arriving with a fresh ?q=<range> (no specific sku) should pre-fill the
  // picker search. Kept in an effect so navigating between range links while
  // the page stays mounted updates the filter, without clobbering a rep who
  // is typing their own search on the selection screen.
  useEffect(() => {
    if (rangeQuery) setSearchTerm(rangeQuery);
  }, [rangeQuery]);

  const openProduct = (sku: string) => {
    navigate(`/wingman/product-pitch?sku=${encodeURIComponent(sku)}`);
  };

  const backToSelection = () => {
    navigate("/wingman/product-pitch");
  };

  if (!loaded && !products.length) {
    return (
      <main className="rounded-3xl border p-6 wm-ui-page wingman-page-host wm-ui-card">
        Loading product workspace...
      </main>
    );
  }

  const selectionPage = (
    <SelectionPage
      products={products}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      activeQuickFilter={activeQuickFilter}
      setActiveQuickFilter={setActiveQuickFilter}
      includeAccessories={includeAccessories}
      setIncludeAccessories={setIncludeAccessories}
      includeCables={includeCables}
      setIncludeCables={setIncludeCables}
      openProduct={openProduct}
    />
  );

  if (!selectedSku) {
    return selectionPage;
  }

  if (!selectedProduct) {
    // A range/family entry point that pointed at a sku not in the current
    // catalogue must not dead-end: fall back to the range-filtered picker so
    // the rep still lands on that family's real products.
    if (rangeQuery) {
      return selectionPage;
    }

    return (
      <main className="grid gap-4 pb-6 wm-ui-page wingman-page-host wm-product-pitch-page">
        <section className="rounded-3xl border p-5 wm-ui-section wm-ui-card">
          <p className={`${PRODUCT_PITCH_KICKER_CLASS} text-amber-200`}>Product not found</p>
          <h1 className={PRODUCT_PITCH_HERO_TITLE_CLASS}>No product workspace found for {selectedSku}</h1>
          <p className="mt-2 text-sm leading-6 wm-ui-copy">
            Return to product selection and choose a current selectable WyreStorm product SKU. Family, regional, legacy, accessory and internal-control references are not selectable Product Pitch SKUs.
          </p>
          <button
            type="button"
            onClick={backToSelection}
            className={`mt-4 ${PRODUCT_PITCH_SMALL_SECONDARY_BUTTON_CLASS}`}
          >
            Change product
          </button>
        </section>
      </main>
    );
  }

  return <ProductWorkspace product={selectedProduct} backToSelection={backToSelection} />;
}

export default ProductPitchPage;
