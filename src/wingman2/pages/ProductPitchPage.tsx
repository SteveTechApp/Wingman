import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { getCurrentWorkflowProject, readProjectStore } from "../data/projectStore";
import { writeProductWorkspaceHandoff } from "../data/productWorkspaceHandoff";
import {
  buildProductNarrative,
  applyProductStoryToSpec,
  cleanUsefulList,
  extractRawProducts,
  normaliseProductRecord,
  productText,
  type ProductNarrative,
  type ProductSpec
} from "../lib/productStoryEngine";
import {
  buildProductPitchSalesGuidance,
  type ProductSalesContext,
} from "../lib/productPitchGuidance";
import { CompareBackToListButton } from "../components/compare/CompareBackToListButton";
import { ReportProblemButton } from "../components/ReportProblemButton";
import { ProductMediaPanel } from "../components/ProductMediaPanel";
import { AVSignalFlowDiagram } from "../components/AVSignalFlowDiagram";
import { RoomSchematicDiagram } from "../components/RoomSchematicDiagram";
import { validateUsbPath, usbValidationIsRequired } from "../logic/usbPathValidator";
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";
import { buildProductCheatSheetHtml } from "../lib/productCheatSheet";
import { resolveProductLifecycle } from "../lib/wyrestormProductLifecycle";
import { getProductMediaBySku, loadProductMediaIndex } from "../data/productMedia";


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

type ProductTab = "overview" | "sales" | "spec" | "diagram" | "visual";

const PRODUCT_PITCH_PANEL_CLASS = "rounded-3xl border border-[#29465e] bg-[#071522]";
const PRODUCT_PITCH_KICKER_CLASS = "text-xs font-bold uppercase tracking-[0.12em]";
const PRODUCT_PITCH_CARD_KICKER_CLASS = "text-xs font-bold uppercase tracking-[0.11em]";
const PRODUCT_PITCH_HERO_TITLE_CLASS = "mt-2 text-3xl font-extrabold tracking-tight";
const PRODUCT_PITCH_SECTION_TITLE_CLASS = "text-xl font-extrabold";
const PRODUCT_PITCH_CARD_TITLE_CLASS = "text-lg font-extrabold";
const PRODUCT_PITCH_PRIMARY_BUTTON_CLASS = "rounded-full bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950";
const PRODUCT_PITCH_SECONDARY_BUTTON_CLASS = "rounded-full border border-cyan-300 px-5 py-2 text-sm font-bold text-cyan-100";
const PRODUCT_PITCH_SMALL_PRIMARY_BUTTON_CLASS = "rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950";
const PRODUCT_PITCH_SMALL_SECONDARY_BUTTON_CLASS = "rounded-full border border-cyan-300 px-4 py-2 text-sm font-bold text-cyan-100";
const PRODUCT_PITCH_FORWARD_BUTTON_CLASS = "wm-ui-button wm-ui-button-forward px-4 py-2 text-sm font-bold";

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

function includesProduct(product: ProductSpec, term: string) {
  return productText(product).includes(term);
}

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

const PRODUCT_PITCH_BLOCKED_SKUS = new Set([
  "NHD-100",
  "NHD-250-RX",
  "NHD-300-TX",
  "APO-100-UC",
  "APO-200-UC",
  "APO-DG2-PRO",
  "APO-VX20-UC",
  "HALO-VX10-V1",
  "MX-1010-H2XC",
  "MX-1616-H2XC",
  "NHD-000-RACK3",
  "NHD-000-CTL",
  "NHD-110-RX",
  "NHD-110-TX",
  "NHD-110-RX-S",
  "NHD-500-E",
  "NHD-500-T",
  "NHD-610",
  "NHD-600-TXRX",
  "NHD-CTL-PRO",
  "NHD-CTL-PRO-T",
  "NHD-TOUCH",
  "NHD-TOUCHPLUS",
  "OFFICE-KIT",
  "SYN-TOUCH10"
]);

function isH2hcTxCardSku(sku: string) {
  const value = String(sku || "").trim().toUpperCase();
  return value.includes("H2HC") && /(^|-)TX($|-)/.test(value);
}

function isBlockedProductPitchSku(sku: string) {
  const value = String(sku || "").trim().toUpperCase();

  if (!value) return true;
  if (PRODUCT_PITCH_BLOCKED_SKUS.has(value)) return true;
  if (value.endsWith("-US")) return true;
  if (value === "NHD-400" || value.startsWith("NHD-400-")) return true;
  if (isH2hcTxCardSku(value)) return true;

  return false;
}

