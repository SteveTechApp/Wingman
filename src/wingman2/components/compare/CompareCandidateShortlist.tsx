import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

import { getProductFamilyRankingReason } from "../../lib/productFamilyShortlistRanking";

type UnknownRecord = Record<string, unknown>;

type ProductFamilyScoreLike = {
  family?: string | null;
  score?: number | null;
  reasons?: string[] | null;
};

type Tone = {
  border: string;
  background: string;
  color: string;
};

type CandidateCard = {
  id: string;
  sku: string;
  name: string;
  fitLabel: string;
  fitHelp: string;
  role: string;
  technology: string;
  ioSummary: string;
  why: string[];
  checks: string[];
  rankingReason: string;
  tone: Tone;
};

export type CompareCandidateShortlistProps = Record<string, unknown>;

const COMPARE_RETURN_KEY = "wingman:compare:lastResultsUrl";
const COMPARE_SELECTED_SKU_KEY = "wingman:compare:selectedSku";

const PRODUCT_ARRAY_KEYS = [
  "candidates",
  "candidateProducts",
  "candidateProductList",
  "matchedProducts",
  "matches",
  "results",
  "recommendations",
  "recommendedProducts",
  "products",
  "wyrestormProducts",
  "options",
  "productOptions",
];

const PRODUCT_OBJECT_KEYS = [
  "candidate",
  "candidateProduct",
  "matchedProduct",
  "selectedProduct",
  "recommendedProduct",
  "wyrestormProduct",
  "targetProduct",
  "rightProduct",
  "product",
  "option",
];

const EXCLUDED_RECURSIVE_KEYS = new Set([
  "competitor",
  "competitorproduct",
  "sourceproduct",
  "leftproduct",
  "rawdata",
  "featurematrix",
  "features",
  "specifications",
  "specificationrows",
  "rows",
]);

const SKU_KEYS = [
  "sku",
  "model",
  "partNumber",
  "productSku",
  "wyrestormSku",
  "wyreStormSku",
];

const NAME_KEYS = [
  "name",
  "title",
  "productName",
  "label",
  "displayName",
];

const ROLE_KEYS = [
  "role",
  "productType",
  "type",
  "category",
  "detectedType",
  "classification",
];

const TECHNOLOGY_KEYS = [
  "technology",
  "technologyType",
  "transport",
  "family",
  "productFamily",
  "signalType",
  "platform",
];

const FIT_KEYS = [
  "fit",
  "fitLevel",
  "matchLevel",
  "matchType",
  "decision",
  "confidenceLabel",
  "status",
];

const INPUT_KEYS = [
  "inputs",
  "inputCount",
  "videoInputs",
  "hdmiInputs",
  "sourceCount",
];

const OUTPUT_KEYS = [
  "outputs",
  "outputCount",
  "videoOutputs",
  "hdmiOutputs",
  "displayCount",
];

