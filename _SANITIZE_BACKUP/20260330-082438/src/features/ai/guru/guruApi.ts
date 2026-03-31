import {
  lookupAndCompare,
  type CompetitorComparisonRecord,
} from "@/services/competitorComparisonService";
import { assessGuruKnowledge } from "@/features/ai/guru/guruKnowledgeBase";
import {
  assessQuestionIntelligence,
  type IntelligenceSupportAction,
} from "@/services/productIntelligenceAdvisor";
import type { ProductIntelligenceRecord } from "@/services/productIntelligenceService";
import { buildAvRecommendationFromDiscovery } from "@/services/av-recommendation/engine";
import type { GuidedProjectRecord } from "@/features/discovery/guidedProjectEngine";

export type GuruMode = "ask" | "resources" | "project-check";

export type GuruAnswer = {
  text: string;
  sources?: Array<{ title: string; kind: "training" | "video" | "doc" | "link"; to?: string; url?: string }>;
  confidence?: "low" | "medium" | "high";
  suggestedSkus?: Array<{ sku: string; name?: string; reason?: string }>;
  explanation?: {
    headline?: string;
    why?: string[];
    whatsMissing?: string[];
    handoffItems?: Array<{
      prompt: string;
      label: string;
      step: number;
      questionId: string;
    }>;
  };
};

export type GuruContext = {
  mode: GuruMode;
  room?: unknown;
  videowall?: unknown;
  bom?: unknown;
  notes?: string;
  discovery?: Partial<GuidedProjectRecord> | null;
};

const COMPETITOR_BRANDS = [
  "crestron",
  "extron",
  "atlona",
  "kramer",
  "lightware",
  "blustream",
  "zeevee",
];

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function hasText(value: unknown): boolean {
  return tidy(value).length > 0;
}

function normalizeSku(value: unknown): string {
  return tidy(value).toUpperCase();
}

function toGuruConfidence(value: "High" | "Medium" | "Low"): GuruAnswer["confidence"] {
  if (value === "High") return "high";
  if (value === "Medium") return "medium";
  return "low";
}

