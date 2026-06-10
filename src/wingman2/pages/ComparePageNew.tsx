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
import { COMPETITOR_SKU_SEED_CATALOG } from "../lib/competitorProductIntelligence";
import {
  rigorousCompare,
  type RigorousCompareResult,
  type RigorousMatch,
} from "../lib/rigorousCompare";
import type { CompareDecisionOutcome } from "../lib/competitorCompareDecision";
import { buildCompareFeatureMatrixRows } from "../lib/compareFeatureMatrix";

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

function resolveSelectedBrand(selectedBrand: string, customBrand: string): string | undefined {
  if (selectedBrand === CUSTOM_BRAND_VALUE) {
    return customBrand.trim() || undefined;
  }

  return selectedBrand || undefined;
}

function EvidenceList({ title, items, tone }: { title: string; items: string[]; tone: "match" | "gap" | "block" | "verify" }) {
  if (!items.length) return null;

  const marker = tone === "match" ? "OK" : tone === "block" ? "NO" : "!";
  const titleClass = tone === "match" ? "text-emerald-200" : tone === "block" ? "text-rose-200" : "text-amber-200";

  return (
    <section className="rounded-2xl border border-[#29465e] bg-[#071522] p-4">
      <h4 className={`text-sm font-black ${titleClass}`}>{title}</h4>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-white/75">
        {items.map((item, index) => (
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

      {competitor.datasheetUrl ? (
        <a href={competitor.datasheetUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-cyan-200">
          Open source product family
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
          <p className="text-sm leading-6 text-white/75">{decision.summary}</p>

          <CompareSpecificationMatrix rows={matrixRows} />

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <EvidenceList title="Confirmed matches" items={decision.matches} tone="match" />
            <EvidenceList title="Blocking differences" items={decision.blockers} tone="block" />
            <EvidenceList title="Gaps to explain" items={decision.gaps} tone="gap" />
            <EvidenceList title="Verify before customer issue" items={decision.verify} tone="verify" />
          </div>

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
  const [liveProfile, setLiveProfile] = useState<CompetitorProfile | null>(null);
  const resolvedBrand = useMemo(() => resolveSelectedBrand(selectedBrand, customBrand), [customBrand, selectedBrand]);
  const compareInputText = useMemo(
    () => [competitorInput, productUrl, applicationContext].map((value) => value.trim()).filter(Boolean).join(" "),
    [applicationContext, competitorInput, productUrl],
  );
  const skuSuggestions = useMemo(
    () => compareSkuSuggestions(competitorInput, resolvedBrand),
    [competitorInput, resolvedBrand],
  );

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/product-intelligence-index.json", { cache: "no-store" });
        if (!response.ok) throw new Error("Product index unavailable");
        const data = await response.json();
        setProducts(readIndexedProducts(data));
      } catch (err) {
        console.error("Failed to load products:", err);
      }
    }

    void loadProducts();
  }, []);

  useEffect(() => {
    if (competitorInput.trim().length >= 3) {
      setLiveProfile(analyzeCompetitor(compareInputText || competitorInput, resolvedBrand));
      return;
    }

    setLiveProfile(null);
  }, [compareInputText, competitorInput, resolvedBrand]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!competitorInput.trim()) {
        setError("Enter a competitor SKU, product name or pasted description.");
        setState("error");
        return;
      }

      if (!productUrl.trim()) {
        setError("Add a source page containing the competitor product details or specification.");
        setState("error");
        return;
      }

      if (products.length === 0) {
        setError("Product data has not loaded yet. Refresh the page or check the product intelligence index.");
        setState("error");
        return;
      }

      setState("analyzing");

      try {
        const compareResult = rigorousCompare(compareInputText || competitorInput, products, resolvedBrand, 10);
        setResult(compareResult);
        setError("");
        setState("results");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Comparison failed");
        setState("error");
      }
    },
    [compareInputText, competitorInput, productUrl, products, resolvedBrand],
  );

  const handleReset = () => {
    setCompetitorInput("");
    setSelectedBrand("");
    setCustomBrand("");
    setProductUrl("");
    setApplicationContext("");
    setResult(null);
    setError("");
    setLiveProfile(null);
    setState("input");
  };

  return (
    <main className="grid gap-4 pb-6 text-white" data-wingman-compare-decision-desk="true">
      <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Competitor replacement desk</p>
        <h1 className="mt-2 text-3xl font-black">Decide whether WyreStorm is a good, partial or no-match replacement</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/70">
          Enter the competitor product, paste useful context, then review the match evidence, blocking differences, verification points and customer-safe next action.
        </p>
      </section>

      {(state === "input" || state === "error") ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <form onSubmit={handleSubmit} className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
            <div className="grid gap-4">
              <CompareProductLookupInput
                value={competitorInput}
                onChange={setCompetitorInput}
                suggestions={skuSuggestions}
                placeholder="Example: DM-NVX-350, DMNVX350, NAV E 501, VS88H2A, or pasted product description"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <CompareManufacturerCombobox
                  value={selectedBrand}
                  options={MANUFACTURER_SELECT_OPTIONS}
                  onChange={(value) => {
                    setSelectedBrand(value);
                    if (value !== CUSTOM_BRAND_VALUE) {
                      setCustomBrand("");
                    }
                  }}
                />

                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Source/spec page</span>
                  <input
                    value={productUrl}
                    onChange={(event) => setProductUrl(event.target.value)}
                    placeholder="Any page with product details or specifications"
                    required
                    className="min-h-12 rounded-2xl border border-[#29465e] bg-[#0d2133] px-4 text-sm font-semibold text-white"
                  />
                </label>
              </div>

              {selectedBrand === CUSTOM_BRAND_VALUE ? (
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Custom manufacturer</span>
                  <input
                    value={customBrand}
                    onChange={(event) => setCustomBrand(event.target.value)}
                    placeholder="Type the manufacturer name"
                    className="min-h-12 rounded-2xl border border-[#29465e] bg-[#0d2133] px-4 text-sm font-semibold text-white"
                  />
                </label>
              ) : null}

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Application context</span>
                <input
                  value={applicationContext}
                  onChange={(event) => setApplicationContext(event.target.value)}
                  placeholder="Example: lecture theatre, meeting room, 4K video wall, AVoIP estate"
                  className="min-h-12 rounded-2xl border border-[#29465e] bg-[#0d2133] px-4 text-sm font-semibold text-white"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-400 bg-rose-400/10 p-4 text-sm font-semibold text-rose-100">{error}</div>
              ) : null}

              <button
                type="submit"
                disabled={!competitorInput.trim() || !productUrl.trim()}
                className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Find WyreStorm Alternatives
              </button>
            </div>
          </form>

          <aside className="grid gap-4">
            <article className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
              <h2 className="text-xl font-black text-cyan-300">What Wingman will check</h2>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-white/70">
                <li>OK product purpose and technology class</li>
                <li>OK manual manufacturer override or auto-detect</li>
                <li>OK source/spec page for evidence and dataset improvement</li>
                <li>OK missing-hyphen and partial SKU interpretation</li>
                <li>OK competitor product profile plus feature-by-feature grid</li>
                <li>OK input/output role and capacity</li>
                <li>OK signal, USB, audio, control and network differences</li>
                <li>OK blocking gaps and verification points</li>
                <li>OK GOOD / PARTIAL / NO MATCH verdict</li>
              </ul>
            </article>

            {liveProfile ? (
              <article className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">Live interpretation</p>
                <dl className="mt-3 grid gap-3 text-sm">
                  <div><dt className="text-white/45">Manufacturer used</dt><dd className="font-black text-white">{resolvedBrand || liveProfile.brand}</dd></div>
                  <div><dt className="text-white/45">Auto detected</dt><dd className="font-black text-white">{liveProfile.brand}</dd></div>
                  <div><dt className="text-white/45">Technology</dt><dd className="font-black text-white">{liveProfile.technologyClass.replace(/_/g, " ")}</dd></div>
                  <div><dt className="text-white/45">Role</dt><dd className="font-black text-white">{liveProfile.role}</dd></div>
                  <div><dt className="text-white/45">Confidence</dt><dd className="font-black text-white">{liveProfile.confidence}</dd></div>
                </dl>
              </article>
            ) : null}
          </aside>
        </section>
      ) : null}

      {state === "analyzing" ? (
        <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-8 text-center">
          <p className="text-lg font-black text-cyan-300">Checking product role, specification fit and blocking differences...</p>
        </section>
      ) : null}

      {state === "results" && result ? (
        <section className="grid gap-4">
          <article className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Competitor request</p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {result.competitor.brand} {result.competitor.sku}
                </h2>
                <p className="mt-1 text-sm text-white/55">
                  {(result.competitor.domain || "type unverified").toString().replace(/_/g, " ")} Â· {result.competitor.role || "role unverified"}
                  {result.competitor.maxResolution ? ` Â· ${result.competitor.maxResolution}` : ""}
                </p>
              </div>

              {result.topOutcome !== "NONE" ? (
                <span className={`rounded-full border px-4 py-2 text-sm font-black ${OUTCOME_STYLES[result.topOutcome as CompareDecisionOutcome]}`}>
                  {result.topOutcome}
                </span>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
              <p className="text-sm font-black text-cyan-200">Recommendation</p>
              <p className="mt-2 text-sm leading-6 text-white">{result.recommendation}</p>
            </div>

            <div className="mt-4">
              <CompetitorProductProfileCard result={result} />
            </div>
          </article>

          {result.matches.length ? (
            <section className="grid gap-3">
              <h2 className="text-xl font-black text-cyan-300">WyreStorm candidates</h2>
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

          {result.nextSteps.length ? (
            <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
              <h2 className="text-xl font-black text-cyan-300">What to ask or check next</h2>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-white/75">
                {result.nextSteps.map((step, index) => (
                  <li key={`${step}-${index}`} className="rounded-2xl border border-[#29465e] bg-[#081724] p-3">{step}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-cyan-300 px-5 py-3 text-sm font-black text-cyan-100"
          >
            Compare another product
          </button>
        </section>
      ) : null}
    </main>
  );
}