const styles: Record<string, CSSProperties> = {
  shell: {
    border: "1px solid rgba(102, 224, 224, 0.22)",
    borderRadius: 22,
    padding: 20,
    background: "linear-gradient(180deg, rgba(7, 20, 35, 0.96), rgba(4, 12, 22, 0.98))",
    color: "#ffffff",
    boxShadow: "0 18px 48px rgba(0, 0, 0, 0.28)",
  },
  eyebrow: {
    color: "#66e0e0",
    fontSize: 12,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 6,
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: 22,
    lineHeight: 1.2,
    color: "#ffffff",
  },
  intro: {
    margin: "8px 0 0",
    color: "rgba(255, 255, 255, 0.78)",
    maxWidth: 900,
    lineHeight: 1.5,
  },
  grid: {
    display: "grid",
    gap: 14,
    marginTop: 18,
  },
  card: {
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: 18,
    padding: 16,
    background: "rgba(255, 255, 255, 0.045)",
  },
  cardTop: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  sku: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "4px 10px",
    background: "rgba(102, 224, 224, 0.13)",
    border: "1px solid rgba(102, 224, 224, 0.34)",
    color: "#66e0e0",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.03em",
  },
  productName: {
    margin: "8px 0 0",
    fontSize: 18,
    color: "#ffffff",
    fontWeight: 800,
  },
  badge: {
    display: "inline-flex",
    borderRadius: 999,
    padding: "6px 11px",
    border: "1px solid",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  facts: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    marginTop: 14,
  },
  fact: {
    borderRadius: 14,
    padding: 12,
    background: "rgba(0, 0, 0, 0.22)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  factLabel: {
    display: "block",
    color: "rgba(255, 255, 255, 0.56)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 4,
  },
  factValue: {
    color: "#ffffff",
    fontWeight: 700,
  },
  sectionLabel: {
    margin: "14px 0 6px",
    color: "#66e0e0",
    fontSize: 13,
    fontWeight: 800,
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    color: "rgba(255, 255, 255, 0.78)",
    lineHeight: 1.45,
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 16,
  },
  primaryButton: {
    border: 0,
    borderRadius: 999,
    padding: "10px 14px",
    background: "#66e0e0",
    color: "#03111f",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: 999,
    padding: "10px 14px",
    background: "rgba(255, 255, 255, 0.06)",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  },
  notes: {
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
    background: "rgba(102, 224, 224, 0.08)",
    border: "1px solid rgba(102, 224, 224, 0.22)",
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 1.5,
  },
  empty: {
    marginTop: 18,
    borderRadius: 16,
    padding: 16,
    background: "rgba(255, 193, 7, 0.08)",
    border: "1px solid rgba(255, 193, 7, 0.22)",
    color: "rgba(255, 255, 255, 0.82)",
  },
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textFromUnknown(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function pickText(record: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    const text = textFromUnknown(value);

    if (text) {
      return text;
    }
  }

  return "";
}

function arrayFromUnknown(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArrayFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(textFromUnknown).filter(Boolean);
  }

  const text = textFromUnknown(value);

  return text ? [text] : [];
}

function normalizeProductFamilyScore(value: unknown): ProductFamilyScoreLike | null {
  if (!isRecord(value)) {
    return null;
  }

  const family = pickText(value, ["family", "productFamily", "technology", "category"]);
  const score = pickNumber(value, ["score", "confidence", "familyScore"]);
  const reasons = stringArrayFromUnknown(value.reasons ?? value.reason ?? value.evidence);

  if (!family) {
    return null;
  }

  return {
    family,
    score,
    reasons,
  };
}

function readProductFamilyScoresFrom(value: unknown): ProductFamilyScoreLike[] {
  const directScores = arrayFromUnknown(value).map(normalizeProductFamilyScore).filter((item): item is ProductFamilyScoreLike => Boolean(item));

  if (directScores.length) {
    return directScores;
  }

  if (!isRecord(value)) {
    return [];
  }

  const nestedCandidates = [
    value.productFamilyScores,
    value.recommendationEvidence,
    isRecord(value.recommendationEvidence) ? value.recommendationEvidence.productFamilyScores : null,
    value.discoveryBrief,
    isRecord(value.discoveryBrief) ? value.discoveryBrief.recommendationEvidence : null,
    isRecord(value.discoveryBrief) && isRecord(value.discoveryBrief.recommendationEvidence)
      ? value.discoveryBrief.recommendationEvidence.productFamilyScores
      : null,
  ];

  for (const candidate of nestedCandidates) {
    const nestedScores = readProductFamilyScoresFrom(candidate);

    if (nestedScores.length) {
      return nestedScores;
    }
  }

  return [];
}

function readProductFamilyScores(props: CompareCandidateShortlistProps): ProductFamilyScoreLike[] {
  return readProductFamilyScoresFrom(props);
}

function pickNumber(record: UnknownRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const match = value.match(/\d+/);

      if (match) {
        return Number(match[0]);
      }
    }
  }

  return null;
}

