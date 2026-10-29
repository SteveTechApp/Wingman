/**
 * The cards a rep works through while a competitor is being identified.
 *
 * The manufacturer combobox, the SKU lookup, the evidence matrix behind it, the
 * reported-status rail and the candidate cards a rep compares against. These are
 * presentational: they receive a competitor, a candidate and callbacks from the
 * page, so the page keeps the state and this module keeps the markup.
 */
import { useState } from "react";
import { Check, Copy, PackageSearch } from "lucide-react";
import {
  uniqueText,
  commercializeCompareCopy,
  salesWhyBullets,
  compactCompareQuoteChecks,
} from "../../lib/repScript";
import { type ScoredCandidate } from "../../features/compare";
import { uniqueSkuOptions } from "./textTokens";
import type { CompetitorProfile, CompetitorSummary } from "./compareTypes";
import { productPitchUrl, verdictClass } from "./compareCompetitorFacts";
import {
  buildCoreComparisonFacts,
  buildWyrestormSummary,
  surfaceValueResolved,
  weakestLinkCardTier,
} from "./compareComparisonFacts";
import { GovernedDataBadge as GovernanceBadge, weakestLinkTier } from "../../components/GovernedDataBadge";
import {
  COMPARE_REPORTED_STATUS_OPTIONS,
  compareReportedStatus,
  compareReportedStatusMeta,
} from "./compareReportedStatus";
import type { CompareReportedStatus } from "./compareReportedStatus";
import { openGuruForCompareResult, salesAskCustomer } from "./compareSalesCopy";

export function ProductMoreLink({ sku }: { sku: string }) {
  return (
    <a className="compare-native-more" href={productPitchUrl(sku)} aria-label={`Open product positioning support for ${sku}`}>
      View product
    </a>
  );
}