function dedupeSources(
  sources: NonNullable<GuruAnswer["sources"]>,
): NonNullable<GuruAnswer["sources"]> {
  const seen = new Set<string>();
  const out: NonNullable<GuruAnswer["sources"]> = [];
  for (const source of sources) {
    const key = `${source.kind}|${source.to || source.url || ""}|${source.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(source);
  }
  return out;
}

function supportActionsToSources(actions: IntelligenceSupportAction[]): NonNullable<GuruAnswer["sources"]> {
  return actions.map((action) => ({
    title: action.label,
    kind: "training",
    to: action.to,
  }));
}

function isCompetitorQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  if (lower.includes("competitor") || lower.includes("replacement") || lower.includes("cross-reference")) return true;
  if (COMPETITOR_BRANDS.some((brand) => lower.includes(brand))) return true;
  return /[a-z0-9]+[-_][a-z0-9-]+/i.test(question) &&
    /\b(compare|alternative|equivalent|cross-reference|cross reference|replace|replacement|versus|vs)\b/i.test(lower);
}

function coreSourcesForQuestion(question: string): NonNullable<GuruAnswer["sources"]> {
  const lower = question.toLowerCase();
  const sources: NonNullable<GuruAnswer["sources"]> = [
    { title: "Product Intelligence", kind: "training", to: "/app/tools/product-intelligence" },
  ];

  if (lower.includes("video wall") || lower.includes("videowall") || lower.includes("led") || lower.includes("lcd")) {
    sources.push({ title: "Video Wall Planner", kind: "training", to: "/app/tools/video-wall" });
  }
  if (lower.includes("proposal") || lower.includes("bom")) {
    sources.push({ title: "Proposal Builder", kind: "training", to: "/app/tools/proposal" });
  }
  if (lower.includes("price") || lower.includes("pricing")) {
    sources.push({ title: "Product Catalog", kind: "training", to: "/app/tools/catalog" });
  }
  if (isCompetitorQuestion(question)) {
    sources.push({ title: "Competitor Compare", kind: "training", to: "/app/tools/compare" });
  }

  return sources;
}

function compareResponseText(record: CompetitorComparisonRecord): string {
  const lines = [
    record.wyrestormVerified === false
      ? "No verified WyreStorm catalog SKU is currently confirmed. Manual review is required."
      : `Closest verified WyreStorm SKU: ${record.wyrestormSku}${record.wyrestormName ? ` (${record.wyrestormName})` : ""} (${record.wyrestormCategory}).`,
    `Confidence: ${record.confidence}${typeof record.matchScore === "number" ? ` (${record.matchScore}/100)` : ""}.`,
    record.rationale,
  ];

  if (record.ioComparison) lines.push(`I/O alignment: ${record.ioComparison}.`);
  if (record.intelligence?.escalationRequired) {
    lines.push(`Escalation required: ${record.intelligence.summary}`);
  }

  return lines.filter(Boolean).join("\n");
}

function addAdvisorSuffix(text: string, mode: GuruMode): string {
  if (mode !== "project-check") return text;
  return `${text}\n\nAdvisor note: validate I/O counts, distance limits, control scope, and user workflow before final recommendation.`;
}

function mergeSuggestedSkus(
  rows: Array<{ sku: string; name?: string; reason?: string }>,
): Array<{ sku: string; name?: string; reason?: string }> {
  const out: Array<{ sku: string; name?: string; reason?: string }> = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const sku = tidy(row.sku).toUpperCase();
    if (!sku || seen.has(sku)) continue;
    seen.add(sku);
    out.push({
      sku,
      name: tidy(row.name) || undefined,
      reason: tidy(row.reason) || undefined,
    });
  }

  return out;
}

function questionSkuSuggestions(
  rows: Array<{ brand?: string; sku?: string; summary?: string }>,
): Array<{ sku: string; name?: string; reason?: string }> {
  return mergeSuggestedSkus(
    rows
      .filter((record) => tidy(record.brand).toLowerCase().includes("wyrestorm"))
      .map((record) => ({
        sku: tidy(record.sku),
        name: tidy(record.summary),
        reason: "Matched from Guru product-intelligence guidance.",
      })),
  );
}

function confidenceRank(value: GuruAnswer["confidence"] | undefined): number {
  if (value === "high") return 3;
  if (value === "medium") return 2;
  if (value === "low") return 1;
  return 0;
}

function strongestConfidence(
  ...values: Array<GuruAnswer["confidence"] | undefined>
): GuruAnswer["confidence"] {
  const best = values.reduce<GuruAnswer["confidence"] | undefined>((current, value) => {
    return confidenceRank(value) > confidenceRank(current) ? value : current;
  }, undefined);
  return best ?? "low";
}

function isProductDirectedQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  const explicitIntent =
    /\bsku\b|\bmodel\b|\bfamily\b|\bproduct\b|\brecommend\b|\bsuggest\b|\bchoose\b|\bspecify\b/.test(lower) ||
    (/\b(which|what)\b/.test(lower) &&
      /\bsupport\b|\bsupports\b/.test(lower) &&
      /\bswitcher\b|\bmatrix\b|\bextender\b|\bsplitter\b|\bpresentation\b|\bwireless\b/.test(lower)) ||
    lower.includes("start with") ||
    lower.includes("which wyrestorm");
  const roomOrWorkflowIntent =
    lower.includes("meeting room") ||
    lower.includes("boardroom") ||
    lower.includes("usb-c") ||
    lower.includes("byod") ||
    lower.includes("byom");
  const categoryIntent =
    /\bneed\b|\blooking for\b|\bquote\b|\bproposal\b|\bshortlist\b/.test(lower) &&
    /\bapollo\b|\bhdbaset\b|\bavoip\b|\bnetworkhd\b|\bmatrix\b|\bswitcher\b|\bsplitter\b|\bextender\b|\bvideo wall\b/.test(lower);

  return (
    explicitIntent ||
    roomOrWorkflowIntent ||
    categoryIntent
  );
}

function shouldIncludeProductMatches(question: string, mode: GuruMode, confidence: GuruAnswer["confidence"]): boolean {
  if (mode === "project-check" && confidence !== "low") return true;
  return confidence !== "low" && isProductDirectedQuestion(question);
}

function isDesignOrWorkflowQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return /\b(room|workflow|design|project|switch|switcher|matrix|extender|hdbaset|avoip|video wall|family|fit|recommend)\b/.test(lower);
}

function isRecommendationStyleQuestion(question: string, mode: GuruMode): boolean {
  if (mode === "project-check") return true;
  const lower = question.toLowerCase();
  return (
    isProductDirectedQuestion(question) ||
    /\b(start with|start|family|direction|fit|recommend|recommendation|best option|best fit|what should i use|what family should i start with)\b/.test(lower)
  );
}

type CapabilityLookup = {
  category: "presentation-switcher" | null;
  capability: "airplay" | "miracast" | "wireless-casting" | null;
};

function recordTextBlob(record: ProductIntelligenceRecord): string {
  return [
    record.brand,
    record.sku,
    record.name,
    record.family,
    record.group,
    record.category,
    record.subcategory,
    record.summary,
    ...(record.features ?? []),
    ...(record.tags ?? []),
    record.notes,
  ]
    .map((value) => tidy(value).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function detectCapabilityLookup(question: string): CapabilityLookup | null {
  const lower = question.toLowerCase();
  const asksForSupportedProducts =
    /\b(which|what)\b/.test(lower) &&
    /\bsupport\b|\bsupports\b/.test(lower);

  if (!asksForSupportedProducts) return null;

  const category = lower.includes("presentation switcher") || lower.includes("presentation switchers")
    ? "presentation-switcher"
    : null;

  const capability = lower.includes("airplay")
    ? "airplay"
    : lower.includes("miracast")
      ? "miracast"
      : lower.includes("wireless casting") || lower.includes("wireless presentation")
        ? "wireless-casting"
        : null;

  if (!category || !capability) return null;

  return { category, capability };
}

function recordMatchesCapabilityLookup(
  record: ProductIntelligenceRecord,
  lookup: CapabilityLookup,
): boolean {
  const blob = recordTextBlob(record);
  const isPresentationSwitcher =
    blob.includes("presentation switcher") ||
    (blob.includes("switcher") && blob.includes("presentation"));

  if (lookup.category === "presentation-switcher" && !isPresentationSwitcher) {
    return false;
  }

  if (lookup.capability === "airplay") {
    return blob.includes("airplay") || blob.includes("wireless casting") || normalizeSku(record.sku).endsWith("-W");
  }
  if (lookup.capability === "miracast") {
    return blob.includes("miracast") || blob.includes("wireless casting") || normalizeSku(record.sku).endsWith("-W");
  }
  if (lookup.capability === "wireless-casting") {
    return blob.includes("wireless casting") || blob.includes("airplay") || blob.includes("miracast") || normalizeSku(record.sku).endsWith("-W");
  }

  return false;
}

function buildCapabilityLookupAnswer(
  question: string,
  records: ProductIntelligenceRecord[],
): GuruAnswer | null {
  const lookup = detectCapabilityLookup(question);
  if (!lookup) return null;

  const matches = records.filter((record) => recordMatchesCapabilityLookup(record, lookup)).slice(0, 4);
  if (matches.length === 0) return null;

  const skuList = matches.map((record) => record.sku).join(", ");
  const lines = [
    `WyreStorm presentation switchers with ${lookup.capability === "wireless-casting" ? "wireless casting" : lookup.capability} support: ${skuList}.`,
    "In this dataset, the wireless `-W` variants are the native AirPlay / Miracast models.",
  ];

  if (lookup.capability === "airplay") {
    lines.push("AirPlay works when the Apple device and switcher are on the same IP subnet.");
  }

  return {
    text: lines.join("\n"),
    confidence: matches.length >= 2 ? "high" : "medium",
    suggestedSkus: mergeSuggestedSkus(
      matches.map((record) => ({
        sku: record.sku,
        name: record.name,
        reason: `Matches the requested ${lookup.capability} capability.`,
      })),
    ),
    sources: dedupeSources([
      { title: "Product Intelligence", kind: "training", to: "/app/tools/product-intelligence" },
      { title: "Product Catalog", kind: "training", to: "/app/tools/catalog" },
    ]),
  };
}

function buildSharedRecommendationAnswer(
  question: string,
  ctx: GuruContext,
): GuruAnswer | null {
  if (!ctx.discovery) return null;

  const recommendation = buildAvRecommendationFromDiscovery(ctx.discovery);
  const shouldUse =
    ctx.mode === "project-check" ||
    isProductDirectedQuestion(question) ||
    isDesignOrWorkflowQuestion(question);

  if (!shouldUse) return null;

  const recommendationStyle = isRecommendationStyleQuestion(question, ctx.mode);
  const why = recommendation.whyThisAnswer.slice(0, recommendationStyle ? 2 : 1);
  const missing = recommendation.whatsMissing.slice(0, recommendationStyle ? 3 : 2);

  const lines = [
    recommendationStyle
      ? `Likely direction: ${recommendation.advice.focusCategory}, led by ${recommendation.primaryFamily} (${recommendation.confidenceLabel} confidence).`
      : `Current project direction: ${recommendation.advice.focusCategory}, led by ${recommendation.primaryFamily}.`,
  ];

  if (why.length > 0) {
    lines.push("Why this answer:");
    lines.push(...why.map((item) => `- ${item}`));
  } else if (hasText(recommendation.advice.workflowSummary)) {
    lines.push(recommendation.advice.workflowSummary);
  }

  if (missing.length > 0) {
    lines.push(recommendationStyle ? "What's still missing:" : "Still worth confirming:");
    lines.push(...missing.map((item) => `- ${item}`));
  }

  return {
    text: lines.filter(Boolean).join("\n"),
    confidence: recommendation.confidenceLabel,
    explanation: {
      headline: recommendationStyle
        ? `${recommendation.primaryFamily} is the lead WyreStorm direction for this brief.`
        : `Current lead family: ${recommendation.primaryFamily}.`,
      why,
      whatsMissing: missing,
      handoffItems: recommendation.missingItems.slice(0, recommendationStyle ? 3 : 2).map((item) => ({
        prompt: item.prompt,
        label: item.label,
        step: item.step,
        questionId: item.questionId,
      })),
    },
    sources: [
      { title: "Guided Project", kind: "training", to: "/app/tools/discovery" },
      { title: "Product Catalog", kind: "training", to: "/app/tools/catalog" },
    ],
  };
}

export async function askGuru(question: string, ctx: GuruContext): Promise<GuruAnswer> {
  const q = tidy(question);
  if (!q) return { text: "Ask a question to get started.", confidence: "low" };

  const knowledge = await assessGuruKnowledge(q, ctx.mode);
  const sharedRecommendation = buildSharedRecommendationAnswer(q, ctx);

  if (ctx.mode === "resources") {
    if (knowledge.text) {
      return {
        text: knowledge.text,
        confidence: knowledge.confidence,
        sources: dedupeSources([
          { title: "Training Hub", kind: "training", to: "/app/tools/training" },
          ...knowledge.sources,
        ]),
      };
    }

    return {
      text: "Use Product Intelligence first, then run Competitor Compare for replacement positioning, and finally validate any uncertainty through diagnostics.",
      confidence: "high",
      sources: [
        { title: "Product Intelligence", kind: "training", to: "/app/tools/product-intelligence" },
        { title: "Competitor Compare", kind: "training", to: "/app/tools/compare" },
        { title: "Lookup Diagnostics", kind: "training", to: "/app/tools/competitor-lookup-diagnostics" },
      ],
    };
  }

  const baseSources = coreSourcesForQuestion(q);

  if (isCompetitorQuestion(q)) {
    const compare = await lookupAndCompare(q);
    const selected = compare.records[0];
    if (!selected) {
      return {
        text: addAdvisorSuffix(
          "No competitor record was returned for that query. Provide brand + model (for example, 'Crestron DM-NVX-360') and rerun compare.",
          ctx.mode,
        ),
        confidence: "low",
        sources: dedupeSources([
          ...baseSources,
          { title: "Lookup Diagnostics", kind: "training", to: "/app/tools/competitor-lookup-diagnostics" },
        ]),
      };
    }

    const supportSources = selected.intelligence
      ? supportActionsToSources(selected.intelligence.supportActions)
      : [];
    const text = compareResponseText(selected);
    return {
      text: addAdvisorSuffix(text, ctx.mode),
      confidence: selected.intelligence
        ? toGuruConfidence(selected.intelligence.confidence)
        : toGuruConfidence(selected.confidence),
      sources: dedupeSources([...baseSources, ...supportSources]),
      suggestedSkus:
        selected.wyrestormVerified === false
          ? []
          : mergeSuggestedSkus([
              {
                sku: selected.wyrestormSku,
                name: selected.wyrestormName || selected.wyrestormCategory,
                reason: `Closest verified replacement for ${selected.brand} ${selected.competitorSku}.`,
              },
            ]),
    };
  }

  const intelligence = await assessQuestionIntelligence(q);
  const topRecords = intelligence.records.slice(0, 3);
  const directCapabilityAnswer = buildCapabilityLookupAnswer(q, intelligence.records);
  if (directCapabilityAnswer) {
    return directCapabilityAnswer;
  }
  const productConfidence = toGuruConfidence(intelligence.confidence);
  const includeProductMatches = shouldIncludeProductMatches(q, ctx.mode, productConfidence);
  const suggestedSkus = includeProductMatches ? questionSkuSuggestions(topRecords) : [];
  const preferSharedNarrative = Boolean(sharedRecommendation) && isRecommendationStyleQuestion(q, ctx.mode);
  const shouldShowProductChecks =
    !knowledge.text ||
    includeProductMatches ||
    ctx.mode === "project-check";

  if (!knowledge.text && topRecords.length === 0) {
    const supportSources = supportActionsToSources(intelligence.supportActions);
    if (sharedRecommendation) {
      return {
        text: addAdvisorSuffix(sharedRecommendation.text, ctx.mode),
        confidence: sharedRecommendation.confidence,
        explanation: sharedRecommendation.explanation,
        sources: dedupeSources([
          ...baseSources,
          ...(sharedRecommendation.sources ?? []),
          ...supportSources,
        ]),
        suggestedSkus: [],
      };
    }
    return {
      text: addAdvisorSuffix(
        [
          "No strong product matches were found for this question.",
          "Add the intended room type, SKU, or product family to improve answer quality.",
          intelligence.escalationRequired
            ? "Escalation: use Product Intelligence and diagnostics to capture missing evidence before customer commitment."
            : "",
        ].filter(Boolean).join("\n"),
        ctx.mode,
      ),
      confidence: toGuruConfidence(intelligence.confidence),
      sources: dedupeSources([...baseSources, ...supportSources]),
      suggestedSkus: [],
    };
  }

  const lines: string[] = [];

  if (sharedRecommendation) {
    lines.push(sharedRecommendation.text);
  }

  if (knowledge.text && (!preferSharedNarrative || !sharedRecommendation)) {
    if (lines.length > 0) lines.push("");
    lines.push(knowledge.text);
  }

  if (includeProductMatches && topRecords.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(`Best product starting points (${intelligence.confidence} confidence, ${intelligence.score}/100):`);
    lines.push(...topRecords.map((record) => `- ${record.brand} ${record.sku}: ${record.summary}`));
  } else if (!knowledge.text && topRecords.length > 0) {
    lines.push(`Top product-intelligence matches (${intelligence.confidence} confidence, ${intelligence.score}/100):`);
    lines.push(...topRecords.map((record) => `- ${record.brand} ${record.sku}: ${record.summary}`));
  }

  if (intelligence.escalationRequired && shouldShowProductChecks && !sharedRecommendation) {
    if (knowledge.text && topRecords.length === 0) {
      if (ctx.mode === "project-check" || isProductDirectedQuestion(q)) {
        lines.push("");
        lines.push("To tighten this into exact product guidance:");
        lines.push("- Add room type, source count, display/output count, transport distance, and control or USB requirements.");
        lines.push("- If this is a competitor replacement, include brand and model so Guru can compare against verified records.");
      }
    } else {
      lines.push("");
      lines.push(knowledge.text ? "Checks before customer commitment:" : "Escalation required:");
      lines.push(...intelligence.escalationReasons.map((reason) => `- ${reason}`));
    }
  }

  const supportSources = intelligence.escalationRequired
    ? supportActionsToSources(intelligence.supportActions)
    : [];

  return {
    text: addAdvisorSuffix(lines.join("\n"), ctx.mode),
    confidence: strongestConfidence(knowledge.confidence, productConfidence),
    explanation: sharedRecommendation?.explanation,
    sources: dedupeSources([
      ...baseSources,
      ...(sharedRecommendation?.sources ?? []),
      ...knowledge.sources,
      ...supportSources,
    ]),
    suggestedSkus,
  };
}