function looksLikeCandidate(record: UnknownRecord): boolean {
  const sku = pickText(record, SKU_KEYS);
  const name = pickText(record, NAME_KEYS);

  if (!sku && !name) {
    return false;
  }

  const manufacturer = pickText(record, ["manufacturer", "brand", "make"]);

  if (manufacturer && !/wyrestorm/i.test(manufacturer)) {
    return false;
  }

  const combined = `${sku} ${name}`.toLowerCase();

  if (combined.includes("competitor")) {
    return false;
  }

  return true;
}

function collectProductObjects(value: unknown, depth = 0, seen = new Set<unknown>()): UnknownRecord[] {
  if (depth > 4) {
    return [];
  }

  if (!isRecord(value) && !Array.isArray(value)) {
    return [];
  }

  if (seen.has(value)) {
    return [];
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const found: UnknownRecord[] = [];

    for (const item of value) {
      found.push(...collectProductObjects(item, depth + 1, seen));
    }

    return found;
  }

  const found: UnknownRecord[] = [];

  if (looksLikeCandidate(value)) {
    found.push(value);
  }

  for (const [key, child] of Object.entries(value)) {
    if (EXCLUDED_RECURSIVE_KEYS.has(key.toLowerCase())) {
      continue;
    }

    found.push(...collectProductObjects(child, depth + 1, seen));
  }

  return found;
}

function collectCandidateRecords(props: CompareCandidateShortlistProps): UnknownRecord[] {
  const direct: UnknownRecord[] = [];

  for (const key of PRODUCT_ARRAY_KEYS) {
    const value = props[key];

    if (!Array.isArray(value)) {
      continue;
    }

    for (const item of value) {
      if (isRecord(item) && looksLikeCandidate(item)) {
        direct.push(item);
      }
    }
  }

  for (const key of PRODUCT_OBJECT_KEYS) {
    const value = props[key];

    if (isRecord(value) && looksLikeCandidate(value)) {
      direct.push(value);
    }
  }

  const candidates = direct.length > 0 ? direct : collectProductObjects(props);
  const seen = new Set<string>();
  const deduped: UnknownRecord[] = [];

  for (const candidate of candidates) {
    const sku = pickText(candidate, SKU_KEYS);
    const name = pickText(candidate, NAME_KEYS);
    const key = `${sku || name}`.toLowerCase();

    if (!key) {
      continue;
    }

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(candidate);
  }

  return deduped.slice(0, 8);
}

function deriveFit(record: UnknownRecord): { label: string; help: string; tone: Tone } {
  const explicit = pickText(record, FIT_KEYS).toLowerCase();
  const score = pickNumber(record, ["score", "matchScore", "confidence", "confidenceScore"]);

  if (explicit.includes("good") || explicit.includes("strong") || explicit.includes("match") && !explicit.includes("partial") || score !== null && score >= 75) {
    return {
      label: "Good product-type match",
      help: "Broad product class, technology direction or I/O shape appears close enough to inspect.",
      tone: {
        border: "rgba(34, 197, 94, 0.48)",
        background: "rgba(34, 197, 94, 0.12)",
        color: "#bbf7d0",
      },
    };
  }

  if (explicit.includes("partial") || explicit.includes("possible") || explicit.includes("adjacent") || score !== null && score >= 45) {
    return {
      label: "Possible product-type match",
      help: "The product may fit the same broad requirement, but key details need checking.",
      tone: {
        border: "rgba(245, 158, 11, 0.52)",
        background: "rgba(245, 158, 11, 0.12)",
        color: "#fde68a",
      },
    };
  }

  if (explicit.includes("no match") || explicit.includes("block") || score !== null && score < 45) {
    return {
      label: "Adjacent option",
      help: "Shown as a nearby WyreStorm direction, not as a direct equivalent.",
      tone: {
        border: "rgba(248, 113, 113, 0.48)",
        background: "rgba(248, 113, 113, 0.12)",
        color: "#fecaca",
      },
    };
  }

  return {
    label: "Possible product-type match",
    help: "Shown because it appears to be in the same product category or workflow.",
    tone: {
      border: "rgba(102, 224, 224, 0.44)",
      background: "rgba(102, 224, 224, 0.10)",
      color: "#a5f3fc",
    },
  };
}