export function CompareEvidenceList({ title, items, className = "" }: { title: string; items: string[]; className?: string }) {
  const visibleItems = uniqueText(items.map((item) => commercializeCompareCopy(item)).filter(Boolean), items.length);

  if (!visibleItems.length) {
    return null;
  }

  return (
    <div className={`${className}`.trim()}>
      <p className="compare-native-label wm-ui-copy">{title}</p>
      <ul className="wm-ui-card">
        {visibleItems.map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function CompareManufacturerCombobox(props: {
  brands: string[];
  selectedBrand: string;
  onBrandSelect: (brand: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = props.selectedBrand.trim().toLowerCase();
  const visibleBrands = props.brands
    .filter((brand) => !query || brand.toLowerCase().includes(query));

  const chooseBrand = (brand: string): void => {
    props.onBrandSelect(brand);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <section className="wm-ui-card p-4 compare-inline-combobox-field" data-wingman-inline-combobox="manufacturer">
      <label className="compare-native-label wm-ui-kicker" htmlFor="compare-manufacturer">Manufacturer</label>
      <div className="compare-inline-combobox">
        <input
          id="compare-manufacturer"
          className="compare-native-input wm-ui-input"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open && visibleBrands.length > 0}
          data-testid="compare-manufacturer" aria-controls="compare-manufacturer-options"
          value={props.selectedBrand}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            props.onBrandSelect(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.min(current + 1, Math.max(visibleBrands.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open && activeIndex >= 0 && visibleBrands[activeIndex]) {
              event.preventDefault();
              chooseBrand(visibleBrands[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder="Type competitor manufacturer"
          autoComplete="off"
        />
        {open && visibleBrands.length > 0 ? (
          <div id="compare-manufacturer-options" className="compare-inline-options" role="listbox" aria-label="Manufacturer suggestions">
            {visibleBrands.map((brand, index) => (
              <button
                key={brand}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`compare-inline-option${index === activeIndex ? " is-active" : ""}`}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseBrand(brand)}
              >
                {brand}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function CompareProductLookupInput(props: {
  value: string;
  knownSkus: string[];
  suggestions: string[];
  onInputChange: (value: string) => void;
  onSkuSelect: (sku: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const options = uniqueSkuOptions([...props.knownSkus, ...props.suggestions]).slice(0, 120);
  const query = props.value.trim().toUpperCase();
  const visibleOptions = options
    .filter((skuOption) => !query || skuOption.toUpperCase().includes(query));

  const chooseSku = (sku: string): void => {
    props.onInputChange(sku);
    setOpen(false);
    setActiveIndex(-1);
    props.onSkuSelect(sku);
  };

  return (
    <section
      className="wm-ui-card p-4 compare-inline-combobox-field"
      data-wingman-compare-auto-advance="true"
      data-wingman-inline-combobox="sku"
    >
      <label className="compare-native-label wm-ui-kicker" htmlFor="compare-competitor-sku">Competitor SKU</label>
      <div className="compare-inline-combobox">
        <input
          id="compare-competitor-sku"
          className="compare-native-input wm-ui-input"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open && visibleOptions.length > 0}
          data-testid="compare-sku" aria-controls="compare-competitor-sku-options"
          value={props.value}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            const value = event.target.value;
            props.onInputChange(value);
            const exact = options.find((option) => option.trim().toUpperCase() === value.trim().toUpperCase());

            if (exact) {
              setOpen(false);
              setActiveIndex(-1);
              props.onSkuSelect(exact);
            } else {
              setOpen(true);
              setActiveIndex(-1);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.min(current + 1, Math.max(visibleOptions.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open && activeIndex >= 0 && visibleOptions[activeIndex]) {
              event.preventDefault();
              chooseSku(visibleOptions[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder="Type competitor model / SKU"
          data-wingman-sku-normalisation="true"
          autoComplete="off"
        />
        {open && visibleOptions.length > 0 ? (
          <div id="compare-competitor-sku-options" className="compare-inline-options" role="listbox" aria-label="Competitor SKU suggestions">
            {visibleOptions.map((skuOption, index) => (
              <button
                key={skuOption}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`compare-inline-option${index === activeIndex ? " is-active" : ""}`}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseSku(skuOption)}
              >
                {skuOption}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <p className="wm-ui-copy mt-2">Known SKUs compare automatically. For an unknown model, type it and press Compare.</p>
    </section>
  );
}

export function CompareEvidenceMatrix({ candidate, competitor }: { candidate: ScoredCandidate; competitor: unknown }) {
  const readText = (source: unknown, keys: string[], fallback: string) => {
    if (!source || typeof source !== "object") {
      return fallback;
    }

    const record = source as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }

      if (Array.isArray(value)) {
        const joined = value
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .slice(0, 3)
          .join(" | ");

        if (joined) {
          return joined;
        }
      }
    }

    return fallback;
  };
  const readScore = (source: unknown) => {
    if (!source || typeof source !== "object") {
      return null;
    }

    const record = source as Record<string, unknown>;
    const keys = ["score", "matchScore", "fitScore", "scorePercent", "confidence"];

    for (const key of keys) {
      const value = record[key];

      if (typeof value === "number" && Number.isFinite(value)) {
        return value <= 1 ? Math.round(value * 100) : Math.round(value);
      }

      if (typeof value === "string") {
        const parsed = Number(value.replace("%", "").trim());

        if (Number.isFinite(parsed)) {
          return parsed <= 1 ? Math.round(parsed * 100) : Math.round(parsed);
        }
      }
    }

    return null;
  };

  const scoreExplanation = (score: number | null) => {
    const reason = first([...candidate.matched, ...candidate.partialMatches], "the available evidence shows some relevant fit");
    const caveat = first([...candidate.mismatches, ...candidate.gaps, ...candidate.unknowns], "there are still details to confirm before treating this as a like-for-like replacement");

    if (score === null) {
      return `Score not shown because the comparison did not expose a numeric score. Treat this as a shortlist result: ${reason}; ${caveat}.`;
    }

    if (score >= 90) {
      return `${score}% because the product role and evidence are strongly aligned. Main fit: ${reason}. Still confirm: ${caveat}.`;
    }

    if (score >= 75) {
      return `${score}% because the product appears to fit the main requirement, but it is not fully proven as a like-for-like replacement. Main fit: ${reason}. Check: ${caveat}.`;
    }

    if (score >= 60) {
      return `${score}% because this is a plausible architecture or product-family match, but important details are incomplete or different. Main fit: ${reason}. Gap to check: ${caveat}.`;
    }

    return `${score}% because the candidate only partially matches the competitor requirement. Main fit: ${reason}. Risk: ${caveat}.`;
  };

  const competitorSku = readText(competitor, ["sku", "model", "partNumber", "name", "title"], "Competitor product not clearly identified");
  const competitorBrand = readText(competitor, ["manufacturer", "brand", "vendor"], "Competitor brand not captured");
  const competitorType = readText(competitor, ["productClass", "class", "category", "family", "type", "role"], "Competitor product type not captured");
  const wyrestormType = `${candidate.product.family} - ${candidate.product.productClass} - ${candidate.product.role}`;
  const displayedScore = readScore(candidate);
  const first = (items: string[] | undefined, fallback: string) => {
    const value = uniqueText(items ?? [], 1)[0];
    return value && value.trim() ? value : fallback;
  };

  const joined = (items: string[] | undefined, fallback: string, limit = 2) => {
    const values = uniqueText(items ?? [], limit).filter((item) => item.trim().length > 0);
    return values.length ? values.join(" | ") : fallback;
  };

  const quoteChecks = uniqueText([
    ...candidate.blockers,
    ...candidate.unknowns,
    ...candidate.checks,
    ...candidate.gaps
  ], 3);

  const rows = [
    {
      label: "Mandatory requirement coverage",
      evidence: candidate.necessaryCoverage
        ? `${candidate.necessaryCoverage.confirmed}/${candidate.necessaryCoverage.total} confirmed; ${candidate.necessaryCoverage.unknown} unknown; ${candidate.necessaryCoverage.failed} failed`
        : "Structured requirement coverage was not available.",
      meaning: "A direct equivalent requires every necessary requirement to be confirmed and none to fail."
    },
    {
      label: "Evidence completeness",
      evidence: typeof candidate.evidenceCompleteness === "number" ? `${candidate.evidenceCompleteness}% of necessary comparison points confirmed` : "Not calculated",
      meaning: "Measures evidence coverage rather than presenting an apparently precise similarity score."
    },
    {
      label: "Solution type",
      evidence: String(candidate.solutionType || "qualified-alternative").replace(/-/g, " "),
      meaning: "Separates a direct product equivalent from a component-led or architecture alternative."
    },
    {
      label: "Competitor product",
      evidence: `${competitorBrand} - ${competitorSku} - ${competitorType}`,
      meaning: "Identifies what the customer is actually asking Wingman to compare."
    },
    {
      label: "WyreStorm candidate",
      evidence: wyrestormType,
      meaning: "Shows the WyreStorm product type being proposed, so sales can see whether it is the same class or an architecture alternative."
    },
    {
      label: "Why it scored",
      evidence: first(candidate.matched, "No strong matched fact was captured."),
      meaning: "The strongest direct reason this candidate was shortlisted."
    },
    {
      label: "Score explanation",
      evidence: scoreExplanation(displayedScore),
      meaning: "Translates the match percentage into plain sales language, including the main reason and the main caveat."
    },
    {
      label: "Confirmed fit",
      evidence: joined(candidate.matched, "No confirmed fit evidence captured.", 2),
      meaning: "Facts that make this a credible WyreStorm alternative."
    },
    {
      label: "Important differences",
      evidence: joined(candidate.mismatches, "No specific difference captured.", 2),
      meaning: "Reasons the recommendation may not be a like-for-like replacement."
    },
    {
      label: "Why not 100%",
      evidence: first([...candidate.mismatches, ...candidate.gaps, ...candidate.unknowns], "The available evidence does not show a material gap."),
      meaning: "Explains why the score should be treated as a fit indicator, not a guarantee."
    },
    {
      label: "Check before quoting",
      evidence: quoteChecks.length ? quoteChecks.join(" | ") : "Confirm source, display, USB, audio, control and distance requirements before quoting.",
      meaning: "Commercial or technical checks needed before using this in a proposal."
    },
    {
      label: "WyreStorm dependencies",
      evidence: joined(candidate.dependencies, "No additional WyreStorm dependency captured.", 2),
      meaning: "Items that may need adding to the system design or BOM."
    }
  ];

  return (
    <section className="wm-ui-section" aria-label="Compare evidence matrix">
      <div>
        <h4>Comparison evidence matrix</h4>
        <p className="wm-ui-copy">Plain-English explanation of the match result, gaps and quote checks.</p>
      </div>
      <div>
        {rows.map((row) => (
          <div className="wm-ui-card" key={row.label}>
            <div>{row.label}</div>
            <div>{row.evidence}</div>
            <div>{row.meaning}</div>
          </div>
        ))}
      </div>
      {candidate.requirements?.length ? (
        <div className="compare-native-requirement-ledger" role="table" aria-label="Necessary comparison requirements">
          <div className="compare-native-core-matrix-row compare-native-core-matrix-row--header" role="row">
            <div role="columnheader">Necessary datapoint</div>
            <div role="columnheader">Competitor</div>
            <div role="columnheader">WyreStorm</div>
            <div role="columnheader">Status</div>
          </div>
          {candidate.requirements.filter((item) => item.tier === "necessary").map((item) => (
            <div className={`compare-native-core-matrix-row compare-requirement--${item.status}`} role="row" key={item.key}>
              <span role="cell"><strong>{item.label}</strong><small>{item.evidence}</small></span>
              <span role="cell">{item.competitorValue}</span>
              <span role="cell">{item.wyrestormValue}</span>
              <strong role="cell">{item.status.replace(/-/g, " ")}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function CompareReportedStatusRail({
  status,
}: {
  status: CompareReportedStatus;
}) {
  return (
    <div
      className="compare-reported-status-rail"
      role="list"
      aria-label="Comparison result status"
    >
      <span className="compare-reported-status-label">Assessment</span>
      {COMPARE_REPORTED_STATUS_OPTIONS.filter((option) => option.key === status).map((option) => (
        <span
          key={option.key}
          role="listitem"
          className={`compare-reported-status compare-reported-status--${option.key} is-active`}
          aria-current="true"
        >
          {option.label}
        </span>
      ))}
    </div>
  );
}

export function CompetitorSearchCard({
  brand,
  sku,
  summary,
  locallyRecognised,
  liveResearched = false,
  confidenceSource,
}: {
  brand: string;
  sku: string;
  summary: CompetitorSummary;
  locallyRecognised: boolean;
  liveResearched?: boolean;
  confidenceSource?: {
    mode?: string;
    approvedBy?: string | null;
    approvedAt?: string | null;
    decisionType?: string | null;
    note?: string;
  };
}) {
  const primaryFacts = summary.facts.slice(0, 4);

  return (
    <section className="wm-match-searched-product" aria-labelledby="wm-match-searched-product-title">
      <header>
        <div>
          <span className="compare-native-eyebrow wm-ui-kicker">Searched competitor</span>
          <h2 id="wm-match-searched-product-title">{brand} {sku}</h2>
        </div>
        <span className={`wm-compare-local-status ${locallyRecognised ? "is-recognised" : "is-lookup"}`}>
          {locallyRecognised ? "Recognised locally" : liveResearched ? "Live researched - review required" : "Live lookup required"}
        </span>
      </header>
      <p>{summary.detail || summary.warning || "Competitor product identity requires confirmation."}</p>
      {confidenceSource?.note && (
        <div className="wm-compare-confidence-source" role="status">
          <span className="wm-compare-confidence-source__icon" aria-hidden="true">
            {confidenceSource.mode === "decision-ledger-approved" ? "✅" : confidenceSource.mode === "stored-intelligence" ? "📋" : confidenceSource.mode === "live" ? "🌐" : "📄"}
          </span>
          <span className="wm-compare-confidence-source__text">{confidenceSource.note}</span>
        </div>
      )}
      <dl>
        {primaryFacts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
      </dl>
    </section>
  );
}

// repScript owns the rep-facing comparison narrative (single source of truth
// in ../lib/repScript). The tier function is re-exported so the public page
// API stays stable for callers and tests.

export function BestCandidateCard({
  candidate,
  competitor,
  competitorProfile,
  onCopySummary,
}: {
  candidate: ScoredCandidate;
  competitor: CompetitorSummary;
  competitorProfile: CompetitorProfile;
  onCopySummary: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const wyrestorm = buildWyrestormSummary(candidate);
  const coreFacts = buildCoreComparisonFacts(competitor, competitorProfile, wyrestorm, candidate);
  const badgeTier = weakestLinkCardTier(coreFacts, candidate.governedTier);
  const whyBullets = salesWhyBullets(candidate);
  const askCustomer = salesAskCustomer(competitor, candidate);
  const status = compareReportedStatus(candidate, competitor);
  const statusMeta = compareReportedStatusMeta(status);
  const quoteChecks = compactCompareQuoteChecks(competitor, candidate, status);
  const conciseReason =
    commercializeCompareCopy(
      candidate.matched[0] ||
        candidate.partialMatches[0] ||
        candidate.mismatches[0] ||
        candidate.unknowns[0] ||
        statusMeta.guidance,
    );

  return (
    <section className={`compare-native-best-card compare-compact-result wm-ui-section wm-ui-card compare-compact-result--${status}`}>
      <CompareReportedStatusRail status={status} />

      <header className="compare-compact-result__headline">
        <div>
          <h2 className="wm-ui-title">{statusMeta.heading}</h2>
          <p className="wm-ui-copy">{statusMeta.guidance}</p>
        </div>
      </header>

      <div className="compare-compact-result__products">
        <section className="compare-compact-result__product wm-ui-card">
          <span>Competitor</span>
          <strong>{competitor.heading}</strong>
          <small>{competitor.detail}</small>
        </section>

        <span className="compare-compact-result__arrow" aria-hidden="true">{"\u2192"}</span>

        <section className="compare-compact-result__product compare-compact-result__product--wyrestorm wm-ui-card">
          <span>WyreStorm direction</span>
          <strong>{wyrestorm.heading}</strong>
          <small>{wyrestorm.detail}</small>
          <GovernanceBadge tier={badgeTier} label={candidate.governedLabel} />
        </section>
      </div>

      <div className="compare-compact-result__reason wm-ui-card">
        <strong>Why</strong>
        <p className="wm-ui-copy">{conciseReason}</p>
      </div>

      {candidate.necessaryCoverage ? (
        <section className="compare-compact-result__coverage wm-ui-card" aria-label="Comparison safety summary">
          <div>
            <span>Necessary requirements</span>
            <strong>{candidate.necessaryCoverage.confirmed}/{candidate.necessaryCoverage.total} confirmed</strong>
          </div>
          <div>
            <span>Evidence completeness</span>
            <strong>{candidate.evidenceCompleteness ?? 0}%</strong>
          </div>
          <div>
            <span>Solution type</span>
            <strong>{String(candidate.solutionType || "qualified-alternative").replace(/-/g, " ")}</strong>
          </div>
        </section>
      ) : null}

      <section className="compare-compact-result__warnings compare-compact-result__footnotes wm-ui-card" aria-label="Advisory footnotes">
          <strong>Check before quoting</strong>
          <ul>
            {quoteChecks.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          {status === "match" ? null : (
            <p className="compare-compact-result__footnote-label">
              This is a product direction, not a guaranteed one-box replacement.
            </p>
          )}
      </section>

      <div className="compare-native-action-row compare-compact-result__actions wm-ui-card">
        <button
          className="compare-native-more wm-ui-button wm-ui-button-primary"
          type="button"
          onClick={() => openGuruForCompareResult(competitor, candidate, status)}
        >
          More info from Guru
        </button>
        <button
          className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary"
          type="button"
          onClick={() => {
            onCopySummary();
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
          aria-label="Copy comparison result"
        >
          {copied ? <><Check size={14} aria-hidden="true" /> Copied</> : <><Copy size={14} aria-hidden="true" /> Copy result</>}
        </button>
        <ProductMoreLink sku={candidate.product.sku} />
      </div>

      <details className="compare-native-technical-details wm-ui-card wm-ui-copy">
        <summary>Technical comparison details</summary>

        {coreFacts.length ? (
          <section className="compare-native-core-facts wm-ui-section" aria-label="Core comparison points">
            <p className="compare-native-label wm-ui-copy">Key comparison matrix</p>
            <div className="compare-native-core-matrix" role="table" aria-label="Competitor versus WyreStorm comparison matrix">
              <div className="compare-native-core-matrix-header wm-ui-card-header" role="rowgroup">
                <div className="compare-native-core-matrix-row compare-native-core-matrix-row--header wm-ui-card wm-ui-card-header" role="row">
                  <span className="compare-native-core-matrix-heading wm-ui-title" role="columnheader">Comparison point</span>
                  <span className="compare-native-core-matrix-heading wm-ui-title" role="columnheader">Competitor</span>
                  <span className="compare-native-core-matrix-heading wm-ui-title" role="columnheader">WyreStorm</span>
                  <span className="compare-native-core-matrix-heading wm-ui-title" role="columnheader">Result</span>
                </div>
              </div>
              <div className="compare-native-core-matrix-body" role="rowgroup">
                {coreFacts.map((fact) => (
                  <div key={`core-fact-${fact.label}`} className="compare-native-core-matrix-row wm-ui-card" role="row">
                    <div className="compare-native-core-matrix-cell compare-native-core-matrix-cell--point" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">Comparison point</span>
                      <strong>{fact.label}</strong>
                    </div>
                    <div className="compare-native-core-matrix-cell" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">Competitor</span>
                      <p className="wm-ui-copy">{fact.competitor || "Needs verification"}</p>
                    </div>
                    <div className="compare-native-core-matrix-cell" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">WyreStorm</span>
                      <p className="wm-ui-copy">{fact.wyrestorm || "Needs verification"}</p>
                    </div>
                    <div className="compare-native-core-matrix-cell compare-native-core-matrix-cell--result wm-ui-card" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">Result</span>
                      <p className="wm-ui-copy">{fact.result}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <CompareEvidenceList title="Matched points" items={whyBullets} />
        <CompareEvidenceList
          title="Important differences"
          items={uniqueText([...candidate.mismatches, ...candidate.gaps], 4)}
          className="wm-ui-title"
        />
        <CompareEvidenceList
          title="Checks before quote"
          items={askCustomer}
          className="wm-ui-title"
        />
        <CompareEvidenceMatrix candidate={candidate} competitor={competitor} />
      </details>
    </section>
  );
}

export function CandidateOptionCard({ candidate }: { candidate: ScoredCandidate }) {
  const summary = buildWyrestormSummary(candidate);
  const comparisonFacts = new Map(summary.comparisonFacts.map((fact) => [fact.label, fact.value]));
  const optionTier = weakestLinkTier([
    candidate.governedTier,
    // The option card surfaces exactly three WyreStorm facts; any of them
    // unresolved makes the card's claim weaker than the profile tier alone.
    ...[candidate.product.productClass, candidate.product.transport, candidate.outcomeLabel].map(
      (value) => (surfaceValueResolved(String(value ?? "")) ? candidate.governedTier : "missing"),
    ),
  ]);
  const matrixVariantReason = candidate.product.productClass === "Matrix"
    ? candidate.checks.find((item) => /feature-enhanced alternative|HDBaseT distance|receiver topology|video-wall/i.test(item))
    : undefined;
  const reason = commercializeCompareCopy(
    matrixVariantReason ||
      candidate.matched[0] ||
      candidate.partialMatches[0] ||
      "Closest role-compatible WyreStorm option from the current Compare data.",
  );
  const advisory = commercializeCompareCopy(
    matrixVariantReason ||
      candidate.dependencies[0] ||
      candidate.mismatches[0] ||
      candidate.gaps[0] ||
      candidate.unknowns[0] ||
      candidate.checks[0] ||
      "Confirm lifecycle, accessories and complete signal-path compatibility before quotation.",
  );

  return (
    <article className="compare-native-option-card compare-product-info-card wm-ui-card">
      <header className="compare-product-info-card__header">
        <span className="compare-product-info-card__icon" aria-hidden="true"><PackageSearch /></span>
        <div className="compare-product-info-card__identity">
        <p className="wm-ui-copy">{candidate.product.family}</p>
        <h3 className="wm-ui-title">{candidate.product.sku}</h3>
          <p className="compare-product-info-card__name">{candidate.product.name}</p>
        </div>
        <span className={`compare-native-verdict compare-product-info-card__status ${verdictClass(candidate.verdict)}`}>{candidate.verdict}</span>
      </header>

      <div className="compare-product-info-card__facts" aria-label="Product information">
        <span><small>Product type</small><strong>{candidate.product.productClass}</strong></span>
        <span><small>Inputs</small><strong>{comparisonFacts.get("Inputs") || "Needs verification"}</strong></span>
        <span><small>Outputs</small><strong>{comparisonFacts.get("Outputs") || "Needs verification"}</strong></span>
        <span><small>Connection</small><strong>{candidate.product.transport}</strong></span>
        <span><small>Data status</small><strong><GovernanceBadge tier={optionTier} label={candidate.governedLabel} /></strong></span>
      </div>

      <section className="compare-product-info-card__fit wm-ui-card">
        <span>Why it fits</span>
        <p className="wm-ui-copy">{reason}</p>
      </section>
      <p className="compare-native-option-footnote wm-ui-copy wm-ui-card">
        <strong>Before you quote:</strong> {advisory}
      </p>

      <details className="wm-ui-card wm-ui-copy">
        <summary>Why this option was shortlisted</summary>
        <CompareEvidenceList title="Why this direction" items={candidate.matched.slice(0, 3)} />
        <CompareEvidenceList title="Important differences" items={candidate.mismatches.slice(0, 2)} className="wm-ui-title" />
        <CompareEvidenceList title="Commercial checks" items={uniqueText([...candidate.unknowns, ...candidate.checks, ...candidate.gaps, ...candidate.dependencies], 4)} className="wm-ui-title" />
      </details>

      <div className="compare-native-action-row compare-product-info-card__actions wm-ui-card">
        <ProductMoreLink sku={candidate.product.sku} />
      </div>
    </article>
  );
}

export function CandidateThumbnailSelector({ candidate, selected, onSelect }: {
  candidate: ScoredCandidate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`compare-candidate-thumbnail${selected ? " is-selected" : ""}`}
      aria-pressed={selected}
      aria-label={`Compare with ${candidate.product.sku}`}
      onClick={onSelect}
    >
      <span>{candidate.product.family}</span>
      <strong>{candidate.product.sku}</strong>
      <small>{candidate.product.productClass} · {candidate.verdict}</small>
    </button>
  );
}
