import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Database, Send, Sparkles, X } from "lucide-react";
import GuruAssistantAvatar from "./branding/GuruAssistantAvatar";

type WingmanGuruDrawerProps = {
  open: boolean;
  onClose: () => void;
};

type GuruMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  time: string;
};

type ProductEntry = {
  sku: string;
  title: string;
  family: string;
  category: string;
  description: string;
  text: string;
  raw: unknown;
};

type CompatibilityRule = {
  receiver?: string;
  transmitter?: string;
  relationship: string;
  notes: string[];
  checks: string[];
};

const SKU_PATTERN = /\b[A-Z]{2,6}(?:-[A-Z0-9]{2,}){1,7}\b/g;

const quickPrompts = [
  "Which receiver can I use with the SW-130-TX-UK?",
  "Suggest a solution for a medium meeting room.",
  "What should I ask to qualify an LED wall opportunity?",
  "Which WyreStorm products fit a BYOD presentation space?",
];

const compatibilityRules: Record<string, CompatibilityRule> = {
  "SW-130-TX-UK": {
    receiver: "RX-500",
    relationship: "Compatible HDBaseT receiver path",
    notes: [
      "Use RX-500 as the receiver with SW-130-TX-UK.",
      "This is the correct path for the SW-130 in-wall HDBaseT transmitter family.",
      "Use this when the requirement is an in-wall source position feeding a remote display/projector with USB support.",
    ],
    checks: [
      "Confirm cable type, installed cable quality, and actual run distance.",
      "Confirm required USB peripherals: camera, speakerphone, touchscreen, keyboard, or mouse.",
      "Confirm display resolution and refresh rate before quoting.",
    ],
  },
  "SW-130-TX-US": {
    receiver: "RX-500",
    relationship: "Compatible HDBaseT receiver path",
    notes: [
      "Use RX-500 as the receiver with SW-130-TX-US.",
      "This is the US-format version of the SW-130 in-wall HDBaseT transmitter path.",
    ],
    checks: [
      "Confirm US wall-plate format.",
      "Confirm cable distance and USB requirements.",
      "Confirm source mix: HDMI, USB-C, or both.",
    ],
  },
  "SW-130-TX": {
    receiver: "RX-500",
    relationship: "Compatible HDBaseT receiver path",
    notes: [
      "Use RX-500 as the receiver with the SW-130-TX family.",
      "Check the regional suffix before ordering: UK and US versions are different wall-plate formats.",
    ],
    checks: [
      "Confirm regional plate format.",
      "Confirm cable distance.",
      "Confirm USB peripheral requirements.",
    ],
  },
  "SW-120-TX3": {
    receiver: "RX3-100",
    relationship: "Compatible HDBaseT 3.0 receiver path",
    notes: [
      "Use RX3-100 with the SW-120-TX3 family.",
      "This is the stronger HDBaseT 3.0 path when higher bandwidth and longer 5K/4K transmission are required.",
    ],
    checks: [
      "Confirm whether the project needs the UK, US, or box version.",
      "Confirm if USB-C laptop input and USB peripheral return are both required.",
    ],
  },
  "SW-120-TX3-UK": {
    receiver: "RX3-100",
    relationship: "Compatible HDBaseT 3.0 receiver path",
    notes: [
      "Use RX3-100 with SW-120-TX3-UK.",
      "This is the UK wall-plate HDBaseT 3.0 transmitter path.",
    ],
    checks: [
      "Confirm UK wall-plate fit.",
      "Confirm required laptop charging, USB, and display resolution.",
    ],
  },
  "SW-120-TX3-US": {
    receiver: "RX3-100",
    relationship: "Compatible HDBaseT 3.0 receiver path",
    notes: [
      "Use RX3-100 with SW-120-TX3-US.",
      "This is the US wall-plate HDBaseT 3.0 transmitter path.",
    ],
    checks: [
      "Confirm US wall-plate fit.",
      "Confirm required laptop charging, USB, and display resolution.",
    ],
  },
  "SW-510-TX": {
    receiver: "SW-515-RX",
    relationship: "Matching receiver for the SW-510 HDBaseT switcher system",
    notes: [
      "Use SW-515-RX with SW-510-TX.",
      "This is the paired HDBaseT receiver for the SW-510 presentation switching transmitter.",
    ],
    checks: [
      "Confirm source count.",
      "Confirm USB peripheral requirements.",
      "Confirm display location and cable distance.",
    ],
  },
};