function isVisibleProductPitchProduct(product: ProductSpec) {
  return !isBlockedProductPitchSku(product.sku);
}

function getProductPitchFilterLead(product: ProductSpec) {
  const sku = product.sku?.trim().toUpperCase() || "";
  const name = product.name?.trim().toUpperCase() || "";
  const value = sku || name;

  return value.charAt(0);
}

function productMatchesProductPitchFilter(product: ProductSpec, filter: ProductPitchQuickFilter) {
  if (filter === "All") return true;

  const lead = getProductPitchFilterLead(product);

  if (filter === "1-9") {
    return /^[1-9]$/.test(lead);
  }

  return lead === filter;
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

  const quickFilterCounts = useMemo(() => {
    const counts = new Map<ProductPitchQuickFilter, number>();

    PRODUCT_PITCH_FILTERS.forEach((filter) => {
      counts.set(filter, 0);
    });

    products.forEach((product) => {
      PRODUCT_PITCH_FILTERS.forEach((filter) => {
        if (productMatchesProductPitchFilter(product, filter)) {
          counts.set(filter, (counts.get(filter) || 0) + 1);
        }
      });
    });

    return counts;
  }, [products]);

  const filtered = useMemo(() => {
    const quickFiltered = products.filter((product) => productMatchesProductPitchFilter(product, activeQuickFilter));

    if (!term) return quickFiltered;

    return quickFiltered.filter((product) => includesProduct(product, term));
  }, [products, term, activeQuickFilter]);

  return (
    <main className="grid gap-4 pb-6 wm-ui-page wingman-page-host">
      <CompareBackToListButton />
      <section className={`${PRODUCT_PITCH_PANEL_CLASS} p-5`}>
        <p className={`${PRODUCT_PITCH_KICKER_CLASS} text-cyan-300`}>Product workspace</p>
        <h1 className={`${PRODUCT_PITCH_HERO_TITLE_CLASS} text-white`}>Select one product</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 wm-ui-copy">
          Select a product first. The next page opens a single product workspace with Overview, Sales Cards, Technical Spec, Diagram and Room Visual tabs.
        </p>
      </section>

      <section className={`${PRODUCT_PITCH_PANEL_CLASS} p-5`}>
        <label className="grid gap-2">
          <span className={`${PRODUCT_PITCH_KICKER_CLASS} text-cyan-300`}>Search by SKU, product name or application</span>
          <input className={["wm-ui-input", "min-h-12 rounded-2xl border border-[#29465e] bg-[#0d2133] px-4 text-sm font-bold text-white outline-none focus:border-cyan-300"].filter(Boolean).join(" ")}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Example: CAM-210-NDI-PTZ, amplifier, HDMI extender, NetworkHD"
            type="search"

            autoFocus
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Product quick filter">
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
                onClick={() => setActiveQuickFilter(filter)}
                title={isDisabled ? `No SKUs currently start with ${filter}` : `${count} matching SKU${count === 1 ? "" : "s"}`}

              >
                {filter}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs font-semibold wm-ui-copy">
          Showing {filtered.length} of {products.length} products
          {activeQuickFilter !== "All" ? ` · Filter: ${activeQuickFilter}` : ""}
          {term ? ` · Search: ${searchTerm.trim()}` : ""}
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filtered.map((product) => (
            <button className={["wm-ui-button wm-ui-button-secondary", "min-h-[92px] rounded-2xl border border-[#29465e] bg-[#081724] p-3 text-left transition hover:border-cyan-300 hover:bg-cyan-500/10"].filter(Boolean).join(" ")}
              key={product.sku}
              type="button"
              onClick={() => openProduct(product.sku)}

            >
              <span className={`block ${PRODUCT_PITCH_CARD_KICKER_CLASS} text-cyan-300`}>{product.family}</span>
              <strong className="mt-1 block truncate text-lg font-extrabold text-white">{product.sku}</strong>
              <span className="mt-1 block line-clamp-2 text-xs font-bold text-white/80">{product.name}</span>
              <span className="mt-2 block truncate text-[0.68rem] text-white/50">{product.productType}</span>
            </button>
          ))}
        </div>

        {!filtered.length ? (
          <div className="mt-5 rounded-2xl border p-4 text-sm wm-ui-card wm-ui-copy wm-ui-title">
            No matching product found. Clear the search or use a broader term.
          </div>
        ) : null}
      </section>
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

  return (
    <div className="grid gap-4">
      <section className="wm-ui-section rounded-lg border p-6 wm-ui-card">
        <p className={`${PRODUCT_PITCH_KICKER_CLASS} text-cyan-200`}>Simple product answer</p>
        <h2 className="mt-2 text-2xl font-extrabold wm-ui-title">What it does</h2>
        <p className="mt-2 max-w-5xl text-base font-bold leading-6 wm-ui-copy">{guidance.plainDescription}</p>
        <p className="mt-2 max-w-5xl text-sm leading-6 wm-ui-copy">
          <strong>Technical description:</strong> {guidance.productRole}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkCard title="How it fits this application">
          <p className="wm-ui-copy">{guidance.scenarioFit}</p>
        </WorkCard>

        <WorkCard title="Say it like this">
          <p className="wm-ui-copy">{guidance.customerSafeWording}</p>
        </WorkCard>

        <WorkCard title="Confirm this" tone="caution">
          <p className="wm-ui-copy">{guidance.confirmationQuestion}</p>
        </WorkCard>

        <WorkCard title="Customer problem it solves">
          <p className="wm-ui-copy">{guidance.customerProblem}</p>
        </WorkCard>
      </div>

      <details className="wm-ui-card rounded-lg border p-5">
        <summary className="cursor-pointer font-extrabold">
          More product and quote detail
        </summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
        </div>
      </details>

      <ProductMediaPanel sku={product.sku} title={product.name} />
    </div>
  );
}

