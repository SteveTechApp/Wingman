export type GuruKnowledgeMode = "ask" | "resources" | "project-check";

export type GuruKnowledgeSource = {
  title: string;
  kind: "training" | "video" | "doc" | "link";
  to?: string;
  url?: string;
};

export type GuruKnowledgeAssessment = {
  score: number;
  confidence: "low" | "medium" | "high";
  text: string;
  familyHints: string[];
  matchedTopicIds: string[];
  sources: GuruKnowledgeSource[];
};

type Topic = {
  id: string;
  modes?: GuruKnowledgeMode[];
  keywords: string[];
  opening: string;
  points: string[];
  qualify?: string[];
  familyHints?: string[];
  sources: GuruKnowledgeSource[];
};

function source(title: string, to: string): GuruKnowledgeSource {
  return { title, kind: "training", to };
}

const TRAINING_SOURCE = source("Training Hub", "/app/tools/training");
const DISCOVERY_SOURCE = source("Discovery Wizard", "/app/tools/discovery");
const CATALOG_SOURCE = source("Product Catalog", "/app/tools/catalog");
const PROPOSAL_SOURCE = source("Proposal Builder", "/app/tools/proposal");
const VIDEO_WALL_SOURCE = source("Video Wall Planner", "/app/tools/video-wall");
const COMPARE_SOURCE = source("Competitor Compare", "/app/tools/compare");
const PRODUCT_INTELLIGENCE_SOURCE = source("Product Intelligence", "/app/tools/product-intelligence");

