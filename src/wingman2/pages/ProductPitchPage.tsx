import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileSearch, PackageCheck, RefreshCcw, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

type ProductIndex = {
  meta?: { generatedAt?: string; count?: number };
  products?: ProductRecord[];
};

type ProductRecord = {
  id?: string;
  sku?: string;
  name?: string;
  title?: string;
  description?: string;
  summary?: string;
  category?: string;
  family?: string;
  routingClass?: string;
  technologies?: string[];
  connectors?: string[];
  features?: string[];
  applications?: string[];
  tags?: string[];
  searchTerms?: string[];
  source?: string;
  raw?: Record<string, unknown>;
};

type UpdateCheckReport = {
  generatedAt?: string;
  sourceUrl?: string;
  indexedCount?: number;
  discoveredCount?: number;
  newCandidateCount?: number;
  candidates?: UpdateCandidate[];
  warnings?: string[];
};

type UpdateCandidate = {
  sku: string;
  title?: string;
  url?: string;
  reason?: string;
};

const indexUrl = "/product-intelligence-index.json";
const updateCheckUrl = "/wyrestorm-product-update-check.json";
const emptyProducts: ProductRecord[] = [];

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&#x2122;|&#8482;|&trade;/gi, "TM")
    .replace(/&#x00ae;|&#174;|&reg;/gi, "R")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function asList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(cleanText).filter(Boolean);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}

function productSku(product: ProductRecord) {
  return cleanText(product.sku || product.id || product.raw?.sku || "").toUpperCase();
}

function productTitle(product: ProductRecord) {
  return cleanText(product.name || product.title || product.raw?.title || product.sku || "WyreStorm product");
}

function productSummary(product: ProductRecord) {
  return cleanText(product.summary || product.description || product.raw?.summary || product.raw?.description || "");
}

function productFamily(product: ProductRecord) {
  return cleanText(product.family || product.category || product.raw?.family || product.raw?.category || "WyreStorm product");
}

function productSearchBlob(product: ProductRecord) {
  return [
    productSku(product),
    productTitle(product),
    productSummary(product),
    productFamily(product),
    cleanText(product.category),
    cleanText(product.routingClass),
    ...asList(product.technologies),
    ...asList(product.connectors),
    ...asList(product.features),
    ...asList(product.applications),
    ...asList(product.tags),
    ...asList(product.searchTerms),
  ]
    .join(" ")
    .toLowerCase();
}

function liveProductUrl(sku: string) {
  return `https://wyrestorm.com/product/${encodeURIComponent(sku.toLowerCase())}/`;
}

function liveSearchUrl(sku: string) {
  return `https://wyrestorm.com/?s=${encodeURIComponent(sku)}`;
}

function buildPitch(product: ProductRecord | undefined) {
  if (!product) {
    return {
      oneLine: "Select a WyreStorm SKU to generate a customer-safe one-page product overview.",
      idealFor: [] as string[],
      talkTrack: [] as string[],
      watchouts: [] as string[],
      tags: [] as string[],
    };
  }

  const sku = productSku(product);
  const title = productTitle(product);
  const family = productFamily(product);
  const summary = productSummary(product);
  const features = asList(product.features);
  const technologies = asList(product.technologies);
  const connectors = asList(product.connectors);
  const applications = asList(product.applications);
  const tags = unique([...features, ...technologies, ...connectors, ...applications, ...asList(product.tags)]);
  const blob = productSearchBlob(product);

  const inferredApplications = [
    blob.includes("meeting") || blob.includes("conference") ? "Meeting rooms and collaboration spaces" : "Professional AV projects",
    blob.includes("education") || blob.includes("classroom") ? "Classrooms and teaching spaces" : "Integrators needing a clean WyreStorm signal path",
    blob.includes("video wall") ? "LCD or LED wall support workflows" : "Commercial installations where reliability and support matter",
  ];

  const idealFor = applications.length ? applications : inferredApplications;

  const talkTrack = unique([
    summary || `${sku} is a ${family} product for WyreStorm AV system designs.`,
    features.length ? `Key customer value: ${features.slice(0, 4).join(", ")}.` : "Position this as part of a complete WyreStorm signal-flow design rather than as an isolated box.",
    connectors.length ? `Relevant connectivity: ${connectors.slice(0, 5).join(", ")}.` : "Confirm source, display, control, USB and audio paths before finalising the design.",
    technologies.length ? `Technology fit: ${technologies.slice(0, 5).join(", ")}.` : "Use the discovery workflow to confirm the application and avoid over-specifying.",
  ]).slice(0, 4);

  const watchouts = unique([
    blob.includes("networkhd") || blob.includes("avoip") ? "Confirm network ownership, VLAN availability, switch capability and controller requirements." : "Confirm cable distance and installed cable route, not just straight-line distance.",
    blob.includes("usb") ? "Check USB device type, bandwidth and host/peripheral locations before committing." : "Check whether USB, control, audio return or display management is required.",
    blob.includes("video wall") || blob.includes("multiview") ? "Clarify whether the requirement is video wall, multiview, full canvas, duplicate display, or per-display routing." : "Validate resolution, refresh rate, HDCP and display compatibility.",
  ]);

  return {
    oneLine: summary || `${title} sits in the ${family} range and should be positioned where its features match the project workflow.`,
    idealFor,
    talkTrack,
    watchouts,
    tags,
  };
}

function getProductOptions(products: ProductRecord[]) {
  return [...products]
    .filter((product) => productSku(product))
    .sort((a, b) => productSku(a).localeCompare(productSku(b)));
}

function selectBestProduct(products: ProductRecord[], query: string) {
  const search = query.trim().toLowerCase();
  if (!search) return undefined;

  const exact = products.find((product) => productSku(product).toLowerCase() === search);
  if (exact) return exact;

  return products.find((product) => productSearchBlob(product).includes(search));
}

export function ProductPitchPage() {
  const [products, setProducts] = useState<ProductRecord[]>(emptyProducts);
  const [query, setQuery] = useState("");
  const [selectedSku, setSelectedSku] = useState("");
  const [indexError, setIndexError] = useState("");
  const [updateReport, setUpdateReport] = useState<UpdateCheckReport | null>(null);
  const [updateError, setUpdateError] = useState("");
  const [showAllCandidates, setShowAllCandidates] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(indexUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load product index (${response.status})`);
        return response.json() as Promise<ProductIndex>;
      })
      .then((data) => {
        if (cancelled) return;
        const indexedProducts = Array.isArray(data.products) ? data.products : [];
        setProducts(indexedProducts);
        const firstSku = productSku(indexedProducts[0]);
        setSelectedSku((current) => current || firstSku);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setIndexError(error instanceof Error ? error.message : "Unable to load product index");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch(updateCheckUrl)
      .then((response) => {
        if (!response.ok) throw new Error("No update-check report has been generated yet.");
        return response.json() as Promise<UpdateCheckReport>;
      })
      .then((report) => {
        if (cancelled) return;
        setUpdateReport(report);
        setUpdateError("");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setUpdateError(error instanceof Error ? error.message : "No update-check report has been generated yet.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const productOptions = useMemo(() => getProductOptions(products), [products]);

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return productOptions.slice(0, 80);
    return productOptions.filter((product) => productSearchBlob(product).includes(search)).slice(0, 80);
  }, [productOptions, query]);

  const selectedProduct = useMemo(() => {
    const selected = selectBestProduct(products, selectedSku);
    if (selected) return selected;
    return selectBestProduct(products, query);
  }, [products, query, selectedSku]);

  const pitch = useMemo(() => buildPitch(selectedProduct), [selectedProduct]);
  const selectedProductSku = selectedProduct ? productSku(selectedProduct) : "";
  const candidatePreview = updateReport?.candidates?.slice(0, showAllCandidates ? 50 : 6) ?? [];

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Product pitch"
        title="One-page WyreStorm product overview"
        purpose="Select any indexed WyreStorm SKU and produce a fast sales-ready pitch sheet with positioning, application fit, features, connectors, watchouts and live source links."
        nextMove="Use this when a salesperson knows the SKU but needs a clean customer-safe summary without opening Catalogue or Discovery first."
        actions={[
          { label: "Open Product Finder", to: routeCatalogByKey.finder.path, variant: "secondary" },
          { label: "Build proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(310px,0.9fr)_minmax(0,1.7fr)]">
        <SectionCard title="Select product" subtitle="Search by SKU, family, connector, feature or application. The list is driven by Wingman product intelligence.">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-800">
                <Search className="h-4 w-4" />
                Find SKU
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Example: NHD-500, USB-C, multiview, CAM-420"
                className="w-full px-3 py-2"
              />
            </label>

            {indexError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{indexError}</div> : null}

            <div className="max-h-[460px] space-y-2 overflow-auto pr-1">
              {filteredOptions.map((product) => {
                const sku = productSku(product);
                const active = sku === selectedProductSku;
                return (
                  <button
                    key={sku}
                    type="button"
                    onClick={() => {
                      setSelectedSku(sku);
                      setQuery(sku);
                    }}
                    className={[
                      "w-full rounded-2xl border p-3 text-left transition",
                      active ? "border-orange-300 bg-orange-50 shadow-[0_10px_30px_rgba(251,146,60,0.12)]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-black text-slate-950">{sku}</span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">{productTitle(product)}</span>
                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-600">{productFamily(product)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <section className="wingman-section-card wingman-surface overflow-hidden rounded-3xl">
          <header className="border-b border-slate-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="wingman-kicker">Pitch sheet</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{selectedProduct ? productSku(selectedProduct) : "Select a SKU"}</h2>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">{selectedProduct ? productTitle(selectedProduct) : "Choose a product on the left to create the one-page overview."}</p>
              </div>

              {selectedProductSku ? (
                <div className="flex flex-wrap gap-2">
                  <a href={liveProductUrl(selectedProductSku)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50">
                    Product page
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <a href={liveSearchUrl(selectedProductSku)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50">
                    WyreStorm search
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : null}
            </div>
          </header>

          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:col-span-2">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <Sparkles className="h-4 w-4 text-orange-600" />
                Customer-safe overview
              </div>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">{pitch.oneLine}</p>
            </div>

            <PitchBlock title="Best-fit applications" items={pitch.idealFor} />
            <PitchBlock title="Sales talk track" items={pitch.talkTrack} />
            <PitchBlock title="Key features" items={asList(selectedProduct?.features).slice(0, 8)} empty="No specific features are currently indexed for this SKU." />
            <PitchBlock title="Connectors / technology" items={unique([...asList(selectedProduct?.connectors), ...asList(selectedProduct?.technologies)]).slice(0, 10)} empty="No connector data is currently indexed for this SKU." />
            <PitchBlock title="Design checks before quoting" items={pitch.watchouts} />
            <PitchBlock title="Useful tags" items={(pitch.tags ?? asList(selectedProduct?.tags)).slice(0, 12)} empty="No tags are currently indexed for this SKU." />
          </div>
        </section>
      </div>

      <SectionCard
        title="Check WyreStorm product updates"
        subtitle="Use this to detect new public product pages and create reviewable product-intelligence candidates before they are added to Wingman."
        rightSlot={
          <Link to={routeCatalogByKey.ingest.path} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-extrabold text-white">
            Review ingest
            <FileSearch className="h-4 w-4" />
          </Link>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <RefreshCcw className="h-4 w-4 text-orange-600" />
              Local update workflow
            </div>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">Run the update checker locally. It compares Wingman indexed SKUs with product pages discovered from WyreStorm.com and writes a report plus candidate records for review.</p>
            <pre className="mt-4 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs font-bold leading-6 text-slate-100">npm run data:check-wyrestorm-products</pre>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">Review generated candidates before merging them into the master product-intelligence data. This avoids accidentally capturing navigation text, banners, or non-product page content.</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <PackageCheck className="h-4 w-4 text-orange-600" />
                Latest generated report
              </div>
              <a href="https://wyrestorm.com/products/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50">
                WyreStorm products
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {updateReport ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric label="Indexed" value={updateReport.indexedCount ?? "-"} />
                  <Metric label="Discovered" value={updateReport.discoveredCount ?? "-"} />
                  <Metric label="New candidates" value={updateReport.newCandidateCount ?? updateReport.candidates?.length ?? "-"} />
                </div>
                <p className="text-xs font-semibold text-slate-500">Generated {updateReport.generatedAt ? new Date(updateReport.generatedAt).toLocaleString() : "recently"}</p>
                {candidatePreview.length ? (
                  <div className="space-y-2">
                    {candidatePreview.map((candidate) => (
                      <a key={`${candidate.sku}-${candidate.url}`} href={candidate.url || liveSearchUrl(candidate.sku)} target="_blank" rel="noreferrer" className="block rounded-2xl border border-slate-200 p-3 hover:bg-slate-50">
                        <span className="block text-sm font-black text-slate-950">{candidate.sku}</span>
                        <span className="mt-1 block text-xs font-semibold text-slate-600">{candidate.title || candidate.reason || "Potential new WyreStorm product"}</span>
                      </a>
                    ))}
                    {(updateReport.candidates?.length ?? 0) > 6 ? (
                      <button type="button" onClick={() => setShowAllCandidates((current) => !current)} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50">
                        {showAllCandidates ? "Show fewer" : "Show more candidates"}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">No new candidate SKUs were found in the latest report.</div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">{updateError || "No update-check report is available yet. Run the npm command locally to generate one."}</div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function PitchBlock({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  const cleanItems = unique(items);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      {cleanItems.length ? (
        <ul className="mt-3 space-y-2">
          {cleanItems.map((item) => (
            <li key={item} className="flex gap-2 text-sm font-semibold leading-6 text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-orange-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{empty || "No indexed data available for this section."}</p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</span>
      <strong className="mt-1 block text-2xl font-black text-slate-950">{value}</strong>
    </div>
  );
}

export default ProductPitchPage;
