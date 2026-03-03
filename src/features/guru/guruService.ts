import WYRESTORM_CATALOG from "./guruCatalog.generated";
import type { GuruCatalogItem } from "./guruCatalog.seed";

export type GuruResponse = {
  question: string;
  productStartingPoint: string;
  skuSuggestions: string[];
  matchedProducts: GuruCatalogItem[];
  qualificationQuestions: string[];
  guidanceNotes: string[];
};

function normalise(value: string): string {
  return value.toLowerCase().trim();
}

function tokensFor(text: string): string[] {
  return normalise(text)
    .replace(/[^a-z0-9\s\-\/]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreProduct(question: string, product: GuruCatalogItem): number {
  const q = normalise(question);
  const t = tokensFor(question);

  const bag = [
    product.sku,
    product.name,
    product.family,
    product.category,
    ...(product.io || []),
    ...(product.connectivity || []),
    ...(product.control || []),
    ...(product.features || []),
    ...(product.bestFor || []),
    product.summary,
  ]
    .join(" | ")
    .toLowerCase();

  let score = 0;

  for (const token of t) {
    if (token.length < 3) continue;
    if (bag.includes(token)) score += 2;
  }

  if (q.includes("meeting room") && product.bestFor.some(x => /meeting|boardroom|collaboration/i.test(x))) score += 5;
  if (q.includes("byod") && /USB-C|wireless|presentation/i.test([product.name, ...product.features].join(" "))) score += 6;
  if ((q.includes("video wall") || q.includes("multiview")) && /video wall|multiview|matrix/i.test([product.name, ...product.features].join(" "))) score += 5;
  if ((q.includes("kvm") || q.includes("control room") || q.includes("server")) && /kvm/i.test([product.name, product.category, ...product.features].join(" "))) score += 7;
  if ((q.includes("microphone") || q.includes("audio")) && /audio|microphone/i.test([product.name, product.category, ...product.features].join(" "))) score += 6;
  if ((q.includes("matrix") || q.includes("4 sources") || q.includes("8x8")) && /matrix/i.test([product.name, product.category].join(" "))) score += 7;
  if ((q.includes("wireless casting") || q.includes("casting")) && /casting/i.test([product.name, ...product.features].join(" "))) score += 7;

  return score;
}

function getTopMatches(question: string, limit = 3): GuruCatalogItem[] {
  return [...WYRESTORM_CATALOG]
    .map((item) => ({ item, score: scoreProduct(question, item) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}

function buildQualificationQuestions(question: string, matches: GuruCatalogItem[]): string[] {
  const q = normalise(question);
  const questions: string[] = [];

  if (!q.includes("room")) questions.push("What is the room type or application?");
  if (!q.includes("display")) questions.push("How many displays are required?");
  if (!q.includes("source")) questions.push("How many active source inputs are required?");
  if (!/\b\d+m\b|\bmeters?\b|\bmetres?\b|\bft\b|\bfeet\b/.test(q)) questions.push("What are the longest cable distances in the system?");
  if (!q.includes("control")) questions.push("Are RS-232, IR, Web-UI, or network control requirements involved?");
  if (!q.includes("audio")) questions.push("Are microphone, DSP, audio de-embed, or external speaker requirements involved?");
  if (matches.some(m => /wireless/i.test([m.name, ...m.features].join(" "))) && !q.includes("wireless")) {
    questions.push("Is wireless casting required, and if so, do guests need one-touch sharing?");
  }
  if (matches.some(m => /kvm/i.test([m.name, m.category].join(" "))) && !q.includes("usb")) {
    questions.push("Do you need USB host/device extension as part of the design?");
  }
  if (matches.some(m => /matrix/i.test([m.name, m.category].join(" "))) && !q.includes("multiview")) {
    questions.push("Is multiview needed, or is the requirement source switching only?");
  }

  return Array.from(new Set(questions)).slice(0, 6);
}

function buildGuidance(matches: GuruCatalogItem[]): string[] {
  const notes: string[] = [
    "Treat the first recommendation as a product starting point, not the final engineered design.",
    "Validate source count, display count, cable distance, and user workflow before finalising the BOM.",
  ];

  if (matches.some(m => /matrix/i.test([m.name, m.category].join(" ")))) {
    notes.push("If the requirement is simple switching, keep the solution matrix-led; if collaboration is central, consider a room-system path instead.");
  }
  if (matches.some(m => /wireless|presentation/i.test([m.name, ...m.features].join(" ")))) {
    notes.push("For presentation spaces, confirm the presenter workflow first, then decide whether wireless casting is optional or core.");
  }
  if (matches.some(m => /audio|microphone/i.test([m.name, m.category].join(" ")))) {
    notes.push("For audio-led spaces, confirm microphone type, room pickup expectations, and whether external amplification is needed.");
  }
  if (matches.some(m => /kvm/i.test([m.name, m.category].join(" ")))) {
    notes.push("For KVM workflows, confirm whether the requirement is point-to-point or routed over an existing managed network.");
  }

  return notes.slice(0, 5);
}

function buildLocalResponse(question: string): GuruResponse {
  const q = question.trim();
  const matches = getTopMatches(q, 3);

  if (!q) {
    return {
      question: "",
      productStartingPoint:
        "Describe the room, use case, source count, display count, cable distances, and any competitor reference so Guru can suggest a WyreStorm starting point.",
      skuSuggestions: [],
      matchedProducts: [],
      qualificationQuestions: [
        "What is the room type or application?",
        "How many sources and displays are involved?",
        "What are the required cable distances?",
        "Is this a new design, an upgrade, or a competitor replacement?",
      ],
      guidanceNotes: [
        "Guru works best when the question includes the commercial objective and the core technical constraints.",
      ],
    };
  }

  const skuSuggestions = matches.map((m) => m.sku);
  const first = matches[0];

  const productStartingPoint = first
    ? `Start with ${first.sku} (${first.name}) as the first WyreStorm direction for this requirement. ${first.summary}`
    : "Start with a workflow-led path: use Templates for known room types, Room Wizard for constraint-led design, then move into Proposal Builder once the core requirement is qualified.";

  return {
    question: q,
    productStartingPoint,
    skuSuggestions,
    matchedProducts: matches,
    qualificationQuestions: buildQualificationQuestions(q, matches),
    guidanceNotes: buildGuidance(matches),
  };
}

export async function askGuru(question: string): Promise<GuruResponse> {
  const q = question.trim();
  const local = buildLocalResponse(q);
  const apiUrl = (import.meta as any)?.env?.VITE_GURU_API_URL as string | undefined;

  if (!apiUrl) {
    return local;
  }

  try {
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: q,
        localCatalog: local.matchedProducts,
        allCatalogCount: WYRESTORM_CATALOG.length,
      }),
    });

    if (!resp.ok) {
      return local;
    }

    const data = await resp.json();

    return {
      question: q,
      productStartingPoint: data?.productStartingPoint || local.productStartingPoint,
      skuSuggestions: Array.isArray(data?.skuSuggestions) && data.skuSuggestions.length
        ? data.skuSuggestions
        : local.skuSuggestions,
      matchedProducts: local.matchedProducts,
      qualificationQuestions: Array.isArray(data?.qualificationQuestions) && data.qualificationQuestions.length
        ? data.qualificationQuestions
        : local.qualificationQuestions,
      guidanceNotes: Array.isArray(data?.guidanceNotes) && data.guidanceNotes.length
        ? data.guidanceNotes
        : local.guidanceNotes,
    };
  } catch {
    return local;
  }
}