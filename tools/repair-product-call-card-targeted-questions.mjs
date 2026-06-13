import fs from "node:fs/promises";

const root = process.cwd();
const jsonPath = `${root}/public/product-call-card-products.json`;
const auditPath = `${root}/public/product-call-card-targeted-questions-audit.json`;

function clean(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function sku(value) {
  return clean(value).toUpperCase();
}

function profile(product) {
  const id = sku(product.sku);
  const family = `${product.family || ""} ${product.category || ""}`.toLowerCase();

  if (id.startsWith("AMP-") || family.includes("audio") || family.includes("amplifier")) return "audio";
  if (id.startsWith("NHD-")) return "networkhd";
  if (id.startsWith("MX-") || id.startsWith("MXV-")) return "matrix";
  if (id.startsWith("SW-0204-VW") || id.startsWith("SW-0206-VW")) return "videoWall";
  if (id === "NHD-0401-MV" || family.includes("multiview")) return "multiview";
  if (id.startsWith("SW-") || family.includes("presentation")) return "presentation";
  if (id.startsWith("APO-") || family.includes("usb") || family.includes("uc")) return "uc";
  if (id.startsWith("EX-") || family.includes("extender")) return "extender";
  if (id.startsWith("CAB-") || id.startsWith("CBL-") || family.includes("cable") || family.includes("accessory")) return "accessory";
  if (id.startsWith("CAM-") || family.includes("camera")) return "camera";
  if (id.startsWith("SYN-") || family.includes("control")) return "control";
  return "general";
}

const COPY = {
  audio: {
    family: "Audio / amplifier",
    questions: [
      "What speakers are being driven and how many zones are required?",
      "Is the speaker system Low Z, High Z / 70V / 100V, or mixed?",
      "What is the audio source: local analogue, Dante, AES67, HDMI audio breakout or DSP output?",
      "Does the installation need DSP, RS-232, GPIO, trigger input or network control?",
    ],
    proofPoints: [
      "Amplifier selection depends on speaker type, speaker load and zone count.",
      "Low Z and High Z / 70V / 100V are different speaker system designs and should be confirmed early.",
      "Dante or AES67 only matters when the audio design needs networked audio integration.",
      "Control ports such as RS-232, GPIO or trigger input matter when the amplifier must integrate with room control or paging.",
    ],
  },
  networkhd: {
    family: null,
    questions: [
      "How many sources and displays need flexible routing?",
      "Is this a new NetworkHD design or an addition to an existing NetworkHD system?",
      "Which NetworkHD series is already installed or being proposed?",
      "Is USB, multiview, video wall, Dante or low latency required?",
    ],
    proofPoints: [
      "NetworkHD is strongest where routing flexibility, expansion or distributed endpoints are required.",
      "Controller and network switch design must be part of the discussion.",
      "NetworkHD series should not be treated as cross-compatible without deliberate system design.",
    ],
  },
  matrix: {
    family: "Matrix / HDBaseT",
    questions: [
      "How many source devices and display destinations are required?",
      "Does each display need an independently routed source, or are any outputs mirrored?",
      "What are the cable distances and are HDBaseT receivers included or required?",
      "Is audio breakout, IR, RS-232, ARC/eARC or IP control needed?",
    ],
    proofPoints: [
      "Matrix products are strongest where the source and display count is known.",
      "HDBaseT outputs are relevant when displays are away from the rack or source position.",
      "Mirrored, loop and local outputs should not be counted as independent routed matrix outputs.",
    ],
  },
  presentation: {
    family: "Presentation switcher",
    questions: [
      "How does the user connect: HDMI, USB-C, wireless or a mix?",
      "Is the room presentation-only, conferencing, or BYOD/BYOM?",
      "How many displays or outputs are required?",
      "Is room control or touch-panel operation expected?",
    ],
    proofPoints: [
      "Presentation switchers are strongest where the room needs simple source connection and clean user operation.",
      "USB-C, wireless and conferencing requirements should be confirmed early.",
    ],
  },
  uc: {
    family: "USB / UC",
    questions: [
      "Is the room BYOD, BYOM, room PC, Teams appliance or mixed use?",
      "Which camera, microphone, speakerphone or USB device needs to connect?",
      "Where is the host laptop or room PC located?",
      "Is USB extension or switching required?",
    ],
    proofPoints: [
      "UC product selection depends on the host location and USB peripheral path.",
      "Camera, microphone and speakerphone compatibility should be confirmed before positioning the product.",
    ],
  },
  accessory: {
    family: null,
    questions: [
      "Which WyreStorm product or device is this accessory being used with?",
      "Is it required for installation, connection, power, mounting or service?",
      "Is compatibility with the parent product confirmed?",
      "Should this be added to a project only as a supporting item?",
    ],
    proofPoints: [
      "Accessories should support a confirmed product workflow rather than be positioned as the main solution.",
      "Connector type, length, compatibility and installation route should be checked before specifying.",
    ],
  },
};

function stripIrrelevant(product, values, productProfile) {
  const blockedByProfile = {
    audio: /matrix|mirrored|local monitor|display count|hdbaset receiver|video wall|networkhd/i,
    matrix: /speaker load|low z|high z|70v|100v|dante audio design|aes67|microphone|speakerphone/i,
    accessory: /dante|aes67|speaker zone|matrix outputs|networkhd|video wall|multiview/i,
    uc: /matrix size|speaker load|70v|100v|hdbaset receiver/i,
  };

  const block = blockedByProfile[productProfile];

  return values.filter((value) => {
    const text = clean(value);
    if (!text) return false;
    if (!block) return true;
    return !block.test(text);
  });
}

const raw = await fs.readFile(jsonPath, "utf8");
const payload = JSON.parse(raw);
const products = Array.isArray(payload) ? payload : Array.isArray(payload.products) ? payload.products : [];

if (products.length === 0) {
  throw new Error("No products found");
}

const audit = [];

const repaired = products.map((product) => {
  const productProfile = profile(product);
  const copy = COPY[productProfile];

  if (!copy) {
    return product;
  }

  const before = {
    family: product.family,
    questions: product.questions,
    proofPoints: product.proofPoints,
  };

  const next = {
    ...product,
    questions: copy.questions,
    proofPoints: stripIrrelevant(product, copy.proofPoints, productProfile),
    copyRepairStatus: "targeted-questions-normalised",
    copyRepairRule: "Questions and checks must follow SKU/product family, not generic filler text.",
  };

  if (copy.family) {
    next.family = copy.family;
    next.category = copy.family;
  }

  audit.push({
    sku: product.sku,
    profile: productProfile,
    before,
    after: {
      family: next.family,
      questions: next.questions,
      proofPoints: next.proofPoints,
    },
  });

  return next;
});

const output = Array.isArray(payload)
  ? repaired
  : {
      ...payload,
      targetedQuestionsRepairGeneratedAt: new Date().toISOString(),
      targetedQuestionsRule: "Questions and checks must follow SKU/product family, not generic filler text.",
      products: repaired,
    };

await fs.writeFile(jsonPath, JSON.stringify(output, null, 2), "utf8");
await fs.writeFile(
  auditPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      repairedCount: audit.length,
      audit,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`Repaired targeted questions/proof points for ${audit.length} products.`);
console.log(auditPath);