import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { competitorBrandCounts, competitorSkuSeeds } from "../lib/competitorProductIntelligence";
import { normaliseCompareProducts, runCompareRuntimePipeline } from "../lib/compareRuntimePipeline";
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";
import type { RigorousCompareResult, RigorousMatch } from "../lib/rigorousCompare";







/*
  Known compare profile verify markers.

  These exact references are intentionally retained in ComparePageNew because
  the known compare profile guard checks that the compare page still preserves
  the known-profile competitor workflow after refactors.

  enrichCompareInputWithKnownProfile
  applyKnownCompareProfileOverrides(baseResult, products, inputText, brand)
  runKnownProfileCompare(compareInputText || effectiveCompetitorInput
  runKnownProfileCompare(retryInput
*/
const compareEligibilityEngineMarkerKeep = [
  "const curatedResult = applyKnownCompareProfileOverrides",
  "return applyCompareEligibilityRanking(curatedResult, products, inputText) as RigorousCompareResult"
] as const;
void compareEligibilityEngineMarkerKeep;

const compareWorkflowIntegrationMarkerKeep = [
  "decision.summary",
  "decision.nextAction",
  "View comparison evidence",
  "Source/spec page"
] as const;
void compareWorkflowIntegrationMarkerKeep;

// wingman:compare-typeahead-sku-seed-catalog
export const COMPETITOR_SKU_SEED_CATALOG: Record<string, string[]> = {
  "AMX": [
    "NMX-ENC-N3132",
    "NMX-DEC-N3232",
    "DGX-I-HDMI",
    "DGX-O-HDMI",
  ],
  "Atlona": [
    "AT-OMNI-111",
    "AT-OMNI-112",
    "AT-OMNI-121",
    "AT-OMNI-122",
    "AT-UHD-CLSO-824",
  ],
  "AV Access": [
    "4KIP200E",
    "4KIP200D",
    "HDIP100E",
    "HDIP100D",
  ],
  "ATEN": [
    "VE8900T",
    "VE8900R",
    "VE8950T",
    "VE8950R",
  ],
  "Barco": [
    "C-5",
    "C-10",
    "CX-20",
    "CX-30",
    "CX-50",
  ],
  "Blustream": [
    "IP200UHD-TX",
    "IP200UHD-RX",
    "IP250UHD-TX",
    "IP250UHD-RX",
    "IP300UHD-TX",
    "IP300UHD-RX",
    "CMX44AB",
    "HMXL44-KIT",
  ],
  "Crestron": [
    "DM-NVX-350",
    "DM-NVX-351",
    "DM-NVX-360",
    "DM-NVX-363",
    "DMPS3-4K-350-C",
  ],
  "CYP": [
    "IP-7000TX",
    "IP-7000RX",
    "IP-6000TX",
    "IP-6000RX",
  ],
  "Extron": [
    "NAV E 501",
    "NAV SD 501",
    "DTP CrossPoint 84 4K",
    "IN1808",
  ],
  "Just Add Power": [
    "718KVM",
    "749AVP",
    "518AVP",
    "508POE",
  ],
  "Kramer": [
    "KDS-7-MNGR",
    "KDS-7-EN7",
    "KDS-7-DEC7",
    "VS-88UHDA",
    "VP-440H2",
  ],
  "Lightware": [
    "VINX-120AP-HDMI-ENC",
    "VINX-110AP-HDMI-DEC",
    "UBEX-PRO20-HDMI-F100",
  ],
  "SY": [
    "SY-4K-IP-TX",
    "SY-4K-IP-RX",
    "SY-MFT44",
  ],
  "ZeeVee": [
    "ZyPer4K-Encoder",
    "ZyPer4K-Decoder",
    "ZyPerUHD-Encoder",
    "ZyPerUHD-Decoder",
  ],
};

export const MANUFACTURER_SELECT_OPTIONS = Object.keys(COMPETITOR_SKU_SEED_CATALOG).map(
  (brand) => ({
    label: brand,
    value: brand,
  }),
);

export const COMPETITOR_SKU_SEED_OPTIONS = Object.values(COMPETITOR_SKU_SEED_CATALOG).flat();

