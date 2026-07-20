import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCopy, Database, MessageSquareText, RotateCcw, Send, Sparkles, X } from "lucide-react";
import GuruAssistantAvatar from "./branding/GuruAssistantAvatar";
import { GuruCallNotesInterpreter } from "./GuruCallNotesInterpreter";
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";
import { postWingmanJson } from "../api/wingmanApi";

type WingmanGuruDrawerProps = {
  open: boolean;
  onClose: () => void;
  contextLabel?: string;
  contextSummary?: string;
  supportCue?: {
    label: string;
    summary: string;
    prompts: string[];
  };
  seedPrompt?: string | null;
  onSeedHandled?: () => void;
};

type GuruMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  time: string;
};

type ProductVoiceId = "endUser" | "systemIntegrator" | "consultant";

type ProductSalesVoice = {
  label?: string;
  headline?: string;
  pitch?: string;
  value?: string;
  talkTrack?: string[];
  discoveryPrompts?: string[];
  positioningNotes?: string[];
  avoidPositioningAs?: string[];
};

type ProductSalesLanguage = {
  headline?: string;
  plainEnglishSummary?: string;
  customerValue?: string;
  realWorldApplication?: string;
  salespersonCue?: string;
  thirdOutputUseCase?: string;
  talkTrack?: string[];
  discoveryPrompts?: string[];
  positioningNotes?: string[];
  avoidPositioningAs?: string[];
  voices?: Partial<Record<ProductVoiceId, ProductSalesVoice>>;
};

type ProductEntry = {
  sku: string;
  title: string;
  family: string;
  category: string;
  description: string;
  salesLanguage?: ProductSalesLanguage;
  text: string;
  raw: unknown;
};

type GlossaryEntry = {
  terms: string[];
  title: string;
  answer: string;
  salesUse: string;
  watchOut: string;
  related?: string[];
};

type LiveCacheEntry = {
  question: string;
  answer: string;
  source: string;
  savedAt: string;
};

const SKU_PATTERN = /\b[A-Z]{2,6}(?:-[A-Z0-9]{2,}){1,7}\b/g;
const GURU_CACHE_KEY = "wingman-guru-live-knowledge-cache-v1";
const GURU_CACHE_LIMIT = 80;
const GURU_EXTERNAL_LOOKUP_ENABLED = import.meta.env.VITE_WINGMAN_ENABLE_GURU_EXTERNAL_LOOKUP === "true";

const quickPrompts = [
  "Which receiver can I use with the SW-130-TX-UK?",
  "Which receiver can I use with the SW-130-TX-UK if USB is not important and the run is 30m?",
  "Explain MX-0403-H3-MST for an installer.",
  "What does HDBaseT mean?",
  "Explain AVoIP encoder vs decoder.",
  "What is EDID and why does it matter?",
  "What is USB host vs USB device?",
];

