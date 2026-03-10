import {
  lookupAndCompare,
  type CompetitorComparisonRecord,
} from "@/services/competitorComparisonService";
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
  if (lower.includes("competitor") || lower.includes("compare") || lower.includes("replacement")) return true;
  if (COMPETITOR_BRANDS.some((brand) => lower.includes(brand))) return true;
  return /[a-z]{2,}\s+[a-z0-9]+[-_][a-z0-9-]+/i.test(question);
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
    `Closest WyreStorm direction: ${record.wyrestormSku} (${record.wyrestormCategory}).`,
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

export async function askGuru(question: string, ctx: GuruContext): Promise<GuruAnswer> {
  const q = tidy(question);
  if (!q) return { text: "Ask a question to get started.", confidence: "low" };

  if (ctx.mode === "resources") {
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
      suggestedSkus: mergeSuggestedSkus([
        {
          sku: selected.wyrestormSku,
          name: selected.wyrestormCategory,
          reason: `Closest replacement for ${selected.brand} ${selected.competitorSku}.`,
        },
      ]),
    };
  }

  const intelligence = await assessQuestionIntelligence(q);
  const topRecords = intelligence.records.slice(0, 3);

  if (topRecords.length === 0) {
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

  const lines = [
    `Top product-intelligence matches (${intelligence.confidence} confidence, ${intelligence.score}/100):`,
    ...topRecords.map((record) => `- ${record.brand} ${record.sku}: ${record.summary}`),
  ];

  if (intelligence.escalationRequired) {
    lines.push("Escalation required:");
    lines.push(...intelligence.escalationReasons.map((reason) => `- ${reason}`));
  }

  const supportSources = intelligence.escalationRequired
    ? supportActionsToSources(intelligence.supportActions)
    : [];

  return {
    text: addAdvisorSuffix(lines.join("\n"), ctx.mode),
    confidence: toGuruConfidence(intelligence.confidence),
    sources: dedupeSources([...baseSources, ...supportSources]),
    suggestedSkus: questionSkuSuggestions(topRecords),
  };
}