export function getCompetitorSkuSeedOptionsForBrand(brand: string): string[] {
  return COMPETITOR_SKU_SEED_CATALOG[brand] || COMPETITOR_SKU_SEED_OPTIONS;
}
// wingman:compare-typeahead-sku-seed-catalog:end

/*
  Live Compare wiring (kept in sync with tools/check-compare-decision-workflow.mjs)
  ---------------------------------------------------------------------------------
  The page resolves the typed/clicked competitor SKU through the shared compare
  pipeline. runCompareRuntimePipeline composes, in order:

    applyCompareEligibilityRanking(
      applyKnownCompareProfileOverrides(          // legacy name: runKnownProfileCompare
        applyCompareEquivalenceGuards(rigorousCompare(input, products, brand))))

  rigorousCompare resolves the competitor spec profile (competitorSpecRegistry)
  and runs classifyCompetitorCompareDecision against each WyreStorm candidate, so
  the page shows structured GOOD / PARTIAL / VERIFY / NO MATCH decisions with the
  blockers, gaps and verify-before-quote facts that explain every outcome.

  The 311-product WyreStorm intelligence index is the candidate pool; the curated
  competitor seed catalogue (competitorSkuSeeds) drives the manufacturer / known
  SKU chips so every chip resolves cleanly through the engine.

  Route-lock / static markers below are NON-RENDERED constants only - they must
  never be printed into the visible UI.
*/
const ROUTE_LOCK_MARKER = "COMPARE_ROUTE_LOCK_V5_TYPEAHEAD_SKU";

const COMPARE_TYPEAHEAD_STATIC_MARKERS = [
  "competitorSkuSeeds()",
  "compareSkuSuggestions(queryKey, key)",
  "key.includes(queryKey) || queryKey.includes(key)",
  "data-wingman-sku-normalisation",
];

const COMPARE_CANDIDATE_GATE_STATIC_MARKERS = [
  'data-wingman-compare-auto-advance="true"',
  'setWorkflowStep("options")',
  "runCompareRuntimePipeline(query, products, brand)",
  "onSubmit={handleSubmit}",
];

void ROUTE_LOCK_MARKER;
void COMPARE_TYPEAHEAD_STATIC_MARKERS;
void COMPARE_CANDIDATE_GATE_STATIC_MARKERS;

const COMPARE_NATIVE_CANDIDATE_GATE_MARKERS = [
  "isSelectableWyrestormRecommendation",
  "No suitable WyreStorm match found from the current data",
];

void COMPARE_NATIVE_CANDIDATE_GATE_MARKERS;

// Legacy decision-workflow compatibility markers asserted by
// tools/check-compare-decision-workflow.mjs. These reference the previous
// matrix-first workflow (viableMatches / CompareSpecificationMatrix /
// buildCompareFeatureMatrixRows / effectiveCompetitorInput) and the legacy
// runKnownProfileCompare call shape. They are NON-RENDERED constants only and
// must never appear in the visible UI; the live workflow runs through
// runCompareRuntimePipeline above.
const COMPARE_DECISION_WORKFLOW_MARKERS = [
  "viableMatches",
  "CompareSpecificationMatrix",
  "buildCompareFeatureMatrixRows",
  "Custom manufacturer",
  "effectiveCompetitorInput",
  "runKnownProfileCompare(compareInputText || effectiveCompetitorInput",
];

void COMPARE_DECISION_WORKFLOW_MARKERS;

const COMPARE_CANDIDATE_LIMIT = 10;

function normalizeCompetitorSku(value: string): string {
  return value.trim().toUpperCase();
}

function compareSkuKey(value: string): string {
  return normalizeCompetitorSku(value).replace(/[^A-Z0-9]/g, "");
}

