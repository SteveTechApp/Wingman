/**
 * CompareEvidenceMatrix — Shows the evidence matrix for a compare result.
 *
 * Extracted from ComparePageNew.advanced.tsx for maintainability.
 */
import { uniqueText } from "../../lib/repScript";
import { type ScoredCandidate } from "../../lib/compareVerdictPipeline";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readText(source: unknown, keys: string[], fallback: string): string {
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
}

function readScore(source: unknown): number | null {
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
}

function first(items: string[] | undefined, fallback: string): string {
  const value = uniqueText(items ?? [], 1)[0];
  return value && value.trim() ? value : fallback;
}

function joined(items: string[] | undefined, fallback: string, limit = 2): string {
  const values = uniqueText(items ?? [], limit).filter((item) => item.trim().length > 0);
  return values.length ? values.join(" | ") : fallback;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CompareEvidenceMatrix({ candidate, competitor }: { candidate: ScoredCandidate; competitor: unknown }) {
  const competitorSku = readText(competitor, ["sku", "model", "partNumber", "name", "title"], "Competitor product not clearly identified");
  const competitorBrand = readText(competitor, ["manufacturer", "brand", "vendor"], "Competitor brand not captured");
  const competitorType = readText(competitor, ["productClass", "class", "category", "family", "type", "role"], "Competitor product type not captured");
  const wyrestormType = `${candidate.product.family} - ${candidate.product.productClass} - ${candidate.product.role}`;
  const displayedScore = readScore(candidate);

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
    <section className="compare-native-evidence-matrix wm-ui-section" aria-label="Compare evidence matrix">
      <div className="compare-native-evidence-matrix__header">
        <h4>Comparison evidence matrix</h4>
        <p className="wm-ui-copy">Plain-English explanation of the match result, gaps and quote checks.</p>
      </div>
      <div className="compare-native-evidence-matrix__grid">
        {rows.map((row) => (
          <div className="compare-native-evidence-matrix__row wm-ui-card" key={row.label}>
            <div className="compare-native-evidence-matrix__label">{row.label}</div>
            <div className="compare-native-evidence-matrix__evidence">{row.evidence}</div>
            <div className="compare-native-evidence-matrix__meaning">{row.meaning}</div>
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

export default CompareEvidenceMatrix;