const applicationAnswers = [
  {
    terms: ["meeting room", "conference room", "boardroom", "huddle"],
    answer:
      "For a meeting room, start with the collaboration workflow rather than the product.\n\nLikely WyreStorm paths:\nâ€¢ Small/simple room: APO video bar or SW-220-TX-W style presentation path.\nâ€¢ Medium BYOD/BYOM room: SW-620-TX-W or SW-640L-TX-W if wireless conferencing, USB-C, dual display, or multiview is required.\nâ€¢ More technical dual-display room: MX-0402-MST or MX-0403-H3-MST where MST, USB-C, HDMI, and structured room switching matter.\n\nQualify next:\nâ€¢ How many displays?\nâ€¢ Is USB-C laptop connection required?\nâ€¢ Is wireless conferencing required or only wireless casting?\nâ€¢ Are cameras/microphones local to the room or remote over USB/HDBaseT/IP?\nâ€¢ Is this BYOD, MTR, Zoom Room, or a flexible room?",
  },
  {
    terms: ["video wall", "videowall", "led wall", "lcd wall"],
    answer:
      "For a video wall, choose the architecture from behaviour, not just wall size.\n\nRecommended design split:\nâ€¢ Simple fixed-layout LCD wall: consider SW-0204-VW.\nâ€¢ More flexible processor-led LCD/video wall: consider SW-0206-VW.\nâ€¢ Distributed sources/displays or future expansion: consider NetworkHD AVoIP.\nâ€¢ Premium 4K60 4:4:4 / low latency / USB workflows: consider NetworkHD 500.\nâ€¢ Lossless zero-latency 10G requirement: consider NetworkHD 600.\n\nQualify next:\nâ€¢ LED or LCD?\nâ€¢ Wall layout: 2x2, 3x3, 1x4, custom, or mosaic?\nâ€¢ Single canvas, separate content per display, or multiview?\nâ€¢ Number of sources?\nâ€¢ Required latency and image quality?",
  },
  {
    terms: ["byod", "byom", "usb-c", "wireless conferencing", "wireless casting"],
    answer:
      "For BYOD/BYOM, qualify USB and user workflow first.\n\nLikely WyreStorm paths:\nâ€¢ Wireless casting only: use a simpler wireless presentation route.\nâ€¢ Wireless conferencing plus USB peripherals: look at SW-620-TX-W or SW-640L-TX-W.\nâ€¢ Wired USB-C with dual-screen / MST: look at MX-0402-MST or MX-0403-H3-MST.\nâ€¢ In-desk cable management: include IDB-300 / IDB-300-BTN where a clean table workflow is needed.\n\nQualify next:\nâ€¢ Does the laptop need to use the room camera and microphone?\nâ€¢ Does USB-C need charging?\nâ€¢ One display or two?\nâ€¢ Is MST required?\nâ€¢ Is a touch panel or button controller required?",
  },
  {
    terms: ["ndi", "camera", "ptz", "streaming", "capture"],
    answer:
      "For camera, NDI, or capture workflows, separate the camera path from the display path.\n\nUseful WyreStorm paths:\nâ€¢ NDI camera into NetworkHD 100 workflow: NHD-128-NDI-TRX can bridge NDI into NetworkHD H.265 workflows.\nâ€¢ Multiview composition in NetworkHD 100: NHD-150-RX can be used for multiview output.\nâ€¢ PTZ camera choices: CAM-210-PTZ, CAM-210-NDI-PTZ, CAM-420-PTZ depending on resolution, NDI, and AI tracking needs.\nâ€¢ Multi-camera bridge: CAM-0402-BRG or CAM-0402-NDI-BRG depending on whether NDI is required.\n\nQualify next:\nâ€¢ USB, HDMI, NDI, or all three?\nâ€¢ Single camera or multi-camera?\nâ€¢ Local conferencing only, streaming, recording, or overflow display?",
  },
];

