import type { ProductSpec } from "./productStoryEngine";

export type TechnologyPositioningKind = "sdvoe" | "jpeg2000" | "long-gop" | "ipmx" | "avoip";

export type TechnologyConversationPrompt = {
  customerSays: string;
  response: string;
  askNext: string;
};

export type TechnologySpeakingCue = {
  label: "Acknowledge" | "Reframe" | "Position";
  text: string;
};

export type TechnologySalesPositioning = {
  kind: TechnologyPositioningKind;
  label: string;
  decisionHeadline: string;
  leadWith: string;
  tradeOff: string;
  proofPoint: string;
  prompts: TechnologyConversationPrompt[];
};

function evidenceFor(product: ProductSpec): string {
  return [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.productType,
    product.description,
    product.summary,
    ...product.keyFeatures,
    ...product.video,
    ...product.network,
  ].join(" ").toLowerCase();
}

export function buildTechnologySpeakingCues(prompt: TechnologyConversationPrompt): TechnologySpeakingCue[] {
  const sentences = prompt.response
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? [];
  const parts = sentences.length > 1
    ? sentences
    : prompt.response.split(/;|—/).map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 3) {
    return [
      { label: "Acknowledge", text: parts[0] },
      { label: "Reframe", text: parts.slice(1, -1).join(" ") },
      { label: "Position", text: parts.at(-1) ?? "" },
    ];
  }

  if (parts.length === 2) {
    return [
      { label: "Acknowledge", text: parts[0] },
      { label: "Reframe", text: parts[1] },
    ];
  }

  return [{ label: "Position", text: prompt.response }];
}

function sharedPrompts(kind: TechnologyPositioningKind): TechnologyConversationPrompt[] {
  const interoperabilityResponse = kind === "ipmx"
    ? "That is the strongest reason to consider IPMX: it is designed around open specifications and multi-vendor interoperability. Confirm which certified products must work together now; do not sell future interoperability as if it is already installed."
    : "Open interoperability is a valid buying criterion. Do not argue against it. Establish whether the customer must mix certified endpoints from different manufacturers now, or whether proven performance, one control environment and accountable support matter more for this project.";

  return [
    {
      customerSays: "The competitor is using IPMX because it is open.",
      response: interoperabilityResponse,
      askNext: "Is multi-vendor endpoint interoperability a contractual requirement, and which exact products must interoperate on day one?",
    },
    {
      customerSays: "Why should we accept a proprietary platform?",
      response: "Do not defend lock-in. Position the value of a complete, tested system only when it reduces integration risk, gives the customer one support path and meets the required workflow. If vendor independence is the priority, record that as a design requirement.",
      askNext: "Which matters more here: freedom to mix endpoints, or a single tested platform with one commissioning and support model?",
    },
  ];
}

