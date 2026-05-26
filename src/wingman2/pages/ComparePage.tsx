import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CompareIntelligenceResult,
  lookupCompareIntelligence,
} from "../lib/compareIntelligenceClient";
import { SalesToneQuickSetter } from "../components/SalesToneQuickSetter";

type StatusTone = "green" | "amber" | "red" | "slate";

type CompareHistoryItem = {
  id: string;
  brand: string;
  sku: string;
  productName: string;
  productUrl: string;
  rawText: string;
  allowWeb: boolean;
  categoryLabel?: string;
  matchStatus?: string;
  savedAt: string;
};

type SpecRow = {
  group: string;
  key: string;
  value: string;
};

type Candidate = NonNullable<NonNullable<CompareIntelligenceResult["wyrestorm"]>["candidates"]>[number];

const HISTORY_KEY = "wingman.compare.inputHistory.v12";
const LEGACY_HISTORY_KEYS = [
  "wingman.compare.inputHistory.v1",
  "wingman.compare.inputHistory.v2",
  "wingman.compare.inputHistory.v3",
  "wingman.compare.inputHistory.v4",
  "wingman.compare.inputHistory.v5",
  "wingman.compare.inputHistory.v6",
  "wingman.compare.inputHistory.v7",
  "wingman.compare.inputHistory.v8",
  "wingman.compare.inputHistory.v9",
  "wingman.compare.inputHistory.v10",
  "wingman.compare.inputHistory.v11",
];

const MAX_HISTORY_ITEMS = 20;
const COMPARE_FEEDBACK_KEY = "wm_competitor_compare_recommendation_feedback_v2";
const BAD_ENCODING_RE = /[\u00c3\u00c2\ufffd]|\u00e2(?:\u20ac|\u201e|\u0153|\u2122|\u00a6)|[\u00c6\u00a2\u0161\u00ac]/;

const statusTone: Record<string, StatusTone> = {
  candidate_match: "green",
  review_required: "amber",
  no_genuine_match: "amber",
  no_wyrestorm_category: "slate",
  insufficient_type_confidence: "amber",
  product_index_empty: "red",
};

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\uFFFD/g, "").trim();
}

function hasBadEncoding(value: unknown) {
  return BAD_ENCODING_RE.test(String(value ?? ""));
}

function displaySafe(value: unknown, fallback = "") {
  const text = cleanText(value);

  if (!text || hasBadEncoding(text)) {
    return fallback;
  }

  return text;
}

function percent(value?: number) {
  if (typeof value !== "number") {
    return "Not available";
  }

  return `${Math.round(value * 100)}%`;
}

function makeHistoryId(item: Pick<CompareHistoryItem, "brand" | "sku" | "productName" | "productUrl">) {
  return [item.brand, item.sku, item.productName, item.productUrl]
    .map((value) => value.trim().toLowerCase())
    .join("|");
}

function normaliseHistoryItem(item: Partial<CompareHistoryItem>): CompareHistoryItem | null {
  const normalised: CompareHistoryItem = {
    id: "",
    brand: displaySafe(item.brand),
    sku: displaySafe(item.sku),
    productName: displaySafe(item.productName),
    productUrl: displaySafe(item.productUrl),
    rawText: displaySafe(item.rawText),
    allowWeb: item.allowWeb !== false,
    categoryLabel: displaySafe(item.categoryLabel),
    matchStatus: displaySafe(item.matchStatus),
    savedAt: displaySafe(item.savedAt) || new Date().toISOString(),
  };

  normalised.id = makeHistoryId(normalised);

  const hasContent = Boolean(
    normalised.brand ||
      normalised.sku ||
      normalised.productName ||
      normalised.productUrl,
  );

  if (!hasContent) {
    return null;
  }

  const hasEncodingIssue = [
    normalised.brand,
    normalised.sku,
    normalised.productName,
    normalised.productUrl,
    normalised.rawText,
    normalised.categoryLabel,
    normalised.matchStatus,
  ].some(hasBadEncoding);

  if (hasEncodingIssue) {
    return null;
  }

  return normalised;
}

function purgeLegacyCompareHistory() {
  if (typeof window === "undefined") {
    return;
  }

  LEGACY_HISTORY_KEYS.forEach((key) => window.localStorage.removeItem(key));

  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("wingman.compare.inputHistory.") && key !== HISTORY_KEY)
    .forEach((key) => window.localStorage.removeItem(key));
}

