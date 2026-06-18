import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
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
import { CompareBackToListButton } from "../components/compare/CompareBackToListButton";
import { ReportProblemButton } from "../components/ReportProblemButton";
import { ProductMediaPanel } from "../components/ProductMediaPanel";
import { AVSignalFlowDiagram } from "../components/AVSignalFlowDiagram";
import { validateUsbPath, usbValidationIsRequired } from "../logic/usbPathValidator";
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";

type ProductTab = "overview" | "sales" | "spec" | "diagram" | "visual";

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

function DisplayList({ items, max = 6 }: { items: string[]; max?: number }) {
  const useful = cleanUsefulList(items, max);

  return (
    <ul className="grid gap-2 text-sm leading-6 text-white/75">
      {useful.map((item, index) => (
        <li key={`${item}-${index}`} className="rounded-2xl border border-[#29465e] bg-[#081724] px-3 py-2">
          {item}
        </li>
      ))}
    </ul>
  );
}

function WorkCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
      <h3 className="text-lg font-black text-cyan-300">{title}</h3>
      <div className="mt-3 text-sm leading-6 text-white/75">{children}</div>
    </section>
  );
}

function SelectionPage({
  products,
  searchTerm,
  setSearchTerm,
  openProduct
}: {
  products: ProductSpec[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  openProduct: (sku: string) => void;
}) {
  const term = searchTerm.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!term) return products.slice(0, 80);
    return products.filter((product) => includesProduct(product, term)).slice(0, 80);
  }, [products, term]);

  return (
    <main className="grid gap-4 pb-6 text-white">
      <CompareBackToListButton />
      <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Product workspace</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Select one product</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/70">
          Select a product first. The next page opens a single product workspace with Overview, Sales Cards, Technical Spec, Diagram and Room Visual tabs.
        </p>
      </section>

      <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Search by SKU, product name or application</span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Example: CAM-210-NDI-PTZ, amplifier, HDMI extender, NetworkHD"
            type="search"
            className="min-h-12 rounded-2xl border border-[#29465e] bg-[#0d2133] px-4 text-sm font-semibold text-white outline-none focus:border-cyan-300"
            autoFocus
          />
        </label>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => (
            <button
              key={product.sku}
              type="button"
              onClick={() => openProduct(product.sku)}
              className="min-h-[132px] rounded-3xl border border-[#29465e] bg-[#081724] p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-500/10"
            >
              <span className="block text-xs font-black uppercase tracking-[0.14em] text-cyan-300">{product.family}</span>
              <strong className="mt-2 block text-xl font-black text-white">{product.sku}</strong>
              <span className="mt-1 block text-sm font-semibold text-white/80">{product.name}</span>
              <span className="mt-3 block text-xs text-white/50">{product.productType}</span>
            </button>
          ))}
        </div>

        {!filtered.length ? (
          <div className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
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
      className={`rounded-full px-4 py-2 text-sm font-black transition ${
        active
          ? "bg-cyan-300 text-slate-950"
          : "border border-[#29465e] bg-[#081724] text-cyan-100 hover:border-cyan-300"
      }`}
    >
      {label}
    </button>
  );
}

function OverviewTab({ product, narrative }: { product: ProductSpec; narrative: ProductNarrative }) {
  return (
    <div className="grid gap-4">
      <section className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">One-minute product view</p>
        <h2 className="mt-2 text-2xl font-black text-white">{narrative.headline}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-white/75">{narrative.whatItIs}</p>
      </section>

      <ProductMediaPanel sku={product.sku} title={product.name} />

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkCard title="What it does">
          <p>{narrative.whyItHelps}</p>
        </WorkCard>

        <WorkCard title="Why the customer cares">
          <p>{narrative.whyCustomerCares}</p>
        </WorkCard>

        <WorkCard title="Use it when">
          <p>{narrative.useWhen}</p>
        </WorkCard>

        <WorkCard title="Do not lead with it when">
          <p>{narrative.avoidIf}</p>
        </WorkCard>

        <WorkCard title="Best-fit applications">
          <DisplayList items={product.applications} max={6} />
        </WorkCard>

        <WorkCard title="Ask next">
          <DisplayList items={narrative.askNow} max={4} />
        </WorkCard>
      </div>
    </div>
  );
}

