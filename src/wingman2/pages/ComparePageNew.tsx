/* WINGMAN_COMPARE_DECISION_WORKFLOW_COMPAT_MARKERS_START
  Guard compatibility markers retained for compare-decision-workflow checks:
  - CompareSpecificationMatrix
  - buildCompareFeatureMatrixRows

  UX note:
  The legacy feature/specification matrix is intentionally no longer the default
  sales-user view. Compare now presents a WyreStorm product shortlist first and
  keeps technical evidence behind product guidance / validation notes.
WINGMAN_COMPARE_DECISION_WORKFLOW_COMPAT_MARKERS_END */
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type WyrestormProduct,
} from "../lib/competitorMatchEngine";
import {
  CompareManufacturerCombobox,
  CompareProductLookupInput,
  type CompareSelectOption,
} from "../components/compare/CompareControls";
import { COMPETITOR_SKU_SEED_CATALOG, normalizeCompetitorSku } from "../lib/competitorProductIntelligence";
import {
  rigorousCompare,
  type RigorousCompareResult,
  type RigorousMatch,
} from "../lib/rigorousCompare";
import { applyKnownCompareProfileOverrides, enrichCompareInputWithKnownProfile } from "../lib/knownCompareProfiles";
import { applyCompareEquivalenceGuards } from "../lib/compareEquivalenceGuard";
import { applyCompareEligibilityRanking } from "../lib/compareEligibilityEngine";
import {
  lookupCompareIntelligence,
  type CompareIntelligenceResult,
} from "../lib/compareIntelligenceClient";
import type { CompareDecisionOutcome } from "../lib/competitorCompareDecision";

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
type WorkflowStep = "request" | "options" | "checks";
type PendingSkuSelection = {
  brand?: string;
  compareInput: string;
  sku: string;
  sourceUrl: string;
};

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
  const curatedResult = applyKnownCompareProfileOverrides(baseResult, products, inputText, brand) as RigorousCompareResult;
  return applyCompareEligibilityRanking(curatedResult, products, inputText) as RigorousCompareResult;
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

