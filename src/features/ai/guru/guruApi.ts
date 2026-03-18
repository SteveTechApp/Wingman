import {
  lookupAndCompare,
  type CompetitorComparisonRecord,
} from "@/services/competitorComparisonService";
import { assessGuruKnowledge } from "@/features/ai/guru/guruKnowledgeBase";
import {
  assessQuestionIntelligence,
  type IntelligenceSupportAction,
} from "@/services/productIntelligenceAdvisor";

export type GuruMode = "ask" | "resources" | "project-check";

export type GuruAnswer = {
  text: string;
  sources?: Array<{ title: string; kind: "training" | "video" | "doc" | "link"; to?: string; url?: string }>;
  confidence?: "low" | "medium" | "high";
  suggestedSkus?: Array<{ sku: string; name?: string; reason?: string }>;
};

export type GuruContext = {
  mode: GuruMode;
  room?: unknown;
  videowall?: unknown;
  bom?: unknown;
  notes?: string;
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

function shouldIncludeProductMatches(question: string, mode: GuruMode, confidence: GuruAnswer["confidence"]): boolean {
  if (mode === "project-check" && confidence !== "low") return true;

  const lower = question.toLowerCase();
  return confidence !== "low" && (
    /\bsku\b|\bmodel\b|\bfamily\b|\bproduct\b|\brecommend\b|\bsuggest\b/.test(lower) ||
    lower.includes("start with") ||
    lower.includes("which wyrestorm") ||
    lower.includes("meeting room") ||
    lower.includes("boardroom") ||
    lower.includes("usb-c") ||
    lower.includes("apollo") ||
    lower.includes("hdbaset") ||
    lower.includes("avoip") ||
    lower.includes("networkhd") ||
    lower.includes("matrix") ||
    lower.includes("switcher") ||
    lower.includes("splitter") ||
    lower.includes("extender") ||
    lower.includes("video wall")
  );
}

export async function askGuru(question: string, ctx: GuruContext): Promise<GuruAnswer> {
  const q = tidy(question);
  if (!q) return { text: "Ask a question to get started.", confidence: "low" };

  const knowledge = assessGuruKnowledge(q, ctx.mode);

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
  const productConfidence = toGuruConfidence(intelligence.confidence);
  const includeProductMatches = shouldIncludeProductMatches(q, ctx.mode, productConfidence);
  const suggestedSkus = includeProductMatches ? questionSkuSuggestions(topRecords) : [];
  const shouldShowProductChecks =
    !knowledge.text ||
    includeProductMatches ||
    ctx.mode === "project-check";

  if (!knowledge.text && topRecords.length === 0) {
    const supportSources = supportActionsToSources(intelligence.supportActions);
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

  if (knowledge.text) {
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

  if (intelligence.escalationRequired && shouldShowProductChecks) {
    lines.push("");
    if (knowledge.text && topRecords.length === 0) {
      lines.push("To tighten this into exact product guidance:");
      lines.push("- Add room type, source count, display/output count, transport distance, and control or USB requirements.");
      lines.push("- If this is a competitor replacement, include brand and model so Guru can compare against verified records.");
    } else {
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
    sources: dedupeSources([...baseSources, ...knowledge.sources, ...supportSources]),
    suggestedSkus,
  };
}