function createMessage(role: "assistant" | "user", content: string): GuruMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

function normaliseSku(value: string) {
  return value
    .toUpperCase()
    .replace(/[â€“â€”]/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .trim();
}

function extractSkus(value: string) {
  const matches = value.toUpperCase().match(SKU_PATTERN) ?? [];
  const unique = new Set<string>();

  matches.forEach((match) => {
    const sku = normaliseSku(match);
    if (/\d/.test(sku)) {
      unique.add(sku);
    }
  });

  return Array.from(unique);
}

function stringifyUnknown(value: unknown, depth = 0): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (depth > 4) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyUnknown(item, depth + 1)).join(" ");
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key} ${stringifyUnknown(item, depth + 1)}`)
      .join(" ");
  }

  return "";
}

function fieldValue(record: Record<string, unknown>, candidates: string[]) {
  for (const candidate of candidates) {
    const value = record[candidate];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function collectObjects(value: unknown, output: unknown[] = [], depth = 0) {
  if (value === null || value === undefined) {
    return output;
  }

  if (depth > 5) {
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectObjects(item, output, depth + 1));
    return output;
  }

  if (typeof value !== "object") {
    return output;
  }

  const text = stringifyUnknown(value);
  const skus = extractSkus(text);
  const record = value as Record<string, unknown>;

  if (skus.length || fieldValue(record, ["sku", "SKU", "model", "partNumber", "part_number"])) {
    output.push(value);
  }

  Object.values(record).forEach((item) => collectObjects(item, output, depth + 1));
  return output;
}

function toProductEntry(item: unknown): ProductEntry | null {
  if (item === null || item === undefined || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  const text = stringifyUnknown(item);
  const extractedSku = extractSkus(text)[0] ?? "";
  const sku = normaliseSku(fieldValue(record, ["sku", "SKU", "model", "partNumber", "part_number"]) || extractedSku);

  if (!sku) {
    return null;
  }

  return {
    sku,
    title:
      fieldValue(record, ["title", "name", "productName", "product_name", "modelName", "model_name"]) ||
      sku,
    family: fieldValue(record, ["family", "series", "productFamily", "product_family"]),
    category: fieldValue(record, ["category", "type", "technology", "technologyType", "technology_type"]),
    description: fieldValue(record, ["description", "summary", "shortDescription", "short_description"]),
    text,
    raw: item,
  };
}

function parseProductIndex(data: unknown) {
  const objects = collectObjects(data);
  const bySku = new Map<string, ProductEntry>();

  objects.forEach((item) => {
    const product = toProductEntry(item);

    if (!product) {
      return;
    }

    const existing = bySku.get(product.sku);

    if (!existing) {
      bySku.set(product.sku, product);
      return;
    }

    if (product.text.length > existing.text.length) {
      bySku.set(product.sku, product);
    }
  });

  return Array.from(bySku.values()).sort((a, b) => a.sku.localeCompare(b.sku));
}

function findProduct(products: ProductEntry[], sku: string) {
  const normalised = normaliseSku(sku);
  return products.find((product) => normaliseSku(product.sku) === normalised);
}

function scoreProduct(product: ProductEntry, query: string) {
  const normalisedQuery = query.toLowerCase();
  const words = normalisedQuery
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length > 2);

  let score = 0;
  const productText = `${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.text}`.toLowerCase();

  if (productText.includes(normalisedQuery)) {
    score += 40;
  }

  words.forEach((word) => {
    if (productText.includes(word)) {
      score += 4;
    }
  });

  extractSkus(query).forEach((sku) => {
    if (normaliseSku(product.sku) === sku) {
      score += 100;
    }

    if (productText.includes(sku.toLowerCase())) {
      score += 40;
    }
  });

  return score;
}

function searchProducts(products: ProductEntry[], query: string, limit = 5) {
  return products
    .map((product) => ({ product, score: scoreProduct(product, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.product);
}

function usefulLines(product: ProductEntry) {
  const keywords = [
    "input",
    "output",
    "receiver",
    "transmitter",
    "compatible",
    "usb",
    "hdbaset",
    "networkhd",
    "distance",
    "resolution",
    "video wall",
    "multiview",
    "wireless",
    "dante",
  ];

  const parts = product.text
    .replace(/\s+/g, " ")
    .split(/(?:â€¢|\n|\. |; )/)
    .map((line) => line.trim())
    .filter((line) => line.length > 18 && line.length < 220);

  const selected = parts.filter((line) => {
    const lower = line.toLowerCase();
    return keywords.some((keyword) => lower.includes(keyword));
  });

  return Array.from(new Set(selected)).slice(0, 5);
}

function detectUsbNotImportant(question: string) {
  const lower = question.toLowerCase();

  return [
    "usb not important",
    "usb is not important",
    "usb isn't important",
    "no usb",
    "without usb",
    "do not need usb",
    "don't need usb",
    "usb not required",
    "usb isn't required",
    "no camera",
    "no touch",
    "video only",
    "hdmi only",
  ].some((phrase) => lower.includes(phrase));
}

function detectUsbRequired(question: string) {
  const lower = question.toLowerCase();

  return [
    "usb",
    "camera",
    "webcam",
    "speakerphone",
    "microphone",
    "touch",
    "interactive",
    "keyboard",
    "mouse",
    "kvm",
    "byom",
    "conferencing",
  ].some((phrase) => lower.includes(phrase));
}

function detectDistanceMetres(question: string) {
  const lower = question.toLowerCase();
  const match = lower.match(/\b(\d{1,3})\s*(m|metre|metres|meter|meters)\b/);

  if (!match) {
    return null;
  }

  const distance = Number.parseInt(match[1], 10);

  if (Number.isNaN(distance)) {
    return null;
  }

  return distance;
}

function hdbasetReceiverByDistance(distance: number | null) {
  if (distance === null) {
    return {
      sku: "RX-35 or RX-70 family",
      reason: "distance has not been confirmed yet",
      caution: "Select the receiver by the required transmission distance and confirmed resolution.",
    };
  }

  if (distance <= 35) {
    return {
      sku: "RX-35 family",
      reason: `the stated distance is ${distance}m, so the shorter-distance HDBaseT receiver path should be considered first`,
      caution: "Confirm the exact RX-35 SKU against required resolution, scaling, audio, and control needs.",
    };
  }

  if (distance <= 70) {
    return {
      sku: "RX-70 family",
      reason: `the stated distance is ${distance}m, so the longer-distance HDBaseT receiver path is the safer choice`,
      caution: "Confirm the exact RX-70 SKU against required resolution, scaling, audio, and control needs.",
    };
  }

  return {
    sku: "RX-70 family or a longer-distance HDBaseT path",
    reason: `the stated distance is ${distance}m, which may exceed the practical limit of some receiver/cable combinations`,
    caution: "Do not assume compatibility beyond the rated distance. Confirm cable grade, resolution, and whether a 100m-capable HDBaseT receiver/path is required.",
  };
}

function isSw130Family(sku: string) {
  const normalised = normaliseSku(sku);

  return normalised === "SW-130-TX" || normalised === "SW-130-TX-UK" || normalised === "SW-130-TX-US";
}

function answerSw130ReceiverQuestion(question: string, sourceSku: string, products: ProductEntry[]) {
  const usbNotImportant = detectUsbNotImportant(question);
  const usbMentioned = detectUsbRequired(question);
  const distance = detectDistanceMetres(question);
  const distanceChoice = hdbasetReceiverByDistance(distance);
  const sourceProduct = findProduct(products, sourceSku);
  const sourceTitle = sourceProduct?.title && sourceProduct.title !== sourceSku ? ` — ${sourceProduct.title}` : "";

  if (usbNotImportant) {
    return [
      `If USB transport is not required, ${sourceSku}${sourceTitle} does not have to be paired specifically with RX-500.`,
      "",
      `Use a suitable WyreStorm HDBaseT receiver selected by transmission distance: ${distanceChoice.sku}.`,
      "",
      `Why: ${distanceChoice.reason}.`,
      "",
      "Practical selection rule:",
      "• Use the RX-35 family for shorter HDBaseT receiver runs.",
      "• Use the RX-70 family for longer HDBaseT receiver runs.",
      "• Use RX-500 when USB transport is required for camera, speakerphone, touch, keyboard, mouse, or KVM-style workflows.",
      "",
      "Check before quoting:",
      "• Required cable distance.",
      "• Required resolution and refresh rate.",
      "• Cable grade and installed cable condition.",
      "• Whether USB return is genuinely required or video-only is acceptable.",
      `• ${distanceChoice.caution}`,
    ].join("\n");
  }

  if (usbMentioned) {
    return [
      `Use RX-500 with ${sourceSku}${sourceTitle} when USB transport matters.`,
      "",
      "Why this fits:",
      "• RX-500 is the correct receiver path when the SW-130 transmitter needs USB return for room peripherals.",
      "• This applies to camera, speakerphone, touch display, keyboard/mouse, or KVM-style requirements.",
      "",
      "If the customer later confirms video-only operation:",
      `• You can move to a suitable HDBaseT receiver by distance instead: ${distanceChoice.sku}.`,
      "• RX-35 family for shorter runs.",
      "• RX-70 family for longer runs.",
      "",
      "Check before quoting:",
      "• USB device type and bandwidth expectation.",
      "• Cable distance.",
      "• Resolution and refresh rate.",
      "• Cable grade.",
    ].join("\n");
  }

  return [
    `${sourceSku}${sourceTitle} has two valid receiver paths depending on whether USB is required.`,
    "",
    "Recommended answer:",
    "• If USB transport is required: use RX-500.",
    `• If USB transport is not required: use a suitable HDBaseT receiver by distance, typically ${distanceChoice.sku}.`,
    "",
    "Practical selection rule:",
    "• RX-35 family for shorter HDBaseT runs.",
    "• RX-70 family for longer HDBaseT runs.",
    "• RX-500 when USB return is needed for camera, speakerphone, touch, keyboard, mouse, or KVM-style use.",
    "",
    "Ask the customer:",
    "• Is this video-only, or does the laptop need to access room USB devices?",
    "• What is the cable distance from wall plate to display/receiver?",
    "• What resolution and refresh rate are required?",
  ].join("\n");
}

function answerReceiverQuestion(question: string, products: ProductEntry[]) {
  const skus = extractSkus(question);
  const sourceSku = skus[0];

  if (!sourceSku) {
    return "Tell me the transmitter SKU and I’ll identify the correct receiver path. For example: “Which receiver works with SW-130-TX-UK?”";
  }

  if (isSw130Family(sourceSku)) {
    return answerSw130ReceiverQuestion(question, sourceSku, products);
  }

  const rule = compatibilityRules[sourceSku];

  if (rule?.receiver) {
    const sourceProduct = findProduct(products, sourceSku);
    const receiverProduct = findProduct(products, rule.receiver);

    const sourceTitle = sourceProduct?.title && sourceProduct.title !== sourceSku ? ` — ${sourceProduct.title}` : "";
    const receiverTitle =
      receiverProduct?.title && receiverProduct.title !== rule.receiver ? ` — ${receiverProduct.title}` : "";

    return [
      `Use ${rule.receiver}${receiverTitle} with ${sourceSku}${sourceTitle}.`,
      "",
      `Relationship: ${rule.relationship}.`,
      "",
      "Why this fits:",
      ...rule.notes.map((note) => `• ${note}`),
      "",
      "Check before quoting:",
      ...rule.checks.map((check) => `• ${check}`),
    ].join("\n");
  }

  const sourceProduct = findProduct(products, sourceSku);
  const sourceLines = sourceProduct ? usefulLines(sourceProduct) : [];

  if (sourceProduct && sourceLines.length) {
    return [
      `I found ${sourceSku}, but I do not have a confirmed receiver rule for it yet.`,
      "",
      `Product context: ${sourceProduct.title}`,
      ...sourceLines.map((line) => `• ${line}`),
      "",
      "Next step: confirm whether this is HDBaseT, NetworkHD, HDMI, or USB extension. I can then narrow the receiver path safely.",
    ].join("\n");
  }

  return [
    `I do not have a confirmed receiver match for ${sourceSku} yet.`,
    "",
    "To avoid specifying the wrong Tx/Rx pair, confirm:",
    "• Is this HDBaseT, NetworkHD, HDMI, or USB?",
    "• What receiver or display location is required?",
    "• What cable distance and resolution are required?",
  ].join("\n");
}
function answerProductQuestion(question: string, products: ProductEntry[]) {
  const skus = extractSkus(question);
  const sku = skus[0];

  if (!sku) {
    return "";
  }

  const product = findProduct(products, sku);

  if (!product) {
    const rule = compatibilityRules[sku];

    if (rule) {
      return answerReceiverQuestion(question, products);
    }

    return [
      `I do not have ${sku} in the local product index yet.`,
      "",
      "I can still help, but I need one more detail:",
      "â€¢ Is it a transmitter, receiver, switcher, matrix, AVoIP endpoint, extender, or accessory?",
    ].join("\n");
  }

  const lines = usefulLines(product);

  return [
    `${product.sku} â€” ${product.title}`,
    product.family ? `Family: ${product.family}` : "",
    product.category ? `Category: ${product.category}` : "",
    product.description ? `Summary: ${product.description}` : "",
    "",
    lines.length ? "Useful product notes:" : "I found the product but the local index does not expose detailed notes for it yet.",
    ...lines.map((line) => `â€¢ ${line}`),
    "",
    "Next qualification:",
    "â€¢ What is the room/application?",
    "â€¢ What is the source and display count?",
    "â€¢ What resolution, distance, USB, audio, and control behaviour is required?",
  ]
    .filter(Boolean)
    .join("\n");
}

function answerComparison(question: string, products: ProductEntry[]) {
  const skus = extractSkus(question);

  if (skus.length < 2) {
    return "";
  }

  const productA = findProduct(products, skus[0]);
  const productB = findProduct(products, skus[1]);

  return [
    `Comparison: ${skus[0]} vs ${skus[1]}`,
    "",
    `${skus[0]}: ${productA?.title ?? "Not found in local index"}`,
    ...(productA ? usefulLines(productA).slice(0, 3).map((line) => `â€¢ ${line}`) : []),
    "",
    `${skus[1]}: ${productB?.title ?? "Not found in local index"}`,
    ...(productB ? usefulLines(productB).slice(0, 3).map((line) => `â€¢ ${line}`) : []),
    "",
    "Decision check:",
    "â€¢ Which one matches the transport type?",
    "â€¢ Which one supports the required distance and resolution?",
    "â€¢ Which one supports the needed USB/audio/control behaviour?",
  ].join("\n");
}

function answerApplication(question: string) {
  const lower = question.toLowerCase();
  const match = applicationAnswers.find((item) => item.terms.some((term) => lower.includes(term)));

  if (!match) {
    return "";
  }

  return match.answer;
}

function answerFromSearch(question: string, products: ProductEntry[]) {
  const matches = searchProducts(products, question, 4);

  if (!matches.length) {
    return [
      "I can help, but I need to narrow the AV requirement.",
      "",
      "Answer these in order:",
      "â€¢ What type of space is this?",
      "â€¢ How many sources and displays?",
      "â€¢ Is this HDMI, HDBaseT, AVoIP, USB-C, wireless, or mixed?",
      "â€¢ What distance and resolution are required?",
      "â€¢ Is USB for camera/microphone/touch needed?",
    ].join("\n");
  }

  return [
    "Likely product matches from the local index:",
    "",
    ...matches.map((product) => {
      const summary = product.description || product.category || product.family || "Matched by SKU/product text.";
      return `â€¢ ${product.sku} â€” ${product.title}. ${summary}`;
    }),
    "",
    "Tell me the room type, source/display count, distance, resolution, and USB requirement and Iâ€™ll narrow this to a recommendation.",
  ].join("\n");
}

function answerQuestion(question: string, products: ProductEntry[]) {
  const lower = question.toLowerCase();
  const skus = extractSkus(question);

  if ((lower.includes("receiver") || lower.includes("rx")) && skus.length) {
    return answerReceiverQuestion(question, products);
  }

  if ((lower.includes("compare") || lower.includes("difference")) && skus.length >= 2) {
    return answerComparison(question, products);
  }

  if (skus.length) {
    const skuAnswer = answerProductQuestion(question, products);

    if (skuAnswer) {
      return skuAnswer;
    }
  }

  const applicationAnswer = answerApplication(question);

  if (applicationAnswer) {
    return applicationAnswer;
  }

  return answerFromSearch(question, products);
}

const openingMessage = createMessage(
  "assistant",
  "Hi, Iâ€™m Guru. Ask me a WyreStorm product or system design question and Iâ€™ll answer directly. Example: â€œWhich receiver can I use with the SW-130-TX-UK?â€"
);

export function WingmanGuruDrawer({ open, onClose }: WingmanGuruDrawerProps) {
  const [messages, setMessages] = useState<GuruMessage[]>([openingMessage]);
  const [draft, setDraft] = useState("");
  const [products, setProducts] = useState<ProductEntry[]>([]);
  const [indexStatus, setIndexStatus] = useState("Loading product intelligence...");
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/product-intelligence-index.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Index request failed: ${response.status}`);
        }

        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!active) {
          return;
        }

        const parsed = parseProductIndex(data);
        setProducts(parsed);
        setIndexStatus(`Product index loaded: ${parsed.length} entries`);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setProducts([]);
        setIndexStatus("Product index unavailable â€” using built-in AV rules");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
    }, 60);

    return () => window.clearTimeout(timer);
  }, [open, messages]);

  const helperText = useMemo(() => indexStatus, [indexStatus]);

  function sendMessage(raw: string) {
    const prompt = raw.trim();

    if (!prompt) {
      return;
    }

    const userMessage = createMessage("user", prompt);
    const assistantMessage = createMessage("assistant", answerQuestion(prompt, products));

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setDraft("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(draft);
  }

  function handleQuickPrompt(prompt: string) {
    sendMessage(prompt);
  }

  return (
    <>
      <div
        className="wingman-guru-backdrop"
        data-open={open ? "true" : "false"}
        onClick={onClose}
        aria-hidden={open ? "false" : "true"}
      />

      <aside
        className="wingman-guru-drawer"
        data-open={open ? "true" : "false"}
        aria-hidden={open ? "false" : "true"}
      >
        <header className="wingman-guru-drawer-header">
          <div className="wingman-guru-drawer-heading">
            <GuruAssistantAvatar size={42} />
            <div>
              <h2>Guru</h2>
              <p>Product-aware Q&A for WyreStorm sales, system design, and proposal support.</p>
              <p style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                <Database className="h-3.5 w-3.5" />
                {helperText}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="wingman-guru-close"
            onClick={onClose}
            aria-label="Close Guru assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="wingman-guru-quick-prompts">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="wingman-guru-quick-prompt"
              onClick={() => handleQuickPrompt(prompt)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        <div className="wingman-guru-messages" ref={messagesRef}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={[
                "wingman-guru-message",
                message.role === "assistant" ? "wingman-guru-message-assistant" : "wingman-guru-message-user",
              ].join(" ")}
            >
              <div className="wingman-guru-message-meta">
                <span>{message.role === "assistant" ? "Guru" : "You"}</span>
                <small>{message.time}</small>
              </div>
              <div className="wingman-guru-message-bubble">{message.content}</div>
            </div>
          ))}
        </div>

        <form className="wingman-guru-composer" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="wingman-guru-input"
            placeholder="Ask Guru a product or system question..."
          />
          <button type="submit" className="wingman-guru-send" aria-label="Send question">
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </form>
      </aside>
    </>
  );
}

export default WingmanGuruDrawer;