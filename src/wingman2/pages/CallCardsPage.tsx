import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey, type WingmanRouteKey } from "../app/routeCatalog";
import { SectionCard } from "../components/SectionCard";

type Audience = "End user" | "Dealer" | "Consultant";
type CallCardCategory = "Discovery" | "Product" | "Competitor" | "Objection" | "Technology" | "Close";

type AnswerPair = {
  question: string;
  answer: string;
};

type ObjectionPair = {
  objection: string;
  response: string;
};

type CallCard = {
  id: string;
  title: string;
  category: CallCardCategory;
  stage: string;
  routeKey: WingmanRouteKey;
  headline: string;
  confidenceCue: string;
  opener: string;
  discoveryQuestions: string[];
  likelyQuestions: AnswerPair[];
  wyrestormPositioning: string[];
  competitorAwareness: string[];
  objections: ObjectionPair[];
  productPointers: string[];
  nextMove: string;
  audienceGuidance: Record<Audience, string>;
};

const audiences: Audience[] = ["End user", "Dealer", "Consultant"];

const callCards: CallCard[] = [
  {
    id: "meeting-room-byod",
    title: "Meeting room / BYOD conversation",
    category: "Product",
    stage: "Qualify the room workflow",
    routeKey: "discovery",
    headline: "Help the customer describe how people actually join, present and share content.",
    confidenceCue: "Anchor the call around user behaviour before discussing SKUs.",
    opener: "Before we look at products, can I check how people actually use the room on a normal day?",
    discoveryQuestions: [
      "Do users bring laptops, use a room PC, or both?",
      "Is the priority wired presentation, wireless presentation, conferencing, or all three?",
      "How many displays are in the room and should they show the same or different content?",
      "Are USB cameras, speakerphones, touch displays or interactive boards involved?",
      "Where do the cables land: table, lectern, wall plate, floor box or rack?",
    ],
    likelyQuestions: [
      {
        question: "Can one device handle USB-C, HDMI, wireless and conferencing?",
        answer: "Yes, in many meeting rooms the right presentation switcher or wireless conferencing product can reduce complexity by combining AV, USB and control into one room-core device.",
      },
      {
        question: "Do we need AV-over-IP for this room?",
        answer: "Not always. For a single room, a presentation switcher or HDBaseT extension path is often simpler and more cost-effective. AV-over-IP makes more sense when routing needs to expand across rooms or many endpoints.",
      },
      {
        question: "What should we check before proposing?",
        answer: "Confirm display count, USB device direction, camera/speakerphone requirements, cable route, distance and whether users expect BYOD, BYOM or fixed-room operation.",
      },
    ],
    wyrestormPositioning: [
      "Position WyreStorm around practical room workflow, not box count.",
      "Use presentation switchers where the customer needs USB-C, HDMI, wireless or local switching.",
      "Use NetworkHD where the room is part of a wider routed or distributed system.",
    ],
    competitorAwareness: [
      "Competitor room products may look similar on input count but differ heavily on USB routing, MST, wireless conferencing and control.",
      "Do not compare a simple switcher against a full room collaboration system without checking USB and conferencing behaviour.",
    ],
    objections: [
      {
        objection: "The customer only asked for HDMI switching.",
        response: "That may be the immediate need, but it is worth checking USB-C, conferencing and future display expansion now to avoid a second redesign later.",
      },
      {
        objection: "They already have Teams or Zoom in the room.",
        response: "Good. Then we need to confirm how the room camera, audio and display switching connect to the meeting host.",
      },
    ],
    productPointers: [
      "SW-640L-TX-W / SW-620-TX-W for wireless presentation and conferencing-led rooms.",
      "MX-0403-H3-MST where dual display, USB-C, MST and HDBaseT extension are needed.",
      "SW-510-TX and SW-515-RX where presentation switching and HDBaseT transport are the focus.",
    ],
    nextMove: "Capture the room workflow in Discovery, then use Finder to narrow the product family.",
    audienceGuidance: {
      "End user": "Talk about meeting experience, fewer cables, reliable joining and easier day-to-day use.",
      Dealer: "Talk about install simplicity, predictable wiring, supportability and upsell paths.",
      Consultant: "Talk about topology, USB direction, signal routing, control, standards and expansion limits.",
    },
  },
  {
    id: "competitor-replacement",
    title: "Competitor replacement conversation",
    category: "Competitor",
    stage: "Classify before matching",
    routeKey: "compare",
    headline: "Stop SKU-for-SKU guessing by first identifying technology class, role and application.",
    confidenceCue: "Ask what job the competitor product is doing before offering an equivalent.",
    opener: "Are we replacing that exact model, or is it being used as a reference for the type of solution required?",
    discoveryQuestions: [
      "Is the competitor product a switcher, extender, matrix, AV-over-IP endpoint, controller or processor?",
      "Is it being used as a kit, and are receivers or accessories included?",
      "What are the required input and output counts?",
      "Which features are essential: USB, audio de-embed, ARC, scaling, Dante, control, video wall or multiview?",
      "Is the customer tied to the competitor ecosystem or just looking for an equivalent outcome?",
    ],
    likelyQuestions: [
      {
        question: "Can WyreStorm replace this competitor product?",
        answer: "Possibly, but the correct match depends on technology class and application. A matrix kit must be compared with a matrix solution, not a single extender. An AV-over-IP transceiver must be compared with the right NetworkHD endpoint family.",
      },
      {
        question: "Why is the WyreStorm SKU bigger than the competitor SKU?",
        answer: "More inputs or outputs should not be a negative if the required function is covered. It may provide expansion headroom, but we should explain the commercial impact clearly.",
      },
      {
        question: "Can we claim exact equivalence?",
        answer: "Only after checking the required features, included accessories, control method, distance, resolution and ecosystem dependencies.",
      },
    ],
    wyrestormPositioning: [
      "Use Compare to classify role first: matrix, extender, AVoIP, presentation, controller or processor.",
      "Position WyreStorm as application-equivalent, not always identical hardware-equivalent.",
      "State assumptions clearly when the competitor bundle includes receivers, licences or control accessories.",
    ],
    competitorAwareness: [
      "Competitor kits often include receivers; the WyreStorm BOM must include compatible receivers if not bundled.",
      "Some competitor AVoIP endpoints are transceivers; do not compare them against only a decoder or only an encoder unless the use case is one-way.",
      "Controller products should be compared to controller/control-layer products, not video endpoints.",
    ],
    objections: [
      {
        objection: "The competitor is a known brand.",
        response: "Absolutely. The important point is whether the design requirement is brand-specific or outcome-specific. If it is outcome-specific, we can compare the topology and required functions objectively.",
      },
      {
        objection: "WyreStorm has more I/O, so it is not like-for-like.",
        response: "More I/O is additional capacity, not a mismatch. The key is whether the required I/O, transport and control features are met or exceeded.",
      },
    ],
    productPointers: [
      "NetworkHD 600 for premium 10G lossless AVoIP transceiver comparisons.",
      "NetworkHD 500 for 1G 4K60 4:4:4 AVoIP with strong USB and Dante-ready workflows.",
      "MXV / MX / SCL matrix families for true matrix requirements.",
      "NHD-CTL-PRO v2 for NetworkHD control-layer comparisons.",
    ],
    nextMove: "Open Compare, classify the competitor product, then move the result into Proposal only when the confidence is high enough.",
    audienceGuidance: {
      "End user": "Avoid naming too many SKUs. Focus on the customer outcome and risk reduction.",
      Dealer: "Talk about equivalent function, stockable alternatives, accessories and margin protection.",
      Consultant: "Talk about matching by topology, I/O, transport, control API, latency, bandwidth and dependencies.",
    },
  },
  {
    id: "avoip-positioning",
    title: "AV-over-IP positioning",
    category: "Technology",
    stage: "Choose architecture",
    routeKey: "finder",
    headline: "Explain when AV-over-IP is the right architecture and when it is not.",
    confidenceCue: "Use AVoIP for flexibility, scale and routing, not as a default answer for every room.",
    opener: "Is this a fixed room-to-display layout, or do sources and displays need to route flexibly now or in future?",
    discoveryQuestions: [
      "How many sources and displays need to be routed?",
      "Is the system single-room, multi-room or building-wide?",
      "What resolution, latency and image-quality expectations exist?",
      "Does USB/KVM, Dante, video wall or multiview matter?",
      "Is there an AV-ready network, or does the project need dedicated switching?",
    ],
    likelyQuestions: [
      {
        question: "Why use AV-over-IP instead of a matrix?",
        answer: "AV-over-IP is stronger when the system needs flexible routing, future expansion, distributed endpoints or integration with video wall and multiview workflows.",
      },
      {
        question: "Which NetworkHD family should we discuss?",
        answer: "NetworkHD 100 is cost-effective low-bandwidth 4K distribution. NetworkHD 500 is premium 1G 4K60 4:4:4 with strong USB. NetworkHD 600 is 10G lossless zero-latency for highest performance.",
      },
      {
        question: "Do we need a special network switch?",
        answer: "Yes, the network design matters. For NetworkHD 600, assume a suitable 10G AV network switch. For 1G systems, confirm multicast, VLAN, PoE and commissioning requirements.",
      },
    ],
    wyrestormPositioning: [
      "WyreStorm can scale from value 1G to premium 10G depending on performance need.",
      "NetworkHD is strongest when the customer values routing flexibility, expansion and centralised management.",
      "Do not oversell AVoIP where a simple switcher or HDBaseT extender is enough.",
    ],
    competitorAwareness: [
      "Competitors may use encoder/decoder/transceiver language differently; always identify actual endpoint role.",
      "Low bandwidth, visually lossless and lossless systems are not the same conversation.",
      "Check whether USB, Dante, multiview or video wall features are native or require accessories/licences.",
    ],
    objections: [
      {
        objection: "AV-over-IP sounds complicated.",
        response: "It can be, which is why we only recommend it where the flexibility justifies the network design. For simpler rooms, we keep the architecture simpler.",
      },
      {
        objection: "The network team is nervous.",
        response: "That is normal. We should define switch requirements, VLAN/multicast expectations and commissioning responsibility early.",
      },
    ],
    productPointers: [
      "NetworkHD 100: low-bandwidth and cost-effective 4K distribution.",
      "NetworkHD 500: 4K60 4:4:4, ultra-low latency, USB and Dante-ready workflows.",
      "NetworkHD 600: 10G lossless zero-latency transceiver architecture.",
      "NHD-0401-MV and NHD-150-RX for specific multiview workflows.",
    ],
    nextMove: "Use Finder to choose NetworkHD family, then Discovery to capture endpoint count and network assumptions.",
    audienceGuidance: {
      "End user": "Talk about flexibility, future changes and reliability.",
      Dealer: "Talk about scalable design, repeatable deployment and support expectations.",
      Consultant: "Talk about bandwidth, latency, compression, multicast, VLANs, USB, Dante and control.",
    },
  },
  {
    id: "hdbaset-matrix",
    title: "HDBaseT matrix / kit conversation",
    category: "Product",
    stage: "Confirm routing and receiver bundle",
    routeKey: "finder",
    headline: "Protect against misclassifying matrix kits as simple extenders.",
    confidenceCue: "A matrix kit is a routing system with receivers, not a point-to-point extender.",
    opener: "Is this a matrix kit with multiple receivers, or a single extender path?",
    discoveryQuestions: [
      "How many HDMI inputs and HDBaseT outputs are required?",
      "Are receivers included in the competitor kit or must they be added separately?",
      "What distance is required at 4K and at 1080p?",
      "Is audio de-embedding, ARC, IR, RS-232, Ethernet or PoH required?",
      "Does the project need a 4x4 exact match, or is 8x8 acceptable for expansion?",
    ],
    likelyQuestions: [
      {
        question: "Can we use a larger WyreStorm matrix?",
        answer: "Yes. More inputs or outputs can be a benefit if the required function is met. We should explain that it provides expansion capacity and confirm budget impact.",
      },
      {
        question: "Why not use an extender kit?",
        answer: "A single extender kit does not replace a matrix kit. A matrix routes multiple sources to multiple displays and usually requires compatible receivers.",
      },
      {
        question: "What should be included in the BOM?",
        answer: "Include the matrix chassis, required receivers, control accessories, rack/power considerations and any audio/control dependencies.",
      },
    ],
    wyrestormPositioning: [
      "Use matrix-class WyreStorm products for matrix-class competitor kits.",
      "Call out receiver dependencies clearly.",
      "Treat additional WyreStorm I/O as expansion value, not a mismatch.",
    ],
    competitorAwareness: [
      "Competitor kit SKUs may include receivers, which changes the commercial comparison.",
      "Some matrix kits provide simultaneous HDMI and HDBaseT outputs on selected outputs; verify this before claiming equivalence.",
      "Check if competitor outputs are HDBaseT 2.0, HDBaseT 3.0 or compressed variants.",
    ],
    objections: [
      {
        objection: "The competitor kit includes receivers.",
        response: "Then we must include compatible WyreStorm receivers in the BOM or clearly state that they are separate.",
      },
      {
        objection: "WyreStorm is 8x8 and they asked for 4x4.",
        response: "That is not a technical problem if budget allows. It gives the customer spare capacity and avoids maxing out the system on day one.",
      },
    ],
    productPointers: [
      "MXV-0404-H2A-KIT / MX-0404-KIT / MX-0808-KIT-V2 where kit-style comparison is required.",
      "MXV-0808-H2A-V3 / MXV-0808-H2A-70-V3 for larger HDBaseT matrix requirements.",
      "Check compatible receiver SKUs and distance class before proposal.",
    ],
    nextMove: "Use Finder for matrix family selection, then Proposal for a kit-aware BOM.",
    audienceGuidance: {
      "End user": "Talk about routing flexibility and included display locations.",
      Dealer: "Talk about kit contents, receivers, stock availability and installation clarity.",
      Consultant: "Talk about I/O count, distance, receiver class, PoH, control paths and audio features.",
    },
  },
  {
    id: "video-wall",
    title: "Video wall opportunity",
    category: "Technology",
    stage: "Choose processor vs matrix vs AVoIP",
    routeKey: "videowall",
    headline: "Clarify wall behaviour before selecting product family.",
    confidenceCue: "Do not assume every wall needs AV-over-IP.",
    opener: "Is the wall mainly one large image, multiple sources, signage, monitoring or mixed layouts?",
    discoveryQuestions: [
      "What is the wall layout: 2x2, 3x3, 1x4, LED canvas or custom?",
      "How many sources need to appear at once?",
      "Does the customer need full canvas, multiview, presets or per-display routing?",
      "Is latency critical?",
      "Is this LCD, LED or projection?",
    ],
    likelyQuestions: [
      {
        question: "Should we use AV-over-IP for a video wall?",
        answer: "Sometimes. AV-over-IP is strong when the wall is part of a flexible routed system. A dedicated processor can be simpler and better value for fixed wall behaviour.",
      },
      {
        question: "What is the difference between video wall and multiview?",
        answer: "Video wall spreads image content across displays. Multiview combines multiple sources into one display or canvas layout. Some systems can do both, but they are different requirements.",
      },
      {
        question: "What must we know before quoting?",
        answer: "Wall size, source count, layout behaviour, resolution, bezel/LED requirements, control method and whether the wall needs future expansion.",
      },
    ],
    wyrestormPositioning: [
      "Consider SW-0206-VW and SW-0204-VW for dedicated non-AVoIP wall processing.",
      "Use NetworkHD 500 or 600 where the wall is part of a routed distributed architecture.",
      "Use NHD-0401-MV where advanced multiview composition is the real requirement.",
    ],
    competitorAwareness: [
      "Some competitor endpoints advertise video wall support, but that does not make them dedicated processors.",
      "Check whether the competitor supports free layout, fixed presets, rotation, bezel correction or cascading.",
    ],
    objections: [
      {
        objection: "The customer just asked for a video wall.",
        response: "That is a display outcome, not enough to select architecture. We need to know whether it is one image, many images, or a flexible operating mode.",
      },
      {
        objection: "AV-over-IP feels more flexible.",
        response: "It is, but it can add network complexity. If the behaviour is fixed, a processor may be cleaner.",
      },
    ],
    productPointers: [
      "SW-0206-VW for dedicated flexible video wall processing.",
      "SW-0204-VW for simpler preset wall layouts.",
      "NetworkHD 500/600 for routed walls and distributed systems.",
      "NHD-0401-MV for NetworkHD 500 multiview workflows.",
    ],
    nextMove: "Open Video Wall Builder and define wall size, source count and layout behaviour.",
    audienceGuidance: {
      "End user": "Talk about how they want the wall to look and operate day to day.",
      Dealer: "Talk about installation complexity, commissioning and display/source count.",
      Consultant: "Talk about processing mode, scaling, latency, wall layouts, rotation and control.",
    },
  },
  {
    id: "objection-price",
    title: "Price and value objection",
    category: "Objection",
    stage: "Defend value without being defensive",
    routeKey: "proposal",
    headline: "Move the conversation from box price to risk, usability and system outcome.",
    confidenceCue: "Do not apologise for value. Explain what the system protects.",
    opener: "I understand price matters. Can we separate the hardware cost from the risk of the system not doing what users need?",
    discoveryQuestions: [
      "Which part of the proposal feels high: hardware, accessories, installation or system scope?",
      "Is the customer comparing like-for-like including receivers, USB, control and support?",
      "What happens if the selected product cannot handle the real room workflow?",
      "Is future expansion likely?",
    ],
    likelyQuestions: [
      {
        question: "Why is this more expensive?",
        answer: "Usually because the WyreStorm solution may include additional capability, better routing flexibility, stronger USB/control support or required accessories that were not included in the comparison.",
      },
      {
        question: "Can we reduce cost?",
        answer: "Yes, but we should value-engineer deliberately: reduce features that are not needed, avoid removing critical transport, USB, control or receiver requirements.",
      },
      {
        question: "How do we justify the recommendation?",
        answer: "Tie the recommendation back to the room workflow, reliability, supportability and the cost of rework if the wrong product is chosen.",
      },
    ],
    wyrestormPositioning: [
      "Position WyreStorm as practical, reliable and application-led.",
      "Show where the recommendation reduces risk: compatibility, installation clarity, support and future changes.",
      "Offer a value-engineered option only after identifying what can safely be removed.",
    ],
    competitorAwareness: [
      "Competitor comparisons often omit accessories, licences, receivers or control components.",
      "A cheaper product may be adequate if the requirement is simpler. Do not oversell when a simpler architecture fits.",
    ],
    objections: [
      {
        objection: "The competitor is cheaper.",
        response: "It may be. The fair comparison is whether both proposals include the same signal paths, accessories, control, USB and support requirements.",
      },
      {
        objection: "We do not need all those features.",
        response: "That is fine. Let us identify which features are essential and which can be removed without creating risk.",
      },
    ],
    productPointers: [
      "Use tiered options: simple, balanced and premium.",
      "Use NetworkHD 100 vs 500 vs 600 as a value ladder.",
      "Use dedicated processors or HDBaseT where they are simpler than AVoIP.",
    ],
    nextMove: "Open Proposal and create a clear base option plus value-engineered alternative.",
    audienceGuidance: {
      "End user": "Talk about reliability, usability and avoiding wasted spend.",
      Dealer: "Talk about complete BOM, fewer surprises and margin-safe alternatives.",
      Consultant: "Talk about scope control, feature trade-offs and risk register assumptions.",
    },
  },
];