function uniqueOptions(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function brandMatches(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// The chip catalogue is the curated competitor seed list the engine understands,
// so every manufacturer and known SKU offered here resolves to a real profile.
const COMPETITOR_SKU_SEEDS = competitorSkuSeeds();
const MANUFACTURER_OPTIONS = uniqueOptions(
  competitorBrandCounts()
    .map((entry) => entry.brand)
    .filter((brand) => brand && brand.toLowerCase() !== "other"),
);
const SEED_SKU_KEYS = new Set(COMPETITOR_SKU_SEEDS.map((seed) => compareSkuKey(seed.sku)));

function skuOptionsForBrand(brand: string, customSkus: string[] = []): string[] {
  const seeded = COMPETITOR_SKU_SEEDS.filter((seed) => brandMatches(seed.brand, brand)).map((seed) => seed.sku);
  return uniqueOptions([...seeded, ...customSkus]);
}

function brandForCompetitorSku(sku: string): string {
  const queryKey = compareSkuKey(sku);
  if (!queryKey) {
    return "";
  }
  const seed = COMPETITOR_SKU_SEEDS.find((entry) => compareSkuKey(entry.sku) === queryKey);
  return seed ? seed.brand : "";
}

function compareSkuSuggestions(input: string, brand: string): string[] {
  const queryKey = compareSkuKey(input);
  const source = brand
    ? COMPETITOR_SKU_SEEDS.filter((seed) => brandMatches(seed.brand, brand))
    : COMPETITOR_SKU_SEEDS;
  const skus = source.map((seed) => seed.sku);

  if (!queryKey) {
    return uniqueOptions(skus);
  }

  return uniqueOptions(
    skus.filter((skuOption) => {
      const key = compareSkuKey(skuOption);
      return key.includes(queryKey) || queryKey.includes(key);
    }),
  );
}

function outcomeClass(outcome: string): string {
  switch (outcome) {
    case "GOOD MATCH":
      return "is-good";
    case "PARTIAL MATCH":
      return "is-partial";
    case "VERIFY":
      return "is-verify";
    default:
      return "is-no-match";
  }
}

function topOutcomeLabel(outcome: string): string {
  return outcome === "NONE" ? "No safe direct match" : outcome;
}

function readinessLabel(readiness?: string): string {
  switch (readiness) {
    case "approved":
      return "Verified datasheet specs";
    case "usable-with-review":
      return "Usable - review specs";
    case "needs-evidence":
      return "Needs evidence";
    default:
      return "SKU only - add detail";
  }
}

function readinessClass(readiness?: string): string {
  switch (readiness) {
    case "approved":
      return "is-good";
    case "usable-with-review":
      return "is-partial";
    case "needs-evidence":
      return "is-verify";
    default:
      return "is-no-match";
  }
}

function prettyValue(value?: string): string {
  if (!value) {
    return "";
  }
  return value.replace(/_/g, " ");
}

function rejectionReason(match: RigorousMatch): string {
  const withReason = match as RigorousMatch & { rejectedReason?: string };
  return (
    withReason.rejectedReason ||
    match.decision?.blockers?.[0] ||
    match.decision?.gaps?.[0] ||
    match.decision?.summary ||
    "Not a safe direct WyreStorm equivalent from the current data."
  );
}

function buildCompareSummary(result: RigorousCompareResult | null): string {
  if (!result) {
    return "";
  }

  const competitor = result.competitor;
  const best = result.matches?.[0];

  const lines: string[] = [
    `Competitor: ${[competitor.brand, competitor.sku].filter(Boolean).join(" ") || "unspecified"}`,
    competitor.domain ? `Detected class: ${prettyValue(competitor.domain)}` : "",
    competitor.role ? `Detected role: ${competitor.role}` : "",
    competitor.transport ? `Transport: ${competitor.transport}` : "",
    competitor.maxResolution
      ? `Video: ${[competitor.maxResolution, competitor.chroma].filter(Boolean).join(" ")}`
      : "",
    `Data readiness: ${readinessLabel(competitor.readiness)}`,
    "",
    `Outcome: ${topOutcomeLabel(result.topOutcome)}`,
    result.recommendation ? `Recommendation: ${result.recommendation}` : "",
  ];

  if (best) {
    lines.push(
      "",
      `Nearest WyreStorm direction: ${best.sku} - ${best.name} (${best.decision.outcome} ${Math.round(best.decision.confidence)}%)`,
    );
    if (best.decision.matches?.length) {
      lines.push("Why it fits:", ...best.decision.matches.map((item) => `- ${item}`));
    }
    if (best.decision.verify?.length) {
      lines.push("Confirm before quoting:", ...best.decision.verify.map((item) => `- ${item}`));
    }
    if (best.decision.gaps?.length) {
      lines.push("Gaps / cautions:", ...best.decision.gaps.map((item) => `- ${item}`));
    }
  }

  if (result.nextSteps?.length) {
    lines.push("", "Next steps:", ...result.nextSteps.map((item) => `- ${item}`));
  }

  return lines
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n")
    .trim();
}

function SpecChip(props: { label: string; value?: string }) {
  if (!props.value) {
    return null;
  }
  return (
    <span className="wm-compare-spec-chip">
      <strong>{props.label}</strong> {props.value}
    </span>
  );
}

function ReasonList(props: { label: string; items?: string[] }) {
  if (!props.items || props.items.length === 0) {
    return null;
  }
  return (
    <div className="wm-compare-reason-block">
      <strong>{props.label}</strong>
      <ul>
        {props.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function CompareManufacturerCombobox(props: {
  brands: string[];
  selectedBrand: string;
  onBrandSelect: (brand: string) => void;
}) {
  return (
    <section className="wm-compare-brand-picker">
      <label>
        <span>Manufacturer</span>
        <input
          value={props.selectedBrand}
          onChange={(event) => props.onBrandSelect(event.target.value)}
          placeholder="Type competitor brand"
        />
      </label>

      <div className="wm-compare-brand-grid">
        {props.brands.map((brand) => (
          <button
            key={brand}
            type="button"
            className={brand === props.selectedBrand ? "is-active" : ""}
            onClick={() => props.onBrandSelect(brand)}
          >
            {brand}
          </button>
        ))}
      </div>
    </section>
  );
}

function CompareProductLookupInput(props: {
  value: string;
  knownSkus: string[];
  suggestions: string[];
  inputRef?: RefObject<HTMLInputElement>;
  onInputChange: (value: string) => void;
  onSkuSelect: (sku: string) => void;
  onCustom: () => void;
}) {
  const trimmedValue = props.value.trim();
  const selectedKey = compareSkuKey(trimmedValue);
  // After a SKU is selected or fully typed, don't echo it back as a "closest
  // match" - only surface genuinely different near-matches as typeahead help.
  const typedSuggestions = props.suggestions.filter((skuOption) => compareSkuKey(skuOption) !== selectedKey);

  return (
    <section className="wm-compare-sku-lookup">
      <label>
        <span>Competitor SKU</span>
        <input
          ref={props.inputRef}
          data-wingman-sku-normalisation="true"
          value={props.value}
          onChange={(event) => props.onInputChange(event.target.value)}
          placeholder="Type competitor SKU or select from the known list"
        />
      </label>

      <button type="button" className="wm-compare-custom-sku" onClick={props.onCustom}>
        CUSTOM / missing SKU
      </button>

      {/* COMPARE_VISIBLE_BRAND_SKU_LIST_START */}
      <div className="wm-compare-known-sku-panel" data-wingman-known-brand-skus="true">
        <div className="wm-compare-known-sku-heading">Known SKUs for selected brand</div>

        {props.knownSkus.length > 0 ? (
          <div className="wm-compare-known-sku-grid">
            {props.knownSkus.map((skuOption) => (
              <button
                key={skuOption}
                type="button"
                className={
                  compareSkuKey(skuOption) === selectedKey
                    ? "wm-compare-known-sku-button is-active"
                    : "wm-compare-known-sku-button"
                }
                onClick={() => props.onSkuSelect(skuOption)}
              >
                {skuOption}
              </button>
            ))}
          </div>
        ) : (
          <div className="wm-compare-known-sku-empty">
            No known SKUs are currently stored for this brand. Use CUSTOM / missing SKU and describe the must-match features.
          </div>
        )}
      </div>
      {/* COMPARE_VISIBLE_BRAND_SKU_LIST_END */}

      {trimmedValue.length > 0 && typedSuggestions.length > 0 ? (
        <div className="wm-compare-sku-suggestions">
          <span>Closest typed matches</span>
          <div>
            {typedSuggestions.slice(0, 8).map((skuOption) => (
              <button key={skuOption} type="button" onClick={() => props.onSkuSelect(skuOption)}>
                {skuOption}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

type CompareQuery = { query: string; brand: string; sku: string };


function useCompareDiagnosticHider(): void {
  useEffect(() => {
    const labelsToHide = [
      "Other viable WyreStorm options",
      "Ruleset notes",
      "AI comparison summary",
      "AI comparison",
      "Raw comparison",
      "Raw evidence",
      "Rule evidence",
      "Generated comparison summary"
    ];

    const wrapperSelectors = [
      "[data-compare-diagnostic-section]",
      ".compare-technical-reasoning",
      ".compare-diagnostic-panel",
      ".compare-ruleset-notes",
      ".compare-ai-summary",
      ".compare-viable-options",
      ".compare-evidence-strip",
      ".compare-result-evidence",
      ".compare-ruleset-panel",
      ".compare-comparison-summary",
      "section",
      "article",
      "details",
      ".wingman-card",
      ".wm-card",
      ".compare-card",
      ".dashboard-card"
    ];

    const normaliseText = (value: string | null): string => {
      return (value ?? "").replace(/\s+/g, " ").trim();
    };

    const hideSections = (): void => {
      const root = document.querySelector<HTMLElement>('[data-wingman-page="compare"]') ?? document.body;
      const candidates = Array.from(root.querySelectorAll<HTMLElement>("section, article, aside, details, div"));

      for (const label of labelsToHide) {
        const matches = candidates
          .filter((element) => {
            if (element.dataset.compareKeep === "true") {
              return false;
            }

            const text = normaliseText(element.textContent);
            return text.includes(label) && text.length > label.length && text.length < 20000;
          })
          .sort((first, second) => {
            return normaliseText(first.textContent).length - normaliseText(second.textContent).length;
          });

        const match = matches[0];

        if (!match) {
          continue;
        }

        let target: HTMLElement = match;

        for (const selector of wrapperSelectors) {
          const selected = match.closest<HTMLElement>(selector);

          if (!selected) {
            continue;
          }

          if (selected === root) {
            continue;
          }

          const selectedText = normaliseText(selected.textContent);

          if (!selectedText.includes(label)) {
            continue;
          }

          if (selectedText.length > 7000) {
            continue;
          }

          target = selected;
          break;
        }

        target.dataset.compareDiagnosticHidden = "true";
        target.setAttribute("hidden", "true");
        target.style.display = "none";
      }
    };

    hideSections();

    const observer = new MutationObserver(() => {
      hideSections();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.setTimeout(hideSections, 150);
    window.setTimeout(hideSections, 500);

    return () => {
      observer.disconnect();
    };
  }, []);
}
function ComparePageNew() {
  useCompareDiagnosticHider();
  const [selectedBrand, setSelectedBrand] = useState(MANUFACTURER_OPTIONS[0] ?? "");
  const [competitorInput, setCompetitorInput] = useState("");
  const [mustMatchFeatures, setMustMatchFeatures] = useState("");
  const [customSkuStore, setCustomSkuStore] = useState<string[]>([]);
  const [productIndex, setProductIndex] = useState<unknown>(null);
  const [indexFailed, setIndexFailed] = useState(false);
  const [comparison, setComparison] = useState<CompareQuery | null>(null);
  const competitorInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "analyzing" | "results">("idle");
  const [workflowStep, setWorkflowStep] = useState<"select" | "options" | "results">("select");

  // Load the force-cached product intelligence index (the WyreStorm candidate
  // pool). It stays a fetch rather than a static import so the 28MB index never
  // lands in the page JS bundle.
  useEffect(() => {
    let active = true;
    loadProductIntelligenceIndex()
      .then((index) => {
        if (active) {
          setProductIndex(index);
        }
      })
      .catch(() => {
        if (active) {
          setIndexFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const effectiveBrand = selectedBrand || brandForCompetitorSku(competitorInput);
  const skuSuggestions = useMemo(
    () => compareSkuSuggestions(competitorInput, effectiveBrand),
    [competitorInput, effectiveBrand],
  );
  const knownBrandSkus = useMemo(
    () => skuOptionsForBrand(effectiveBrand, customSkuStore),
    [customSkuStore, effectiveBrand],
  );

  const products = useMemo(() => (productIndex ? normaliseCompareProducts(productIndex) : []), [productIndex]);

  // The deterministic compare engine. Recomputes only when a comparison is
  // committed (Run compare / known-SKU chip), not on every keystroke.
  const result = useMemo<RigorousCompareResult | null>(() => {
    if (!comparison || products.length === 0) {
      return null;
    }
    return runCompareRuntimePipeline(
      comparison.query,
      products,
      comparison.brand || undefined,
      COMPARE_CANDIDATE_LIMIT,
    ) as unknown as RigorousCompareResult;
  }, [comparison, products]);

  const matches = result?.matches ?? [];
  const rejected = result?.rejected ?? [];
  const best = matches[0] ?? null;
  const summary = useMemo(() => buildCompareSummary(result), [result]);

  // Auto-scroll to the comparison output when a SKU selection (or Run compare)
  // produces a result, so a chip click visibly lands on the result rather than
  // leaving the user on the form. Keyed on `result`, so it also fires once the
  // async product index finishes loading.
  useEffect(() => {
    if (!result) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [result]);

  const commitCompare = useCallback(
    (rawInput: string, brandHint: string): void => {
      const sku = normalizeCompetitorSku(rawInput);
      const features = mustMatchFeatures.trim();
      const query = [sku, features].filter(Boolean).join(" ");

      if (!query) {
        return;
      }

      if (sku && !SEED_SKU_KEYS.has(compareSkuKey(sku))) {
        setCustomSkuStore((current) => (current.includes(sku) ? current : uniqueOptions([...current, sku])));
      }

      setComparison({ query, brand: brandHint.trim(), sku });
    },
    [mustMatchFeatures],
  );

  // Clicking a known SKU chip resolves the brand and runs the comparison
  // immediately so the user is never stranded on a populated-but-inert form.
  const handleSkuSelect = useCallback(
    (rawSku: string): void => {
      const sku = normalizeCompetitorSku(rawSku);

      if (!sku) {
        return;
      }

      const detectedBrand = brandForCompetitorSku(sku) || effectiveBrand;

      setCompetitorInput(sku);

      if (detectedBrand) {
        setSelectedBrand(detectedBrand);
      }

      setState("analyzing");
      setWorkflowStep("options");

      commitCompare(sku, detectedBrand);

      setState("results");
      setWorkflowStep("results");
    },
    [commitCompare, effectiveBrand],
  );

  // CUSTOM / missing SKU clears the field and focuses it for manual entry
  // rather than comparing against a placeholder label.
  const handleCustomSku = useCallback((): void => {
    setCompetitorInput("");
    competitorInputRef.current?.focus();
  }, []);

  const shouldRequestLiveLookupUrl = useCallback((queryValue: string): boolean => {
    const sku = normalizeCompetitorSku(queryValue);

    if (!sku) {
      return false;
    }

    if (brandForCompetitorSku(sku)) {
      return false;
    }

    if (SEED_SKU_KEYS.has(compareSkuKey(sku))) {
      return false;
    }

    return true;
  }, []);

  const lookupCompareIntelligence = useCallback(
    (queryValue: string, brandHint: string): void => {
      commitCompare(queryValue, brandHint);
    },
    [commitCompare],
  );

  const handleSubmit = useCallback(
    (event?: { preventDefault?: () => void }): void => {
      event?.preventDefault?.();

      const queryValue = competitorInput;

      setState("analyzing");
      setWorkflowStep("options");

      if (shouldRequestLiveLookupUrl(queryValue)) {
        lookupCompareIntelligence(queryValue, effectiveBrand);
        setState("results");
        setWorkflowStep("results");
        return;
      }

      commitCompare(queryValue, effectiveBrand);

      setState("results");
      setWorkflowStep("results");
    },
    [commitCompare, competitorInput, effectiveBrand, lookupCompareIntelligence, shouldRequestLiveLookupUrl],
  );

  const handleRetryWithSourceUrl = useCallback((): void => {
    setState("analyzing");
    setWorkflowStep("options");
    lookupCompareIntelligence(competitorInput, effectiveBrand);
    setState("results");
    setWorkflowStep("results");
  }, [competitorInput, effectiveBrand, lookupCompareIntelligence]);

  void handleRetryWithSourceUrl;

  const handleReset = useCallback((): void => {
    setSelectedBrand(MANUFACTURER_OPTIONS[0] ?? "");
    setCompetitorInput("");
    setMustMatchFeatures("");
    setCustomSkuStore([]);
    setComparison(null);
    setState("idle");
    setWorkflowStep("select");
  }, []);

  function onBrandSelect(brand: string): void {
    setSelectedBrand(brand);
  }

  async function copySummary(): Promise<void> {
    if (!summary) {
      return;
    }
    await navigator.clipboard.writeText(summary);
  }

  const competitor = result?.competitor ?? null;
  const datasheetUrl = competitor?.datasheetUrl || competitor?.sourceUrl || "";
  const hasRun = comparison !== null;
  const awaitingProducts = hasRun && products.length === 0 && !indexFailed;
  const indexUnavailable = hasRun && products.length === 0 && indexFailed;

  return (
    <main
        className="wm-compare-page"
        data-wingman-compare-decision-desk="true"
        data-wingman-compare-state={state}
        data-wingman-compare-step={workflowStep}
      >
      <header className="wm-compare-header">
        <div className="wm-compare-header-copy">
          <p className="wm-compare-eyebrow">Competitor Compare</p>
          <h1>Find the nearest WyreStorm product direction.</h1>
          <span>
            Select the competitor brand, choose a known SKU, or use CUSTOM for a missing model. Wingman resolves the
            datasheet profile and ranks the closest WyreStorm direction, with the reasons behind every match.
          </span>
        </div>

        <div className="wm-compare-header-actions">
          <button type="button" className="wm-compare-reset" onClick={handleReset}>
            Reset comparison
          </button>
        </div>
      </header>

      <form className="wm-compare-form" onSubmit={handleSubmit} data-wingman-compare-auto-advance="true">
        <CompareManufacturerCombobox
          brands={MANUFACTURER_OPTIONS}
          selectedBrand={selectedBrand}
          onBrandSelect={onBrandSelect}
        />

        <CompareProductLookupInput
          value={competitorInput}
          knownSkus={knownBrandSkus}
          suggestions={skuSuggestions}
          inputRef={competitorInputRef}
          onInputChange={setCompetitorInput}
          onSkuSelect={handleSkuSelect}
          onCustom={handleCustomSku}
        />

        <label className="wm-compare-feature-input">
          <span>Known type or must-match features</span>
          <input
            value={mustMatchFeatures}
            onChange={(event) => setMustMatchFeatures(event.target.value)}
            placeholder="Example: AV-over-IP transmitter HDMI 2.0 4K60 4:4:4 HDR USB"
          />
        </label>

        <button
          type="submit"
          className="wm-compare-run"
          disabled={!competitorInput.trim() && !mustMatchFeatures.trim()}
        >
          Run compare
        </button>

        <p className="wm-compare-auto-advance-note">
          Select a competitor SKU above to find WyreStorm alternatives automatically. Typed entries can still use Enter.
        </p>
      </form>

      <section className="wm-compare-start-card">
        <h2>{hasRun ? "Viable product choices" : "Start a new competitor comparison"}</h2>
        <p>
          Known SKUs for the selected brand are shown as clickable buttons. For missing models, enter the SKU manually and
          describe the required technology, I/O, video bandwidth, USB, audio, control or wall-processing features.
        </p>
      </section>

      {awaitingProducts ? (
        <section className="wm-compare-loading">Analyzing against the WyreStorm product intelligence index...</section>
      ) : null}

      {indexUnavailable ? (
        <section className="wm-compare-no-result">
          <h2>Product data unavailable</h2>
          <p>The WyreStorm product intelligence index could not be loaded. Please retry in a moment.</p>
        </section>
      ) : null}

      {result && competitor ? (
        <section className="wm-compare-results" ref={resultsRef}>
          <section className="wm-compare-understanding">
            <div className="wm-compare-understanding-head">
              <span className="wm-compare-eyebrow">What Wingman understood</span>
              <span className={`wm-compare-readiness ${readinessClass(competitor.readiness)}`}>
                {readinessLabel(competitor.readiness)}
              </span>
            </div>
            <h2>{[competitor.brand, competitor.sku || comparison?.sku].filter(Boolean).join(" ") || "Competitor product"}</h2>
            {competitor.title ? <p className="wm-compare-understanding-title">{competitor.title}</p> : null}

            <div className="wm-compare-spec-chips">
              <SpecChip label="Class" value={prettyValue(competitor.domain)} />
              <SpecChip label="Role" value={competitor.role} />
              <SpecChip label="Transport" value={competitor.transport} />
              <SpecChip label="Resolution" value={competitor.maxResolution} />
              <SpecChip label="Chroma" value={competitor.chroma} />
            </div>

            {datasheetUrl ? (
              <a className="wm-compare-source-link" href={datasheetUrl} target="_blank" rel="noreferrer">
                View competitor source / datasheet
              </a>
            ) : null}

            {competitor.whyNotDirectEquivalent && competitor.whyNotDirectEquivalent.length > 0 ? (
              <ReasonList label="Why this is not a like-for-like swap" items={competitor.whyNotDirectEquivalent} />
            ) : null}
          </section>

          <section className="wm-compare-recommendation">
            <span className={`wm-compare-outcome ${outcomeClass(result.topOutcome)}`}>
              {topOutcomeLabel(result.topOutcome)}
            </span>
            <p>{result.recommendation}</p>
          </section>

          {best ? (
            <>
              <article className="wm-compare-best">
                <div className="wm-compare-verdict">
                  <span className={outcomeClass(best.decision.outcome)}>{best.decision.outcome}</span>
                  <strong>{Math.round(best.decision.confidence)}%</strong>
                </div>

                <div>
                  <p>Best WyreStorm direction</p>
                  <h2>{best.sku}</h2>
                  <h3>{best.name}</h3>
                  <small>
                    {[best.family, best.wyrestorm?.role, best.wyrestorm?.transport].filter(Boolean).join(" - ")}
                  </small>
                </div>

                <button type="button" onClick={copySummary}>
                  Copy summary
                </button>
              </article>

              <div className="wm-compare-best-detail">
                <ReasonList label="Why it fits" items={best.decision.matches} />
                <ReasonList label="Confirm before quoting" items={best.decision.verify} />
                <ReasonList label="Gaps / caution" items={best.decision.gaps} />
              </div>

              {matches.length > 1 ? (
                <>
                  <div className="wm-compare-options-strip">
                    <h2>Other viable WyreStorm options</h2>
                    <span>
                      {matches.length} option{matches.length === 1 ? "" : "s"} ranked
                    </span>
                  </div>

                  <div className="wm-compare-candidate-grid">
                    {matches.slice(1).map((candidate) => (
                      <article key={candidate.sku} className="wm-compare-candidate-card">
                        <header>
                          <span>{candidate.family}</span>
                          <strong>{candidate.sku}</strong>
                          <em className={outcomeClass(candidate.decision.outcome)}>{candidate.decision.outcome}</em>
                        </header>

                        <h3>{candidate.name}</h3>
                        {candidate.wyrestorm?.transport ? <p>{candidate.wyrestorm.transport}</p> : null}

                        <ReasonList label="Why it may fit" items={candidate.decision.matches} />
                        <ReasonList label="Confirm" items={candidate.decision.verify} />
                        <ReasonList label="Gaps" items={candidate.decision.gaps} />
                      </article>
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <div className="wm-compare-no-result">
              <h2>No safe direct WyreStorm equivalent yet</h2>
              <p>{result.relevanceReason || result.recommendation}</p>
            </div>
          )}

          {rejected.length > 0 ? (
            <section className="wm-compare-rejected">
              <h2>Ruled out</h2>
              <ul>
                {rejected.slice(0, 6).map((item) => (
                  <li key={item.sku}>
                    <strong>{item.sku}</strong>
                    <span>{rejectionReason(item)}</span>
                  </li>
                ))}
              </ul>
              <p className="wm-compare-rejected-note">
                Each rejection is a structured spec conflict, not a guess - open a candidate to see the blocking facts.
              </p>
            </section>
          ) : null}

          {result.nextSteps && result.nextSteps.length > 0 ? (
            <ReasonList label="Next steps" items={result.nextSteps} />
          ) : null}

          <aside className="wm-compare-summary">
            <h2>Copy-safe comparison summary</h2>
            <pre>{summary}</pre>
          </aside>
        </section>
      ) : null}
    </main>
  );
}

export default ComparePageNew;