function loadHistory() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = JSON.parse(raw || "[]");

    if (!Array.isArray(parsed)) {
      return [];
    }

    const cleaned = parsed
      .map((item) => normaliseHistoryItem(item))
      .filter((item): item is CompareHistoryItem => Boolean(item))
      .slice(0, MAX_HISTORY_ITEMS);

    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(cleaned));

    return cleaned;
  } catch {
    window.localStorage.removeItem(HISTORY_KEY);
    return [];
  }
}

function saveHistory(items: CompareHistoryItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS)));
}

function saveRecommendationFeedback(response: CompareIntelligenceResult) {
  if (typeof window === "undefined") {
    return;
  }

  const candidate = response.wyrestorm?.candidates?.[0];
  const feedback = {
    savedAt: new Date().toISOString(),
    brand: response.query?.brand || "",
    sku: response.query?.sku || "",
    productName: response.query?.productName || "",
    candidateSku: candidate?.sku || "",
    matchStatus: response.wyrestorm?.matchStatus || "",
    matchScore: candidate?.score ?? null,
  };

  try {
    const existing = JSON.parse(window.localStorage.getItem(COMPARE_FEEDBACK_KEY) || "[]");
    const next = Array.isArray(existing) ? [feedback, ...existing].slice(0, 25) : [feedback];
    window.localStorage.setItem(COMPARE_FEEDBACK_KEY, JSON.stringify(next));
  } catch {
    window.localStorage.setItem(COMPARE_FEEDBACK_KEY, JSON.stringify([feedback]));
  }
}

function normaliseSuggestion(value: unknown) {
  return cleanText(value).toLowerCase().trim();
}

function uniqueSuggestions(
  history: CompareHistoryItem[],
  key: "brand" | "sku" | "productName" | "productUrl",
  activeBrand = "",
) {
  const selectedBrand = normaliseSuggestion(activeBrand);

  return Array.from(
    new Set(
      history
        .filter((item) => {
          if (key === "brand") {
            return true;
          }

          if (!selectedBrand) {
            return false;
          }

          return normaliseSuggestion(item.brand) === selectedBrand;
        })
        .map((item) => item[key]?.trim())
        .filter((value): value is string => Boolean(value) && !hasBadEncoding(value)),
    ),
  ).slice(0, 12);
}

function specRows(result: CompareIntelligenceResult | null): SpecRow[] {
  const profile = result?.competitor?.specProfile as Record<string, unknown> | undefined;

  if (!profile) {
    return [];
  }

  return Object.entries(profile)
    .filter(([key]) => key !== "evidenceHints" && key !== "__evidenceText")
    .flatMap(([group, value]) => {
      if (!value || typeof value !== "object") {
        return [];
      }

      return Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== null && item !== undefined && item !== false)
        .map(([key, item]) => ({
          group,
          key,
          value: item === true ? "Yes" : String(item),
        }));
    });
}

function statusLabel(value?: string) {
  const labels: Record<string, string> = {
    candidate_match: "Credible WyreStorm option found",
    review_required: "Manual review required before positioning",
    no_genuine_match: "No strong WyreStorm alternative found",
    no_wyrestorm_category: "WyreStorm does not directly compete with this product type",
    insufficient_type_confidence: "Need more product detail before recommending",
    product_index_empty: "WyreStorm product list is unavailable",
  };

  return labels[value || ""] || value || "Not checked";
}

function toneClass(tone: StatusTone) {
  const classes: Record<StatusTone, string> = {
    green: "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-400/40 bg-amber-400/10 text-amber-100",
    red: "border-red-400/40 bg-red-400/10 text-red-100",
    slate: "border-slate-400/30 bg-slate-400/10 text-slate-100",
  };

  return classes[tone];
}

function formatSavedDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function topCandidate(result: CompareIntelligenceResult | null): Candidate | null {
  const candidates = result?.wyrestorm?.candidates || [];

  if (!candidates.length) {
    return null;
  }

  return candidates[0] || null;
}


function hasUsefulVerifiedFacts(result: CompareIntelligenceResult | null) {
  return specRows(result).length > 0;
}

function isProvisionalMatch(result: CompareIntelligenceResult | null) {
  return result?.competitor?.category === "av_over_ip" && !hasUsefulVerifiedFacts(result);
}

