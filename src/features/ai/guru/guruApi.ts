import {
  assessGuruKnowledge,
  type GuruKnowledgeSource,
} from "@/features/ai/guru/guruKnowledgeBase";

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
  discovery?: Record<string, unknown> | null;
};

type Source = NonNullable<GuruAnswer["sources"]>[number];
type SuggestedSku = NonNullable<GuruAnswer["suggestedSkus"]>[number];

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalize(value: unknown): string {
  return tidy(value).toLowerCase();
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function dedupeSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];

  for (const item of sources) {
    const key = `${item.kind}|${item.to || item.url || ""}|${item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

function dedupeSkus(items: SuggestedSku[]): SuggestedSku[] {
  const seen = new Set<string>();
  const out: SuggestedSku[] = [];

  for (const item of items) {
    const key = item.sku.toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      sku: key,
      name: item.name,
      reason: item.reason,
    });
  }

  return out;
}

function productSource(title = "Product Catalog"): Source {
  return { title, kind: "training", to: "/app/tools/catalog" };
}

function guruSourcesToAnswerSources(items: GuruKnowledgeSource[]): Source[] {
  return items.map((item) => ({
    title: item.title,
    kind: item.kind,
    to: item.to,
    url: item.url,
  }));
}

function buildCapabilityAnswer(question: string): GuruAnswer | null {
  const q = normalize(question);

  const isPresentationSwitcherQuestion =
    hasAny(q, ["presentation switcher", "presentation switchers", "switcher", "switchers"]) &&
    hasAny(q, ["airplay", "miracast", "wireless casting", "wireless presentation"]);

  if (!isPresentationSwitcherQuestion) return null;

  const skus: SuggestedSku[] = [
    {
      sku: "SW-640L-TX-W",
      reason: "4-input wireless presentation and conferencing switcher.",
    },
    {
      sku: "SW-620-TX-W",
      reason: "2-input wireless presentation and conferencing switcher.",
    },
  ];

  const lines = [
    "Confirmed WyreStorm wireless presentation switcher options include SW-640L-TX-W and SW-620-TX-W.",
    "For this class of product, the -W presentation switchers are the native AirPlay / Miracast direction.",
    "If you also want video-bar style collaboration endpoints, Apollo video bars are a separate category rather than presentation switchers.",
  ];

  return {
    text: lines.join("\n"),
    confidence: "high",
    suggestedSkus: skus,
    sources: dedupeSources([
      productSource(),
      { title: "Training Hub", kind: "training", to: "/app/tools/training" },
    ]),
  };
}

function buildVideoWallAnswer(question: string): GuruAnswer | null {
  const q = normalize(question);
  if (!hasAny(q, ["video wall", "videowall", "lcd wall", "led wall"])) return null;

  const lines = [
    "For a simpler fixed-layout wall, start by considering SW-0206-VW as the processor-led option.",
    "For lower-bandwidth AVoIP walls, NetworkHD 100 can suit cost-sensitive walls and NHD-150-RX adds multiview capability.",
    "For higher-performance 1G AVoIP walls, NetworkHD 500 is the stronger direction, and NHD-0401-MV is the correct multiview companion where needed.",
    "For the highest-performance zero-latency direction, NetworkHD 600 is the premium family.",
  ];

  return {
    text: lines.join("\n"),
    confidence: "high",
    suggestedSkus: dedupeSkus([
      { sku: "SW-0206-VW", reason: "Fixed-layout processor-led video wall direction." },
      { sku: "NHD-150-RX", reason: "Multiview decoder option within NetworkHD 100 workflows." },
      { sku: "NHD-0401-MV", reason: "Correct multiview companion for NetworkHD 500 workflows." },
      { sku: "NHD-600-TRX", reason: "Premium zero-latency NetworkHD 600 direction." },
    ]),
    sources: dedupeSources([
      { title: "Video Wall Planner", kind: "training", to: "/app/tools/video-wall" },
      productSource(),
    ]),
    explanation: {
      headline: "Choose the wall strategy before locking the BOM.",
      why: [
        "Processor-led walls are usually better for simpler fixed layouts.",
        "AVoIP walls are stronger when scale, routing flexibility, or multiview behaviour genuinely matter.",
      ],
      whatsMissing: [
        "Wall size and geometry",
        "Number of simultaneous sources",
        "Whether the wall is fixed-layout or dynamically reconfigured",
      ],
    },
  };
}

function buildAvoipVsHdbasetAnswer(question: string): GuruAnswer | null {
  const q = normalize(question);
  if (!hasAny(q, ["hdbaset vs avoip", "hdbaset and avoip", "avoip vs hdbaset"])) return null;

  return {
    text: [
      "Use HDBaseT when the system is mainly fixed-room transport over known cable runs and the topology is simple or moderately switched.",
      "Use AVoIP when many-to-many routing, easy expansion, flexible video wall behaviour, or wider distributed AV architecture is the real requirement.",
      "The practical decision depends on topology, scale, and network readiness more than distance alone.",
    ].join("\n"),
    confidence: "high",
    suggestedSkus: dedupeSkus([
      { sku: "RX3-100", reason: "Good HDBaseT 3.0 receiver direction for higher-performance transport workflows." },
      { sku: "NHD-500-TX v2", reason: "Strong AVoIP encoder direction for higher-performance 1G distribution." },
      { sku: "NHD-500-RX v2", reason: "Matching higher-performance 1G decoder direction." },
    ]),
    sources: dedupeSources([
      productSource(),
      { title: "Discovery Wizard", kind: "training", to: "/app/tools/discovery" },
    ]),
  };
}

function buildExtenderAnswer(question: string): GuruAnswer | null {
  const q = normalize(question);

  if (hasAny(q, ["usb extender", "usb extension", "extend usb", "usb over cat"])) {
    return {
      text: [
        "Use EX-60-USB2 for basic USB 2.0 extension where distance and bandwidth are modest.",
        "Use EX-100-USB3 or EX-100-IW-USBC when the application genuinely needs higher USB bandwidth and longer reach.",
        "Confirm whether the job needs USB 2.0 only or true USB 3.x performance before choosing the family.",
      ].join("\n"),
      confidence: "high",
      suggestedSkus: dedupeSkus([
        { sku: "EX-60-USB2", reason: "Basic USB 2.0 extender direction." },
        { sku: "EX-100-USB3", reason: "Higher-performance USB extension direction." },
        { sku: "EX-100-IW-USBC", reason: "Wall-plate USB extension direction." },
      ]),
      sources: [productSource()],
    };
  }

  if (hasAny(q, ["hdmi extender", "extend hdmi", "extender"])) {
    return {
      text: [
        "For straightforward 4K HDMI extension, shortlist around the real bandwidth, distance, and whether local monitor loop-out, audio de-embed, or control passthrough is needed.",
        "EX-70-H2C is a good direction when you want 4K extension with loop-out and audio de-embed.",
        "Move into higher-spec HDBaseT or fibre-based options when the signal envelope or route length pushes past sensible copper limits.",
      ].join("\n"),
      confidence: "medium",
      suggestedSkus: dedupeSkus([
        { sku: "EX-70-H2C", reason: "4K HDMI extension with loop-out direction." },
        { sku: "EXF-300-H2", reason: "Fibre-based 4K extension direction." },
      ]),
      sources: [productSource()],
    };
  }

  return null;
}

function buildApolloAnswer(question: string): GuruAnswer | null {
  const q = normalize(question);

  if (!hasAny(q, ["apollo", "byod", "byom", "wireless presentation", "conference bar", "video bar"])) {
    return null;
  }

  return {
    text: [
      "For collaboration-led rooms, Apollo is the right starting family when USB-C ingest, wireless presentation, BYOD/BYOM, or integrated camera/audio workflow matters.",
      "APO-VX20-UC v2 is the stronger premium video-bar direction, while the wireless presentation switchers such as SW-640L-TX-W and SW-620-TX-W fit presentation-led spaces.",
      "Keep video bars and presentation switchers separate in your thinking: they solve adjacent but different room behaviours.",
    ].join("\n"),
    confidence: "high",
    suggestedSkus: dedupeSkus([
      { sku: "APO-VX20-UC v2", reason: "Premium Apollo video-bar direction." },
      { sku: "SW-640L-TX-W", reason: "Wireless presentation and conferencing switcher direction." },
      { sku: "SW-620-TX-W", reason: "Smaller wireless presentation and conferencing switcher direction." },
    ]),
    sources: [productSource()],
  };
}

function buildCompetitorAnswer(question: string): GuruAnswer | null {
  const q = normalize(question);

  if (!hasAny(q, ["competitor", "alternative", "equivalent", "replacement", "cross reference", "cross-reference", "crestron", "extron", "atlona", "lightware", "blustream", "zeevee"])) {
    return null;
  }

  return {
    text: [
      "Use competitor matching to identify the closest WyreStorm family, not to auto-generate a BOM without workflow validation.",
      "First classify whether the competitor solution is presentation-led, matrix-led, HDBaseT-led, or AVoIP-led.",
      "Then match the topology, transport method, I/O behaviour, and user workflow before recommending the closest WyreStorm direction.",
    ].join("\n"),
    confidence: "medium",
    sources: dedupeSources([
      { title: "Competitor Compare", kind: "training", to: "/app/tools/compare" },
      { title: "Product Intelligence", kind: "training", to: "/app/tools/product-intelligence" },
    ]),
  };
}

function buildRouteContextSuffix(ctx: GuruContext): string | null {
  if (ctx.mode === "project-check") {
    return "Advisor note: validate I/O counts, distance limits, control scope, USB needs, and user workflow before final recommendation.";
  }
  return null;
}

function fallbackAnswer(_question: string, knowledgeText: string): GuruAnswer {
  const lines: string[] = [];

  if (knowledgeText) {
    lines.push(knowledgeText);
  } else {
    lines.push("I can help with WyreStorm product direction, AV architecture, video wall logic, extenders, and proposal guidance.");
    lines.push("Add the room type, source count, output count, distance, and any USB or control requirements to tighten the answer.");
  }

  return {
    text: lines.join("\n\n"),
    confidence: knowledgeText ? "medium" : "low",
    sources: dedupeSources([
      { title: "Discovery Wizard", kind: "training", to: "/app/tools/discovery" },
      productSource(),
    ]),
  };
}

export async function askGuru(question: string, ctx: GuruContext): Promise<GuruAnswer> {
  const q = tidy(question);
  if (!q) {
    return {
      text: "Ask a question to get started.",
      confidence: "low",
    };
  }

  const knowledge = await assessGuruKnowledge(q, ctx.mode);

  const direct =
    buildCapabilityAnswer(q) ||
    buildVideoWallAnswer(q) ||
    buildAvoipVsHdbasetAnswer(q) ||
    buildExtenderAnswer(q) ||
    buildApolloAnswer(q) ||
    buildCompetitorAnswer(q);

  const suffix = buildRouteContextSuffix(ctx);

  if (direct) {
    const text = suffix ? `${direct.text}\n\n${suffix}` : direct.text;
    return {
      ...direct,
      text,
      sources: dedupeSources([
        ...(direct.sources ?? []),
        ...guruSourcesToAnswerSources(knowledge.sources),
      ]),
    };
  }

  const fallback = fallbackAnswer(q, knowledge.text);
  const text = suffix ? `${fallback.text}\n\n${suffix}` : fallback.text;

  return {
    ...fallback,
    text,
    confidence: knowledge.confidence || fallback.confidence,
    sources: dedupeSources([
      ...(fallback.sources ?? []),
      ...guruSourcesToAnswerSources(knowledge.sources),
    ]),
    explanation:
      knowledge.familyHints.length > 0
        ? {
            headline: `Likely direction: ${knowledge.familyHints.join(", ")}.`,
            why: [
              "This is a heuristic guidance layer intended to keep the Guru chat usable inside the current repo.",
            ],
            whatsMissing: [
              "Detailed project data",
              "Exact I/O counts",
              "Confirmed transport distances",
            ],
          }
        : undefined,
  };
}