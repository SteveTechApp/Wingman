import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  analyzeCompetitor,
  type CompetitorProfile,
  type WyrestormProduct,
} from "../lib/competitorMatchEngine";
import {
  CompareManufacturerCombobox,
  CompareProductLookupInput,
  type CompareSelectOption,
} from "../components/compare/CompareControls";
import { CompareSpecificationMatrix } from "../components/compare/CompareSpecificationMatrix";
import { CompactCompareMatrix } from "../components/compare/CompactCompareMatrix";
import { COMPETITOR_SKU_SEED_CATALOG, normalizeCompetitorSku } from "../lib/competitorProductIntelligence";
import {
  rigorousCompare,
  type RigorousCompareResult,
  type RigorousMatch,
} from "../lib/rigorousCompare";
import { applyKnownCompareProfileOverrides, enrichCompareInputWithKnownProfile } from "../lib/knownCompareProfiles";
import { applyCompareEquivalenceGuards } from "../lib/compareEquivalenceGuard";
import {
  lookupCompareIntelligence,
  type CompareIntelligenceResult,
} from "../lib/compareIntelligenceClient";
import type { CompareDecisionOutcome } from "../lib/competitorCompareDecision";
import { buildCompareFeatureMatrixRows, type CompareFeatureMatrixRow } from "../lib/compareFeatureMatrix";

const KNOWN_BRANDS = [
  "Crestron",
  "Extron",
  "Atlona",
  "Kramer",
  "Lightware",
  "Blustream",
  "Barco",
  "ZeeVee",
  "AMX",
  "AVPro Edge",
  "Binary",
  "ATEN",
  "Logitech",
  "Poly",
  "Biamp",
  "Shure",
  "QSC",
  "Visionary",
];

const CUSTOM_BRAND_VALUE = "__custom_brand__";

const MANUFACTURER_OPTIONS = Array.from(
  new Set([
    ...Object.keys(COMPETITOR_SKU_SEED_CATALOG).filter((brand) => brand !== "Other"),
    ...KNOWN_BRANDS,
  ]),
).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

const MANUFACTURER_SELECT_OPTIONS: CompareSelectOption[] = [
  { value: "", label: "Auto-detect where possible" },
  ...MANUFACTURER_OPTIONS.map((brand) => ({ value: brand, label: brand })),
  { value: CUSTOM_BRAND_VALUE, label: "Other / type manufacturer" },
];

type PageState = "input" | "analyzing" | "results" | "error";
type WorkflowStep = "request" | "matrix" | "options" | "checks";

function shouldRequestLiveLookupUrl(result: RigorousCompareResult, hasSourceUrl: boolean): boolean {
  if (hasSourceUrl && result.competitor.specTier === "verified-profile") return false;
  if (result.topOutcome === "NONE") return true;
  if (!result.matches.length) return true;
  if (result.topOutcome === "VERIFY" && !hasSourceUrl) return true;
  if (result.competitor.specTier !== "verified-profile" && result.competitor.missingFacts.length > 0) return true;

  return false;
}