function deriveIoSummary(record: UnknownRecord): string {
  const explicit = pickText(record, ["ioSummary", "iOSummary", "ports", "portSummary", "inputOutputSummary"]);

  if (explicit) {
    return explicit;
  }

  const inputs = pickNumber(record, INPUT_KEYS);
  const outputs = pickNumber(record, OUTPUT_KEYS);

  if (inputs !== null && outputs !== null) {
    return `${inputs} input${inputs === 1 ? "" : "s"} / ${outputs} output${outputs === 1 ? "" : "s"}`;
  }

  if (inputs !== null) {
    return `${inputs} input${inputs === 1 ? "" : "s"} / outputs to confirm`;
  }

  if (outputs !== null) {
    return `Inputs to confirm / ${outputs} output${outputs === 1 ? "" : "s"}`;
  }

  return "Check datasheet for exact I/O";
}

function makeCandidateCard(record: UnknownRecord, index: number, productFamilyScores: ProductFamilyScoreLike[]): CandidateCard {
  const sku = pickText(record, SKU_KEYS);
  const name = pickText(record, NAME_KEYS) || sku || `WyreStorm option ${index + 1}`;
  const role = pickText(record, ROLE_KEYS) || "Product role to confirm";
  const technology = pickText(record, TECHNOLOGY_KEYS) || "Technology type to confirm";
  const ioSummary = deriveIoSummary(record);
  const fit = deriveFit(record);
  const rankingReason = getProductFamilyRankingReason(
    {
      sku,
      title: name,
      family: technology,
      category: role,
      technology,
      description: [role, technology, ioSummary].filter(Boolean).join(" "),
    },
    productFamilyScores,
  );

  const why = [
    role !== "Product role to confirm" ? `Same broad role: ${role}` : "",
    technology !== "Technology type to confirm" ? `Technology direction: ${technology}` : "",
    ioSummary !== "Check datasheet for exact I/O" ? `I/O shape: ${ioSummary}` : "",
  ].filter(Boolean);

  const checks = [
    "Confirm exact input/output requirement before quoting.",
    "Check resolution, HDCP, audio, control and distance requirements.",
    "Treat this as a WyreStorm product direction, not a guaranteed direct equivalent.",
  ];

  return {
    id: `${sku || name}-${index}`,
    sku,
    name,
    fitLabel: fit.label,
    fitHelp: fit.help,
    role,
    technology,
    ioSummary,
    why: why.length > 0 ? why : ["Shown as a potential WyreStorm product direction."],
    checks,
    rankingReason,
    tone: fit.tone,
  };
}

function buildCandidateCards(props: CompareCandidateShortlistProps): CandidateCard[] {
  const productFamilyScores = readProductFamilyScores(props);

  return collectCandidateRecords(props).map((record, index) => makeCandidateCard(record, index, productFamilyScores));
}

function readDetectedCategory(props: CompareCandidateShortlistProps): string {
  const direct = pickText(props, [
    "detectedProductType",
    "detectedCategory",
    "classification",
    "productType",
    "category",
    "compareCategory",
  ]);

  if (direct) {
    return direct;
  }

  const competitor = props.competitorProduct || props.competitor || props.sourceProduct;

  if (isRecord(competitor)) {
    return pickText(competitor, ROLE_KEYS) || pickText(competitor, TECHNOLOGY_KEYS);
  }

  return "";
}

function saveCompareReturn(candidate: CandidateCard): void {
  if (typeof window === "undefined") {
    return;
  }

  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.sessionStorage.setItem(COMPARE_RETURN_KEY, currentUrl);
  window.sessionStorage.setItem(COMPARE_SELECTED_SKU_KEY, candidate.sku || candidate.name);
}