export function buildTechnologySalesPositioning(product: ProductSpec): TechnologySalesPositioning | null {
  const evidence = evidenceFor(product);
  const isAvoip = /av.?over.?ip|avoip|networkhd|encoder|decoder|network video|sdvoe|ipmx|jpeg.?2000|h\.26[45]|hevc/.test(evidence);
  if (!isAvoip) return null;

  if (/sdvoe|10g(?:be)?|uncompressed 4k|zero.?frame|zero.?latency/.test(evidence)) {
    return {
      kind: "sdvoe",
      label: "10G SDVoE / uncompressed",
      decisionHeadline: "Sell the consequence of delay or image compromise—not the protocol badge.",
      leadWith: "Use this route when interaction must feel immediate, desktop detail must survive transport, or live switching and processing are operational requirements. The commercial story is deterministic performance and a mature full-stack workflow.",
      tradeOff: "It asks the customer to fund and operate 10GbE infrastructure. If the application tolerates compression and modest delay, a lower-bandwidth platform may deliver the required outcome for less.",
      proofPoint: "SDVoE publishes sub-100-microsecond transport and 4K60 4:4:4 performance. Confirm that the selected product and complete design support the exact workflow before repeating those claims.",
      prompts: [
        ...sharedPrompts("sdvoe"),
        {
          customerSays: "Why pay for 10G when 1G products carry 4K?",
          response: "Agree that 1G can carry 4K. The decision is what gets traded to make it fit: compression ratio, latency, chroma detail, processing flexibility or all four. Use 10G only when those differences affect the user's work.",
          askNext: "Will users interact with the source in real time, judge fine text or imagery, or switch and compose feeds live?",
        },
        {
          customerSays: "H.265 gives us much lower bandwidth.",
          response: "It does, and that can be the right answer for signage, monitoring and contribution-style workflows. This product earns its place only where immediate response and preserved source quality are worth the extra network capacity.",
          askNext: "What is the maximum acceptable glass-to-glass delay, and will the content be re-encoded, edited or closely inspected?",
        },
      ],
    };
  }

  if (/jpeg.?2000|networkhd 500|nhd-5\d\d/.test(evidence)) {
    return {
      kind: "jpeg2000",
      label: "1G JPEG 2000",
      decisionHeadline: "Position the middle ground: premium visual performance without making 10G the entry price.",
      leadWith: "Use this route where the customer needs high-quality routed AV, low interaction delay and a practical 1GbE deployment. Lead with the workflow and network economics, then prove the image and latency requirement.",
      tradeOff: "JPEG 2000 is compressed and this product family is not an IPMX interoperability claim. A 10G uncompressed route may suit the most demanding live applications; H.264/H.265 may suit bandwidth-led applications better.",
      proofPoint: "JPEG describes JPEG 2000 as intraframe, scalable and capable of sub-frame latency. Product-specific latency, chroma and interoperability still require current WyreStorm evidence.",
      prompts: [
        ...sharedPrompts("jpeg2000"),
        {
          customerSays: "Is JPEG 2000 old technology compared with H.265?",
          response: "Newer does not automatically mean better for live AV. H.265 is excellent when compression efficiency leads. JPEG 2000 remains relevant when frame independence, repeated processing and low delay matter more than achieving the smallest stream.",
          askNext: "Is the customer's priority network efficiency, or responsive high-quality interaction with the source?",
        },
        {
          customerSays: "Why not step up to SDVoE?",
          response: "Step up only when the application justifies 10G, uncompressed transport or the SDVoE processing model. Otherwise, 1G can lower switch cost and simplify deployment while retaining the required customer experience.",
          askNext: "Which requirement fails on 1G: latency, image detail, endpoint processing, scale or the specified network standard?",
        },
      ],
    };
  }

  if (/h\.264|h\.265|hevc|avc/.test(evidence) && !/ipmx|jpeg.?xs|st\s*2110|nmos/.test(evidence)) {
    return {
      kind: "long-gop",
      label: "H.264 / H.265",
      decisionHeadline: "Lead with reach and bandwidth economy; qualify interaction before promising an AV-room experience.",
      leadWith: "Use this route when many streams must cross constrained networks, when signage or monitoring dominates, or when distribution reach matters more than instantaneous interaction.",
      tradeOff: "High compression can add latency and may be less suitable for live mouse control, rapid source switching, fine desktop text or workflows that repeatedly encode the picture.",
      proofPoint: "H.264 and H.265 are established international video-coding standards. Their real-world delay and picture behaviour depend on profile, bitrate, GOP structure and the product implementation.",
      prompts: [
        ...sharedPrompts("long-gop"),
        {
          customerSays: "H.265 is more efficient, so why buy anything else?",
          response: "Efficiency is one axis, not the outcome. H.265 is compelling when bandwidth and scale lead. It is less compelling when the user is controlling a live source and notices every delay or when fine 4:4:4 desktop detail is the priority.",
          askNext: "Is this primarily viewing content, or are users actively controlling and switching it in real time?",
        },
        {
          customerSays: "Can we run this on the existing network?",
          response: "Possibly, but codec efficiency is not permission to skip network design. Confirm aggregate bitrate, multicast behaviour, switch capability, contention, security ownership and the support boundary.",
          askNext: "Who owns the network, and what capacity, multicast and quality-of-service constraints have they approved for AV?",
        },
      ],
    };
  }

  if (/ipmx|jpeg.?xs|st\s*2110|nmos/.test(evidence)) {
    return {
      kind: "ipmx",
      label: "IPMX / open media standards",
      decisionHeadline: "Lead with specified interoperability, but verify the certified ecosystem the customer can buy today.",
      leadWith: "Use this route where standards-based multi-vendor media transport, discovery and connection management are explicit customer requirements.",
      tradeOff: "An open specification does not make every implementation or optional profile identical. The design still needs qualified senders, receivers, security, control and support ownership.",
      proofPoint: "AIMS defines IPMX around SMPTE ST 2110, AES67, NMOS and VSF recommendations, with compressed and uncompressed video profiles including JPEG XS, AVC and HEVC.",
      prompts: sharedPrompts("ipmx"),
    };
  }

  return {
    kind: "avoip",
    label: "AV-over-IP",
    decisionHeadline: "Translate the technology into an operational choice before comparing specifications.",
    leadWith: "Start with where sources and displays are, how users interact, what the network team will support and what failure would cost. Only then compare codec, bandwidth and protocol.",
    tradeOff: "Do not imply that all AV-over-IP platforms interoperate or that one compression approach is universally superior.",
    proofPoint: "Confirm codec, latency, chroma, switching, security, control and interoperability against the exact endpoint and current system documentation.",
    prompts: sharedPrompts("avoip"),
  };
}