function SalesTab({
  product,
  narrative,
  context,
}: {
  product: ProductSpec;
  narrative: ProductNarrative;
  context: ProductSalesContext;
}) {
  const guidance = buildProductPitchSalesGuidance(product, narrative, context);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <WorkCard title="What it does">
        <p className="wm-ui-copy">{guidance.plainDescription}</p>
      </WorkCard>

      <WorkCard title="How it is used here">
        <p className="wm-ui-copy">{guidance.scenarioFit}</p>
      </WorkCard>

      <WorkCard title="Say it like this">
        <p className="wm-ui-copy">{guidance.customerSafeWording}</p>
      </WorkCard>

      <WorkCard title="Confirm this" tone="caution">
        <p className="wm-ui-copy">{guidance.confirmationQuestion}</p>
      </WorkCard>

      <WorkCard title="Do not oversell">
        <p className="wm-ui-copy">Keep the conversation tied to the room, workflow and confirmed requirement. Do not promise unverified I/O, distance, USB, network, audio or control behaviour until checked.</p>
      </WorkCard>

      <WorkCard title="Technical points if asked">
        <DisplayList items={product.keyFeatures} max={4} />
      </WorkCard>
    </div>
  );
}

function SpecTable({ product }: { product: ProductSpec }) {
  const rows = [
    ["Product type", [product.productType]],
    ["I/O summary", product.ioSummary],
    ["Video / signal", product.video],
    ["Audio", product.audio],
    ["USB", product.usb],
    ["Network", product.network],
    ["Control / integration", product.control],
    ["Power", product.power],
    ["Physical / install", product.physical],
    ["Checks before recommending", product.checks]
  ] as const;

  return (
    <div className="overflow-hidden rounded-3xl border wm-ui-card wm-ui-title">
      {rows.map(([label, rawItems]) => {
        const items = cleanUsefulList([...rawItems], 4);

        return (
          <div key={label} className="grid gap-3 border-b p-4 last:border-b-0 lg:grid-cols-[220px_minmax(0,1fr)] wm-ui-card wm-ui-title">
            <strong className="text-sm font-extrabold wm-ui-copy">{label}</strong>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <span key={item} className="rounded-full border px-3 py-1.5 text-sm wm-ui-card wm-ui-copy">
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
                <li key={warning}>âš  {warning}</li>
              ))}
            </ul>
          ) : null}
          {usbResult.blockers.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm wm-ui-copy">
              {usbResult.blockers.map((blocker) => (
                <li key={blocker}>âœ• {blocker}</li>
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

function DiagramTab({ product, narrative }: { product: ProductSpec; narrative: ProductNarrative }) {
  const saveHandoff = () => {
    writeProductWorkspaceHandoff(product, narrative);
  };

  return (
    <div className="grid gap-4">
      <RoomSchematicDiagram product={product} narrative={narrative} />

      <section className={`${PRODUCT_PITCH_PANEL_CLASS} p-5`}>
        <h2 className={`${PRODUCT_PITCH_SECTION_TITLE_CLASS} text-cyan-300`}>Simple product connection view</h2>
        <div className="mt-5 grid items-stretch gap-3 lg:grid-cols-[1fr_80px_1fr_80px_1fr]">
          <div className="rounded-3xl border p-5 wm-ui-card">
            <p className={`${PRODUCT_PITCH_CARD_KICKER_CLASS} text-white/45`}>Source / input side</p>
            <strong className="mt-2 block text-lg text-white">{narrative.diagramSource}</strong>
          </div>

          <div className="hidden items-center justify-center text-3xl font-extrabold text-cyan-300 lg:flex">â†’</div>

          <div className="rounded-3xl border p-5 wm-ui-card">
            <p className={`${PRODUCT_PITCH_CARD_KICKER_CLASS} text-cyan-200`}>WyreStorm product</p>
            <strong className="mt-2 block text-lg text-white">{product.sku}</strong>
            <span className="mt-1 block text-sm wm-ui-copy">{product.productType}</span>
          </div>

          <div className="hidden items-center justify-center text-3xl font-extrabold text-cyan-300 lg:flex">â†’</div>

          <div className="rounded-3xl border p-5 wm-ui-card">
            <p className={`${PRODUCT_PITCH_CARD_KICKER_CLASS} text-white/45`}>Output / destination side</p>
            <strong className="mt-2 block text-lg text-white">{narrative.diagramOutput}</strong>
          </div>
        </div>
      </section>

      <AVSignalFlowDiagram
        mode={product.category || product.productType}
        title="Typical signal flow"
        subtitle={`Where ${product.sku} sits in the chain`}
      />

      <section className={`${PRODUCT_PITCH_PANEL_CLASS} p-5`}>
        <h3 className={`${PRODUCT_PITCH_CARD_TITLE_CLASS} text-cyan-300`}>Open full schematic</h3>
        <p className="mt-2 text-sm leading-6 wm-ui-copy">
          Use Schematic Builder for the full end-to-end system diagram with known WyreStorm devices, third-party devices and TBC blocks.
        </p>
        <Link
          to={routeCatalogByKey.visualDesign.path}
          onClick={saveHandoff}
          className={`mt-4 inline-flex ${PRODUCT_PITCH_FORWARD_BUTTON_CLASS}`}
        >
          Send product to Schematic Builder
        </Link>
      </section>
    </div>
  );
}

function VisualTab({ product, narrative }: { product: ProductSpec; narrative: ProductNarrative }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const copyPrompt = () => {
    if (!navigator.clipboard) return;

    void navigator.clipboard.writeText(narrative.visualPrompt).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  const saveHandoff = () => {
    writeProductWorkspaceHandoff(product, narrative);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className={`${PRODUCT_PITCH_PANEL_CLASS} p-5`}>
        <h2 className={`${PRODUCT_PITCH_SECTION_TITLE_CLASS} text-cyan-300`}>Room visual prompt</h2>
        <p className="mt-2 text-sm leading-6 wm-ui-copy">
          Once discovery is complete, this can become a Generate room image action for proposal support. For now, this prompt can be copied or stored as product context.
        </p>

        <textarea
          readOnly
          value={narrative.visualPrompt}
          className="mt-4 min-h-[220px] w-full rounded-3xl border p-4 text-sm leading-6 wm-ui-input wm-ui-card wm-ui-copy"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copyPrompt}
            className={PRODUCT_PITCH_PRIMARY_BUTTON_CLASS}
          >
            {copied ? "Copied" : "Copy room image prompt"}
          </button>

          <button
            type="button"
            onClick={saveHandoff}
            className={PRODUCT_PITCH_SECONDARY_BUTTON_CLASS}
          >
            {saved ? "Saved" : "Save visual context"}
          </button>
        </div>
      </section>

      <aside className="rounded-3xl border p-5 wm-ui-card">
        <h3 className={`${PRODUCT_PITCH_CARD_TITLE_CLASS} text-white`}>Future workflow</h3>
        <ol className="mt-4 grid gap-3 text-sm leading-6 wm-ui-copy">
          <li>1. Complete room discovery.</li>
          <li>2. Select the product and schematic.</li>
          <li>3. Generate a representative room image.</li>
          <li>4. Add the image to the response pack or proposal.</li>
        </ol>
      </aside>
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
    <main className="grid gap-4 pb-6 wm-ui-page wingman-page-host">
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
            <button
              type="button"
              onClick={backToSelection}
              className={PRODUCT_PITCH_SMALL_SECONDARY_BUTTON_CLASS}
            >
              Back to product selection
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
              ? "âš  Admin blocked"
              : lifecycle.supersededBy
                ? "âš  Superseded product"
                : lifecycle.status === "discontinued"
                  ? "âš  Discontinued product"
                  : lifecycle.status === "do-not-spec"
                    ? "âš  Do not specify"
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
            {narrative.confidence === "low" ? "âš  Check before quoting" : "Auto-generated positioning"}
          </p>
          <p className="mt-1 max-w-4xl text-sm leading-6 wm-ui-copy">{narrative.reviewNote}</p>
        </section>
      ) : null}

      <section className={`${PRODUCT_PITCH_PANEL_CLASS} p-4`}>
        <div className="flex flex-wrap gap-2">
          <TabButton label="Overview" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
          <TabButton label="Sales Cards" active={activeTab === "sales"} onClick={() => setActiveTab("sales")} />
          <TabButton label="Technical Spec" active={activeTab === "spec"} onClick={() => setActiveTab("spec")} />
          <TabButton label="Diagram" active={activeTab === "diagram"} onClick={() => setActiveTab("diagram")} />
          <TabButton label="Room Visual" active={activeTab === "visual"} onClick={() => setActiveTab("visual")} />
        </div>
      </section>

      {activeTab === "overview" ? <OverviewTab product={product} narrative={narrative} context={salesContext} /> : null}
      {activeTab === "sales" ? <SalesTab product={product} narrative={narrative} context={salesContext} /> : null}
      {activeTab === "spec" ? <SpecTab product={product} /> : null}
      {activeTab === "diagram" ? <DiagramTab product={product} narrative={narrative} /> : null}
      {activeTab === "visual" ? <VisualTab product={product} narrative={narrative} /> : null}
    </main>
  );
}

export function ProductPitchPage() {
  useProductPitchDensityClass();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedSku = searchParams.get("sku") || "";

  const [products, setProducts] = useState<ProductSpec[]>(fallbackProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState<ProductPitchQuickFilter>("All");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadProductIntelligenceIndex()
      .then((data) => {
        if (cancelled) return;

        const indexed = extractRawProducts(data)
          .map((entry, index) => normaliseProductRecord(entry, index))
          .filter((product): product is ProductSpec => Boolean(product));

        if (indexed.length) {
          setProducts(indexed);
        }

        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setProducts(fallbackProducts.map(applyProductStoryToSpec));
        setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const availableProducts = useMemo(() => products.filter(isVisibleProductPitchProduct), [products]);

  const selectedProduct = useMemo(() => {
    if (!selectedSku) return null;

    return availableProducts.find((product) => product.sku.toLowerCase() === selectedSku.toLowerCase()) || null;
  }, [availableProducts, selectedSku]);

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

  if (!selectedSku) {
    return (
      <SelectionPage
        products={availableProducts}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeQuickFilter={activeQuickFilter}
        setActiveQuickFilter={setActiveQuickFilter}
        openProduct={openProduct}
      />
    );
  }

  if (!selectedProduct) {
    return (
      <main className="grid gap-4 pb-6 wm-ui-page wingman-page-host">
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
            Back to product selection
          </button>
        </section>

        {/* Product Pitch tester-readiness safety panel - START */}
        <section className="wm-section-card wm-product-pitch-safety-panel" aria-labelledby="product-pitch-safety-title">
          <div className="wm-product-pitch-safety-header">
            <div>
              <p className="wm-ui-kicker">Tester safety</p>
              <h2 id="product-pitch-safety-title" className="wm-card-title">
                Product Pitch safety review
              </h2>
              <p className="wm-copy">
                Use this page as product-direction guidance for a sales conversation. It is not a final engineered design or quote.
              </p>
            </div>
          </div>

          <div className="wm-product-pitch-safety-grid">
            <article className="wm-product-pitch-safety-item">
              <h3 className="wm-card-title">Product direction</h3>
              <p className="wm-copy">
                Treat the selected product as the likely WyreStorm direction only after the customer requirement, application,
                signal path, source/display count, USB, audio, control, distance and infrastructure needs have been checked.
              </p>
            </article>

            <article className="wm-product-pitch-safety-item">
              <h3 className="wm-card-title">Why this fits</h3>
              <p className="wm-copy">
                A product fit should be supported by clear evidence: product class, core signal format, routing or extension
                requirement, endpoint role, required dependencies and any known gaps against the customer brief.
              </p>
            </article>

            <article className="wm-product-pitch-safety-item">
              <h3 className="wm-card-title">Pre-sales review warning</h3>
              <p className="wm-copy">
                Escalate for pre-sales review before quotation where the requirement includes AV-over-IP, USB transport,
                video wall processing, competitor substitution, incomplete room information, unclear network ownership,
                or any non-standard system behaviour.
              </p>
            </article>
          </div>
        </section>
        {/* Product Pitch tester-readiness safety panel - END */}
      </main>
    );
  }

  return <ProductWorkspace product={selectedProduct} backToSelection={backToSelection} />;
}

export default ProductPitchPage;