const TOPICS: Topic[] = [
  {
    id: "discovery",
    keywords: [
      "discovery",
      "qualify",
      "what should i ask",
      "room requirements",
      "project requirements",
      "what information",
      "site survey",
    ],
    opening:
      "Start with application, room behaviour, source count, display count, distance, USB, audio, and control expectations before selecting WyreStorm products.",
    points: [
      "Decide whether the job is point-to-point, one-to-many, switched, many-to-many, or video-wall led.",
      "Capture the longest transport distances and the actual cable types available.",
      "Qualify whether the workflow is presenter-led, BYOD/BYOM, signage, operator-led, or collaboration-led.",
    ],
    qualify: [
      "How many active sources and outputs are involved?",
      "What are the longest cable distances?",
      "Is USB, wireless presentation, audio DSP, or control integration required?",
    ],
    familyHints: ["Apollo", "HDBaseT", "NetworkHD", "Matrix", "Video Wall"],
    sources: [DISCOVERY_SOURCE, TRAINING_SOURCE],
  },
  {
    id: "apollo-vs-hdbaset",
    keywords: [
      "apollo vs hdbaset",
      "byod",
      "byom",
      "wireless presentation",
      "meeting room",
      "usb-c presentation",
      "presentation switcher",
      "conference room",
    ],
    opening:
      "Use Apollo when user workflow is central: USB-C ingest, wireless presentation, BYOD/BYOM, room USB devices, and collaboration features. Use HDBaseT when the requirement is mainly deterministic transport and extension.",
    points: [
      "Apollo is stronger when the room needs switching plus collaboration behaviour.",
      "HDBaseT is often cleaner for fixed transport and predictable point-to-point extension.",
      "If users need wireless casting, USB-C laptop connectivity, or room USB handoff, Apollo usually deserves first consideration.",
    ],
    qualify: [
      "Is the room presentation-led or transport-led?",
      "Does the user need wireless casting or BYOM access to room USB devices?",
      "Is the system single-room only or part of a wider distribution architecture?",
    ],
    familyHints: ["Apollo", "HDBaseT"],
    sources: [CATALOG_SOURCE, DISCOVERY_SOURCE],
  },
  {
    id: "hdbaset-vs-avoip",
    keywords: [
      "hdbaset vs avoip",
      "networkhd",
      "av over ip",
      "distributed av",
      "many to many",
      "matrix vs avoip",
    ],
    opening:
      "Choose HDBaseT for fixed-room transport and smaller switched systems over known cable runs. Choose AVoIP when scale, flexibility, multicast distribution, or larger endpoint counts are the true design driver.",
    points: [
      "HDBaseT suits predictable signal paths and simpler room topologies.",
      "AVoIP suits many-to-many routing, expansion, and flexible video wall or multiview behaviour.",
      "The decision depends on topology, scale, latency expectation, and network readiness, not distance alone.",
    ],
    qualify: [
      "Is this point-to-point, matrix-like, or many-to-many?",
      "Is a managed network available for AV traffic?",
      "Does the customer need easy future expansion or flexible routing changes?",
    ],
    familyHints: ["HDBaseT", "NetworkHD"],
    sources: [TRAINING_SOURCE, DISCOVERY_SOURCE, VIDEO_WALL_SOURCE],
  },
  {
    id: "video-wall",
    keywords: [
      "video wall",
      "videowall",
      "lcd wall",
      "led wall",
      "multiview wall",
      "wall processor",
      "bezel compensation",
    ],
    opening:
      "For video walls, first decide whether the job is a fixed-layout processor wall, an advanced multiview wall, or a scalable AVoIP wall.",
    points: [
      "Use a processor-led wall for simpler fixed canvas layouts and lower system complexity.",
      "Use AVoIP when the wall needs flexible source routing, distribution scale, or wider system integration.",
      "Confirm wall geometry, content behaviour, preset needs, and whether the wall must behave as one canvas or as multiple zones.",
    ],
    qualify: [
      "Is this LCD, LED, or a mixed display system?",
      "How many sources must be visible simultaneously?",
      "Does the user need presets only or live multiview reconfiguration?",
    ],
    familyHints: ["SW-0206-VW", "NetworkHD 100", "NetworkHD 500", "NetworkHD 600"],
    sources: [VIDEO_WALL_SOURCE, DISCOVERY_SOURCE, PROPOSAL_SOURCE],
  },
  {
    id: "extenders",
    keywords: [
      "extender",
      "extend hdmi",
      "distance",
      "cat6",
      "cat6a",
      "usb extender",
      "kvm extender",
      "fiber extender",
    ],
    opening:
      "For extender design, capture signal format, transport distance, cable grade, USB needs, and control requirements before selecting the product family.",
    points: [
      "Higher bandwidth formats reduce practical copper distance compared with lighter signal envelopes.",
      "USB, audio breakout, Ethernet passthrough, IR, and RS-232 should be treated as core requirements, not extras.",
      "If distance or bandwidth exceeds sensible copper limits, move to higher-spec HDBaseT or fibre-based options.",
    ],
    qualify: [
      "What video format must be supported: 1080p, 4K60 4:4:4, 5K, or 8K?",
      "What cable type is installed and how clean is the route?",
      "Is USB 2.0, USB 3.x, IR, RS-232, or audio de-embed required?",
    ],
    familyHints: ["HDBaseT", "USB Extension", "Fibre Extenders"],
    sources: [CATALOG_SOURCE, TRAINING_SOURCE],
  },
  {
    id: "proposal",
    modes: ["ask", "project-check"],
    keywords: [
      "proposal",
      "bom",
      "bill of materials",
      "quote",
      "scope",
      "assumptions",
      "exclusions",
    ],
    opening:
      "Proposal guidance should explain why the architecture fits the application, what assumptions the design depends on, and what still needs confirmation before commercial issue.",
    points: [
      "Keep the explanation application-led rather than product-led.",
      "State the transport logic, user workflow, and any dependency on cable or network conditions.",
      "Call out missing information before the quote is treated as final.",
    ],
    qualify: [
      "What is confirmed and what is still assumed?",
      "Is the room workflow clear enough to lock the BOM?",
      "Are there cabling, control, or network dependencies that need highlighting?",
    ],
    familyHints: ["Proposal", "Discovery"],
    sources: [PROPOSAL_SOURCE, DISCOVERY_SOURCE],
  },
  {
    id: "competitor",
    keywords: [
      "competitor",
      "alternative",
      "equivalent",
      "replacement",
      "cross reference",
      "cross-reference",
      "crestron",
      "extron",
      "atlona",
      "lightware",
      "blustream",
      "zeevee",
    ],
    opening:
      "For competitor positioning, match the application and transport behaviour first, then narrow to the closest WyreStorm family. Do not treat competitor matching as a BOM shortcut without workflow validation.",
    points: [
      "Check whether the competitor solution is presentation-led, matrix-led, HDBaseT-led, or AVoIP-led.",
      "Match on topology, interface type, user workflow, distance, and control needs.",
      "Use competitor data for positioning and alternatives, not as direct BOM replacement without validation.",
    ],
    qualify: [
      "What exact model is being compared?",
      "What behaviour matters most: transport, switching, collaboration, or scale?",
      "Are there ecosystem or control constraints that must be preserved?",
    ],
    familyHints: ["Competitor Compare", "Product Intelligence"],
    sources: [COMPARE_SOURCE, PRODUCT_INTELLIGENCE_SOURCE],
  },
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s/-]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 3),
  );
}