function openProductGuidance(candidate: CandidateCard): void {
  if (typeof window === "undefined") {
    return;
  }

  saveCompareReturn(candidate);

  const productKey = candidate.sku || candidate.name;
  const params = new URLSearchParams();

  params.set("sku", productKey);
  params.set("product", productKey);
  params.set("from", "compare");

  window.location.assign(`/wingman/product-pitch?${params.toString()}`);
}

export function CompareCandidateShortlist(props: CompareCandidateShortlistProps) {
  const [showNotes, setShowNotes] = useState(false);
  const candidates = useMemo(() => buildCandidateCards(props), [props]);
  const detectedCategory = useMemo(() => readDetectedCategory(props), [props]);

  return (
    <section style={styles.shell} aria-label="WyreStorm product options">
      <div style={styles.eyebrow}>Competitor compare</div>
      <h2 style={styles.title}>WyreStorm product options in the same category</h2>
      <p style={styles.intro}>
        This view shows potential WyreStorm product directions based mainly on product type,
        technology family and I/O shape. It is not claiming a direct feature-for-feature equivalent.
      </p>

      {detectedCategory ? (
        <p style={styles.intro}>
          <strong>Detected category:</strong> {detectedCategory}
        </p>
      ) : null}

      {candidates.length === 0 ? (
        <div style={styles.empty}>
          No clear WyreStorm candidate list was passed into this view. The compare engine may still have
          evidence, but the UI needs a candidate product object, SKU, or recommendation result to show a shortlist.
        </div>
      ) : null}

      {candidates.length > 0 ? (
        <div style={styles.grid}>
          {candidates.map((candidate) => (
            <article key={candidate.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div>
                  {candidate.sku ? <span style={styles.sku}>{candidate.sku}</span> : null}
                  <h3 style={styles.productName}>{candidate.name}</h3>
                </div>

                <span
                  style={{
                    ...styles.badge,
                    borderColor: candidate.tone.border,
                    background: candidate.tone.background,
                    color: candidate.tone.color,
                  }}
                  title={candidate.fitHelp}
                >
                  {candidate.fitLabel}
                </span>
              </div>

              <div style={styles.facts}>
                <div style={styles.fact}>
                  <span style={styles.factLabel}>Product role</span>
                  <span style={styles.factValue}>{candidate.role}</span>
                </div>

                <div style={styles.fact}>
                  <span style={styles.factLabel}>Technology type</span>
                  <span style={styles.factValue}>{candidate.technology}</span>
                </div>

                <div style={styles.fact}>
                  <span style={styles.factLabel}>I/O shape</span>
                  <span style={styles.factValue}>{candidate.ioSummary}</span>
                </div>
              </div>

              {candidate.rankingReason ? (
                <div style={styles.notes} data-testid="compare-product-family-ranking-reason">
                  <strong>Why this compare option is prioritised:</strong> {candidate.rankingReason}
                </div>
              ) : null}

              <div style={styles.sectionLabel}>Why shown</div>
              <ul style={styles.list}>
                {candidate.why.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div style={styles.sectionLabel}>Check before quoting</div>
              <ul style={styles.list}>
                {candidate.checks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div style={styles.actions}>
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => openProductGuidance(candidate)}
                >
                  View product guidance
                </button>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => {
                    saveCompareReturn(candidate);
                    setShowNotes((value) => !value);
                  }}
                >
                  {showNotes ? "Hide technical notes" : "View technical match notes"}
                </button>
              </div>

              {showNotes ? (
                <div style={styles.notes}>
                  Detailed compare data is intentionally hidden from the first view because public competitor
                  specifications can be incomplete and feature matching is often subjective. Use the shortlist as
                  a sales-safe starting point, then validate datasheets, dependencies and project requirements.
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default CompareCandidateShortlist;