function salesRecommendation(result: CompareIntelligenceResult | null) {
  const status = result?.wyrestorm?.matchStatus;
  const candidate = topCandidate(result);
  const provisional = isProvisionalMatch(result);

  if (status === "candidate_match" && candidate?.sku && provisional) {
    return `Treat ${candidate.sku} as a provisional same-role starting point only. Add a product page or datasheet text before expanding to other WyreStorm families or quoting.`;
  }

  if (status === "review_required" && candidate?.sku) {
    return `Do not position ${candidate.sku} as a recommendation yet. Use it as a review-only lead, then confirm current SKU status, feature parity, distance, signal format, USB/audio/control needs and package contents before quoting.`;
  }

  if (status === "review_required") {
    return "Do not position a WyreStorm recommendation yet. The closest product area needs manual review before it is safe for a customer proposal.";
  }

  if (status === "candidate_match" && candidate?.sku) {
    return `Position ${candidate.sku} first as a realistic functional alternative, not a guaranteed line-for-line clone. Confirm the listed differences, distance, signal format, USB/audio/control needs, and any project-specific constraints before quoting.`;
  }

  if (status === "candidate_match") {
    return "Wingman found a credible WyreStorm option. Use it as the starting point, then confirm the customer requirement before committing.";
  }

  if (status === "no_genuine_match") {
    return "Do not force a WyreStorm comparison. Use this result to explain that the competitor product may sit outside the best WyreStorm fit, or that more detail is needed.";
  }

  if (status === "no_wyrestorm_category") {
    return "This appears to be a product type WyreStorm does not directly replace. Use the product facts to understand the opportunity and look for related attachment sales.";
  }

  return result?.wyrestorm?.message || "Add more product detail before positioning a WyreStorm option.";
}

function friendlyReason(reason: string) {
  return displaySafe(reason)
    .replace("same product category", "same type of product")
    .replace("related product category", "related product type")
    .replace("feature:", "matches ")
    .replace("ports ", "similar ports: ");
}

function resultHeadline(result: CompareIntelligenceResult | null) {
  const candidate = topCandidate(result);
  const status = result?.wyrestorm?.matchStatus;

  if (status === "candidate_match" && candidate?.sku && isProvisionalMatch(result)) {
    return `${candidate.sku} is the provisional same-role option`;
  }

  if (status === "review_required" && candidate?.sku) {
    return `${candidate.sku} needs manual review before positioning`;
  }

  if (status === "candidate_match" && candidate?.sku) {
    return `${candidate.sku} is the leading WyreStorm option`;
  }

  if (status === "candidate_match") {
    return "Credible WyreStorm option found";
  }

  if (status === "no_genuine_match") {
    return "No strong WyreStorm alternative found";
  }

  if (status === "no_wyrestorm_category") {
    return "No direct WyreStorm product area";
  }

  return "Need more product detail before recommending";
}

function resultSubline(result: CompareIntelligenceResult | null) {
  const candidate = topCandidate(result);

  if (candidate?.candidatePurpose || candidate?.purposeMatch) {
    return displaySafe(candidate.purposeMatch || candidate.candidatePurpose);
  }

  return displaySafe(result?.competitor?.purposeLabel || result?.competitor?.categoryLabel || "Wingman is still building confidence from the available product detail.");
}