const avGlossary: GlossaryEntry[] = [
  {
    terms: ["avoip", "av over ip", "av-over-ip", "network av", "networked av"],
    title: "AVoIP / AV-over-IP",
    answer:
      "AV-over-IP means transporting audio, video, control, and sometimes USB over an IP network rather than using a fixed point-to-point AV cable. In WyreStorm designs this usually means NetworkHD.",
    salesUse:
      "Use AVoIP when the customer needs flexible routing, expansion, distributed displays, multi-room routing, centralised control, video walls, or many-to-many source/display behaviour.",
    watchOut:
      "Do not treat every AVoIP platform as equivalent. Check latency, image quality, compression, bandwidth, USB, Dante/audio, switch requirements, and scalability.",
    related: ["NetworkHD", "encoder", "decoder", "IGMP", "multicast"],
  },
  {
    terms: ["encoder", "av encoder", "networkhd encoder", "transmitter", "tx"],
    title: "Encoder / Transmitter / TX",
    answer:
      "An encoder or transmitter sits at the source end. It takes a signal such as HDMI, USB-C, camera, or another AV source and prepares it for transport.",
    salesUse:
      "Ask what the source is, where it is physically located, what it connects to, and what transport path is available from that location.",
    watchOut:
      "Do not confuse AVoIP encoders with HDBaseT transmitters. Both may be called TX, but they belong to different architectures.",
    related: ["decoder", "receiver", "HDBaseT", "AVoIP"],
  },
  {
    terms: ["decoder", "av decoder", "networkhd decoder", "receiver", "rx"],
    title: "Decoder / Receiver / RX",
    answer:
      "A decoder or receiver sits at the display/end-point side. It receives the transported signal and outputs it to a display, projector, processor, audio device, or endpoint.",
    salesUse:
      "Ask what display or endpoint is being fed, what resolution is required, and whether USB, audio, scaling, or control is also needed.",
    watchOut:
      "A NetworkHD decoder is not the same as an HDBaseT receiver. Match the receiver to the transport technology first, then distance and features.",
    related: ["encoder", "transmitter", "RX-700", "RX-500", "NetworkHD"],
  },
  {
    terms: ["hdbaset", "hd base t", "hdbt", "hdbt3", "hdbaset 3.0"],
    title: "HDBaseT",
    answer:
      "HDBaseT is a point-to-point AV transport technology that sends video, audio, control, Ethernet, USB on some products, and power on some products over twisted-pair category cable.",
    salesUse:
      "Use HDBaseT when a source or switcher needs to feed a display over a medium-to-long cable run without moving to a full networked AV architecture.",
    watchOut:
      "Always check distance, resolution, cable grade, USB support, PoH/PoC direction, and the exact receiver feature set.",
    related: ["Cat6", "PoH", "PoC", "RX-35", "RX-70", "RX-700"],
  },
  {
    terms: ["edid", "extended display identification data"],
    title: "EDID",
    answer:
      "EDID is the display information sent back to a source to tell it what resolutions, refresh rates, audio formats, and colour formats the display can accept.",
    salesUse:
      "EDID matters when a source is not outputting the expected resolution or when mixed displays are used in the same system.",
    watchOut:
      "Poor EDID handling can cause no picture, wrong resolution, unstable images, or incorrect audio format.",
    related: ["HDMI", "scaler", "matrix", "display compatibility"],
  },
  {
    terms: ["hdcp", "copy protection", "hdcp 2.2", "hdcp 2.3"],
    title: "HDCP",
    answer:
      "HDCP is HDMI content protection. Every active device in the signal path must support the required HDCP version for protected content to display correctly.",
    salesUse:
      "Ask whether the source is a laptop, media player, set-top box, or protected content source.",
    watchOut:
      "HDCP faults often look like intermittent picture, blank screen, or content showing on one display but not another.",
    related: ["HDMI", "EDID", "matrix", "splitter"],
  },
  {
    terms: ["usb host", "host port", "usb-b host", "usb-c host"],
    title: "USB Host",
    answer:
      "USB host is the computer side of the USB relationship. In meeting rooms, the host is normally the laptop or room PC that wants to use a camera, microphone, speakerphone, touch display, keyboard, or mouse.",
    salesUse:
      "Identify which device is the computer and which devices are peripherals before selecting extenders or switchers.",
    watchOut:
      "USB host and USB device ports are not interchangeable. Getting this wrong is a common reason conferencing systems fail.",
    related: ["USB device", "KVM", "BYOD", "camera"],
  },
  {
    terms: ["usb device", "usb peripheral", "device port", "usb camera", "usb speakerphone"],
    title: "USB Device / Peripheral",
    answer:
      "A USB device or peripheral is the item the computer wants to use, such as a webcam, PTZ camera, speakerphone, microphone, touch display, keyboard, or mouse.",
    salesUse:
      "List every USB peripheral and where it is physically located before choosing switchers or extenders.",
    watchOut:
      "USB 2.0 and USB 3.x have different bandwidth and distance implications. Cameras need more care than simple keyboard/mouse devices.",
    related: ["USB host", "USB extender", "camera", "speakerphone"],
  },
  {
    terms: ["usb-c", "usbc", "type-c", "displayport alt mode", "alt-mode"],
    title: "USB-C",
    answer:
      "USB-C is a connector type, not a guarantee of capability. A USB-C port may carry video, USB data, charging, Ethernet, or only some of those functions.",
    salesUse:
      "Ask whether the customer needs USB-C for video, USB peripherals, laptop charging, network access, or all of these.",
    watchOut:
      "Do not assume every USB-C cable or port supports video, charging, high-speed USB, or MST.",
    related: ["MST", "Power Delivery", "BYOD", "USB host"],
  },
  {
    terms: ["mst", "multi-stream transport", "dual screen over usb-c", "dual display over usb-c"],
    title: "MST",
    answer:
      "MST means Multi-Stream Transport. It allows more than one display signal to be carried over a suitable USB-C / DisplayPort connection from a laptop.",
    salesUse:
      "Use MST when a laptop needs to drive dual independent displays from one USB-C connection.",
    watchOut:
      "MST depends on laptop, operating system, USB-C/DisplayPort capability, and switcher support. Mac behaviour can be different from Windows.",
    related: ["USB-C", "dual display", "MX-0402-MST", "MX-0403-H3-MST"],
  },
  {
    terms: ["byod", "bring your own device"],
    title: "BYOD",
    answer:
      "BYOD means Bring Your Own Device. In AV, a participant brings a laptop and connects it to the room to share content or run the meeting.",
    salesUse:
      "Ask whether the laptop only needs to share video, or whether it also needs access to the room camera, microphone, speakers, touch display, and network.",
    watchOut:
      "BYOD can mean simple presentation or full conferencing. USB requirements change the product choice.",
    related: ["BYOD", "USB-C", "wireless conferencing", "presentation switcher"],
  },
  {
    terms: ["byom", "bring your own meeting"],
    title: "BYOD",
    answer:
      "BYOM means Bring Your Own Meeting. A participant runs Teams, Zoom, Webex, or similar from their own laptop while using the room camera, microphone, speakers, and display.",
    salesUse:
      "BYOD normally requires USB routing as well as video routing.",
    watchOut:
      "Wireless presentation is not automatically wireless conferencing. Confirm whether the camera and microphone return to the laptop.",
    related: ["BYOD", "USB host", "wireless conferencing", "camera"],
  },
  {
    terms: ["kvm", "keyboard video mouse"],
    title: "KVM",
    answer:
      "KVM stands for Keyboard, Video, Mouse. In AV it usually means transporting video and USB control/peripherals together so a user can operate a remote computer or device.",
    salesUse:
      "Ask which computer is being controlled, where the operator is sitting, and what USB devices need to work.",
    watchOut:
      "KVM can mean simple keyboard/mouse, but it can also involve cameras, touchscreens, or high-speed USB devices.",
    related: ["USB extender", "USB host", "USB device"],
  },
  {
    terms: ["matrix", "matrix switcher", "hdmi matrix", "hdbaset matrix"],
    title: "Matrix Switcher",
    answer:
      "A matrix switcher routes multiple inputs to multiple outputs. For example, an 8x8 matrix can route any of 8 sources to any of 8 displays.",
    salesUse:
      "Use a matrix when the I/O count is known and the system is mostly fixed around a central rack or room core.",
    watchOut:
      "A matrix is not always better than AVoIP. AVoIP may be better when expansion, distributed rooms, or flexible routing are important.",
    related: ["seamless matrix", "AVoIP", "HDBaseT matrix"],
  },
  {
    terms: ["seamless", "seamless switching", "fast switching"],
    title: "Seamless Switching",
    answer:
      "Seamless switching reduces or removes the black-screen delay when changing between sources. It usually uses scaling or frame synchronisation inside the switcher or processor.",
    salesUse:
      "Use seamless switching for presentation spaces, education, events, and rooms where source changes must look professional.",
    watchOut:
      "Check whether the customer needs true seamless switching, fast switching, multiview, video wall processing, or just basic source selection.",
    related: ["scaler", "matrix", "multiview", "video wall"],
  },
  {
    terms: ["scaler", "scaling", "downscaling", "upscaling"],
    title: "Scaler / Scaling",
    answer:
      "A scaler changes video resolution or format. It helps when sources and displays do not all support the same resolution.",
    salesUse:
      "Use scaling where mixed-resolution displays are involved or where the system needs a consistent output format.",
    watchOut:
      "Scaling solves many compatibility issues but can affect latency, image processing, and system behaviour.",
    related: ["EDID", "matrix", "splitter", "video wall"],
  },
  {
    terms: ["multiview", "multi-view", "quad view", "pip", "picture in picture"],
    title: "Multiview",
    answer:
      "Multiview shows multiple sources on one display at the same time, such as quad view, picture-in-picture, or custom layouts.",
    salesUse:
      "Use multiview for monitoring, teaching, meeting rooms, control rooms, or any environment where users need to see more than one source at once.",
    watchOut:
      "Multiview is different from a video wall. A video wall spreads content across multiple displays; multiview combines sources onto one output or canvas.",
    related: ["video wall", "seamless matrix", "NHD-150-RX", "NHD-0401-MV"],
  },
  {
    terms: ["video wall", "videowall", "lcd wall", "led wall"],
    title: "Video Wall",
    answer:
      "A video wall uses multiple displays or LED cabinets to create a larger visual canvas. It may show one large image, separate content per display, or mixed layouts.",
    salesUse:
      "Ask wall size, layout, source count, content behaviour, latency, and whether it is LCD or LED before recommending a processor, matrix, or AVoIP.",
    watchOut:
      "Do not assume AVoIP is always the answer. Dedicated processors like SW-0206-VW can be better for some fixed wall requirements.",
    related: ["SW-0206-VW", "SW-0204-VW", "AVoIP", "multiview"],
  },
  {
    terms: ["poe", "power over ethernet"],
    title: "PoE",
    answer:
      "PoE means Power over Ethernet. It provides power over network cabling to devices such as touch panels, cameras, controllers, or networked endpoints.",
    salesUse:
      "Use PoE where the endpoint is network-based and can be powered from a suitable PoE switch or injector.",
    watchOut:
      "PoE is not the same as PoH or PoC. Check the exact product power standard and required wattage.",
    related: ["PoH", "PoC", "network switch"],
  },
  {
    terms: ["poh", "power over hdbaset"],
    title: "PoH",
    answer:
      "PoH means Power over HDBaseT. It powers a compatible transmitter or receiver over the HDBaseT link.",
    salesUse:
      "Use PoH to reduce local power supplies at endpoints where the WyreStorm product supports it.",
    watchOut:
      "Check direction: some products power transmitter to receiver, some receiver to transmitter, and some are bidirectional.",
    related: ["HDBaseT", "PoC", "PoE"],
  },
  {
    terms: ["poc", "power over cable"],
    title: "PoC",
    answer:
      "PoC means Power over Cable. It is a general term for powering one side of an extender/link from the other side over the same cable path.",
    salesUse:
      "Use it as a practical installation benefit when the endpoint has no convenient local power.",
    watchOut:
      "Always check compatibility and power direction between the exact transmitter and receiver.",
    related: ["PoH", "PoE", "HDBaseT"],
  },
  {
    terms: ["dante", "aes67", "network audio"],
    title: "Dante / AES67",
    answer:
      "Dante and AES67 are network audio technologies used to move audio channels over an IP network.",
    salesUse:
      "Use network audio where audio needs to be distributed, routed, processed, or integrated with DSPs/amplifiers across the network.",
    watchOut:
      "Network audio needs correct network design, clocking, routing, and IT coordination.",
    related: ["DSP", "amplifier", "network audio", "MX-1007-HYB"],
  },
];