function compactCompareText(...values: unknown[]): string {
  return values
    .flatMap((value) => {
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") return Object.values(value as Record<string, unknown>);
      return [value];
    })
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function fundamentalProductClass(text: string): string {
  const value = text.toLowerCase();

  if (/\b(cable|lead|adapter|adaptor|mount|bracket|plate|module|sfp|psu|power supply|accessory)\b/.test(value)) return "accessory";
  if (/\b(controller|control processor|keypad|relay|gpio|rs-?232|ir emitter)\b/.test(value)) return "control";
  if (/\b(video wall|videowall|wall processor)\b/.test(value)) return "video-wall";
  if (/\b(multiview|multi-view|windowing|window processor)\b/.test(value)) return "multiview";
  if (/\b(matrix|matrix switcher|mx-|mmx|[0-9]{1,2}x[0-9]{1,2})\b/.test(value)) return "matrix";
  if (/\b(av over ip|av-over-ip|avoip|networkhd|encoder|decoder|transceiver|ip streaming)\b/.test(value)) return "av-over-ip";
  if (/\b(extender|extension|transmitter|receiver|hdbaset|hdbt|hdbase t|tx|rx)\b/.test(value)) return "extender";
  if (/\b(presentation|collaboration|uc|usb-c|usbc|conference|room switcher|scaler switcher)\b/.test(value)) return "presentation";
  if (/\b(audio|dante|aes67|amplifier|amp|speaker|microphone|mic)\b/.test(value)) return "audio";

  return "unknown";
}

function matchProductText(match: RigorousMatch): string {
  return compactCompareText(
    match.sku,
    match.name,
    match.family,
    match.wyrestorm.sku,
    match.wyrestorm.title,
    match.wyrestorm.domain,
    match.wyrestorm.role,
    match.wyrestorm.transport,
    match.wyrestorm.features,
    match.decision.summary,
  );
}

function competitorProductText(competitor: RigorousCompareResult["competitor"]): string {
  return compactCompareText(
    competitor.sku,
    competitor.title,
    competitor.brand,
    competitor.domain,
    competitor.role,
    competitor.transport,
    competitor.sourceLabel,
    competitor.profileEvidence,
  );
}

function isSupportOnlyClass(productClass: string): boolean {
  return productClass === "accessory" || productClass === "control";
}

function isSelectableWyrestormRecommendation(match: RigorousMatch, competitor: RigorousCompareResult["competitor"]): boolean {
  const outcome = match.decision.outcome;

  if (outcome !== "GOOD MATCH" && outcome !== "PARTIAL MATCH") return false;
  if (compareSkuKey(match.sku) === compareSkuKey(competitor.sku)) return false;

  const competitorClass = fundamentalProductClass(competitorProductText(competitor));
  const candidateClass = fundamentalProductClass(matchProductText(match));

  if (isSupportOnlyClass(candidateClass) && candidateClass !== competitorClass) return false;
  if (outcome === "GOOD MATCH") return true;

  return candidateClass !== "unknown" && candidateClass === competitorClass;
}

function recommendationProductType(match: RigorousMatch): string {
  return formatProfileValue(match.family || match.wyrestorm.domain || match.wyrestorm.role || match.name);
}

function shortRecommendationReason(match: RigorousMatch): string {
  const reason = match.decision.matches[0] || match.decision.summary || match.decision.nextAction;
  const cleanReason = reason.replace(/^WyreStorm evidence:\s*/i, "").trim();

  return cleanReason.length > 150 ? `${cleanReason.slice(0, 147).trim()}...` : cleanReason;
}

function ProductOptionCard({
  match,
  rank,
  selected,
  onSelect,
}: {
  match: RigorousMatch;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`wm-compare-option-card grid min-h-[88px] gap-2 rounded-2xl border p-3 text-left transition ${
        selected
          ? "border-emerald-200 bg-emerald-300 text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.22)]"
          : "border-emerald-400/45 bg-emerald-500/15 text-white hover:border-emerald-200 hover:bg-emerald-400/25"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-black uppercase tracking-[0.14em] opacity-70">Option {rank}</span>
          <h3 className="mt-1 text-lg font-black">{match.sku}</h3>
          <p className="mt-1 text-sm font-semibold opacity-75">{recommendationProductType(match)}</p>
        </div>
        <span className={`shrink-0 rounded-md border px-3 py-2 text-xs font-black ${selected ? "border-slate-950/20 bg-slate-950/10 text-slate-950" : outcomeClass(match.decision.outcome)}`}>
          {match.decision.outcome}
        </span>
      </div>
      <p className="text-xs leading-5 opacity-85">{shortRecommendationReason(match)}</p>
    </button>
  );
}

function EvidenceList({ title, items, tone }: { title: string; items?: string[]; tone: "match" | "gap" | "block" | "verify" }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

  if (!safeItems.length) return null;

  const marker = tone === "match" ? "OK" : tone === "block" ? "NO" : "!";
  const titleClass = tone === "match" ? "text-emerald-200" : tone === "block" ? "text-rose-200" : "text-amber-200";

  return (
    <section className="rounded-2xl border border-[#29465e] bg-[#071522] p-3">
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
    <section className="rounded-2xl border border-[#29465e] bg-[#081724] p-3" data-wingman-competitor-product-profile="true">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Competitor product profile</p>
          <h3 className="mt-1 text-xl font-black text-white">{competitor.brand} {competitor.sku}</h3>
        </div>
        <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
          {competitor.readiness}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#1b3348] bg-[#071522] p-2">
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
    <details className="mt-2 rounded-2xl border border-[#29465e] bg-[#081724] p-3" data-compare-evidence-drawer="true">
      <summary className="cursor-pointer text-sm font-black text-cyan-200">View comparison evidence</summary>

      <div className="mt-3 grid gap-3">
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-3">
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
    <section className="rounded-2xl border border-amber-400/45 bg-amber-400/10 p-3" data-wingman-live-lookup-retry="true">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-100">Need a live/spec source</p>
          <h2 className="mt-1 text-xl font-black text-white">Point Wingman at a product page and retry</h2>
        </div>
        <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-100">
          Retry lookup
        </span>
      </div>

      {status ? (
        <p className="mt-2 rounded-xl border border-amber-400/30 bg-[#071522] p-2 text-sm font-semibold text-amber-50">{status}</p>
      ) : null}

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Live lookup URL</span>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Paste a product page, reseller page, PDF datasheet, or public spec page"
            className="min-h-10 rounded-xl border border-[#29465e] bg-[#0d2133] px-3 text-sm font-semibold text-white"
          />
        </label>
        <button
          type="button"
          onClick={onRetry}
          disabled={disabled || !value.trim()}
          className="self-end rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Retry with URL
        </button>
      </div>
    </section>
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
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("request");
  const [selectedOptionSku, setSelectedOptionSku] = useState("");
  const [pendingSkuSelection, setPendingSkuSelection] = useState<PendingSkuSelection | null>(null);

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
    const selectedSku = sku.trim();

    if (!selectedSku) {
      return;
    }

    const selectedBrandForSku = brand || resolvedBrand;
    const normalisedSelection = normalizeCompetitorSku(selectedSku, selectedBrandForSku);
    const nextSku = normalisedSelection?.sku || selectedSku;
    const nextBrand = normalisedSelection?.brand || selectedBrandForSku;
    const nextCompareInput = [nextSku, productUrl, applicationContext]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" ");

    setCompetitorInput(nextSku);

    if (nextBrand) {
      setSelectedBrand(nextBrand);
      setCustomBrand("");
    }

    if (!products.length) {
      setPendingSkuSelection({
        brand: nextBrand,
        compareInput: nextCompareInput || nextSku,
        sku: nextSku,
        sourceUrl: productUrl.trim(),
      });
      setError("");
      setLookupStatus(`Loading product data before finding options for ${nextSku}.`);
      setState("analyzing");
      setWorkflowStep("options");
      return;
    }

    setError("");
    setLookupStatus(`Finding viable WyreStorm options for ${nextSku}.`);
    setState("analyzing");
    setWorkflowStep("options");
    setSelectedOptionSku("");
    setPendingSkuSelection(null);

    try {
      const compareResult = runKnownProfileCompare(
        nextCompareInput || nextSku,
        products,
        nextBrand,
        10,
        productUrl.trim(),
      );

      setResult(compareResult);
      setLookupStatus("");
      setState("results");
      setWorkflowStep("options");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
      setState("error");
      setWorkflowStep("request");
    }
  }, [applicationContext, productUrl, products, resolvedBrand]);

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
    if (!pendingSkuSelection || !products.length) {
      return;
    }

    setPendingSkuSelection(null);
    setError("");
    setLookupStatus(`Finding viable WyreStorm options for ${pendingSkuSelection.sku}.`);
    setState("analyzing");
    setWorkflowStep("options");
    setSelectedOptionSku("");

    try {
      const compareResult = runKnownProfileCompare(
        pendingSkuSelection.compareInput,
        products,
        pendingSkuSelection.brand,
        10,
        pendingSkuSelection.sourceUrl,
      );

      setResult(compareResult);
      setLookupStatus("");
      setState("results");
      setWorkflowStep("options");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
      setState("error");
      setWorkflowStep("request");
    }
  }, [pendingSkuSelection, products]);

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
      setSelectedOptionSku("");
      setPendingSkuSelection(null);

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
        setWorkflowStep("options");
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
    setLookupStatus("Trying the supplied product/spec URL before refreshing the WyreStorm options.");
    setSelectedOptionSku("");
    setPendingSkuSelection(null);

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
          ? `Live lookup read ${lookup.evidence.usefulPages} useful page${lookup.evidence.usefulPages === 1 ? "" : "s"} and refreshed the options.`
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
      setWorkflowStep("options");
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
    setState("input");
    setWorkflowStep("request");
    setSelectedOptionSku("");
    setPendingSkuSelection(null);
  };

  const viableMatches = useMemo(
    () => (result ? result.matches.filter((match) => isSelectableWyrestormRecommendation(match, result.competitor)).slice(0, 8) : []),
    [result],
  );
  const selectedMatch = useMemo(
    () => viableMatches.find((match) => compareSkuKey(match.sku) === compareSkuKey(selectedOptionSku)) ?? viableMatches[0] ?? null,
    [selectedOptionSku, viableMatches],
  );
  const evidenceMatch = selectedMatch ?? result?.matches[0] ?? null;
  const resultReady = state === "results" && Boolean(result);
  const activeStep = resultReady ? workflowStep : "request";

  const workflowSteps = [
    { key: "request", label: "1 Request", description: "Enter competitor product" },
    { key: "options", label: "2 Options", description: "Viable WyreStorm choices" },
    { key: "checks", label: "3 Checks", description: "Evidence and next action" },
  ] as const;

  const navButtonClass = (key: typeof workflowSteps[number]["key"], disabled: boolean) => {
    const active = activeStep === key;

    if (disabled) {
      return "rounded-xl border border-[#29465e] bg-[#071522] px-3 py-2 text-left opacity-45";
    }

    if (active) {
      return "rounded-xl border border-cyan-300 bg-cyan-300/15 px-3 py-2 text-left shadow-[0_0_18px_rgba(34,211,238,0.1)]";
    }

    return "rounded-xl border border-[#29465e] bg-[#071522] px-3 py-2 text-left transition hover:border-cyan-300/70 hover:bg-cyan-300/10";
  };

  return (
    <main className="wm-compare-page grid gap-1 pb-2 text-white" data-wingman-compare-screen="true" data-wingman-compare-decision-desk="true">
      <section className="wm-compare-compact-header flex flex-wrap items-center gap-2 rounded-xl border border-[#29465e] bg-[#071522] p-2">
        <h1 className="wm-compare-compact-title text-lg font-black">Compare replacement options</h1>
        <nav className="wm-compare-mini-steps grid flex-1 gap-1 md:grid-cols-3" aria-label="Compare workflow stages">
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
                <span className="block text-xs font-black text-white">{step.label}</span>
              </button>
            );
          })}
        </nav>
        <button type="button" onClick={handleReset} className="wm-compare-reset-button rounded-xl border border-cyan-300/50 px-3 py-2 text-xs font-black text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10">
          Reset Compare
        </button>
      </section>

      {state === "analyzing" ? (
        <section className="rounded-2xl border border-[#29465e] bg-[#071522] p-4 text-center">
          <p className="text-sm font-black text-cyan-300">Checking fit...</p>
        </section>
      ) : null}

      {activeStep === "request" && state !== "analyzing" ? (
        <section className="grid gap-2" data-compare-stage="request">
          <form onSubmit={handleSubmit} className="wm-compare-request-form rounded-2xl border border-[#29465e] bg-[#071522] p-3">
            <div className="wm-compare-request-grid grid gap-3">
              <section className="wm-compare-filter-panel rounded-2xl border border-[#29465e] bg-[#081724] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Manufacturer filter</p>
                  </div>
                  {effectiveBrand ? (
                    <button
                      type="button"
                      onClick={() => handleManufacturerSelect("")}
                      className="rounded-xl border border-cyan-300/50 px-3 py-2 text-xs font-black text-cyan-100"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>

                <div className="mt-2">
                  <CompareManufacturerCombobox
                    value={selectedBrand}
                    options={MANUFACTURER_SELECT_OPTIONS}
                    onChange={handleManufacturerSelect}
                  />
                </div>

                <div className="wm-compare-manufacturer-grid mt-3 grid gap-2" aria-label="Manufacturer quick filters">
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
                  <label className="mt-3 grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Custom manufacturer</span>
                    <input
                      value={customBrand}
                      onChange={(event) => setCustomBrand(event.target.value)}
                      placeholder="Type the manufacturer name"
                      className="min-h-10 rounded-xl border border-[#29465e] bg-[#0d2133] px-3 text-sm font-semibold text-white"
                    />
                  </label>
                ) : null}
              </section>

              <section className="wm-compare-sku-panel rounded-2xl border border-[#29465e] bg-[#081724] p-3">
                <CompareProductLookupInput
                  value={competitorInput}
                  onChange={setCompetitorInput}
                  onSelectSuggestion={(sku) => handleSkuSelect(sku, effectiveBrand || brandForCompetitorSku(sku))}
                  suggestions={skuSuggestions}
                  placeholder={effectiveBrand ? `Search ${effectiveBrand} SKUs or paste a product description` : "Search any competitor SKU or paste a product description"}
                  maxVisibleSuggestions={60}
                />

                <div className="wm-compare-sku-browser mt-3 grid gap-2">
                  <div className="wm-compare-sku-browser-head flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                        {effectiveBrand ? `${effectiveBrand} SKU list` : "Competitor SKU list"}
                      </p>
                    </div>
                    <span className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-50">
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
                          className={`grid min-h-11 gap-1 rounded-xl border px-3 py-2 text-left transition ${compareSkuKey(competitorInput) === compareSkuKey(sku) ? "border-emerald-200 bg-emerald-300 text-slate-950" : "border-emerald-500/35 bg-emerald-500/10 text-emerald-50 hover:border-emerald-200 hover:bg-emerald-400/20"}`}
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

            <details className="wm-compare-context-drawer rounded-2xl border border-[#29465e] bg-[#081724] p-3" open={Boolean(productUrl.trim() || applicationContext.trim()) || undefined}>
              <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.16em] text-cyan-200">Add URL or context</summary>
              <div className="wm-compare-context-grid mt-3">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Source/spec page</span>
                  <input
                    value={productUrl}
                    onChange={(event) => setProductUrl(event.target.value)}
                    placeholder="Product page or PDF URL"
                    className="min-h-10 rounded-xl border border-[#29465e] bg-[#0d2133] px-3 text-sm font-semibold text-white"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Application context</span>
                  <input
                    value={applicationContext}
                    onChange={(event) => setApplicationContext(event.target.value)}
                    placeholder="Meeting room, 4K wall, AVoIP estate..."
                    className="min-h-10 rounded-xl border border-[#29465e] bg-[#0d2133] px-3 text-sm font-semibold text-white"
                  />
                </label>
              </div>
            </details>

            {error ? (
              <div className="rounded-xl border border-rose-400 bg-rose-400/10 p-3 text-sm font-semibold text-rose-100">{error}</div>
            ) : null}

            {normalisedSku?.corrected ? (
              <div className="rounded-xl border border-cyan-300/35 bg-cyan-300/10 p-3 text-sm font-semibold text-cyan-50" data-wingman-sku-normalisation="true">
                Interpreting as {normalisedSku.brand} {normalisedSku.sku}
              </div>
            ) : null}
            <p
              className="wm-compare-auto-advance-note sr-only"
              data-wingman-compare-auto-advance="true"
            >
              Select a competitor SKU above to show WyreStorm options automatically. Typed entries can still use Enter.
            </p>
          </form>
        </section>
      ) : null}

      {resultReady && result && activeStep === "options" ? (
        <section className="grid gap-2" data-compare-stage="options">
          <section className="wm-compare-options-strip rounded-xl border border-[#29465e] bg-[#071522] p-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-black text-cyan-300">Viable product choices</h2>
              <span className="rounded-md border border-emerald-300/40 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-100">
                {viableMatches.length} viable
              </span>
            </div>
          </section>

          {viableMatches.length ? (
            <section className="grid gap-2 lg:grid-cols-2">
              {viableMatches.map((match, index) => (
                <ProductOptionCard
                  key={`${match.sku}-${index}`}
                  match={match}
                  rank={index + 1}
                  selected={compareSkuKey(selectedMatch?.sku) === compareSkuKey(match.sku)}
                  onSelect={() => setSelectedOptionSku(match.sku)}
                />
              ))}
            </section>
          ) : (
            <section className="rounded-2xl border border-amber-400/45 bg-amber-400/10 p-3">
              <h2 className="text-base font-black text-amber-100">
                No suitable WyreStorm match found from the current data. Search wider, enter a product description, or ask pre-sales to review.
              </h2>
            </section>
          )}

          <ComparisonEvidenceDetails result={result} topMatch={evidenceMatch} />

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setWorkflowStep("request")} className="rounded-xl border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100">
              Back to request
            </button>
            <button type="button" onClick={() => setWorkflowStep("checks")} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950">
              {viableMatches.length ? "Continue to next checks" : "Search wider / add evidence"}
            </button>
          </div>
        </section>
      ) : null}

      {resultReady && result && activeStep === "checks" ? (
        <section className="grid gap-2" data-compare-stage="checks">
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
            <section className="rounded-2xl border border-[#29465e] bg-[#071522] p-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Stage 3 / Next checks</p>
              <h2 className="mt-1 text-lg font-black text-cyan-300">What to ask or check next</h2>
              {selectedMatch ? (
                <p className="mt-1 text-sm leading-5 text-white/65">
                  Selected option: <strong className="text-white">{selectedMatch.sku}</strong> ({selectedMatch.decision.outcome}).
                </p>
              ) : null}
              <ul className="mt-3 space-y-2 text-sm leading-5 text-white/75">
                {result.nextSteps.map((step, index) => (
                  <li key={`${step}-${index}`} className="rounded-xl border border-[#29465e] bg-[#081724] p-2">{step}</li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-3">
              <h2 className="text-base font-black text-emerald-100">No additional checks returned</h2>
            </section>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setWorkflowStep("options")} className="rounded-xl border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100">
              Back to options
            </button>
            <button type="button" onClick={handleReset} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950">
              Compare another product
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