function recordFromUnknown(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function countFromRecord(record: Record<string, unknown>, keys: string[]): number | undefined {
  const total = keys.reduce((sum, key) => {
    const value = Number(record[key]);
    return Number.isFinite(value) && value > 0 ? sum + value : sum;
  }, 0);

  return total > 0 ? total : undefined;
}

function addLookupCount(lines: string[], label: string, value: number | undefined) {
  if (value) lines.push(`${label} ${value}`);
}

function lookupProfileFacts(profile: Record<string, unknown> | undefined): string {
  if (!profile) return "";

  const lines: string[] = [];
  const videoInputs = recordFromUnknown(profile.videoInputs);
  const videoOutputs = recordFromUnknown(profile.videoOutputs);
  const usb = recordFromUnknown(profile.usb);
  const audio = recordFromUnknown(profile.audio);
  const control = recordFromUnknown(profile.control);
  const power = recordFromUnknown(profile.power);
  const network = recordFromUnknown(profile.network);
  const videoProcessing = recordFromUnknown(profile.videoProcessing);
  const features = recordFromUnknown(profile.features);
  const verifiedSource = recordFromUnknown(profile.verifiedSource);

  addLookupCount(lines, "HDMI inputs", countFromRecord(videoInputs, ["hdmi"]));
  addLookupCount(lines, "HDMI outputs", countFromRecord(videoOutputs, ["hdmi", "hdmiLoopThrough", "hdmiMirrored"]));
  addLookupCount(lines, "HDBaseT outputs", countFromRecord(videoOutputs, ["hdbaset", "hdbt"]));
  addLookupCount(lines, "USB host ports", countFromRecord(usb, ["host", "hosts", "usbHost", "usbHostPorts"]));
  addLookupCount(lines, "USB device ports", countFromRecord(usb, ["device", "devices", "client", "usbDevice", "usbDevicePorts"]));
  addLookupCount(lines, "Audio inputs", countFromRecord(audio, ["inputs", "audioInputs", "lineInputs", "micInputs"]));
  addLookupCount(lines, "Audio outputs", countFromRecord(audio, ["outputs", "audioOutputs", "lineOutputs"]));
  addLookupCount(lines, "Network ports", countFromRecord(control, ["lan", "ethernet", "network"]) ?? countFromRecord(network, ["ports", "lan", "ethernet"]));
  addLookupCount(lines, "Control ports", countFromRecord(control, ["rs232", "ir", "cec", "relay", "digitalIo", "gpio"]));

  if (videoProcessing.maxResolution) lines.push(`Resolution ${String(videoProcessing.maxResolution)}`);
  if (videoProcessing.role) lines.push(`Product role ${String(videoProcessing.role)}`);
  if (network.transport) lines.push(`Transport ${String(network.transport)}`);
  if (network.codec) lines.push(`Codec ${String(network.codec)}`);
  if (verifiedSource.role) lines.push(`Verified role ${String(verifiedSource.role)}`);
  if (features.usbC) lines.push("USB-C");
  if (features.usbRouting || usb.usb2 || usb.usb3) lines.push("USB routing");
  if (features.dante || audio.dante) lines.push("Dante audio");
  if (features.aes67 || audio.aes67) lines.push("AES67 audio");
  if (features.hdbasetExtension) lines.push("HDBaseT output");
  if (features.poe || power.poe || power.poePlus) lines.push("PoE");
  if (features.poc || power.poc) lines.push("PoC");
  if (features.poh || power.poh) lines.push("PoH");
  if (features.audioDeEmbed || audio.deEmbed) lines.push("Audio de-embed");
  if (features.audioEmbed || audio.embed) lines.push("Audio embed");
  if (control.rs232) lines.push("RS-232");
  if (control.ir) lines.push("IR control");
  if (control.lan) lines.push("Ethernet control");
  if (control.relay) lines.push("Relay");
  if (control.gpio || control.digitalIo) lines.push("GPIO");

  return lines.join("\n");
}

function lookupEvidenceText(lookup: CompareIntelligenceResult): string {
  const lines: string[] = [];
  const competitor = lookup.competitor;

  if (competitor?.categoryLabel) lines.push(`Technology class ${competitor.categoryLabel}`);
  if (competitor?.purposeLabel) lines.push(`Product purpose ${competitor.purposeLabel}`);
  if (competitor?.purposeRole) lines.push(`Product role ${competitor.purposeRole}`);

  const profileFacts = lookupProfileFacts(competitor?.specProfile);
  if (profileFacts) lines.push(profileFacts);

  for (const source of lookup.evidence?.sources ?? []) {
    if (source.excerpt) lines.push(source.excerpt);
  }

  return lines.filter(Boolean).join("\n");
}

const OUTCOME_STYLES: Record<CompareDecisionOutcome, string> = {
  "GOOD MATCH": "border-emerald-400 bg-emerald-400/15 text-emerald-100",
  "PARTIAL MATCH": "border-amber-400 bg-amber-400/15 text-amber-100",
  VERIFY: "border-yellow-400 bg-yellow-400/15 text-yellow-100",
  "NO MATCH": "border-rose-400 bg-rose-400/15 text-rose-100",
};

function readIndexedProducts(data: unknown): WyrestormProduct[] {
  if (Array.isArray(data)) {
    return data as WyrestormProduct[];
  }

  if (data && typeof data === "object" && Array.isArray((data as { products?: unknown }).products)) {
    return (data as { products: WyrestormProduct[] }).products;
  }

  return [];
}

function runKnownProfileCompare(
  inputText: string,
  products: WyrestormProduct[],
  brand: string | undefined,
  limit: number,
  productUrl: string,
): RigorousCompareResult {
  const enrichedInput = enrichCompareInputWithKnownProfile(inputText, brand);
  const baseResult = applyCompareEquivalenceGuards(rigorousCompare(enrichedInput, products, brand, limit, productUrl));
  return applyKnownCompareProfileOverrides(baseResult, products, inputText, brand) as RigorousCompareResult;
}
function outcomeClass(outcome: CompareDecisionOutcome) {
  return OUTCOME_STYLES[outcome];
}

function formatProfileValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "Unknown";
}