const applicationAnswers = [
  {
    terms: ["meeting room", "conference room", "boardroom", "huddle"],
    answer:
      "For a meeting room, start with the collaboration workflow rather than the product.\n\nLikely WyreStorm paths:\n- Small/simple room: APO video bar or simple presentation switching.\n- Medium BYOD/BYOD room: consider wireless conferencing or USB-C presentation products.\n- More technical dual-display room: consider MST/presentation matrix routes.\n\nQualify next:\n- How many displays?\n- Is USB-C laptop connection required?\n- Is wireless conferencing required or only wireless casting?\n- Are cameras/microphones local or remote?\n- Is this BYOD, MTR, Zoom Room, or flexible use?",
  },
  {
    terms: ["ndi", "camera", "ptz", "streaming", "capture"],
    answer:
      "For camera, NDI, or capture workflows, separate the camera path from the display path.\n\nUseful WyreStorm paths:\n- NDI camera into NetworkHD 100 workflow: NHD-128-NDI-TRX can bridge NDI into H.265 workflows.\n- Multiview composition in NetworkHD 100: NHD-150-RX can be used for multiview output.\n- PTZ camera choices depend on resolution, NDI, AI tracking, and output format.\n\nQualify next:\n- USB, HDMI, NDI, or all three?\n- Single camera or multi-camera?\n- Conferencing only, streaming, recording, or overflow display?",
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
    .replace(/[--]/g, "-")
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

function asSalesLanguage(value: unknown): ProductSalesLanguage | undefined {
  if (value && typeof value === "object") return value as ProductSalesLanguage;
  return undefined;
}

function salesLanguageFromRecord(record: Record<string, unknown>) {
  const direct = asSalesLanguage(record.salesLanguage);

  if (direct) {
    return direct;
  }

  const technicalProfile = record.technicalProfile;

  if (technicalProfile && typeof technicalProfile === "object") {
    return asSalesLanguage((technicalProfile as Record<string, unknown>).salesLanguage);
  }

  return undefined;
}

function cleanGuruLine(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function uniqueGuruLines(values: unknown[]) {
  return Array.from(new Set(values.map(cleanGuruLine).filter(Boolean)));
}

function collectObjects(value: unknown, output: unknown[] = [], depth = 0) {
  if (value === null || value === undefined || depth > 5) {
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
    salesLanguage: salesLanguageFromRecord(record),
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
  const match = question.toLowerCase().match(/\b(\d{1,3})\s*(m|metre|metres|meter|meters)\b/);

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
      caution: "Select the receiver by required transmission distance and confirmed resolution.",
    };
  }

  if (distance <= 35) {
    return {
      sku: "RX-35 family",
      reason: `the stated distance is ${distance}m, so the shorter-distance HDBaseT receiver path should be considered first`,
      caution: "Confirm the exact RX-35 SKU against resolution, scaling, audio, and control needs.",
    };
  }

  if (distance <= 70) {
    return {
      sku: "RX-70 family",
      reason: `the stated distance is ${distance}m, so the longer-distance HDBaseT receiver path is the safer choice`,
      caution: "Confirm the exact RX-70 SKU against resolution, scaling, audio, and control needs.",
    };
  }

  return {
    sku: "RX-70 family or a longer-distance HDBaseT path",
    reason: `the stated distance is ${distance}m, which may exceed some receiver/cable combinations`,
    caution: "Confirm cable grade, resolution, and whether a 100m-capable HDBaseT receiver/path is required.",
  };
}

function sw130ReceiverByDistance(distance: number | null) {
  if (distance === null) {
    return {
      sku: "RX-500 or RX-700",
      reason: "the SW-130 receiver choice depends on confirmed distance and resolution",
      caution: "Use RX-500 for shorter SW-130 runs where the distance/resolution fits; use RX-700 for the longer-distance SW-130 path.",
    };
  }

  if (distance <= 35) {
    return {
      sku: "RX-500",
      reason: `the stated distance is ${distance}m, so RX-500 is a valid shorter-distance SW-130 receiver path`,
      caution: "Confirm resolution, cable grade, USB/control needs, and installed path condition before customer issue.",
    };
  }

  return {
    sku: "RX-700",
    reason: `the stated distance is ${distance}m, so the longer-distance SW-130 receiver path is the safer governed choice`,
    caution: "Confirm cable grade, resolution, USB/control needs, and whether the run requires the 100m-capable SW-130 receive path.",
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
  const sw130DistanceChoice = sw130ReceiverByDistance(distance);
  const valueEngineeredDistanceChoice = hdbasetReceiverByDistance(distance);
  const sourceProduct = findProduct(products, sourceSku);
  const sourceTitle = sourceProduct?.title && sourceProduct.title !== sourceSku ? ` - ${sourceProduct.title}` : "";

  if (usbNotImportant) {
    return [
      `If USB transport is not required, ${sourceSku}${sourceTitle} can be value-engineered with a WyreStorm HDBT 2.0 compatible receiver.`,
      "",
      "You do not have to force RX-500 or RX-700 just because SW-130 is the transmitter.",
      "",
      `Distance logic: ${valueEngineeredDistanceChoice.reason}.`,
      "",
      "Practical selection rule:",
      "- If USB transport is not required: use any WyreStorm HDBT 2.0 compatible receiver that meets distance, resolution, cable, audio/control, and power needs.",
      "- RX-500 remains valid for shorter-distance SW-130 receiver connections where its distance/resolution envelope fits.",
      "- RX-700 remains the longer-distance SW-130 receiver path.",
      "",
      "Check before customer issue:",
      "- Required cable distance.",
      "- Required resolution and refresh rate.",
      "- Cable grade and installed cable condition.",
      "- Whether USB return is genuinely not required.",
      `- ${valueEngineeredDistanceChoice.caution}`,
    ].join("\n");
  }

  if (usbMentioned) {
    return [
      `Use ${sw130DistanceChoice.sku} with ${sourceSku}${sourceTitle}, then validate the USB and cable requirements.`,
      "",
      "Why this fits:",
      "- RX-500 can be used for shorter-distance SW-130 receiver connections.",
      "- RX-700 is the longer-distance SW-130 receiver path.",
      "- This applies to camera, speakerphone, touch display, keyboard/mouse, or KVM-style requirements.",
      `- Distance logic: ${sw130DistanceChoice.reason}.`,
      "",
      "Before customer issue:",
      `- ${sw130DistanceChoice.caution}`,
      "- Confirm whether USB 2.0 is sufficient for the device type.",
    ].join("\n");
  }

  return [
    `${sourceSku}${sourceTitle} has two valid governed receiver paths depending on distance and design requirements.`,
    "",
    "Recommended answer:",
    "- If USB transport is required: RX-500 can provide the shorter-distance SW-130 receiver connection, while RX-700 is the longer-distance SW-130 receiver path.",
    "- If USB transport is not required: value-engineer with any WyreStorm HDBT 2.0 compatible receiver that meets the technical requirements.",
    `- Based on the stated distance for a USB-required SW-130 path: ${sw130DistanceChoice.sku}.`,
    "",
    "Ask the customer:",
    "- Is USB transport required, or is this video-only?",
    "- What is the cable distance from wall plate to display/receiver?",
    "- What resolution and refresh rate are required?",
  ].join("\n");
}

function scoreProduct(product: ProductEntry, query: string) {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length > 2);

  let score = 0;
  const productText = `${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.text}`.toLowerCase();

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
    .split(/(?:-|\n|\. |; )/)
    .map((line) => line.trim())
    .filter((line) => line.length > 18 && line.length < 220);

  const selected = parts.filter((line) => {
    const lower = line.toLowerCase();
    return keywords.some((keyword) => lower.includes(keyword));
  });

  return Array.from(new Set(selected)).slice(0, 5);
}

function detectProductVoice(question: string): ProductVoiceId {
  const lower = question.toLowerCase();

  if (/\b(si|system integrator|integrator|installer|install|commissioning|commission)\b/.test(lower)) {
    return "systemIntegrator";
  }

  if (/\b(consultant|technical|designer|specifier|architect|architecture|trade-off|tradeoff)\b/.test(lower)) {
    return "consultant";
  }

  return "endUser";
}

function salesVoiceLines(product: ProductEntry, question: string) {
  const language = product.salesLanguage;

  if (!language) {
    return [];
  }

  const voiceId = detectProductVoice(question);
  const voice = language.voices?.[voiceId];
  const heading = voice?.label || (voiceId === "systemIntegrator" ? "SI / installer" : voiceId === "consultant" ? "Consultant / technical" : "End user");
  const pitch = cleanGuruLine(voice?.pitch || language.plainEnglishSummary);
  const value = cleanGuruLine(voice?.value || language.customerValue || language.realWorldApplication);
  const talkTrack = uniqueGuruLines([
    ...(voice?.talkTrack ?? []),
    ...(voiceId === "endUser" ? [language.salespersonCue, language.realWorldApplication] : []),
    language.thirdOutputUseCase,
  ]).slice(0, 3);
  const prompts = uniqueGuruLines([...(voice?.discoveryPrompts ?? []), ...(language.discoveryPrompts ?? [])]).slice(0, 3);

  return [
    `${heading} view:`,
    pitch ? `- ${pitch}` : "",
    value ? `- ${value}` : "",
    ...talkTrack.map((line) => `- ${line}`),
    prompts.length ? "" : "",
    prompts.length ? "Good questions to ask:" : "",
    ...prompts.map((line) => `- ${line}`),
  ].filter(Boolean);
}

function answerGlossary(question: string) {
  const lower = question.toLowerCase();

  const directTerm = lower
    .replace(/^(what is|what does|explain|define|meaning of|what's)\s+/i, "")
    .replace(/\?+$/g, "")
    .trim();

  const match = avGlossary.find((entry) =>
    entry.terms.some((term) => {
      const termLower = term.toLowerCase();
      return lower.includes(termLower) || directTerm === termLower;
    })
  );

  if (!match) {
    return "";
  }

  return [
    `${match.title}`,
    "",
    match.answer,
    "",
    "Sales use:",
    `- ${match.salesUse}`,
    "",
    "Watch out:",
    `- ${match.watchOut}`,
    match.related?.length ? "" : "",
    match.related?.length ? `Related terms: ${match.related.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function answerReceiverQuestion(question: string, products: ProductEntry[]) {
  const skus = extractSkus(question);
  const sourceSku = skus[0];

  if (!sourceSku) {
    return `Tell me the transmitter SKU and I'll identify the correct receiver path. For example: "Which receiver works with SW-130-TX-UK?"`;
  }

  if (isSw130Family(sourceSku)) {
    return answerSw130ReceiverQuestion(question, sourceSku, products);
  }

  const product = findProduct(products, sourceSku);

  if (product) {
    return [
      `I found ${sourceSku}, but I do not have a confirmed receiver pairing rule for it yet.`,
      "",
      `Product context: ${product.title}`,
      ...usefulLines(product).map((line) => `- ${line}`),
      "",
      "Confirm the transport type first: HDBaseT, NetworkHD/AVoIP, HDMI, or USB extension.",
    ].join("\n");
  }

  return [
    `I do not have a confirmed receiver match for ${sourceSku} yet.`,
    "",
    "To avoid specifying the wrong Tx/Rx pair, confirm:",
    "- Is this HDBaseT, NetworkHD, HDMI, or USB?",
    "- What receiver or display location is required?",
    "- What cable distance and resolution are required?",
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
    return "";
  }

  const lines = usefulLines(product);
  const voiceLines = salesVoiceLines(product, question);

  return [
    `${product.sku} - ${product.title}`,
    product.family ? `Family: ${product.family}` : "",
    product.category ? `Category: ${product.category}` : "",
    product.description ? `Summary: ${product.description}` : "",
    voiceLines.length ? "" : "",
    ...voiceLines,
    "",
    lines.length ? "Useful product notes:" : "I found the product but the local index does not expose detailed notes for it yet.",
    ...lines.map((line) => `- ${line}`),
    "",
    "Next qualification:",
    "- What is the room/application?",
    "- What is the source and display count?",
    "- What resolution, distance, USB, audio, and control behaviour is required?",
  ]
    .filter(Boolean)
    .join("\n");
}

function answerApplication(question: string) {
  const lower = question.toLowerCase();
  const match = applicationAnswers.find((item) => item.terms.some((term) => lower.includes(term)));

  if (!match) {
    return "";
  }

  return match.answer;
}

function answerHdmiUsbExtenderIntent(question: string) {
  const lower = question.toLowerCase();

  const mentionsUsb = /\busb\b|camera|webcam|speakerphone|microphone|touch|keyboard|mouse|kvm|byom|conference|conferencing/.test(lower);
  const mentionsVideo = /\bhdmi\b|display|screen|projector|monitor|video/.test(lower);
  const mentionsExtender = /extender|extend|extension|transmit|send|over cat|cat6|cat 6|hdbaset|long run|distance/.test(lower);
  const asksForSingleSolution =
    /\ba\b.*\bextender\b/.test(lower) ||
    /\bone\b.*\bextender\b/.test(lower) ||
    /\bsingle\b.*\b(extender|solution|box|product)\b/.test(lower) ||
    /\bcombined\b|\bintegrated\b|\ball.?in.?one\b/.test(lower) ||
    /usb.*and.*hdmi|hdmi.*and.*usb/.test(lower);

  if (!mentionsUsb || !mentionsVideo) {
    return "";
  }

  if (!mentionsExtender && !asksForSingleSolution) {
    return "";
  }

  const distance = detectDistanceMetres(question);
  const distanceChoice = hdbasetReceiverByDistance(distance);

  if (distance !== null) {
    return [
      "Yes - treat this as a request for one integrated HDMI + USB extender solution, not separate HDMI and USB devices.",
      "",
      `Based on the stated ${distance}m run, the primary design path should be a single extender system / Tx-Rx pair that carries both HDMI video and USB over the same transport architecture.`,
      "",
      "Recommended design logic:",
      "- Use an integrated HDMI + USB extender path where the transmitter and receiver are designed to work together.",
      "- Do not split HDMI and USB into separate extender products unless there is a clear reason, such as USB bandwidth, cable pathway limits, or the selected video extender cannot carry the required USB.",
      `- If the requirement later becomes video-only, select the HDBaseT receiver family by distance: ${distanceChoice.sku}.`,
      "",
      "Likely WyreStorm paths to check first:",
      "- SW-130-TX-UK / SW-130-TX-US with RX-500 for shorter USB-required runs or RX-700 for the longer SW-130 receive path.",
      "- SW-120-TX3 family with RX3-100 where a higher-performance HDBaseT 3.0 style transmitter/receiver path is more appropriate.",
      "",
      "Only consider a separate USB extender path when:",
      "- The HDMI transport product does not support the required USB behaviour.",
      "- The USB device needs more bandwidth than the combined AV extender supports.",
      "- The USB device location is different from the HDMI display/source path.",
      "",
      "Before customer issue, confirm:",
      "- Cable distance and cable grade.",
      "- Required resolution and refresh rate.",
      "- USB device type: camera, speakerphone, touch, keyboard/mouse, or other.",
      "- Whether USB 2.0 is enough or USB 3.x bandwidth is required.",
      "- Whether the source location should be wall plate, desk, floor box, or rack.",
    ].join("\n");
  }

  return [
    "Yes - treat this as a request for one integrated HDMI + USB extender solution, not separate HDMI and USB devices.",
    "",
    "Recommended design logic:",
    "- Start with a single extender system / Tx-Rx pair that carries HDMI video and USB together.",
    "- Do not recommend separate HDMI and USB extenders unless an integrated product cannot meet the distance, USB bandwidth, or physical installation requirement.",
    "- If USB transport is important for camera, speakerphone, touch, keyboard, mouse, or BYOD, the product must explicitly support USB transport.",
    "",
    "Likely WyreStorm paths to check first:",
    "- SW-130-TX-UK / SW-130-TX-US with RX-500 for shorter USB-required runs or RX-700 for the longer SW-130 receive path.",
    "- SW-120-TX3 family with RX3-100 for a higher-performance HDBaseT 3.0 style transmitter/receiver path.",
    "",
    "Only consider a separate USB extender path when:",
    "- The selected HDMI extender does not carry the required USB.",
    "- The USB peripheral needs more bandwidth than the integrated extender supports.",
    "- The USB endpoint is in a different physical location from the HDMI endpoint.",
    "",
    "Ask the customer:",
    "- How far is the cable run?",
    "- What resolution is required: 1080p, 4K30, or 4K60?",
    "- What USB device needs to work?",
    "- Is this for BYOD conferencing, touch, KVM, or simple USB control?",
    "- Is the source location wall plate, desk, floor box, or rack?",
  ].join("\n");
}
function answerFromSearch(question: string, products: ProductEntry[]) {
  const matches = searchProducts(products, question, 4);

  if (!matches.length) {
    return "";
  }

  return [
    "Likely product matches from the local index:",
    "",
    ...matches.map((product) => {
      const summary = product.salesLanguage?.plainEnglishSummary || product.description || product.category || product.family || "Matched by SKU/product text.";
      return `- ${product.sku} - ${product.title}. ${summary}`;
    }),
    "",
    "Tell me the room type, source/display count, distance, resolution, and USB requirement and I'll narrow this to a recommendation.",
  ].join("\n");
}

function normaliseCacheKey(question: string) {
  return question.toLowerCase().replace(/\s+/g, " ").trim();
}

function readGuruCache() {
  if (typeof window === "undefined") {
    return {} as Record<string, LiveCacheEntry>;
  }

  try {
    const raw = window.localStorage.getItem(GURU_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, LiveCacheEntry>) : {};
  } catch {
    return {};
  }
}

function writeGuruCache(cache: Record<string, LiveCacheEntry>) {
  if (typeof window === "undefined") {
    return;
  }

  const entries = Object.entries(cache)
    .sort((a, b) => Date.parse(b[1]?.savedAt ?? "") - Date.parse(a[1]?.savedAt ?? ""))
    .slice(0, GURU_CACHE_LIMIT);

  window.localStorage.setItem(GURU_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
}

function readCachedLiveAnswer(question: string) {
  const cache = readGuruCache();
  const key = normaliseCacheKey(question);
  return cache[key] ?? null;
}

function storeCachedLiveAnswer(question: string, answer: string, source: string) {
  const cache = readGuruCache();
  const key = normaliseCacheKey(question);

  cache[key] = {
    question,
    answer,
    source,
    savedAt: new Date().toISOString(),
  };

  writeGuruCache(cache);
}

function cacheCount() {
  return Object.keys(readGuruCache()).length;
}

function liveLookupTerm(question: string) {
  return question
    .replace(/\b(what is|what does|explain|define|meaning of|tell me about|how does|why does)\b/gi, "")
    .replace(/[?!.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

async function tryWikipediaLookup(question: string) {
  const term = liveLookupTerm(question);

  if (!term || extractSkus(term).length) {
    return "";
  }

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    return "";
  }

  const data = (await response.json()) as { title?: string; extract?: string; content_urls?: { desktop?: { page?: string } } };
  const extract = typeof data.extract === "string" ? data.extract.trim() : "";

  if (!extract || extract.length < 80) {
    return "";
  }

  return [
    `${data.title ?? term}`,
    "",
    extract,
    "",
    "Guru note:",
    "- This was found by live lookup because it was not in the local Wingman glossary or product index.",
    "- I have stored it in local Guru memory for next time.",
  ].join("\n");
}

async function tryDuckDuckGoLookup(question: string) {
  const term = liveLookupTerm(question);

  if (!term) {
    return "";
  }

  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(`${term} AV terminology`)}&format=json&no_html=1&skip_disambig=1`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    return "";
  }

  const data = (await response.json()) as { Heading?: string; AbstractText?: string; Answer?: string };
  const answer = [data.AbstractText, data.Answer].filter(Boolean).join(" ").trim();

  if (!answer || answer.length < 60) {
    return "";
  }

  return [
    `${data.Heading || term}`,
    "",
    answer,
    "",
    "Guru note:",
    "- This was found by live lookup because it was not in the local Wingman glossary or product index.",
    "- I have stored it in local Guru memory for next time.",
  ].join("\n");
}

async function liveLookup(question: string) {
  const cached = readCachedLiveAnswer(question);

  if (cached?.answer) {
    return [
      cached.answer,
      "",
      `Local Guru memory: reused cached answer saved ${new Date(cached.savedAt).toLocaleString()}.`,
    ].join("\n");
  }

  try {
    const response = await postWingmanJson<{
      ok: boolean;
      data?: {
        answer?: string;
        bullets?: string[];
        confidence?: number;
      };
    }>("/api/wingman/agents/guru", { question });
    const answer = response.data?.answer?.trim() || "";
    const confidence = Number(response.data?.confidence || 0);

    if (answer && confidence >= 0.75) {
      return [
        answer,
        ...(response.data?.bullets || []).slice(0, 4).map((item) => `- ${item}`),
      ].join("\n");
    }
  } catch {
    // The signed-in agent service is optional. Continue to the configured safe fallback.
  }

  if (!GURU_EXTERNAL_LOOKUP_ENABLED) {
    return [
      "I do not know that confidently from Wingman's local knowledge yet.",
      "",
      "For privacy, Guru external web lookup is off by default. I checked the local glossary and product index only.",
      "",
      "Add more AV context or enable `VITE_WINGMAN_ENABLE_GURU_EXTERNAL_LOOKUP=true` in a trusted environment if third-party lookup is acceptable.",
    ].join("\n");
  }

  try {
    const wikipediaAnswer = await tryWikipediaLookup(question);

    if (wikipediaAnswer) {
      storeCachedLiveAnswer(question, wikipediaAnswer, "wikipedia");
      return wikipediaAnswer;
    }
  } catch {
    // Fall through to the next live lookup source.
  }

  try {
    const duckAnswer = await tryDuckDuckGoLookup(question);

    if (duckAnswer) {
      storeCachedLiveAnswer(question, duckAnswer, "duckduckgo");
      return duckAnswer;
    }
  } catch {
    // Fall through to safe clarification.
  }

  return [
    "I do not know that confidently yet.",
    "",
    "I checked the local Wingman glossary, local product index, and attempted a live lookup, but did not get a strong enough answer to store.",
    "",
    "Ask it with a little more context, for example:",
    "- Is this a product SKU, AV acronym, signal type, cable type, or system behaviour?",
    "- Is the question about WyreStorm product selection or general AV terminology?",
  ].join("\n");
}

async function answerQuestion(question: string, products: ProductEntry[]) {
  const lower = question.toLowerCase();
  const skus = extractSkus(question);

  if ((lower.includes("receiver") || lower.includes("rx")) && skus.length) {
    return answerReceiverQuestion(question, products);
  }

  const glossaryAnswer = answerGlossary(question);

  if (glossaryAnswer) {
    return glossaryAnswer;
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


  const hdmiUsbExtenderAnswer = answerHdmiUsbExtenderIntent(question);

  if (hdmiUsbExtenderAnswer) {
    return hdmiUsbExtenderAnswer;
  }

  const productSearchAnswer = answerFromSearch(question, products);

  if (productSearchAnswer) {
    return productSearchAnswer;
  }

  return liveLookup(question);
}


const GURU_STRUCTURED_CONVERSATION_UI_V2 = "GURU_STRUCTURED_CONVERSATION_UI_V2";

type GuruContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function isGuruSectionHeading(line: string, index: number, lines: string[]) {
  const text = line.replace(/:$/, "").trim();

  if (!text || text.length > 72) {
    return false;
  }

  if (line.endsWith(":")) {
    return true;
  }

  return index === 0 && lines[index + 1] === "" && !/[.!?]$/.test(line);
}

function buildGuruContentBlocks(content: string): GuruContentBlock[] {
  const lines = content
    .replace(/\r/g, "")
    .replace(/\s+-\s+(?=(?:Is|What|Which|Where|How|Why|Confirm|Check|Use|Ask|Do|Does)\b)/g, "\n- ")
    .split("\n")
    .map((line) => line.trim());

  const blocks: GuruContentBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();

    if (text) {
      blocks.push({ type: "paragraph", text });
    }

    paragraph = [];
  };

  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "list", items: [...list] });
    }

    list = [];
  };

  lines.forEach((line, index) => {
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const bullet = line.match(/^[-*\u2022]\s+(.+)$/);

    if (bullet) {
      flushParagraph();
      list.push(bullet[1].trim());
      return;
    }

    flushList();

    if (isGuruSectionHeading(line, index, lines)) {
      flushParagraph();
      blocks.push({ type: "heading", text: line.replace(/:$/, "").trim() });
      return;
    }

    paragraph.push(line);
  });

  flushParagraph();
  flushList();

  return blocks.length ? blocks : [{ type: "paragraph", text: content.trim() }];
}

function guruMessageTone(content: string) {
  const text = content.toLowerCase();

  if (text.includes("checking guru knowledge")) {
    return "loading";
  }

  if (
    /do not know|do not have a confirmed|not confirmed|needs verification|wrong tx\/rx|before quoting|before customer issue|confirm:/.test(
      text,
    )
  ) {
    return "caution";
  }

  if (/recommended answer|why this fits|sales use|practical selection rule|use .* with/.test(text)) {
    return "guidance";
  }

  return "standard";
}

function GuruMessageContent({ content }: { content: string }) {
  const blocks = buildGuruContentBlocks(content);
  const loading = guruMessageTone(content) === "loading";

  if (loading) {
    return (
      <div className="wingman-guru-loading" role="status">
        <span className="wingman-guru-loading-dot" />
        <span>Checking local Guru knowledge...</span>
      </div>
    );
  }

  return (
    <div className="wingman-guru-rich-content">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h4 key={`heading-${index}-${block.text}`} className="wingman-guru-rich-heading">
              {block.text}
            </h4>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list-${index}`} className="wingman-guru-rich-list">
              {block.items.map((item) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`paragraph-${index}-${block.text.slice(0, 24)}`} className="wingman-guru-rich-paragraph">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
const openingMessage = createMessage(
  "assistant",
  GURU_EXTERNAL_LOOKUP_ENABLED
    ? "Hi, I'm Guru, Wingman's real-time AV and WyreStorm technical assistant. Ask me a product, AV terminology, acronym, or system design question. You can ask for an end-user, installer, or consultant view. If I don't know it locally, I'll try a live lookup and store the answer in local Guru memory for next time."
    : "Hi, I'm Guru, Wingman's real-time AV and WyreStorm technical assistant. Ask me a product, AV terminology, acronym, or system design question. You can ask for an end-user, installer, or consultant view. External lookup is off, so I'll answer from the local Wingman glossary and product index."
);

export function WingmanGuruDrawer({
  open,
  onClose,
  contextLabel,
  contextSummary,
  supportCue,
  seedPrompt,
  onSeedHandled,
}: WingmanGuruDrawerProps) {
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);
  const [messages, setMessages] = useState<GuruMessage[]>([openingMessage]);
  const [draft, setDraft] = useState("");
  const [products, setProducts] = useState<ProductEntry[]>([]);
  const [indexStatus, setIndexStatus] = useState("Loading product intelligence...");
  const [memoryCount, setMemoryCount] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const handledSeedPromptRef = useRef<string | null>(null);

  useEffect(() => {
    setMemoryCount(cacheCount());

    let active = true;

    loadProductIntelligenceIndex()
      .then((data) => {
        if (!active) {
          return;
        }

        const parsed = parseProductIndex(data);
        setProducts(parsed);
        setIndexStatus(`Product index loaded: ${parsed.length} entries`);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        console.error("[wingman] GuruDrawer: product intelligence index load failed", error);
        setProducts([]);
        setIndexStatus("Product index unavailable - using built-in AV rules and glossary");
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

  const sendMessage = useCallback(
    async (raw: string) => {
      const prompt = raw.trim();

      if (!prompt) {
        return;
      }

      const userMessage = createMessage("user", prompt);
      const pendingMessage = createMessage("assistant", "Checking Guru knowledge...");

      setMessages((current) => [...current, userMessage, pendingMessage]);
      setDraft("");

      const answer = await answerQuestion(prompt, products);

      setMessages((current) =>
        current.map((message) => (message.id === pendingMessage.id ? { ...message, content: answer } : message))
      );

      setMemoryCount(cacheCount());
    },
    [products],
  );

  useEffect(() => {
    const prompt = seedPrompt?.trim() ?? "";

    if (!prompt) {
      handledSeedPromptRef.current = null;
      return;
    }

    if (!open || handledSeedPromptRef.current === prompt) {
      return;
    }

    handledSeedPromptRef.current = prompt;
    void sendMessage(prompt);
    onSeedHandled?.();
  }, [open, onSeedHandled, seedPrompt, sendMessage]);

  const helperText = useMemo(() => {
    return `${indexStatus} - Glossary: ${avGlossary.length} terms - Local Guru memory: ${memoryCount}`;
  }, [indexStatus, memoryCount]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function handleQuickPrompt(prompt: string) {
    void sendMessage(prompt);
  }

  function clearGuruMemory() {
    window.localStorage.removeItem(GURU_CACHE_KEY);
    setMemoryCount(0);
    setMessages((current) => [
      ...current,
      createMessage("assistant", "Local Guru memory has been cleared. Built-in glossary and product rules remain available."),
    ]);
  }

  function clearConversation() {
    setMessages([openingMessage]);
    setCopiedMessageId(null);
  }

  async function copyGuruMessage(message: GuruMessage) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => {
        setCopiedMessageId((current) => (current === message.id ? null : current));
      }, 1800);
    } catch {
      setCopiedMessageId(null);
    }
  }

  function sendGuruMessageToDiscovery(message: GuruMessage) {
    const handoff = [
      "Guru assistant handoff",
      "",
      message.content,
      "",
      "Use this as discovery context only. Validate the room, signal path, USB, audio, control, distance and product dependencies before quoting.",
    ].join("\n");

    window.sessionStorage.setItem("wingman-guru-call-notes-transcript", handoff);
    window.dispatchEvent(
      new CustomEvent("wingman:use-call-notes-in-discovery", {
        detail: handoff,
      }),
    );
    window.location.href = "/wingman/discovery";
  }

  return portalReady
    ? createPortal(
        <>
      <div
        className="wingman-guru-backdrop"
        data-wingman-guru-backdrop="true"
        data-open={open ? "true" : "false"}
        onClick={onClose}
        aria-hidden={open ? "false" : "true"}
      />

      <aside
        className="wingman-guru-drawer"
        data-wingman-guru-drawer="true"
        data-open={open ? "true" : "false"}
      >
                <header className="wingman-guru-drawer-header">
          <div className="wingman-guru-drawer-heading">
            <GuruAssistantAvatar size={42} />
            <div className="wingman-guru-title-stack">
              <div className="wingman-guru-title-row">
                <h2>Guru</h2>
                <span className="wingman-guru-mode-badge">
                  <Database className="h-3.5 w-3.5" />
                  {GURU_EXTERNAL_LOOKUP_ENABLED ? "Live lookup enabled" : "Local knowledge"}
                </span>
              </div>
              <p>AV and WyreStorm technical assistant</p>
              <small>{helperText}</small>
            </div>
          </div>

          <div className="wingman-guru-header-actions">
            {messages.length > 1 ? (
              <button
                type="button"
                className="wingman-guru-header-button"
                onClick={clearConversation}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear chat</span>
              </button>
            ) : null}

            <button
              type="button"
              className="wingman-guru-close"
              onClick={onClose}
              aria-label="Close Guru assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <section className="wingman-guru-quick-section" aria-label="Quick Guru questions">
          <div className="wingman-guru-section-label">
            <strong>Quick asks</strong>
            <span>Select a prompt or type your own question below.</span>
          </div>

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

            {memoryCount > 0 ? (
              <button
                type="button"
                className="wingman-guru-quick-prompt wingman-guru-quick-prompt--quiet"
                onClick={clearGuruMemory}
              >
                Clear local memory
              </button>
            ) : null}
          </div>
        </section>

        {supportCue ? (
          <details className="wingman-guru-support-drawer">
            <summary>
              <span>{supportCue.label}</span>
              <small>{contextLabel ? `${contextLabel} workflow support` : "Workflow support"}</small>
            </summary>
            <div className="wingman-guru-support-content">
              <p>{supportCue.summary}</p>
              {contextSummary ? <small>Current page: {contextSummary}</small> : null}
              <div className="wingman-guru-context-prompts">
                {supportCue.prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="wingman-guru-context-prompt"
                    onClick={() => handleQuickPrompt(prompt)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          </details>
        ) : null}

        <details className="wingman-guru-tool-drawer">
          <summary>
            <span>Call notes interpreter</span>
            <small>Optional: capture or paste call notes and send them into Discovery.</small>
          </summary>
          <div className="wingman-guru-tool-content">
            <GuruCallNotesInterpreter />
          </div>
        </details>

        <section className="wingman-guru-conversation" aria-label="Guru conversation">
          <div className="wingman-guru-conversation-header">
            <MessageSquareText className="h-4 w-4" />
            <div>
              <strong>Conversation</strong>
              <small>Guru answers are guidance. Confirm product data and dependencies before quoting.</small>
            </div>
          </div>

          <div className="wingman-guru-messages" ref={messagesRef}>
            {messages.map((message) => {
              const tone = guruMessageTone(message.content);
              const isPending = tone === "loading";

              return (
                <article
                  key={message.id}
                  className={[
                    "wingman-guru-message",
                    message.role === "assistant"
                      ? "wingman-guru-message-assistant"
                      : "wingman-guru-message-user",
                  ].join(" ")}
                  data-message-role={message.role}
                  data-message-tone={tone}
                >
                  <div className="wingman-guru-message-meta">
                    <span>{message.role === "assistant" ? "Guru" : "You"}</span>
                    <small>{message.time}</small>
                  </div>

                  <div className="wingman-guru-message-bubble">
                    <GuruMessageContent content={message.content} />
                  </div>

                  {message.role === "assistant" && !isPending ? (
                    <div className="wingman-guru-message-actions">
                      <button
                        type="button"
                        onClick={() => {
                          void copyGuruMessage(message);
                        }}
                      >
                        <ClipboardCopy className="h-3.5 w-3.5" />
                        <span>{copiedMessageId === message.id ? "Copied" : "Copy answer"}</span>
                      </button>
                      <button type="button" onClick={() => sendGuruMessageToDiscovery(message)}>
                        Use in Discovery
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <form className="wingman-guru-composer" onSubmit={handleSubmit}>
          <div className="wingman-guru-input-shell">
            <label className="sr-only" htmlFor="wingman-guru-question">
              Ask Guru
            </label>
            <textarea
              id="wingman-guru-question"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();

                  if (draft.trim()) {
                    void sendMessage(draft);
                  }
                }
              }}
              className="wingman-guru-input"
              placeholder="Ask Guru a product, AV term, acronym, or system question..."
              rows={2}
            />
            <small>Enter to send - Shift+Enter for a new line</small>
          </div>
          <button
            type="submit"
            className="wingman-guru-send"
            aria-label="Send question"
            disabled={!draft.trim()}
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </form>
      </aside>
        </>,
        document.body,
      )
    : null;
}

export default WingmanGuruDrawer;