function factLabel(row: SpecRow) {
  const labels: Record<string, string> = {
    hdmi: "HDMI",
    hdbaset: "HDBaseT",
    hdmiMirrored: "Mirrored HDMI",
    rs232: "RS-232",
    ir: "IR",
    lan: "LAN",
    relay: "Relay",
    gpio: "GPIO",
    hdcp: "HDCP",
    edid: "EDID",
    webUi: "Web UI",
    hdbasetExtension: "HDBaseT extension",
    audioDeEmbedding: "Audio de-embedding",
    analogueOutput: "Analogue audio out",
    balancedOutput: "Balanced audio out",
  };

  return labels[row.key] || row.key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function factPriority(row: SpecRow) {
  const key = row.key.toLowerCase();
  const group = row.group.toLowerCase();

  if (group === "videoinputs") return 10;
  if (group === "videooutputs") return 20;
  if (key === "hdbasetextension") return 30;
  if (group === "control") return 40;
  if (key === "hdcp" || key === "edid") return 50;
  if (group === "audio") return 60;
  if (group === "usb") return 70;
  if (group === "features") return 80;

  return 100;
}

function competitorOverviewText(result: CompareIntelligenceResult | null) {
  const productType = displaySafe(
    result?.competitor?.purposeLabel || result?.competitor?.categoryLabel,
    "this competitor product",
  );

  const rows = specRows(result)
    .filter((row) => row.value !== "false" && row.value !== "No")
    .sort((a, b) => factPriority(a) - factPriority(b))
    .slice(0, 7);

  if (!rows.length) {
    return `Appears to be ${productType}. Wingman has not found enough verified facts yet, so the match should be treated as provisional.`;
  }

  const facts = rows.map((row) => `${factLabel(row)}: ${row.value}`).join("; ");

  return `Appears to be ${productType}. Verified headline facts: ${facts}.`;
}

function evidenceQualityText(result: CompareIntelligenceResult | null) {
  const quality = result?.evidence?.dataQuality;

  if (!quality?.basis) {
    return "Evidence basis not available.";
  }

  return `${quality.basis}. ${quality.guidance || ""}`.trim();
}

function candidateFit(candidate: Candidate | null, index = 0, result: CompareIntelligenceResult | null = null) {
  const score = Number(candidate?.score || 0);
  const provisional = isProvisionalMatch(result);
  const matchStatus = result?.wyrestorm?.matchStatus || "";
  const lifecycleStatus = displaySafe(candidate?.lifecycleStatus).toLowerCase();
  const recommendationStatus = displaySafe(candidate?.recommendationStatus).toLowerCase();
  const needsLifecycleReview = Boolean(
    candidate &&
      ((lifecycleStatus && lifecycleStatus !== "active") ||
        (recommendationStatus && recommendationStatus !== "recommendable")),
  );
  const reasons = (candidate?.reasons || []).map((reason) => reason.toLowerCase());
  const hasDirectLanguage = reasons.some((reason) =>
    reason.includes("same") ||
    reason.includes("direct") ||
    reason.includes("lead option") ||
    reason.includes("required match"),
  );
  const hasRelatedLanguage = reasons.some((reason) =>
    reason.includes("related") ||
    reason.includes("not like-for-like") ||
    reason.includes("subject to") ||
    reason.includes("confirm"),
  );

  if (!candidate) {
    return {
      label: "No fit",
      summary: "No WyreStorm product should be positioned from the current evidence.",
      className: "border-slate-400/20 bg-slate-400/10 text-slate-200",
    };
  }

  if (needsLifecycleReview) {
    return {
      label: "Review only",
      summary: candidate.lifecycleWarning || "Current SKU status is not verified. Confirm against WyreStorm source data before positioning or quoting.",
      className: "border-amber-300/35 bg-amber-300/10 text-amber-100",
    };
  }

  if (matchStatus === "review_required" || score < 70) {
    return {
      label: "Review only",
      summary: "Related product area, but the evidence is not strong enough for a customer-safe recommendation. Confirm facts manually before positioning.",
      className: "border-amber-300/35 bg-amber-300/10 text-amber-100",
    };
  }

  if (provisional) {
    return {
      label: "Provisional same-role fit",
      summary: "Correct endpoint role, but verified product facts are limited. Add a product page or datasheet before quoting or expanding the shortlist.",
      className: "border-amber-300/35 bg-amber-300/10 text-amber-100",
    };
  }

  if (score >= 85 && (index === 0 || hasDirectLanguage)) {
    return {
      label: "Good fit",
      summary: "Use as the lead WyreStorm position, then confirm the final project details before quoting.",
      className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    };
  }

  if (score >= 70) {
    return {
      label: "Good fit with checks",
      summary: "Technically close, but confirm feature parity, package contents, signal standard, distance and control needs.",
      className: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
    };
  }

  if (score >= 50 || hasRelatedLanguage) {
    return {
      label: "Indifferent / conditional fit",
      summary: "Related product area, but not a like-for-like replacement. Use only if the customer requirement is narrower or has changed.",
      className: "border-amber-300/35 bg-amber-300/10 text-amber-100",
    };
  }

  return {
    label: "Poor fit",
    summary: "Do not position this as a direct alternative unless more evidence changes the requirement.",
    className: "border-red-300/30 bg-red-300/10 text-red-100",
  };
}

function matchOverviewText(result: CompareIntelligenceResult | null) {
  const candidate = topCandidate(result);
  const fit = candidateFit(candidate, 0, result);

  if (!candidate) {
    return fit.summary;
  }

  return `${fit.label}: ${candidate.matchBasis || fit.summary}`;
}


function nextCheckItems(result: CompareIntelligenceResult | null) {
  const category = result?.competitor?.category || "";
  const role = result?.competitor?.purposeRole || "";

  if (category === "av_over_ip") {
    if (role === "encoder") {
      return [
        "Confirm this is the source-side device feeding video onto the AV-over-IP network.",
        "Confirm resolution, codec/compression, latency expectation and network family.",
        "Do not compare it with decoder/RX products unless the customer also needs display-side endpoints.",
      ];
    }

    if (role === "decoder") {
      return [
        "Confirm this is the display-side device converting AV-over-IP back to HDMI.",
        "Confirm whether a standard decoder is enough or whether multiview composition is required.",
        "Do not compare it with encoder/TX products unless the customer also needs source-side endpoints.",
      ];
    }

    return [
      "Confirm whether this AVoIP product is an encoder, decoder or transceiver.",
      "Do not rely on port count alone for AVoIP endpoint matching.",
    ];
  }

  if (category === "matrix_switcher") {
    return [
      "Confirm input count, output count and whether the outputs are HDMI, HDBaseT, or mixed.",
      "Check audio return, ARC/eARC, RS-232/IR routing, receiver package and distance requirements.",
    ];
  }

  if (category === "hdbaset_extender") {
    return [
      "Confirm whether this is a transmitter, receiver, or TX/RX kit.",
      "Check HDBaseT generation, distance, USB, audio, control and power requirements.",
    ];
  }

  if (category === "video_wall_processor") {
    return [
      "Confirm display count, source count and wall layout.",
      "Confirm whether it is a dedicated video wall processor or a matrix/scaling architecture.",
    ];
  }

  return [
    "Add a product page, datasheet text or more exact model information before making the match final.",
  ];
}


function ComparePage() {
  const [brand, setBrand] = useState("");
  const [sku, setSku] = useState("");
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [allowWeb, setAllowWeb] = useState(true);
  const [history, setHistory] = useState<CompareHistoryItem[]>([]);
  const [result, setResult] = useState<CompareIntelligenceResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    purgeLegacyCompareHistory();
    setHistory(loadHistory());
  }, []);

  const rows = useMemo(() => specRows(result), [result]);
  const matchStatus = result?.wyrestorm?.matchStatus || "";
  const tone = statusTone[matchStatus] || "slate";
  const candidate = topCandidate(result);
  const matchScore = candidate?.score;

  const brandSuggestions = useMemo(() => uniqueSuggestions(history, "brand"), [history]);
  const skuSuggestions = useMemo(() => uniqueSuggestions(history, "sku", brand), [history, brand]);
  const productNameSuggestions = useMemo(() => uniqueSuggestions(history, "productName", brand), [history, brand]);
  const productUrlSuggestions = useMemo(() => uniqueSuggestions(history, "productUrl", brand), [history, brand]);

  function clearCurrentCompareOutput() {
    setResult(null);
    setError("");
  }

  function updateBrand(value: string) {
    setBrand(value);
    clearCurrentCompareOutput();
  }

  function updateSku(value: string) {
    setSku(value);
    clearCurrentCompareOutput();
  }

  function updateProductName(value: string) {
    setProductName(value);
    clearCurrentCompareOutput();
  }

  function updateProductUrl(value: string) {
    setProductUrl(value);
    clearCurrentCompareOutput();
  }

  function updateRawText(value: string) {
    setRawText(value);
    clearCurrentCompareOutput();
  }

  function rememberLookup(response: CompareIntelligenceResult) {
    const nextItem = normaliseHistoryItem({
      brand,
      sku,
      productName,
      productUrl,
      rawText,
      allowWeb,
      categoryLabel: response.competitor?.purposeLabel || response.competitor?.categoryLabel,
      matchStatus: response.wyrestorm?.matchStatus,
      savedAt: new Date().toISOString(),
    });

    if (!nextItem) {
      return;
    }

    const nextHistory = [
      nextItem,
      ...history.filter((item) => item.id !== nextItem.id),
    ].slice(0, MAX_HISTORY_ITEMS);

    setHistory(nextHistory);
    saveHistory(nextHistory);
  }

  function loadHistoryItem(item: CompareHistoryItem) {
    setBrand(item.brand);
    setSku(item.sku);
    setProductName(item.productName);
    setProductUrl(item.productUrl);
    setRawText(item.rawText);
    setAllowWeb(item.allowWeb);
    setError("");
  }

  function deleteHistoryItem(id: string) {
    const nextHistory = history.filter((item) => item.id !== id);
    setHistory(nextHistory);
    saveHistory(nextHistory);
  }

  function clearHistory() {
    purgeLegacyCompareHistory();
    setHistory([]);
    saveHistory([]);
  }

  async function runCompetitorMatch(event: FormEvent) {
    event.preventDefault();

    const requestBrand = brand.trim();
    const requestSku = sku.trim();
    const requestProductName = productName.trim();
    const requestProductUrl = productUrl.trim();
    const requestRawText = rawText.trim();

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const response = await lookupCompareIntelligence({
        brand: requestBrand,
        sku: requestSku,
        productName: requestProductName,
        productUrl: requestProductUrl,
        rawText: requestRawText,
        allowWeb,
      });

      setResult(response);
      rememberLookup(response);
      saveRecommendationFeedback(response);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : String(lookupError));
    }

    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-3 py-5 text-slate-100 sm:px-4">
      <section className="mx-auto flex w-full max-w-[88rem] flex-col gap-4 rounded-[2rem] border border-white/[0.03] bg-slate-900/25 px-3 py-4 shadow-2xl shadow-black/20">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
                Competitor Product Check
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">
                Understand the competitor product, then position WyreStorm confidently.
              </h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                Enter whatever you have: competitor brand, model, product name, pasted customer notes, or a product page. A URL is optional, but it can improve accuracy when available.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
              Only credible alternatives
            </div>
          </div>
        </div>

        <SalesToneQuickSetter context="compare" surface="dark" className="max-w-none" />

        <form
          onSubmit={runCompetitorMatch}
          className="grid gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-xl shadow-black/20 xl:grid-cols-[1fr_1fr_1.45fr_auto]"
        >
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Competitor brand
            </span>
            <input
              value={brand}
              onChange={(event) => updateBrand(event.target.value)}
              placeholder="e.g. Extron, AVPro Edge, Kramer"
              list="compare-brand-history"
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus:ring-2"
            />
            <datalist id="compare-brand-history">
              {brandSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Competitor model
            </span>
            <input
              value={sku}
              onChange={(event) => updateSku(event.target.value)}
              placeholder="Use the exact model number if available. Suggestions are limited to the selected brand."
              list="compare-sku-history"
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus:ring-2"
            />
            <datalist id="compare-sku-history">
              {skuSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Product name or customer note
            </span>
            <input
              value={productName}
              onChange={(event) => updateProductName(event.target.value)}
              placeholder="Optional short description from the customer or quote. Suggestions are limited to the selected brand."
              list="compare-product-name-history"
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus:ring-2"
            />
            <datalist id="compare-product-name-history">
              {productNameSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy || (!brand.trim() && !sku.trim() && !productName.trim() && !rawText.trim() && !productUrl.trim())}
              className="min-h-[50px] min-w-[150px] rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Checking..." : "Check product"}
            </button>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 lg:col-span-4">
            <input
              type="checkbox"
              checked={allowWeb}
              onChange={(event) => setAllowWeb(event.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-slate-300">
              Let Wingman look online when you only have a brand, model, or partial product detail.
            </span>
          </label>

          <label className="flex flex-col gap-2 lg:col-span-4">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Optional product page link
            </span>
            <input
              value={productUrl}
              onChange={(event) => updateProductUrl(event.target.value)}
              placeholder="Optional. Paste a manufacturer page, distributor listing, or saved product link if you have one. Suggestions are limited to the selected brand."
              list="compare-product-url-history"
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus:ring-2"
            />
            <datalist id="compare-product-url-history">
              {productUrlSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <span className="text-xs leading-5 text-slate-500">
              Not required. A product page simply gives Wingman a stronger source when the exact link is available.
            </span>
          </label>

          <label className="flex flex-col gap-2 lg:col-span-4">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Paste anything the customer sent you
            </span>
            <textarea
              value={rawText}
              onChange={(event) => updateRawText(event.target.value)}
              placeholder="Optional. Paste a product description, quotation line, datasheet text, or known ports/features."
              className="min-h-[96px] rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus:ring-2"
            />
          </label>
        </form>

        {error ? (
          <div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-4 text-red-100">
            {error}
          </div>
        ) : null}

        {result ? (
          <section className="grid gap-4">
            <div className={`rounded-3xl border p-5 shadow-2xl shadow-black/30 ${toneClass(tone)}`}>
              <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] opacity-80">
                    Sales answer
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">
                    {resultHeadline(result)}
                  </h2>
                  <p className="mt-3 max-w-3xl text-base leading-7 opacity-95">
                    {salesRecommendation(result)}
                  </p>

                  {resultSubline(result) ? (
                    <p className="mt-3 text-sm font-semibold opacity-90">
                      {resultSubline(result)}
                    </p>
                  ) : null}

                  {candidate?.reasons?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <p className="basis-full text-xs font-bold uppercase tracking-[0.18em] opacity-75">
                        Match evidence
                      </p>
                      {candidate.reasons.slice(0, 6).map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold"
                        >
                          {friendlyReason(reason)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-75">
                    Competitor product
                  </p>
                  <h3 className="mt-2 text-xl font-black">
                    {displaySafe(result.competitor?.purposeLabel || result.competitor?.categoryLabel, "Need more product detail")}
                  </h3>
                  <p className="mt-2 text-sm opacity-85">
                    Wingman confidence: {percent(result.competitor?.categoryConfidence)}
                  </p>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-75">
                      Competitor overview
                    </p>
                    <p className="mt-2 text-sm leading-6 opacity-90">
                      {competitorOverviewText(result)}
                    </p>
                    <p className="mt-2 text-xs leading-5 opacity-80">
                      Evidence basis: {evidenceQualityText(result)}
                    </p>
                    <p className="mt-3 text-sm font-semibold opacity-95">
                      {matchOverviewText(result)}
                    </p>
                  </div>

                  {candidate ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-75">
                        Best WyreStorm fit
                      </p>
                      <p className="mt-1 text-2xl font-black">{candidate.sku}</p>
                      {candidate.name ? (
                        <p className="mt-1 text-sm opacity-90">{candidate.name}</p>
                      ) : null}
                      <p className="mt-2 text-xs font-semibold opacity-75">
                        Match score: {matchScore ?? "Not available"}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-3 text-sm opacity-90">
                      No WyreStorm SKU is being forced from weak evidence.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col gap-4">
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        What Wingman identified
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-white">
                        {displaySafe(result.competitor?.purposeLabel || result.competitor?.categoryLabel, "Need more product detail")}
                      </h2>
                      <p className="mt-2 text-sm text-slate-300">
                        Wingman confidence: {percent(result.competitor?.categoryConfidence)}
                      </p>
                    </div>

                    <span
                      className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${toneClass(
                        result.competitor?.wyrestormOverlap ? "green" : "slate",
                      )}`}
                    >
                      {result.competitor?.wyrestormOverlap ? "WyreStorm can compete here" : "No direct WyreStorm product area"}
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Verified product facts found
                  </p>

                  {rows.length ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {rows.slice(0, 12).map((row) => (
                        <div
                          key={`${row.group}-${row.key}`}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2"
                        >
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            {row.group}
                          </p>
                          <p className="text-sm font-semibold text-white">
                            {row.key}: {row.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-100">
                          Confirm before quoting
                        </p>
                        <ul className="mt-2 space-y-2 text-sm leading-6 text-amber-50/90">
                          {nextCheckItems(result).map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  WyreStorm options to consider
                </p>

                {result.wyrestorm?.candidates?.length ? (
                  <div className="mt-4 flex flex-col gap-3">
                    {result.wyrestorm.candidates.map((item, index) => {
                      const reviewOnly = result.wyrestorm?.matchStatus === "review_required" ||
                        (item.recommendationStatus && item.recommendationStatus !== "recommendable") ||
                        (item.lifecycleStatus && item.lifecycleStatus !== "active");
                      const leadClass = reviewOnly
                        ? "border-amber-300/40 bg-amber-300/10"
                        : "border-cyan-300/40 bg-cyan-300/10";
                      const leadBadgeClass = reviewOnly
                        ? "border-amber-300/30 bg-amber-300/15 text-amber-100"
                        : "border-cyan-300/30 bg-cyan-300/15 text-cyan-100";
                      const scoreClass = reviewOnly
                        ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                        : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100";

                      return (
                      <article
                        key={`${item.sku}-${item.name}-${index}`}
                        className={`rounded-3xl border p-4 ${index === 0 ? leadClass : "border-white/10 bg-white/[0.04]"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              {index === 0 ? (
                                <span className={`rounded-full border px-2 py-1 text-xs font-bold ${leadBadgeClass}`}>
                                  {reviewOnly ? "Review lead" : "Lead option"}
                                </span>
                              ) : null}
                              {item.family ? (
                                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-300">
                                  {item.family}
                                </span>
                              ) : null}
                            </div>

                            <h3 className="mt-3 text-2xl font-black text-white">
                              {item.sku}
                            </h3>

                            {item.name ? (
                              <p className="mt-1 text-sm leading-6 text-slate-300">
                                {item.name}
                              </p>
                            ) : null}

                            {item.candidatePurpose ? (
                              <p className="mt-2 text-xs font-semibold text-slate-400">
                                Role: {item.candidatePurpose}
                              </p>
                            ) : null}

                            {(() => {
                              const fit = candidateFit(item, index, result);

                              return (
                                <div className={`mt-3 rounded-2xl border px-3 py-2 text-xs ${fit.className}`}>
                                  <p className="font-black">{fit.label}</p>
                                  <p className="mt-1 leading-5 opacity-90">{fit.summary}</p>
                                </div>
                              );
                            })()}

                            {item.lifecycleWarning ? (
                              <p className="mt-2 text-xs leading-5 text-amber-100/90">
                                SKU status: {item.lifecycleWarning}
                              </p>
                            ) : null}
                          </div>

                          <span className={`rounded-2xl border px-3 py-2 text-sm font-black ${scoreClass}`}>
                            {item.score ?? 0}
                          </span>
                        </div>

                        {item.reasons?.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.reasons.slice(0, 8).map((reason) => (
                              <span
                                key={reason}
                                className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-300"
                              >
                                {friendlyReason(reason)}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {item.majorMatches?.length || item.advantages?.length || item.differences?.length ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            {item.majorMatches?.length ? (
                              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100">
                                  Major fit
                                </p>
                                <ul className="mt-2 space-y-1 text-xs leading-5 text-emerald-50/90">
                                  {item.majorMatches.slice(0, 4).map((match) => (
                                    <li key={match}>- {match}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            {item.advantages?.length ? (
                              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
                                  WyreStorm adds
                                </p>
                                <ul className="mt-2 space-y-1 text-xs leading-5 text-cyan-50/90">
                                  {item.advantages.slice(0, 4).map((advantage) => (
                                    <li key={advantage}>- {advantage}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            {item.differences?.length ? (
                              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-100">
                                  Check differences
                                </p>
                                <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-50/90">
                                  {item.differences.slice(0, 4).map((difference) => (
                                    <li key={difference}>- {difference}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    No WyreStorm option is being forced. This is correct when the competitor product is outside WyreStorm's range, or when there is not enough detail to make a credible recommendation.
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Recent competitor checks
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Simple recall list. Re-use or remove individual checks without affecting the current project.
              </p>
            </div>

            <button
              type="button"
              onClick={clearHistory}
              disabled={history.length === 0}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear recent checks
            </button>
          </div>

          {history.length ? (
            <div className="mt-4 flex flex-col gap-2">
              {history.map((item) => (
                <article
                  key={item.id}
                  className="grid items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm sm:grid-cols-[1fr_auto_auto]"
                >
                  <button
                    type="button"
                    onClick={() => loadHistoryItem(item)}
                    className="min-w-0 text-left"
                    title="Reload this previous competitor check"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="truncate font-bold text-white">
                        {[displaySafe(item.brand), displaySafe(item.sku)].filter(Boolean).join(" - ") || "Untitled lookup"}
                      </span>

                      {item.productName ? (
                        <span className="truncate text-xs text-slate-300">
                          {displaySafe(item.productName)}
                        </span>
                      ) : null}

                      {item.categoryLabel ? (
                        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                          {displaySafe(item.categoryLabel)}
                        </span>
                      ) : null}

                      {item.matchStatus ? (
                        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                          {statusLabel(item.matchStatus)}
                        </span>
                      ) : null}

                      {item.savedAt ? (
                        <span className="text-xs text-slate-500">
                          {formatSavedDate(item.savedAt)}
                        </span>
                      ) : null}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => loadHistoryItem(item)}
                    className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100 hover:bg-cyan-300/20"
                  >
                    Use
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteHistoryItem(item.id)}
                    className="rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-1.5 text-xs font-bold text-red-100 hover:bg-red-300/20"
                  >
                    Remove
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
              No recent competitor checks yet. Completed checks will appear here automatically.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export { ComparePage };
export default ComparePage;