function compareSkuKey(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function skuOptionsForBrand(brand?: string): string[] {
  if (brand && COMPETITOR_SKU_SEED_CATALOG[brand]) {
    return COMPETITOR_SKU_SEED_CATALOG[brand];
  }

  if (brand) {
    return [];
  }

  return Array.from(new Set(Object.values(COMPETITOR_SKU_SEED_CATALOG).flat()));
}

function compareSkuSuggestions(query: string, brand?: string): string[] {
  const queryKey = compareSkuKey(query);
  const options = skuOptionsForBrand(brand);
  const filtered = queryKey
    ? options.filter((sku) => {
      const key = compareSkuKey(sku);
      return key.includes(queryKey) || queryKey.includes(key);
    })
    : options;

  return Array.from(new Set(filtered))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
    .slice(0, 80);
}

function brandForCompetitorSku(sku: string): string {
  const skuKey = compareSkuKey(sku);

  for (const [brand, brandSkus] of Object.entries(COMPETITOR_SKU_SEED_CATALOG)) {
    if (brand === "Other") continue;
    if (brandSkus.some((item) => compareSkuKey(item) === skuKey)) return brand;
  }

  return "";
}

function skuCountForBrand(brand: string): number {
  return COMPETITOR_SKU_SEED_CATALOG[brand]?.length ?? 0;
}

function resolveSelectedBrand(selectedBrand: string, customBrand: string): string | undefined {
  if (selectedBrand === CUSTOM_BRAND_VALUE) {
    return customBrand.trim() || undefined;
  }

  return selectedBrand || undefined;
}

function EvidenceList({ title, items, tone }: { title: string; items?: string[]; tone: "match" | "gap" | "block" | "verify" }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

  if (!safeItems.length) return null;

  const marker = tone === "match" ? "OK" : tone === "block" ? "NO" : "!";
  const titleClass = tone === "match" ? "text-emerald-200" : tone === "block" ? "text-rose-200" : "text-amber-200";

  return (
    <section className="rounded-2xl border border-[#29465e] bg-[#071522] p-4">
      <h4 className={`text-sm font-black ${titleClass}`}>{title}</h4>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-white/75">
        {safeItems.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2">
            <span className="shrink-0 font-black">{marker}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CompetitorProductProfileCard({ result }: { result: RigorousCompareResult }) {
  const competitor = result.competitor;
  const facts: [string, unknown][] = [
    ["Manufacturer", competitor.brand],
    ["SKU", competitor.sku],
    ["Technology", competitor.domain],
    ["Role", competitor.role],
    ["Transport", competitor.transport],
    ["Inputs", competitor.inputCount],
    ["Outputs", competitor.outputCount],
    ["Resolution", competitor.maxResolution],
    ["Chroma", competitor.chroma],
    ["Evidence tier", competitor.specTier],
  ];

  return (
    <section className="rounded-2xl border border-[#29465e] bg-[#081724] p-4" data-wingman-competitor-product-profile="true">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Competitor product profile</p>
          <h3 className="mt-1 text-xl font-black text-white">{competitor.brand} {competitor.sku}</h3>
        </div>
        <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
          {competitor.readiness}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#1b3348] bg-[#071522] p-3">
            <dt className="text-xs font-black uppercase tracking-[0.12em] text-white/40">{label}</dt>
            <dd className="mt-1 text-sm font-black text-white">{formatProfileValue(value)}</dd>
          </div>
        ))}
      </dl>

      {competitor.datasheetUrl || competitor.sourceUrl ? (
        <a href={competitor.datasheetUrl || competitor.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-cyan-200">
          Open product/spec source
        </a>
      ) : null}

      {competitor.assumptions.length || competitor.missingFacts.length ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {competitor.assumptions.length ? (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
              <p className="text-sm font-black text-amber-100">Assumptions</p>
              <ul className="mt-2 space-y-1 text-sm leading-5 text-white/70">
                {competitor.assumptions.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}

          {competitor.missingFacts.length ? (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
              <p className="text-sm font-black text-amber-100">Missing competitor facts</p>
              <ul className="mt-2 space-y-1 text-sm leading-5 text-white/70">
                {competitor.missingFacts.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ComparisonEvidenceDetails({ result, topMatch }: { result: RigorousCompareResult; topMatch: RigorousMatch | null }) {
  return (
    <details className="mt-4 rounded-2xl border border-[#29465e] bg-[#081724] p-4" data-compare-evidence-drawer="true">
      <summary className="cursor-pointer text-sm font-black text-cyan-200">View comparison evidence</summary>

      <div className="mt-4 grid gap-4">
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <p className="text-sm font-black text-cyan-200">Generated recommendation</p>
          <p className="mt-2 text-sm leading-6 text-white/75">{result.recommendation}</p>
        </div>

        <CompetitorProductProfileCard result={result} />

        {topMatch ? (
          <div className="grid gap-3 xl:grid-cols-2">
            <EvidenceList title="Confirmed matches" items={topMatch.decision.matches} tone="match" />
            <EvidenceList title="Blocking differences" items={topMatch.decision.blockers} tone="block" />
            <EvidenceList title="Gaps to explain" items={topMatch.decision.gaps} tone="gap" />
            <EvidenceList title="Verify before customer issue" items={topMatch.decision.verify} tone="verify" />
          </div>
        ) : null}
      </div>
    </details>
  );
}

function DataQualityStrip({ rows }: { rows: CompareFeatureMatrixRow[] }) {
  const competitorGaps = rows.filter((row) => row.competitorValue === "Unknown").map((row) => row.label);
  const wyrestormGaps = rows.filter((row) => row.wyrestormValue === "Unknown").map((row) => row.label);

  if (!competitorGaps.length && !wyrestormGaps.length) return null;

  return (
    <div className="mt-3 grid gap-2 rounded-2xl border border-amber-400/35 bg-amber-400/10 p-3 text-xs" data-wingman-compare-data-quality="true">
      <div className="flex flex-wrap gap-2">
        <span className="font-black uppercase tracking-[0.12em] text-amber-100">Dataset gaps</span>
        {wyrestormGaps.length ? (
          <span className="rounded-full border border-rose-400/45 bg-rose-400/10 px-2 py-1 font-black text-rose-100">
            WyreStorm needs {wyrestormGaps.length} fact{wyrestormGaps.length === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="rounded-full border border-emerald-400/45 bg-emerald-400/10 px-2 py-1 font-black text-emerald-100">
            WyreStorm core facts present
          </span>
        )}
        {competitorGaps.length ? (
          <span className="rounded-full border border-amber-400/45 bg-amber-400/10 px-2 py-1 font-black text-amber-100">
            Competitor needs {competitorGaps.length} fact{competitorGaps.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      <div className="grid gap-1 text-white/70 md:grid-cols-2">
        {wyrestormGaps.length ? <p>WyreStorm data to complete: {wyrestormGaps.slice(0, 5).join(", ")}.</p> : null}
        {competitorGaps.length ? <p>Competitor data to source: {competitorGaps.slice(0, 5).join(", ")}.</p> : null}
      </div>
    </div>
  );
}

function LiveLookupRetryPanel({
  value,
  status,
  onChange,
  onRetry,
  disabled,
}: {
  value: string;
  status?: string;
  onChange: (value: string) => void;
  onRetry: () => void;
  disabled: boolean;
}) {
  return (
    <section className="rounded-3xl border border-amber-400/45 bg-amber-400/10 p-5" data-wingman-live-lookup-retry="true">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-100">Need a live/spec source</p>
          <h2 className="mt-1 text-xl font-black text-white">Point Wingman at a product page and retry</h2>
        </div>
        <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-100">
          Retry lookup
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-white/75">
        The current result is not strong enough. Add any public page containing the competitor product details, specification table or PDF datasheet link, then retry so Wingman can use that source for the comparison.
      </p>
      {status ? (
        <p className="mt-3 rounded-2xl border border-amber-400/30 bg-[#071522] p-3 text-sm font-semibold text-amber-50">{status}</p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Live lookup URL</span>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Paste a product page, reseller page, PDF datasheet, or public spec page"
            className="min-h-12 rounded-2xl border border-[#29465e] bg-[#0d2133] px-4 text-sm font-semibold text-white"
          />
        </label>
        <button
          type="button"
          onClick={onRetry}
          disabled={disabled || !value.trim()}
          className="self-end rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Retry with URL
        </button>
      </div>
    </section>
  );
}

function MatchCard({ match, rank, competitor, defaultExpanded = false }: { match: RigorousMatch; rank: number; competitor: RigorousCompareResult["competitor"]; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded || rank === 1);
  const { decision } = match;
  const matrixRows = useMemo(
    () => buildCompareFeatureMatrixRows(competitor, match.wyrestorm),
    [competitor, match.wyrestorm],
  );

  return (
    <article className={`overflow-hidden rounded-3xl border ${rank === 1 ? "border-cyan-300 bg-cyan-500/10" : "border-[#29465e] bg-[#071522]"}`}>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#0d2133] text-sm font-black text-cyan-200">{rank}</span>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-white">{match.sku}</h3>
            <p className="text-sm text-white/55">{match.name || match.family}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs font-black text-white/45">{decision.confidence}%</span>
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${outcomeClass(decision.outcome)}`}>
            {decision.outcome}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-[#29465e] p-4">
          <CompareSpecificationMatrix
            rows={matrixRows}
            competitorLabel={`${competitor.brand || "Competitor"} ${competitor.sku || "product"}`}
            wyrestormLabel={match.sku}
          />
          <DataQualityStrip rows={matrixRows} />

          <details className="mt-4 rounded-2xl border border-[#29465e] bg-[#081724] p-4">
            <summary className="cursor-pointer text-sm font-black text-cyan-200">Evidence notes and objection handling</summary>
            <p className="mt-3 text-sm leading-6 text-white/70">{decision.summary}</p>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              <EvidenceList title="Confirmed matches" items={decision.matches} tone="match" />
              <EvidenceList title="Blocking differences" items={decision.blockers} tone="block" />
              <EvidenceList title="Gaps to explain" items={decision.gaps} tone="gap" />
              <EvidenceList title="Verify before customer issue" items={decision.verify} tone="verify" />
            </div>
          </details>

          <div className="mt-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm leading-6 text-white">
            <strong className="text-cyan-200">Next action: </strong>
            {decision.nextAction}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function ComparePageNew() {
  const [state, setState] = useState<PageState>("input");
  const [competitorInput, setCompetitorInput] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [applicationContext, setApplicationContext] = useState("");
  const [products, setProducts] = useState<WyrestormProduct[]>([]);
  const [result, setResult] = useState<RigorousCompareResult | null>(null);
  const [error, setError] = useState("");
  const [lookupStatus, setLookupStatus] = useState("");
  const [liveProfile, setLiveProfile] = useState<CompetitorProfile | null>(null);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("request");

  const resolvedBrand = useMemo(() => resolveSelectedBrand(selectedBrand, customBrand), [customBrand, selectedBrand]);
  const normalisedSku = useMemo(
    () => normalizeCompetitorSku(competitorInput, resolvedBrand),
    [competitorInput, resolvedBrand],
  );
  const effectiveBrand = normalisedSku?.brand || resolvedBrand;
  const effectiveCompetitorInput = normalisedSku?.sku || competitorInput;
  const compareInputText = useMemo(
    () => [effectiveCompetitorInput, productUrl, applicationContext].map((value) => value.trim()).filter(Boolean).join(" "),
    [applicationContext, effectiveCompetitorInput, productUrl],
  );
  const skuSuggestions = useMemo(
    () => compareSkuSuggestions(competitorInput, effectiveBrand),
    [competitorInput, effectiveBrand],
  );
  const manufacturerFilters = useMemo(
    () => MANUFACTURER_OPTIONS
      .map((brand) => ({ brand, count: skuCountForBrand(brand) }))
      .filter((item) => item.count > 0),
    [],
  );
  const skuBrowserItems = useMemo(
    () => skuSuggestions.map((sku) => ({
      sku,
      brand: effectiveBrand || brandForCompetitorSku(sku),
    })),
    [effectiveBrand, skuSuggestions],
  );
  const selectedBrandSkuCount = useMemo(
    () => skuOptionsForBrand(effectiveBrand).length,
    [effectiveBrand],
  );
  const totalKnownCompetitorSkuCount = useMemo(
    () => skuOptionsForBrand().length,
    [],
  );

  const handleManufacturerSelect = useCallback((value: string) => {
    setSelectedBrand(value);

    if (value !== CUSTOM_BRAND_VALUE) {
      setCustomBrand("");
    }
  }, []);

  const handleSkuSelect = useCallback((sku: string, brand?: string) => {
    setCompetitorInput(sku);

    if (brand) {
      setSelectedBrand(brand);
      setCustomBrand("");
    }
  }, []);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await loadProductIntelligenceIndex();
        setProducts(readIndexedProducts(data));
      } catch (err) {
        console.error("Failed to load products:", err);
      }
    }

    void loadProducts();
  }, []);

  useEffect(() => {
    if (competitorInput.trim().length >= 3) {
      setLiveProfile(analyzeCompetitor(compareInputText || effectiveCompetitorInput, effectiveBrand));
      return;
    }

    setLiveProfile(null);
  }, [compareInputText, competitorInput, effectiveBrand, effectiveCompetitorInput]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!competitorInput.trim()) {
        setError("Enter a competitor SKU, product name or pasted description.");
        setState("error");
        setWorkflowStep("request");
        return;
      }

      if (products.length === 0) {
        setError("Product data has not loaded yet. Refresh the page or check the product intelligence index.");
        setState("error");
        setWorkflowStep("request");
        return;
      }

      setState("analyzing");
      setLookupStatus("");

      try {
        const compareResult = runKnownProfileCompare(compareInputText || effectiveCompetitorInput, products, effectiveBrand, 10, productUrl.trim());

        if (normalisedSku?.corrected) {
          setCompetitorInput(normalisedSku.sku);

          if (!resolvedBrand && normalisedSku.brand) {
            setSelectedBrand(normalisedSku.brand);
          }
        }

        setResult(compareResult);
        setError("");
        setState("results");
        setWorkflowStep("matrix");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Comparison failed");
        setState("error");
        setWorkflowStep("request");
      }
    },
    [compareInputText, competitorInput, effectiveBrand, effectiveCompetitorInput, normalisedSku, productUrl, products, resolvedBrand],
  );

  const handleRetryWithSourceUrl = useCallback(async () => {
    if (!productUrl.trim()) {
      setError("Paste a live product/spec URL before retrying.");
      setState("error");
      setWorkflowStep("request");
      return;
    }

    if (products.length === 0) {
      setError("Product data has not loaded yet. Refresh the page or check the product intelligence index.");
      setState("error");
      setWorkflowStep("request");
      return;
    }

    setState("analyzing");
    setLookupStatus("Trying the supplied product/spec URL before re-running the matrix.");

    try {
      let retryInput = [effectiveCompetitorInput, applicationContext, productUrl].map((value) => value.trim()).filter(Boolean).join("\n");
      let nextLookupStatus = "Retried with the supplied URL and local source parsing.";

      try {
        const lookup = await lookupCompareIntelligence({
          brand: effectiveBrand || result?.competitor.brand || "",
          sku: result?.competitor.sku || effectiveCompetitorInput,
          productName: result?.competitor.title,
          rawText: [effectiveCompetitorInput, applicationContext].filter(Boolean).join("\n"),
          productUrl: productUrl.trim(),
          allowWeb: true,
        });

        const evidenceText = lookupEvidenceText(lookup);

        if (evidenceText) {
          retryInput = [effectiveCompetitorInput, evidenceText, applicationContext, productUrl].map((value) => value.trim()).filter(Boolean).join("\n");
        }

        nextLookupStatus = lookup.evidence?.usefulPages
          ? `Live lookup read ${lookup.evidence.usefulPages} useful page${lookup.evidence.usefulPages === 1 ? "" : "s"} and retried the matrix.`
          : "Live lookup responded, but Wingman still needs the supplied URL/source text as evidence.";
      } catch (lookupError) {
        nextLookupStatus = lookupError instanceof Error
          ? `Live lookup service unavailable (${lookupError.message}); retried using the URL text and local source feed.`
          : "Live lookup service unavailable; retried using the URL text and local source feed.";
      }

      const compareResult = runKnownProfileCompare(retryInput, products, effectiveBrand || result?.competitor.brand, 10, productUrl.trim());
      setResult(compareResult);
      setError("");
      setLookupStatus(nextLookupStatus);
      setState("results");
      setWorkflowStep("matrix");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison retry failed");
      setState("error");
      setWorkflowStep("request");
    }
  }, [applicationContext, effectiveBrand, effectiveCompetitorInput, productUrl, products, result]);

  const handleReset = () => {
    setCompetitorInput("");
    setSelectedBrand("");
    setCustomBrand("");
    setProductUrl("");
    setApplicationContext("");
    setResult(null);
    setError("");
    setLookupStatus("");
    setLiveProfile(null);
    setState("input");
    setWorkflowStep("request");
  };

  const topMatch = result?.matches[0] ?? null;
  const resultReady = state === "results" && Boolean(result);
  const activeStep = resultReady ? workflowStep : "request";

  const workflowSteps = [
    { key: "request", label: "1 Request", description: "Enter competitor product" },
    { key: "matrix", label: "2 Matrix", description: "Judge replacement fit" },
    { key: "options", label: "3 Options", description: "WyreStorm candidates" },
    { key: "checks", label: "4 Checks", description: "Next validation" },
  ] as const;

  const navButtonClass = (key: typeof workflowSteps[number]["key"], disabled: boolean) => {
    const active = activeStep === key;

    if (disabled) {
      return "rounded-2xl border border-[#29465e] bg-[#071522] px-4 py-3 text-left opacity-45";
    }

    if (active) {
      return "rounded-2xl border border-cyan-300 bg-cyan-300/15 px-4 py-3 text-left shadow-[0_0_24px_rgba(34,211,238,0.12)]";
    }

    return "rounded-2xl border border-[#29465e] bg-[#071522] px-4 py-3 text-left transition hover:border-cyan-300/70 hover:bg-cyan-300/10";
  };

  return (
    <main className="wm-compare-page grid gap-4 pb-8 text-white" data-wingman-compare-screen="true" data-wingman-compare-decision-desk="true">
      <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Competitor replacement desk / staged workflow</p>
        <h1 className="mt-2 text-3xl font-black">Build a visible competitor-to-WyreStorm comparison matrix</h1>
      </section>

      <nav className="grid gap-2 md:grid-cols-4" aria-label="Compare workflow stages">
        {workflowSteps.map((step) => {
          const disabled = step.key !== "request" && !resultReady;

          return (
            <button
              key={step.key}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!disabled) {
                  setWorkflowStep(step.key);
                }
              }}
              className={navButtonClass(step.key, disabled)}
            >
              <span className="block text-sm font-black text-white">{step.label}</span>
              <span className="mt-1 block text-xs font-semibold text-white/55">{step.description}</span>
            </button>
          );
        })}
      </nav>

      {state === "analyzing" ? (
        <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-8 text-center">
          <p className="text-lg font-black text-cyan-300">Checking product role, specification fit and blocking differences...</p>
        </section>
      ) : null}

      {activeStep === "request" && state !== "analyzing" ? (
        <section className="grid gap-4" data-compare-stage="request">
          <form onSubmit={handleSubmit} className="wm-compare-request-form rounded-3xl border border-[#29465e] bg-[#071522] p-5">
            <div className="wm-compare-request-intro flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">Stage 1 / Competitor input</p>
                <p className="mt-1 text-sm leading-5 text-white/65">
                  Filter by manufacturer, pick the competitor SKU, then Wingman builds the comparison matrix.
                </p>
              </div>
              <div className="wm-compare-request-stats flex flex-wrap justify-start gap-2 xl:justify-end" aria-label="Competitor SKU coverage">
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-50">{MANUFACTURER_OPTIONS.length} manufacturers</span>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-50">{totalKnownCompetitorSkuCount} known SKUs</span>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-50">{effectiveBrand ? `${selectedBrandSkuCount} shown` : "All shown"}</span>
              </div>
            </div>

            <div className="wm-compare-request-grid grid gap-4">
              <section className="wm-compare-filter-panel rounded-2xl border border-[#29465e] bg-[#081724] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Manufacturer filter</p>
                    <p className="mt-1 text-sm leading-5 text-white/58">Choose a brand first to shorten the SKU list.</p>
                  </div>
                  {effectiveBrand ? (
                    <button
                      type="button"
                      onClick={() => handleManufacturerSelect("")}
                      className="rounded-full border border-cyan-300/50 px-3 py-2 text-xs font-black text-cyan-100"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>

                <div className="mt-4">
                  <CompareManufacturerCombobox
                    value={selectedBrand}
                    options={MANUFACTURER_SELECT_OPTIONS}
                    onChange={handleManufacturerSelect}
                  />
                </div>

                <div className="wm-compare-manufacturer-grid mt-4 grid gap-2" aria-label="Manufacturer quick filters">
                  <button
                    type="button"
                    onClick={() => handleManufacturerSelect("")}
                    className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition ${!effectiveBrand ? "is-active border-cyan-300 bg-cyan-300 text-slate-950" : "border-[#29465e] bg-[#0d2133] text-white/80 hover:border-cyan-300/70"}`}
                  >
                    <span>All</span>
                    <small>{totalKnownCompetitorSkuCount}</small>
                  </button>
                  {manufacturerFilters.map(({ brand, count }) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => handleManufacturerSelect(brand)}
                      className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition ${effectiveBrand === brand ? "is-active border-cyan-300 bg-cyan-300 text-slate-950" : "border-[#29465e] bg-[#0d2133] text-white/80 hover:border-cyan-300/70"}`}
                    >
                      <span>{brand}</span>
                      <small>{count}</small>
                    </button>
                  ))}
                </div>

                {selectedBrand === CUSTOM_BRAND_VALUE ? (
                  <label className="mt-4 grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Custom manufacturer</span>
                    <input
                      value={customBrand}
                      onChange={(event) => setCustomBrand(event.target.value)}
                      placeholder="Type the manufacturer name"
                      className="min-h-12 rounded-2xl border border-[#29465e] bg-[#0d2133] px-4 text-sm font-semibold text-white"
                    />
                  </label>
                ) : null}
              </section>

              <section className="wm-compare-sku-panel rounded-2xl border border-[#29465e] bg-[#081724] p-4">
                <CompareProductLookupInput
                  value={competitorInput}
                  onChange={setCompetitorInput}
                  suggestions={skuSuggestions}
                  placeholder={effectiveBrand ? `Search ${effectiveBrand} SKUs or paste a product description` : "Search any competitor SKU or paste a product description"}
                  maxVisibleSuggestions={60}
                />

                <div className="wm-compare-sku-browser mt-4 grid gap-3">
                  <div className="wm-compare-sku-browser-head flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                        {effectiveBrand ? `${effectiveBrand} SKU list` : "Competitor SKU list"}
                      </p>
                      <p className="mt-1 text-sm text-white/58">
                        {skuBrowserItems.length ? "Click a SKU to load it into the request." : "No stored SKUs for this manufacturer yet. Type or paste the competitor product above."}
                      </p>
                    </div>
                    <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-50">
                      {skuBrowserItems.length} result{skuBrowserItems.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {skuBrowserItems.length ? (
                    <div className="wm-compare-sku-grid grid gap-2 pr-1" role="listbox" aria-label="Filtered competitor SKUs">
                      {skuBrowserItems.map(({ sku, brand }) => (
                        <button
                          key={`${brand || "any"}-${sku}`}
                          type="button"
                          role="option"
                          aria-selected={compareSkuKey(competitorInput) === compareSkuKey(sku)}
                          onClick={() => handleSkuSelect(sku, brand)}
                          className={`grid min-h-11 gap-1 rounded-xl border px-3 py-2 text-left transition ${compareSkuKey(competitorInput) === compareSkuKey(sku) ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-[#29465e] bg-[#0d2133] text-white/80 hover:border-cyan-300/70"}`}
                        >
                          <span>{sku}</span>
                          {brand ? <small>{brand}</small> : null}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="wm-compare-empty-sku-list">
                      Type a SKU, product name or paste the public product description.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="wm-compare-context-grid">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Source/spec page</span>
                <input
                  value={productUrl}
                  onChange={(event) => setProductUrl(event.target.value)}
                  placeholder="Optional first pass; required if Wingman asks for retry evidence"
                  className="min-h-12 rounded-2xl border border-[#29465e] bg-[#0d2133] px-4 text-sm font-semibold text-white"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Application context</span>
                <input
                  value={applicationContext}
                  onChange={(event) => setApplicationContext(event.target.value)}
                  placeholder="Example: lecture theatre, meeting room, 4K video wall, AVoIP estate"
                  className="min-h-12 rounded-2xl border border-[#29465e] bg-[#0d2133] px-4 text-sm font-semibold text-white"
                />
              </label>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-400 bg-rose-400/10 p-4 text-sm font-semibold text-rose-100">{error}</div>
            ) : null}

            {normalisedSku?.corrected ? (
              <div className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 p-4 text-sm font-semibold text-cyan-50" data-wingman-sku-normalisation="true">
                Interpreting as {normalisedSku.brand} {normalisedSku.sku}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!competitorInput.trim()}
              className="wm-compare-find-button rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              Find WyreStorm Alternatives
            </button>
          </form>

          {liveProfile ? (
            <section className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">Live interpretation preview</p>
              <dl className="mt-3 grid gap-3 text-sm md:grid-cols-5">
                <div><dt className="text-white/45">Manufacturer used</dt><dd className="font-black text-white">{effectiveBrand || liveProfile.brand}</dd></div>
                <div><dt className="text-white/45">Auto detected</dt><dd className="font-black text-white">{liveProfile.brand}</dd></div>
                <div><dt className="text-white/45">Technology</dt><dd className="font-black text-white">{liveProfile.technologyClass.replace(/_/g, " ")}</dd></div>
                <div><dt className="text-white/45">Role</dt><dd className="font-black text-white">{liveProfile.role}</dd></div>
                <div><dt className="text-white/45">Confidence</dt><dd className="font-black text-white">{liveProfile.confidence}</dd></div>
              </dl>
            </section>
          ) : null}
        </section>
      ) : null}

      {resultReady && result && activeStep === "matrix" ? (
        <section className="grid gap-4" data-compare-stage="matrix">
          {topMatch ? (
            <section className="rounded-3xl border border-cyan-300/45 bg-[#071522] p-5" data-wingman-visible-comparison-matrix-stage="true">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Stage 2 / Comparison matrix</p>
                  <h2 className="mt-1 text-2xl font-black text-white">Competitor vs WyreStorm specification matrix</h2>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-white/65">
                    Fast judgement first: NO MATCH / PARTIAL MATCH / GOOD MATCH. Expand evidence only when a customer or quote decision needs backup.
                  </p>
                </div>

                <span className={`rounded-full border px-4 py-2 text-sm font-black ${outcomeClass(topMatch.decision.outcome)}`}>
                  {topMatch.decision.outcome}
                </span>
              </div>

              <CompactCompareMatrix result={result} maxCandidates={4} />

              <ComparisonEvidenceDetails result={result} topMatch={topMatch} />

              <details className="mt-4 rounded-2xl border border-[#29465e] bg-[#081724] p-4" data-compare-detailed-matrix="true">
                <summary className="cursor-pointer text-sm font-black text-cyan-200">
                  Open detailed single-candidate matrix
                </summary>
                <div className="mt-4" data-compare-matrix="true">
                  <CompareSpecificationMatrix
                    rows={buildCompareFeatureMatrixRows(result.competitor, topMatch.wyrestorm)}
                    competitorLabel={`${result.competitor.brand} ${result.competitor.sku}`.trim()}
                    wyrestormLabel={topMatch.sku}
                  />
                </div>
              </details>

              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={() => setWorkflowStep("request")} className="rounded-full border border-cyan-300 px-5 py-3 text-sm font-black text-cyan-100">
                  Back to request
                </button>
                <button type="button" onClick={() => setWorkflowStep("options")} className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950">
                  Continue to options
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-3xl border border-amber-400/40 bg-amber-400/10 p-5">
              <h2 className="text-xl font-black text-amber-100">No matrix available yet</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">Wingman needs a stronger candidate match before a meaningful matrix can be shown.</p>
              <div className="mt-4">
                <ComparisonEvidenceDetails result={result} topMatch={topMatch} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={() => setWorkflowStep("request")} className="rounded-full border border-cyan-300 px-5 py-3 text-sm font-black text-cyan-100">
                  Back to request
                </button>
                <button type="button" onClick={() => setWorkflowStep("checks")} className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950">
                  Go to next checks
                </button>
              </div>
            </section>
          )}
        </section>
      ) : null}

      {resultReady && result && activeStep === "options" ? (
        <section className="grid gap-4" data-compare-stage="options">
          <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Stage 3 / Candidate options</p>
            <h2 className="mt-1 text-xl font-black text-cyan-300">WyreStorm candidate cards</h2>
            <p className="mt-1 text-sm text-white/55">Use these cards after reviewing the main matrix.</p>
          </section>

          {result.matches.length ? (
            <section className="grid gap-3">
              {result.matches.map((match, index) => (
                <MatchCard key={`${match.sku}-${index}`} match={match} rank={index + 1} competitor={result.competitor} />
              ))}
            </section>
          ) : null}

          {result.rejected.length ? (
            <section className="grid gap-3 rounded-3xl border border-rose-400/40 bg-rose-400/10 p-5">
              <h2 className="text-xl font-black text-rose-100">Not equivalent</h2>
              <p className="text-sm leading-6 text-rose-100/80">Rejected candidates include the blocking feature rows that make them unsafe to present as equivalent.</p>
              {result.rejected.slice(0, 6).map((match, index) => (
                <MatchCard
                  key={`${match.sku}-${index}`}
                  match={match}
                  rank={result.matches.length + index + 1}
                  competitor={result.competitor}
                  defaultExpanded={result.matches.length === 0 && index === 0}
                />
              ))}
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setWorkflowStep("matrix")} className="rounded-full border border-cyan-300 px-5 py-3 text-sm font-black text-cyan-100">
              Back to matrix
            </button>
            <button type="button" onClick={() => setWorkflowStep("checks")} className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950">
              Continue to next checks
            </button>
          </div>
        </section>
      ) : null}

      {resultReady && result && activeStep === "checks" ? (
        <section className="grid gap-4" data-compare-stage="checks">
          {shouldRequestLiveLookupUrl(result, Boolean(productUrl.trim())) ? (
            <LiveLookupRetryPanel
              value={productUrl}
              status={lookupStatus}
              onChange={setProductUrl}
              onRetry={handleRetryWithSourceUrl}
              disabled={false}
            />
          ) : null}

          {result.nextSteps.length ? (
            <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Stage 4 / Next checks</p>
              <h2 className="mt-1 text-xl font-black text-cyan-300">What to ask or check next</h2>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-white/75">
                {result.nextSteps.map((step, index) => (
                  <li key={`${step}-${index}`} className="rounded-2xl border border-[#29465e] bg-[#081724] p-3">{step}</li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="rounded-3xl border border-emerald-400/40 bg-emerald-400/10 p-5">
              <h2 className="text-xl font-black text-emerald-100">No additional checks returned</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">Review the matrix and candidate evidence before using the result externally.</p>
            </section>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setWorkflowStep("options")} className="rounded-full border border-cyan-300 px-5 py-3 text-sm font-black text-cyan-100">
              Back to options
            </button>
            <button type="button" onClick={handleReset} className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950">
              Compare another product
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