function SalesTab({ product, narrative }: { product: ProductSpec; narrative: ProductNarrative }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <WorkCard title="Customer challenge">
        <p>{narrative.customerChallenge}</p>
      </WorkCard>

      <WorkCard title="Why this product helps">
        <p>{narrative.whyItHelps}</p>
      </WorkCard>

      <WorkCard title="Key features worth mentioning">
        <DisplayList items={product.keyFeatures} max={6} />
      </WorkCard>

      <WorkCard title="Say it like this">
        <p>{narrative.suggestedWording}</p>
      </WorkCard>

      <WorkCard title="Suggest a demo / evaluation">
        <p>{narrative.demoPrompt}</p>
      </WorkCard>

      <WorkCard title="Do not oversell">
        <p>Keep the conversation tied to the room, workflow and confirmed requirement. Do not promise unverified I/O, distance, USB, network, audio or control behaviour until checked.</p>
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
    <div className="overflow-hidden rounded-3xl border border-[#29465e] bg-[#071522]">
      {rows.map(([label, rawItems]) => {
        const items = cleanUsefulList([...rawItems], 4);

        return (
          <div key={label} className="grid gap-3 border-b border-[#29465e] p-4 last:border-b-0 lg:grid-cols-[220px_minmax(0,1fr)]">
            <strong className="text-sm font-black text-cyan-300">{label}</strong>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <span key={item} className="rounded-full border border-[#29465e] bg-[#081724] px-3 py-1.5 text-sm text-white/75">
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
      <section className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5">
        <h2 className="text-xl font-black text-white">Technical specification view</h2>
        <p className="mt-2 text-sm leading-6 text-white/70">
          Use this tab to confirm details. It is separated from the sales view so the user is not forced to interpret technical data during a live conversation.
        </p>
      </section>

      {usbResult ? (
        <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
          <h3 className="text-lg font-black text-cyan-300">USB path check</h3>
          <p className="mt-1 text-sm leading-6 text-white/70">
            USB standard <strong className="text-white">{usbResult.usbStandardUsed}</strong> · up to{" "}
            {usbResult.maxAllowedTiers} cascaded tier{usbResult.maxAllowedTiers === 1 ? "" : "s"}
            {usbResult.downstreamHubLimit ? ` · hub limit ${usbResult.downstreamHubLimit}` : ""}.
          </p>
          {usbResult.warnings.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-amber-200">
              {usbResult.warnings.map((warning) => (
                <li key={warning}>⚠ {warning}</li>
              ))}
            </ul>
          ) : null}
          {usbResult.blockers.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-rose-300">
              {usbResult.blockers.map((blocker) => (
                <li key={blocker}>✕ {blocker}</li>
              ))}
            </ul>
          ) : null}
          {usbResult.recommendationImpact ? (
            <p className="mt-2 text-sm leading-6 text-white/60">{usbResult.recommendationImpact}</p>
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
      <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
        <h2 className="text-xl font-black text-cyan-300">Simple product connection view</h2>
        <div className="mt-5 grid items-stretch gap-3 lg:grid-cols-[1fr_80px_1fr_80px_1fr]">
          <div className="rounded-3xl border border-[#29465e] bg-[#081724] p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">Source / input side</p>
            <strong className="mt-2 block text-lg text-white">{narrative.diagramSource}</strong>
          </div>

          <div className="hidden items-center justify-center text-3xl font-black text-cyan-300 lg:flex">ÃƒÂ¢Ã¢â‚¬ Ã¢â‚¬â„¢</div>

          <div className="rounded-3xl border border-cyan-400 bg-cyan-500/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">WyreStorm product</p>
            <strong className="mt-2 block text-lg text-white">{product.sku}</strong>
            <span className="mt-1 block text-sm text-white/65">{product.productType}</span>
          </div>

          <div className="hidden items-center justify-center text-3xl font-black text-cyan-300 lg:flex">ÃƒÂ¢Ã¢â‚¬ Ã¢â‚¬â„¢</div>

          <div className="rounded-3xl border border-[#29465e] bg-[#081724] p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">Output / destination side</p>
            <strong className="mt-2 block text-lg text-white">{narrative.diagramOutput}</strong>
          </div>
        </div>
      </section>

      <AVSignalFlowDiagram
        mode={product.category || product.productType}
        title="Typical signal flow"
        subtitle={`Where ${product.sku} sits in the chain`}
      />

      <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
        <h3 className="text-lg font-black text-cyan-300">Open full schematic</h3>
        <p className="mt-2 text-sm leading-6 text-white/70">
          Use Schematic Builder for the full end-to-end system diagram with known WyreStorm devices, third-party devices and TBC blocks.
        </p>
        <Link
          to={routeCatalogByKey.visualDesign.path}
          onClick={saveHandoff}
          className="mt-4 inline-flex rounded-full bg-cyan-300 px-5 py-2 text-sm font-black text-slate-950"
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
      <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
        <h2 className="text-xl font-black text-cyan-300">Room visual prompt</h2>
        <p className="mt-2 text-sm leading-6 text-white/70">
          Once discovery is complete, this can become a Generate room image action for proposal support. For now, this prompt can be copied or stored as product context.
        </p>

        <textarea
          readOnly
          value={narrative.visualPrompt}
          className="mt-4 min-h-[220px] w-full rounded-3xl border border-[#29465e] bg-[#081724] p-4 text-sm leading-6 text-white/75"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copyPrompt}
            className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-black text-slate-950"
          >
            {copied ? "Copied" : "Copy room image prompt"}
          </button>

          <button
            type="button"
            onClick={saveHandoff}
            className="rounded-full border border-cyan-300 px-5 py-2 text-sm font-black text-cyan-100"
          >
            {saved ? "Saved" : "Save visual context"}
          </button>
        </div>
      </section>

      <aside className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5">
        <h3 className="text-lg font-black text-white">Future workflow</h3>
        <ol className="mt-4 grid gap-3 text-sm leading-6 text-white/75">
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
  const narrative = useMemo(() => buildProductNarrative(product), [product]);

  useEffect(() => {
    writeProductWorkspaceHandoff(product, narrative);
  }, [product, narrative]);

  return (
    <main className="grid gap-4 pb-6 text-white">
      <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Product workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-cyan-200">{product.sku}</h1>
            <h2 className="mt-1 text-xl font-bold text-white">{product.name}</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-white/70">{narrative.headline}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ReportProblemButton sku={product.sku} productName={product.name} />
            <button
              type="button"
              onClick={backToSelection}
              className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100"
            >
              Back to product selection
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-4">
        <div className="flex flex-wrap gap-2">
          <TabButton label="Overview" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
          <TabButton label="Sales Cards" active={activeTab === "sales"} onClick={() => setActiveTab("sales")} />
          <TabButton label="Technical Spec" active={activeTab === "spec"} onClick={() => setActiveTab("spec")} />
          <TabButton label="Diagram" active={activeTab === "diagram"} onClick={() => setActiveTab("diagram")} />
          <TabButton label="Room Visual" active={activeTab === "visual"} onClick={() => setActiveTab("visual")} />
        </div>
      </section>

      {activeTab === "overview" ? <OverviewTab product={product} narrative={narrative} /> : null}
      {activeTab === "sales" ? <SalesTab product={product} narrative={narrative} /> : null}
      {activeTab === "spec" ? <SpecTab product={product} /> : null}
      {activeTab === "diagram" ? <DiagramTab product={product} narrative={narrative} /> : null}
      {activeTab === "visual" ? <VisualTab product={product} narrative={narrative} /> : null}
    </main>
  );
}

export function ProductPitchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedSku = searchParams.get("sku") || "";

  const [products, setProducts] = useState<ProductSpec[]>(fallbackProducts);
  const [searchTerm, setSearchTerm] = useState("");
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

  const selectedProduct = useMemo(() => {
    if (!selectedSku) return null;
    return products.find((product) => product.sku.toLowerCase() === selectedSku.toLowerCase()) || null;
  }, [products, selectedSku]);

  const openProduct = (sku: string) => {
    navigate(`/wingman/product-pitch?sku=${encodeURIComponent(sku)}`);
  };

  const backToSelection = () => {
    navigate("/wingman/product-pitch");
  };

  if (!loaded && !products.length) {
    return (
      <main className="rounded-3xl border border-[#29465e] bg-[#071522] p-6 text-white">
        Loading product workspace...
      </main>
    );
  }

  if (!selectedSku) {
    return (
      <SelectionPage
        products={products}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        openProduct={openProduct}
      />
    );
  }

  if (!selectedProduct) {
    return (
      <main className="grid gap-4 pb-6 text-white">
        <section className="rounded-3xl border border-amber-400/40 bg-amber-400/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">Product not found</p>
          <h1 className="mt-2 text-3xl font-black">No product workspace found for {selectedSku}</h1>
          <p className="mt-2 text-sm leading-6 text-white/70">
            Return to product selection and choose a product from the connected index.
          </p>
          <button
            type="button"
            onClick={backToSelection}
            className="mt-4 rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100"
          >
            Back to product selection
          </button>
        </section>
      </main>
    );
  }

  return <ProductWorkspace product={selectedProduct} backToSelection={backToSelection} />;
}

export default ProductPitchPage;
