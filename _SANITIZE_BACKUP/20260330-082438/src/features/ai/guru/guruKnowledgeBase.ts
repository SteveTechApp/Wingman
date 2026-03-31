export type GuruKnowledgeMode = "ask" | "resources" | "project-check";

export type GuruKnowledgeSource = {
  title: string;
  kind: "training" | "video" | "doc" | "link";
  to?: string;
  url?: string;
};

type GuruKnowledgeTopic = {
  id: string;
  title: string;
  modes?: GuruKnowledgeMode[];
  keywords: string[];
  opening: string;
  points: string[];
  qualify?: string[];
  familyHints?: string[];
  sources: GuruKnowledgeSource[];
};

export type GuruKnowledgeAssessment = {
  score: number;
  confidence: "low" | "medium" | "high";
  text: string;
  familyHints: string[];
  matchedTopicIds: string[];
  sources: GuruKnowledgeSource[];
};

type GuruKnowledgeReferenceEntry = {
  id: string;
  title: string;
  body: string;
  raw: string;
  keywords: string[];
  modes?: GuruKnowledgeMode[];
  sources: GuruKnowledgeSource[];
};

function source(title: string, to: string): GuruKnowledgeSource {
  return { title, kind: "training", to };
}

const TRAINING_SOURCE = source("Training Hub", "/app/tools/training");
const DISCOVERY_SOURCE = source("Guided Project", "/app/tools/discovery");
const CATALOG_SOURCE = source("Product Catalog", "/app/tools/catalog");
const COMPARE_SOURCE = source("Competitor Compare", "/app/tools/compare");
const PRODUCT_INTELLIGENCE_SOURCE = source("Product Intelligence", "/app/tools/product-intelligence");
const VIDEO_WALL_SOURCE = source("Video Wall Planner", "/app/tools/video-wall");
const PROPOSAL_SOURCE = source("Proposal Builder", "/app/tools/proposal");