function escapeStarterSvgText(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function starterCardScene(card: CallCard): string {
  if (card.category === "Competitor") return "competitor";
  if (card.category === "Objection") return "objection";
  if (card.id.includes("video")) return "videowall";
  if (card.id.includes("matrix")) return "matrix";
  if (card.id.includes("avoip")) return "network";
  if (card.id.includes("meeting")) return "meeting";
  return "generic";
}

function starterCardVisual(card: CallCard): string {
  const scene = starterCardScene(card);
  const title = escapeStarterSvgText(card.title);

  const sceneMarkup: Record<string, string> = {
    meeting: '<rect x="35" y="28" width="130" height="72" rx="12" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" /><rect x="56" y="45" width="88" height="36" rx="7" fill="rgba(255,255,255,0.12)" /><rect x="70" y="112" width="60" height="16" rx="8" fill="rgba(255,255,255,0.18)" /><circle cx="54" cy="120" r="10" fill="rgba(255,255,255,0.18)" /><circle cx="146" cy="120" r="10" fill="rgba(255,255,255,0.18)" />',
    competitor: '<rect x="28" y="40" width="56" height="56" rx="12" fill="rgba(255,255,255,0.13)" stroke="rgba(255,255,255,0.28)" /><rect x="116" y="40" width="56" height="56" rx="12" fill="rgba(255,255,255,0.13)" stroke="rgba(255,255,255,0.28)" /><path d="M86 68h28" stroke="rgba(255,255,255,0.34)" stroke-width="8" stroke-linecap="round" /><path d="M104 58l12 10-12 10" stroke="rgba(255,255,255,0.40)" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" />',
    videowall: '<rect x="36" y="24" width="128" height="88" rx="12" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.30)" /><path d="M100 24v88M36 68h128" stroke="rgba(255,255,255,0.24)" /><rect x="50" y="38" width="36" height="20" rx="4" fill="rgba(255,255,255,0.10)" /><rect x="114" y="80" width="36" height="20" rx="4" fill="rgba(255,255,255,0.10)" />',
    matrix: '<circle cx="44" cy="42" r="8" fill="rgba(255,255,255,0.24)" /><circle cx="44" cy="74" r="8" fill="rgba(255,255,255,0.24)" /><circle cx="44" cy="106" r="8" fill="rgba(255,255,255,0.24)" /><circle cx="156" cy="42" r="8" fill="rgba(255,255,255,0.24)" /><circle cx="156" cy="74" r="8" fill="rgba(255,255,255,0.24)" /><circle cx="156" cy="106" r="8" fill="rgba(255,255,255,0.24)" /><rect x="82" y="34" width="36" height="80" rx="10" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.28)" /><path d="M52 42h30M52 74h30M52 106h30M118 42h30M118 74h30M118 106h30" stroke="rgba(255,255,255,0.26)" />',
    network: '<rect x="36" y="34" width="34" height="34" rx="9" fill="rgba(255,255,255,0.16)" /><rect x="130" y="34" width="34" height="34" rx="9" fill="rgba(255,255,255,0.16)" /><rect x="36" y="94" width="34" height="34" rx="9" fill="rgba(255,255,255,0.16)" /><rect x="130" y="94" width="34" height="34" rx="9" fill="rgba(255,255,255,0.16)" /><circle cx="100" cy="80" r="17" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" /><path d="M70 51l18 18M130 51l-18 18M70 111l18-18M130 111l-18-18" stroke="rgba(255,255,255,0.30)" stroke-width="6" stroke-linecap="round" />',
    objection: '<rect x="42" y="36" width="116" height="70" rx="16" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.30)" /><path d="M62 60h76M62 78h56M62 96h70" stroke="rgba(255,255,255,0.26)" stroke-width="7" stroke-linecap="round" /><circle cx="156" cy="44" r="18" fill="rgba(255,255,255,0.12)" /><path d="M150 44h12M156 38v12" stroke="rgba(255,255,255,0.36)" stroke-width="4" stroke-linecap="round" />',
    generic: '<rect x="38" y="32" width="124" height="80" rx="16" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" /><path d="M60 56h80M60 76h54M60 96h70" stroke="rgba(255,255,255,0.24)" stroke-width="7" stroke-linecap="round" />',
  };

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="405" viewBox="0 0 200 150">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#111827" />
          <stop offset="55%" stop-color="#1e3a5f" />
          <stop offset="100%" stop-color="#f59e0b" />
        </linearGradient>
      </defs>
      <rect width="200" height="150" rx="18" fill="url(#bg)" />
      <circle cx="170" cy="20" r="30" fill="rgba(255,255,255,0.08)" />
      <circle cx="24" cy="132" r="36" fill="rgba(255,255,255,0.06)" />
      ${sceneMarkup[scene] || sceneMarkup.generic}
      <rect x="16" y="120" width="168" height="18" rx="9" fill="rgba(0,0,0,0.24)" />
      <text x="24" y="133" font-family="Inter, Arial, sans-serif" font-size="9" font-weight="800" fill="rgba(255,255,255,0.94)">${title.slice(0, 35)}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function cardSearchText(card: CallCard): string {
  return [
    card.title,
    card.category,
    card.stage,
    card.headline,
    card.discoveryQuestions.join(" "),
    card.productPointers.join(" "),
    card.competitorAwareness.join(" "),
    card.objections.map((item) => `${item.objection} ${item.response}`).join(" "),
  ].join(" ").toLowerCase();
}

function CardList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="wingman-kicker">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnswerList({ items }: { items: AnswerPair[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="wingman-kicker">Likely questions and confident answers</p>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.question} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-950">{item.question}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{item.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObjectionList({ items }: { items: ObjectionPair[] }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <p className="wingman-kicker text-amber-900">Objection handling</p>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.objection} className="rounded-xl border border-amber-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-950">{item.objection}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{item.response}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CallCardsPage() {
  const [activeId, setActiveId] = useState(callCards[0].id);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CallCardCategory | "All">("All");
  const [audience, setAudience] = useState<Audience>("Dealer");

  const activeCard = useMemo(() => {
    return callCards.find((card) => card.id === activeId) || callCards[0];
  }, [activeId]);

  const filteredCards = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return callCards.filter((card) => {
      const categoryMatches = category === "All" || card.category === category;
      const queryMatches = !cleanQuery || cardSearchText(card).includes(cleanQuery);
      return categoryMatches && queryMatches;
    });
  }, [category, query]);

  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(callCards.map((card) => card.category)))] as Array<CallCardCategory | "All">;
  }, []);

  return (
    <div className="pb-4">
      <SectionCard
        title="Live call command centre"
        subtitle="Choose the conversation type and audience. Keep the answer panel open while speaking to the customer."
      >
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="grid gap-2">
                <span className="wingman-kicker">Find a card</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search product, objection, competitor, room type..."
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500"
                />
              </label>

              <div className="mt-4">
                <p className="wingman-kicker">Conversation type</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        category === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="wingman-kicker">Audience mode</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {audiences.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setAudience(item)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        audience === item ? "bg-amber-500 text-slate-950" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {filteredCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setActiveId(card.id)}
                  className={`overflow-hidden rounded-2xl border text-left shadow-sm transition ${
                    activeCard.id === card.id
                      ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div
                    className="h-28 bg-cover bg-center"
                    aria-hidden="true"
                    style={{ backgroundImage: `url(${starterCardVisual(card)})` }}
                  />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-950">{card.title}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.category}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-bold text-slate-700">
                        {card.stage}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-5 text-slate-700">{card.headline}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="wingman-kicker">Active call card</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{activeCard.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{activeCard.confidenceCue}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={routeCatalogByKey[activeCard.routeKey].path}
                    className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Open {routeCatalogByKey[activeCard.routeKey].label}
                  </Link>
                  <Link
                    to={routeCatalogByKey.proposal.path}
                    className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    Proposal
                  </Link>
                </div>
              </div>

              <div className="wm-callcard-action-grid" aria-label="Call card handoff actions">
                <Link to={routeCatalogByKey.discovery.path} className="wm-callcard-action-card">
                  <span>Discovery</span>
                  <small>Capture requirements</small>
                </Link>
                <Link to={routeCatalogByKey.finder.path} className="wm-callcard-action-card">
                  <span>Finder</span>
                  <small>Choose WyreStorm products</small>
                </Link>
                <Link to={routeCatalogByKey.compare.path} className="wm-callcard-action-card">
                  <span>Compare</span>
                  <small>Handle competitor SKUs</small>
                </Link>
                <Link to={routeCatalogByKey.videowall.path} className="wm-callcard-action-card">
                  <span>Video Wall</span>
                  <small>Qualify wall behaviour</small>
                </Link>
                <Link to={routeCatalogByKey.proposal.path} className="wm-callcard-action-card wm-callcard-action-card-primary">
                  <span>Proposal</span>
                  <small>Turn call into output</small>
                </Link>
              </div>
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="wingman-kicker text-amber-900">Say this first</p>
                <p className="mt-2 text-lg font-semibold leading-7 text-slate-950">"{activeCard.opener}"</p>
              </div>

              <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <p className="wingman-kicker text-sky-900">Speak to this audience</p>
                <p className="mt-2 text-sm leading-6 text-slate-800">{activeCard.audienceGuidance[audience]}</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <CardList title="Ask these next" items={activeCard.discoveryQuestions} />
              <CardList title="WyreStorm positioning" items={activeCard.wyrestormPositioning} />
              <AnswerList items={activeCard.likelyQuestions} />
              <ObjectionList items={activeCard.objections} />
              <CardList title="Competitor awareness" items={activeCard.competitorAwareness} />
              <CardList title="Product pointers" items={activeCard.productPointers} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Next move</p>
              <p className="mt-2 text-sm leading-6 text-slate-100">{activeCard.nextMove}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={routeCatalogByKey.discovery.path} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">
                  Discovery
                </Link>
                <Link to={routeCatalogByKey.finder.path} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">
                  Finder
                </Link>
                <Link to={routeCatalogByKey.compare.path} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">
                  Compare
                </Link>
                <Link to={routeCatalogByKey.videowall.path} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">
                  Video Wall
                </Link>
                <Link to={routeCatalogByKey.proposal.path} className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300">
                  Proposal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default CallCardsPage;