function dedupeSources(sources: GuruKnowledgeSource[]): GuruKnowledgeSource[] {
  const seen = new Set<string>();
  const out: GuruKnowledgeSource[] = [];

  for (const item of sources) {
    const key = `${item.kind}|${item.to || item.url || ""}|${item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

function confidenceForScore(score: number): GuruKnowledgeAssessment["confidence"] {
  if (score >= 18) return "high";
  if (score >= 9) return "medium";
  return "low";
}

function scoreTopic(query: string, tokens: Set<string>, topic: Topic, mode: GuruKnowledgeMode): number {
  let score = 0;

  if (!topic.modes || topic.modes.includes(mode)) {
    score += 2;
  }

  for (const keyword of topic.keywords) {
    const key = normalize(keyword);
    if (!key) continue;

    if (query.includes(key)) {
      score += key.includes(" ") ? 8 : 4;
      continue;
    }

    const keyParts = key.split(" ").filter((part) => part.length >= 3);
    if (keyParts.length > 1 && keyParts.every((part) => tokens.has(part))) {
      score += 3;
    } else if (keyParts.length === 1 && tokens.has(keyParts[0]!)) {
      score += 1;
    }
  }

  return score;
}

export async function assessGuruKnowledge(
  question: string,
  mode: GuruKnowledgeMode,
): Promise<GuruKnowledgeAssessment> {
  const query = normalize(question);
  const tokens = tokenSet(question);

  if (!query) {
    return {
      score: 0,
      confidence: "low",
      text: "",
      familyHints: [],
      matchedTopicIds: [],
      sources: [],
    };
  }

  const ranked = TOPICS
    .map((topic) => ({
      topic,
      score: scoreTopic(query, tokens, topic, mode),
    }))
    .filter((item) => item.score >= 4)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return {
      score: 0,
      confidence: "low",
      text: "",
      familyHints: [],
      matchedTopicIds: [],
      sources: [],
    };
  }

  const primary = ranked[0]!.topic;
  const secondary = ranked[1] && ranked[1]!.score >= ranked[0]!.score * 0.7 ? ranked[1]!.topic : null;

  const lines: string[] = [primary.opening];

  if (primary.points.length > 0) {
    lines.push("", "What matters most:");
    lines.push(...primary.points.map((point) => `- ${point}`));
  }

  const qualify = [...(primary.qualify ?? []), ...(secondary?.qualify ?? [])].slice(0, 4);
  if (qualify.length > 0) {
    lines.push("", "Qualify before you commit:");
    lines.push(...qualify.map((point) => `- ${point}`));
  }

  const familyHints = Array.from(
    new Set([...(primary.familyHints ?? []), ...(secondary?.familyHints ?? [])]),
  );

  if (familyHints.length > 0) {
    lines.push("", `Likely direction: ${familyHints.join(", ")}.`);
  }

  return {
    score: ranked[0]!.score,
    confidence: confidenceForScore(ranked[0]!.score),
    text: lines.join("\n"),
    familyHints,
    matchedTopicIds: secondary ? [primary.id, secondary.id] : [primary.id],
    sources: dedupeSources([...(primary.sources ?? []), ...(secondary?.sources ?? [])]),
  };
}