const GURU_KNOWLEDGE_TOPICS: GuruKnowledgeTopic[] = [
  {
    id: "wyrestorm-positioning",
    title: "Positioning WyreStorm",
    modes: ["ask", "project-check"],
    keywords: [
      "position wyrestorm",
      "positioning wyrestorm",
      "larger av brands",
      "larger brands",
      "against larger brands",
      "against bigger brands",
      "why wyrestorm",
      "differentiate wyrestorm",
    ],
    opening:
      "Position WyreStorm as a commercially practical AV platform: strong on HDMI, HDBaseT, AVoIP, collaboration, and deployment speed rather than a heavyweight control-first ecosystem.",
    points: [
      "Lead with application fit and workflow clarity: meeting rooms, presentation spaces, extension, switching, AVoIP, video wall, and BYOD/BYOM use cases.",
      "Compare on topology choice, usability, deployment simplicity, and commercial value instead of only brand scale.",
      "If the customer is standards-led around a third-party control ecosystem, qualify integration expectations early instead of overselling feature parity.",
    ],
    qualify: [
      "Is this an outcome-led room sale, an enterprise standardisation project, or a competitor replacement?",
      "How important are native control, fleet management, and incumbent ecosystem requirements?",
      "Is the customer optimising for value and speed, or for deep standardisation around another platform?",
    ],
    sources: [COMPARE_SOURCE, PRODUCT_INTELLIGENCE_SOURCE, TRAINING_SOURCE],
  },
  {
    id: "discovery-qualification",
    title: "Discovery and qualification",
    keywords: [
      "discovery answers",
      "what should i ask",
      "discovery call",
      "qualify an av opportunity",
      "missing information",
      "before choosing wyrestorm",
      "what matters most",
      "sales call",
    ],
    opening:
      "Before choosing products, capture the commercial objective, room workflow, physical topology, and control expectations. That usually narrows the correct WyreStorm family faster than jumping straight into SKUs.",
    points: [
      "Get room type, source count, output count, transport distance, and whether the project is point-to-point, switched, mirrored, distributed, or video-wall led.",
      "Confirm interface types at both ends: HDMI, USB-C, HDBaseT, AVoIP, USB, audio breakout, control, and any passthrough requirements.",
      "Qualify user workflow early: presenter-led, BYOD, hybrid meeting, signage, operator control, or multi-zone routing.",
    ],
    qualify: [
      "What is the intended room or application?",
      "How many active sources and destinations are involved?",
      "What are the longest transport distances and the installed cable types?",
      "Are USB, audio, control, wireless casting, or future expansion part of the requirement?",
    ],
    familyHints: ["Apollo", "HDBaseT", "AVoIP", "Matrix", "Video Wall"],
    sources: [DISCOVERY_SOURCE, TRAINING_SOURCE, PRODUCT_INTELLIGENCE_SOURCE],
  },
  {
    id: "apollo-vs-hdbaset",
    title: "Apollo vs HDBaseT",
    modes: ["ask", "project-check"],
    keywords: [
      "apollo instead of hdbaset",
      "apollo vs hdbaset",
      "usb-c byod",
      "byod meeting room",
      "wireless presentation",
      "small meeting room",
      "teams room",
    ],
    opening:
      "Use Apollo when presentation, BYOD/BYOM, USB-C, or wireless collaboration is central. Use HDBaseT when the job is primarily reliable point-to-point transport or room switching over category cable.",
    points: [
      "Apollo is stronger when the user workflow matters as much as the transport: USB-C ingest, wireless casting, collaboration peripherals, and room-system behaviour.",
      "HDBaseT is often the cleaner choice for deterministic extension and switching where the requirement is mainly HDMI plus known transport distance.",
      "If the room is presenter-led with USB devices, wireless guests, or BYOM, Apollo usually deserves first consideration before a pure extender path.",
    ],
    qualify: [
      "Is the room presentation-led or transport-led?",
      "Do users need wireless casting, USB-C ingest, or BYOM access to room USB peripherals?",
      "Is the transport one room/one display, or is there a broader switched workflow?",
    ],
    familyHints: ["Apollo", "HDBaseT"],
    sources: [DISCOVERY_SOURCE, TRAINING_SOURCE, CATALOG_SOURCE],
  },
  {
    id: "hdbaset-vs-avoip",
    title: "HDBaseT vs AVoIP",
    keywords: [
      "hdbaset vs avoip",
      "compare hdbaset and avoip",
      "hdbaset and avoip",
      "choose between hdbaset and avoip",
      "networkhd",
      "distributed av",
      "ip stream",
      "ip/stream",
      "managed network",
    ],
    opening:
      "Choose HDBaseT when the system is mainly point-to-point or small switched AV over known cable runs. Choose AVoIP when scale, flexibility, multicast distribution, or network-led architecture is the real driver.",
    points: [
      "HDBaseT suits fixed-room transport and predictable extension where the signal path is closed and distances are known.",
      "AVoIP suits systems that need easy scaling, many endpoints, multicast, video wall, or routing over existing managed network infrastructure.",
      "The decision is not just distance. It is also about scalability, network readiness, latency expectations, and how often routing patterns will change.",
    ],
    qualify: [
      "Is the project point-to-point, matrix-like, or many-to-many?",
      "Is there a managed network available and acceptable for AV traffic?",
      "Are low latency, multicast, video wall, or large endpoint counts required?",
    ],
    familyHints: ["HDBaseT", "AVoIP"],
    sources: [TRAINING_SOURCE, DISCOVERY_SOURCE, VIDEO_WALL_SOURCE],
  },
  {
    id: "presentation-vs-matrix",
    title: "Presentation switcher vs matrix switch",
    modes: ["ask", "project-check"],
    keywords: [
      "presentation switcher",
      "matrix switch",
      "switch between devices",
      "switching workflow",
      "multi-format inputs",
      "usb-c presentation",
      "matrix outputs",
    ],
    opening:
      "First decide whether the room is presentation-led or routing-led. Presentation switchers prioritise user workflow and multi-format room integration. Matrix switchers prioritise scalable HDMI routing.",
    points: [
      "Presentation switchers usually need multi-format inputs, USB-C, relays, control ports, audio breakout, Ethernet, wireless casting, AirPlay, Miracast, or MST-aware behaviour.",
      "Matrix systems are more likely to stay HDMI-led on the input side and focus on output topology such as HDMI or HDBaseT class A/class B distribution.",
      "If the customer talks about presenters, collaboration, USB-C laptops, or wireless guests, start with presentation workflow before matrix size.",
    ],
    qualify: [
      "Is the primary problem user presentation workflow or source routing scale?",
      "Do the inputs need to be multi-format, especially USB-C?",
      "Are the outputs local HDMI, HDBaseT, or distributed elsewhere in the building?",
    ],
    familyHints: ["Apollo", "Matrix", "HDBaseT"],
    sources: [DISCOVERY_SOURCE, CATALOG_SOURCE, TRAINING_SOURCE],
  },
  {
    id: "extender-design",
    title: "Extender design and distance",
    modes: ["ask", "project-check"],
    keywords: [
      "extend a signal",
      "extender",
      "longest cable run",
      "cable run distance",
      "cat6",
      "cat6a",
      "cat7",
      "poh",
      "ir passthrough",
      "ethernet passthrough",
      "usb 3.0 support",
      "kvm usb 2.0",
    ],
    opening:
      "For HDMI extension, practical reach depends on signal format, cable grade, and whether USB, control, audio breakout, power, or passthrough features are part of the transport requirement.",
    points: [
      "Higher bandwidth formats such as 4K 60Hz 4:4:4, 5K, and 8K reduce practical distance on copper category cable compared with 1080p or lighter 4K envelopes.",
      "Capture the distance band, cable type, and route complexity before you shortlist extenders. A simple same-room run behaves very differently from patched or cross-building infrastructure.",
      "Treat USB/KVM, audio breakout, RS-232, IR, Ethernet passthrough, and one-way/two-way PoH as design-critical capabilities, not as afterthought add-ons.",
    ],
    qualify: [
      "What signal formats must be supported: 1080p, 4K30 4:4:4, 4K60 4:4:4, 5K, or 8K?",
      "What cable type is installed: Cat5e, Cat6, Cat6A, Cat7, or fibre?",
      "Are USB, audio breakout, RS-232, IR, Ethernet passthrough, or PoH required?",
    ],
    familyHints: ["HDBaseT", "USB Extension"],
    sources: [DISCOVERY_SOURCE, TRAINING_SOURCE, CATALOG_SOURCE],
  },
  {
    id: "duplicate-distribution",
    title: "Duplicate signal and HDMI distribution",
    modes: ["ask", "project-check"],
    keywords: [
      "duplicate a signal",
      "splitter",
      "distribution amplifier",
      "mirror one source",
      "mirrored outputs",
      "scaled output",
      "mixed resolution output",
    ],
    opening:
      "For duplicate-signal workflows, assume HDMI in and HDMI out first. Then decide whether the outputs are local copper, HAOC optical HDMI, or far enough away to justify a separate HDMI extender line item.",
    points: [
      "Copper HDMI leads are usually 0.5m, 1m, 2m, 3m, 5m, or 10m. HAOC optical HDMI is the more natural step for 10m, 15m, 20m, or 30m output runs.",
      "Cable capability matters. Qualify 5Gb, 10Gb, or 18Gb performance, plus ALLM, eARC, HDR, and multichannel audio when those features matter to the customer workflow.",
      "Cable counts scale with the I/O count. A 1x2 splitter usually drives three HDMI runs total, a 1x4 drives five, and a 1x8 drives nine before accessories and contingencies.",
    ],
    qualify: [
      "How many mirrored outputs are needed?",
      "Are the outputs mixed-resolution or scaled, or are they true like-for-like mirrors?",
      "Are the outputs local, long-HDMI, HAOC, or remote enough to need extender kits?",
    ],
    familyHints: ["Matrix", "HDBaseT"],
    sources: [DISCOVERY_SOURCE, CATALOG_SOURCE, PROPOSAL_SOURCE],
  },
  {
    id: "hdmi-cabling",
    title: "HDMI cabling and HAOC",
    keywords: [
      "hdmi cable",
      "haoc",
      "hdmi over fibre",
      "optical hdmi",
      "earc",
      "allm",
      "hdr",
      "multichannel audio",
      "18gb",
      "10gb",
      "5gb",
    ],
    opening:
      "Do not treat HDMI cables as interchangeable. Length, bandwidth, and feature support directly affect whether the path will carry the required signal reliably.",
    points: [
      "Short copper runs are fine for rack or local interconnects, but longer runs need a deliberate choice between certified copper, HAOC optical HDMI, or an extender architecture.",
      "Match the cable to the signal envelope. 5Gb, 10Gb, and 18Gb capability, plus HDR, ALLM, eARC, and multichannel audio, should all be qualified when relevant.",
      "HAOC is the normal term for active hybrid optical HDMI leads. It is useful when you need longer direct HDMI runs without switching to an extender topology.",
    ],
    qualify: [
      "What is the actual source bandwidth and feature set?",
      "Is the run local copper, long copper, or better served by HAOC or an extender?",
      "Are the HDMI leads part of the core offer, or should Guru suggest them as add-on sales lines?",
    ],
    sources: [CATALOG_SOURCE, PROPOSAL_SOURCE, TRAINING_SOURCE],
  },
  {
    id: "signal-fundamentals",
    title: "Signal fundamentals",
    modes: ["ask", "resources", "project-check"],
    keywords: [
      "hdcp",
      "edid",
      "scaling",
      "signal path",
      "av fundamentals",
      "explain hdcp",
      "explain edid",
      "explain scaling",
    ],
    opening:
      "When an AV system behaves unpredictably, EDID, HDCP, and scaling are often the first three fundamentals to check because they determine what format the source sends and what the display path will accept.",
    points: [
      "EDID is the capability conversation. It tells the source what resolutions and audio formats the downstream chain claims to support.",
      "HDCP is the content-protection conversation. A mismatch anywhere in the chain can block or interrupt video.",
      "Scaling is the format-conversion tool that helps unlike sources and displays coexist when native timings do not line up cleanly.",
    ],
    qualify: [
      "Is the issue a design-choice question or a live fault symptom?",
      "Are all sources and displays expected to run the same signal envelope?",
      "Is there any HDCP-protected content or mixed-resolution display estate involved?",
    ],
    sources: [TRAINING_SOURCE, DISCOVERY_SOURCE],
  },
  {
    id: "troubleshooting-hdmi",
    title: "Troubleshooting HDMI sync and image faults",
    modes: ["ask", "project-check"],
    keywords: [
      "hdmi sync",
      "intermittent sync",
      "no signal",
      "flicker",
      "drop out",
      "dropout",
      "hdcp fault",
      "edid problem",
      "video is missing",
    ],
    opening:
      "For HDMI image faults, work from physical layer to handshake to format. Most recurring failures are cable integrity, HDCP/EDID negotiation, or an unsupported signal envelope for the route.",
    points: [
      "Verify the cable path first: distance, connector quality, patch points, cable grade, and whether the current signal exceeds what the link can realistically carry.",
      "Then check the handshake layer: EDID policy, HDCP behaviour, and whether a scaler or switch is forcing a timing that one endpoint rejects.",
      "Finally check topology-specific issues such as extender mode, matrix routing, sink power-up order, or display-side deep-color/HDR settings.",
    ],
    qualify: [
      "Is the fault constant or intermittent?",
      "Does it happen on one source, one display, or one route only?",
      "What resolution, refresh, and colour format is actually being transported?",
    ],
    sources: [TRAINING_SOURCE, PRODUCT_INTELLIGENCE_SOURCE],
  },
  {
    id: "troubleshooting-usb",
    title: "Troubleshooting USB and KVM",
    modes: ["ask", "project-check"],
    keywords: [
      "usb problem",
      "usb devices fail",
      "usb disconnect",
      "camera not detected",
      "mic not detected",
      "kvm issue",
      "usb extension",
      "enumeration",
    ],
    opening:
      "USB faults usually come down to host/device role confusion, unsupported USB bandwidth over the chosen transport, or devices reconnecting unpredictably across the path.",
    points: [
      "Confirm the USB role model first: which endpoint is the host, which devices must enumerate remotely, and whether the path needs USB 2.0 only or high-speed USB 3.0 support.",
      "Check bandwidth and topology. Cameras, speakerphones, and storage-class devices can behave very differently over the same transport.",
      "If the system is KVM-led, validate that USB switching behaviour matches the video switching behaviour the user actually expects.",
    ],
    qualify: [
      "Is the workflow basic USB 2.0 peripheral sharing or high-speed USB 3.0 transport?",
      "Are devices failing to enumerate, dropping out, or staying connected to the wrong host?",
      "Does the USB route follow fixed extension, matrix switching, or network transport?",
    ],
    sources: [TRAINING_SOURCE, DISCOVERY_SOURCE, PRODUCT_INTELLIGENCE_SOURCE],
  },
  {
    id: "video-wall-planning",
    title: "Video wall planning",
    keywords: [
      "video wall",
      "videowall",
      "display canvas",
      "processor strategy",
      "multiview",
      "lcd wall",
      "led wall",
    ],
    opening:
      "Video-wall projects should start with canvas strategy and processor role, not with generic room prompts. The real design variables are layout, source composition, control method, and content behaviour.",
    points: [
      "Confirm wall geometry, panel or LED technology, bezel/canvas behaviour, and whether the user needs presets, windows, or operator-driven multiview changes.",
      "Separate source transport from wall processing. The transport can be HDMI, HDBaseT, or AVoIP, but the processor strategy determines the wall experience.",
      "Capture control expectations early because many video-wall jobs become operational workflow projects rather than simple AV transport jobs.",
    ],
    qualify: [
      "Is this LCD, LED, or mixed-display architecture?",
      "How many simultaneous windows, presets, or operator layouts are required?",
      "Is the content local, switched, or distributed over the network?",
    ],
    familyHints: ["Video Wall", "AVoIP"],
    sources: [VIDEO_WALL_SOURCE, DISCOVERY_SOURCE, TRAINING_SOURCE],
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

function keywordScore(query: string, queryTokens: Set<string>, keyword: string): number {
  const normalizedKeyword = normalize(keyword);
  if (!normalizedKeyword) return 0;
  if (query.includes(normalizedKeyword)) {
    return normalizedKeyword.includes(" ") ? 10 : 5;
  }

  const parts = normalizedKeyword.split(" ").filter((token) => token.length >= 3);
  if (parts.length > 1 && parts.every((part) => queryTokens.has(part))) {
    return 4;
  }
  if (parts.length === 1 && queryTokens.has(parts[0]!)) {
    return 2;
  }
  return 0;
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
  if (score >= 24) return "high";
  if (score >= 12) return "medium";
  return "low";
}

function emptyAssessment(): GuruKnowledgeAssessment {
  return {
    score: 0,
    confidence: "low",
    text: "",
    familyHints: [],
    matchedTopicIds: [],
    sources: [],
  };
}

function buildCuratedKnowledgeAssessment(question: string, mode: GuruKnowledgeMode): GuruKnowledgeAssessment {
  const query = normalize(question);
  const queryTokens = tokenSet(question);

  if (!query) {
    return emptyAssessment();
  }

  const ranked = GURU_KNOWLEDGE_TOPICS
    .map((topic) => {
      let score = 0;
      if (!topic.modes || topic.modes.includes(mode)) {
        score += 3;
      }
      for (const keyword of topic.keywords) {
        score += keywordScore(query, queryTokens, keyword);
      }
      return { topic, score };
    })
    .filter((item) => item.score >= 8)
    .sort((left, right) => right.score - left.score);

  if (ranked.length === 0) {
    return emptyAssessment();
  }

  const primary = ranked[0]!.topic;
  const primaryScore = ranked[0]!.score;
  const secondary = ranked[1] && ranked[1]!.score >= primaryScore * 0.72 ? ranked[1]!.topic : null;

  const lines: string[] = [primary.opening];

  if (primary.points.length > 0) {
    lines.push("", "What matters most:");
    lines.push(...primary.points.map((point) => `- ${point}`));
  }

  if (secondary) {
    lines.push("", `Also consider: ${secondary.opening}`);
    lines.push(...secondary.points.slice(0, 2).map((point) => `- ${point}`));
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
    lines.push("", `Likely WyreStorm direction: ${familyHints.join(", ")}.`);
  }

  return {
    score: primaryScore,
    confidence: confidenceForScore(primaryScore),
    text: lines.join("\n"),
    familyHints,
    matchedTopicIds: secondary ? [primary.id, secondary.id] : [primary.id],
    sources: dedupeSources([...(primary.sources ?? []), ...(secondary?.sources ?? [])]),
  };
}

let cachedReferenceEntries: GuruKnowledgeReferenceEntry[] | null = null;

function confidenceRank(value: GuruKnowledgeAssessment["confidence"]): number {
  if (value === "high") return 3;
  if (value === "medium") return 2;
  return 1;
}

function strongestConfidence(
  left: GuruKnowledgeAssessment["confidence"],
  right: GuruKnowledgeAssessment["confidence"],
): GuruKnowledgeAssessment["confidence"] {
  return confidenceRank(left) >= confidenceRank(right) ? left : right;
}

function uniqueStrings(values: string[], limit = 18): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const item = value.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }

  return out;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`{1,3}/g, "")
    .replace(/[*_>#]+/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\r/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeText(value: string, maxSentences = 2): string {
  const plain = stripMarkdown(value);
  if (!plain) return "";
  const sentences = plain
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.slice(0, maxSentences).join(" ");
}

function extractHighlights(raw: string, body: string, limit = 3): string[] {
  const rawLines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const bulletLines = rawLines
    .filter((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line) || /^#{2,4}\s+/.test(line))
    .map((line) =>
      stripMarkdown(
        line
          .replace(/^[-*]\s+/, "")
          .replace(/^\d+\.\s+/, "")
          .replace(/^#{2,4}\s+/, ""),
      ),
    )
    .filter(Boolean);

  if (bulletLines.length > 0) {
    return uniqueStrings(bulletLines, limit);
  }

  const sentences = stripMarkdown(body)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return uniqueStrings(sentences, limit);
}

function referenceKeywords(...values: string[]): string[] {
  const phrases = values.map((value) => stripMarkdown(value)).filter(Boolean);
  const tokens = uniqueStrings(
    phrases.flatMap((value) => Array.from(tokenSet(value))),
    28,
  );
  return uniqueStrings([...phrases, ...tokens], 32);
}

function inferReferenceModes(label: string): GuruKnowledgeMode[] | undefined {
  const value = label.toLowerCase();

  if (
    value.includes("troubleshoot") ||
    value.includes("site survey") ||
    value.includes("field guide") ||
    value.includes("sales inquiry") ||
    value.includes("bant")
  ) {
    return ["project-check", "ask"];
  }

  if (
    value.includes("signals") ||
    value.includes("terminology") ||
    value.includes("network") ||
    value.includes("hdbaset") ||
    value.includes("avoip") ||
    value.includes("datasheet") ||
    value.includes("video wall")
  ) {
    return ["resources", "ask", "project-check"];
  }

  return undefined;
}

function buildTrainingReferenceEntries(
  trainingModules: Array<{
    id: string;
    title: string;
    contentPages: Array<{ title: string; content: string; asset?: { title?: string } }>;
  }>,
): GuruKnowledgeReferenceEntry[] {
  return trainingModules.flatMap((module) =>
    module.contentPages.map((page, index) => ({
      id: `training:${module.id}:${index}`,
      title: `${module.title}: ${page.title}`,
      body: summarizeText(page.content, 3),
      raw: page.content,
      keywords: referenceKeywords(module.title, page.title, page.content, page.asset?.title || ""),
      modes: inferReferenceModes(`${module.title} ${page.title}`),
      sources: [TRAINING_SOURCE],
    })),
  );
}

function splitTechnicalSections(markdown: string): Array<{ title: string; body: string }> {
  return markdown
    .split(/\n##\s+/)
    .map((section, index) => {
      const rawSection = index === 0 ? section.replace(/^#.*\n?/, "").trim() : section.trim();
      if (!rawSection) return null;
      const [titleLine, ...bodyLines] = rawSection.split("\n");
      return {
        title: stripMarkdown(titleLine || ""),
        body: bodyLines.join("\n").trim(),
      };
    })
    .filter((section): section is { title: string; body: string } => Boolean(section?.title && section.body));
}

function buildTechnicalReferenceEntries(markdown: string): GuruKnowledgeReferenceEntry[] {
  const sections = splitTechnicalSections(markdown);
  const entries: GuruKnowledgeReferenceEntry[] = [];

  sections.forEach((section, sectionIndex) => {
    entries.push({
      id: `tech:${sectionIndex}`,
      title: section.title,
      body: summarizeText(section.body, 3),
      raw: section.body,
      keywords: referenceKeywords(section.title, section.body),
      modes: inferReferenceModes(section.title),
      sources: [TRAINING_SOURCE],
    });

    const bulletMatches = Array.from(
      section.body.matchAll(/-\s+\*\*([^*]+)\*\*:?\s*([\s\S]*?)(?=\n-\s+\*\*|\n##\s+|$)/g),
    );

    bulletMatches.forEach((match, bulletIndex) => {
      const bulletTitle = stripMarkdown(match[1] || "");
      const bulletBody = (match[2] || "").trim();
      if (!bulletTitle || !bulletBody) return;

      entries.push({
        id: `tech:${sectionIndex}:bullet:${bulletIndex}`,
        title: `${section.title}: ${bulletTitle}`,
        body: summarizeText(bulletBody, 3),
        raw: bulletBody,
        keywords: referenceKeywords(section.title, bulletTitle, bulletBody),
        modes: inferReferenceModes(`${section.title} ${bulletTitle}`),
        sources: [TRAINING_SOURCE],
      });
    });
  });

  return entries;
}

async function loadReferenceEntries(): Promise<GuruKnowledgeReferenceEntry[]> {
  if (cachedReferenceEntries) {
    return cachedReferenceEntries;
  }

  const [{ TRAINING_MODULES }, { TECHNICAL_DATABASE }] = await Promise.all([
    import("@/data/trainingContent"),
    import("@/data/technicalDatabase"),
  ]);

  cachedReferenceEntries = [
    ...buildTrainingReferenceEntries(TRAINING_MODULES),
    ...buildTechnicalReferenceEntries(TECHNICAL_DATABASE),
  ];

  return cachedReferenceEntries;
}

function scoreReferenceEntry(
  entry: GuruKnowledgeReferenceEntry,
  query: string,
  queryTokens: Set<string>,
  mode: GuruKnowledgeMode,
): number {
  let score = 0;

  if (!entry.modes || entry.modes.includes(mode)) {
    score += 3;
  }

  score += keywordScore(query, queryTokens, entry.title) * 2;

  for (const keyword of entry.keywords) {
    score += keywordScore(query, queryTokens, keyword);
  }

  const overlap = entry.keywords.filter((keyword) => queryTokens.has(normalize(keyword))).length;
  score += Math.min(12, overlap * 2);

  return score;
}

async function buildReferenceKnowledgeAssessment(
  question: string,
  mode: GuruKnowledgeMode,
): Promise<GuruKnowledgeAssessment> {
  const query = normalize(question);
  const queryTokens = tokenSet(question);

  if (!query) {
    return emptyAssessment();
  }

  const entries = await loadReferenceEntries();
  const ranked = entries
    .map((entry) => ({
      entry,
      score: scoreReferenceEntry(entry, query, queryTokens, mode),
    }))
    .filter((item) => item.score >= 12)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  if (ranked.length === 0) {
    return emptyAssessment();
  }

  const [primary, secondary] = ranked;
  const highlights = extractHighlights(primary!.entry.raw, primary!.entry.body, 3);
  const lines = [`Reference guidance from ${primary!.entry.title}: ${primary!.entry.body}`];

  if (highlights.length > 0) {
    lines.push("", "Useful reference points:");
    lines.push(...highlights.map((item) => `- ${item}`));
  }

  if (secondary && secondary.score >= primary!.score * 0.8) {
    lines.push("", `Related reference: ${secondary.entry.title}.`);
    const related = extractHighlights(secondary.entry.raw, secondary.entry.body, 2);
    lines.push(...related.map((item) => `- ${item}`));
  }

  return {
    score: primary!.score,
    confidence: confidenceForScore(primary!.score),
    text: lines.join("\n"),
    familyHints: [],
    matchedTopicIds: ranked.map((item) => item.entry.id),
    sources: dedupeSources(ranked.flatMap((item) => item.entry.sources)),
  };
}

function mergeKnowledgeAssessments(
  curated: GuruKnowledgeAssessment,
  reference: GuruKnowledgeAssessment,
): GuruKnowledgeAssessment {
  if (!curated.text) return reference;
  if (!reference.text) return curated;

  const text =
    reference.score >= curated.score * 0.78 || curated.confidence === "low"
      ? `${curated.text}\n\nReference detail:\n${reference.text}`
      : curated.text;

  return {
    score: Math.max(curated.score, reference.score),
    confidence: strongestConfidence(curated.confidence, reference.confidence),
    text,
    familyHints: uniqueStrings([...curated.familyHints, ...reference.familyHints]),
    matchedTopicIds: uniqueStrings([...curated.matchedTopicIds, ...reference.matchedTopicIds], 10),
    sources: dedupeSources([...curated.sources, ...reference.sources]),
  };
}

export async function assessGuruKnowledge(
  question: string,
  mode: GuruKnowledgeMode,
): Promise<GuruKnowledgeAssessment> {
  const curated = buildCuratedKnowledgeAssessment(question, mode);
  const reference = await buildReferenceKnowledgeAssessment(question, mode);
  return mergeKnowledgeAssessments(curated, reference);
}
