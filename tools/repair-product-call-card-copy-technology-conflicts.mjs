import fs from "node:fs/promises";

const root = process.cwd();
const jsonPath = `${root}/public/product-call-card-products.json`;
const auditPath = `${root}/public/product-call-card-copy-repair-audit.json`;

function clean(value) {
  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function normSku(value) {
  return clean(value).toUpperCase();
}

function unique(values) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const item = clean(value);

    if (!item) {
      continue;
    }

    const key = item.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(item);
  }

  return output;
}

function short(value, max = 255) {
  const text = clean(value);

  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}.`;
}

function splitSentences(value) {
  return clean(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => clean(sentence))
    .filter(Boolean);
}

function isNoiseSentence(sentence) {
  return /newsletter|sign up|wishlist|cart|login|register|privacy|cookie|downloads?|manual|quick view|related products|read more|learn more/i.test(sentence);
}

function deriveProfile(product) {
  const sku = normSku(product.sku);
  const text = `${sku} ${product.name || ""} ${product.family || ""} ${product.category || ""} ${product.description || ""} ${(product.tags || []).join(" ")}`.toLowerCase();

  if (sku === "NHD-0401-MV") {
    return {
      key: "multiviewProcessor",
      family: "Multiview processor",
      allowed: ["multiview", "hdmi", "4k", "uhd", "layout", "canvas", "source", "output"],
      blocked: ["networkhd 600", "networkhd 500", "networkhd 100", "av-over-ip", "avoip", "sdvoe"],
    };
  }

  if (/^SW-020[46]-VW/.test(sku)) {
    return {
      key: "videoWallProcessor",
      family: "Video wall processor",
      allowed: ["video wall", "videowall", "processor", "layout", "preset", "display", "source", "hdmi", "4k"],
      blocked: ["networkhd 600", "networkhd 500", "networkhd 100", "av-over-ip", "avoip", "sdvoe"],
    };
  }

  if (/^NHD-600/.test(sku)) {
    return {
      key: "networkHd600",
      family: "NetworkHD 600",
      allowed: ["networkhd", "av-over-ip", "avoip", "10g", "sdvoe", "transceiver", "low latency", "zero latency", "4k", "routing"],
      blocked: ["matrix switcher", "hdbaset matrix", "fixed 8x8 matrix"],
    };
  }

  if (/^NHD-5/.test(sku)) {
    return {
      key: "networkHd500",
      family: "NetworkHD 500",
      allowed: ["networkhd", "av-over-ip", "avoip", "jpeg xs", "4k60", "4:4:4", "usb", "dante", "low latency"],
      blocked: ["networkhd 600", "sdvoe", "hdbaset matrix", "fixed 8x8 matrix"],
    };
  }

  if (/^NHD-1/.test(sku)) {
    return {
      key: "networkHd100",
      family: "NetworkHD 100",
      allowed: ["networkhd", "av-over-ip", "avoip", "h.264", "h.265", "multiview", "encoder", "decoder", "routing"],
      blocked: ["networkhd 600", "networkhd 500", "sdvoe", "jpeg xs", "hdbaset matrix"],
    };
  }

  if (/^NHD-/.test(sku)) {
    return {
      key: "networkHd",
      family: "NetworkHD",
      allowed: ["networkhd", "av-over-ip", "avoip", "encoder", "decoder", "routing"],
      blocked: ["hdbaset matrix", "fixed matrix"],
    };
  }

  if (/^MX-1007-HYB/.test(sku) || /^MX-0804-EDU/.test(sku)) {
    return {
      key: "hybridEducation",
      family: "Hybrid / education",
      allowed: ["hybrid", "presentation", "usb", "hdbaset", "education", "teaching", "amplifier", "dsp", "networkhd 500"],
      blocked: ["networkhd 600", "sdvoe", "networkhd 100"],
    };
  }

  if (/^MX-|^MXV-/.test(sku)) {
    return {
      key: "matrixHdbaset",
      family: "Matrix / HDBaseT",
      allowed: ["matrix", "hdbaset", "hdbt", "hdmi", "source", "display", "input", "output", "4k", "uhd", "distance", "audio", "control", "arc", "rs-232", "ir"],
      blocked: ["networkhd 600", "networkhd 500", "networkhd 100", "av-over-ip", "avoip", "sdvoe", "jpeg xs"],
    };
  }

  if (/^AMP-/.test(sku)) {
    return {
      key: "audioAmplifier",
      family: "Audio / amplifier",
      allowed: ["amplifier", "audio", "dante", "aes67", "low z", "high z", "70v", "100v", "speaker", "zone", "dsp", "line level", "rs-232", "gpio"],
      blocked: ["networkhd 600", "networkhd 500", "networkhd 100", "av-over-ip", "avoip", "video wall"],
    };
  }

  if (/^APO-DG/.test(sku)) {
    return {
      key: "wirelessPresentation",
      family: "Wireless presentation",
      allowed: ["wireless", "casting", "usb-c", "airplay", "miracast", "presentation", "dongle", "apollo"],
      blocked: ["networkhd 600", "networkhd 500", "networkhd 100", "hdbaset matrix", "sdvoe"],
    };
  }

  if (/^APO-/.test(sku)) {
    return {
      key: "usbUc",
      family: "USB / UC",
      allowed: ["usb", "uc", "byod", "byom", "camera", "microphone", "speaker", "audio", "conference", "apollo"],
      blocked: ["networkhd 600", "networkhd 500", "networkhd 100", "hdbaset matrix", "sdvoe"],
    };
  }

  if (/^SW-/.test(sku)) {
    return {
      key: "presentationSwitcher",
      family: "Presentation switcher",
      allowed: ["presentation", "switcher", "usb-c", "usb", "wireless", "byod", "byom", "hdbaset", "hdmi", "display", "meeting", "teaching"],
      blocked: ["networkhd 600", "networkhd 500", "networkhd 100", "sdvoe"],
    };
  }

  if (/^EX-/.test(sku)) {
    return {
      key: "hdbasetExtender",
      family: "HDBaseT extender",
      allowed: ["hdbaset", "hdbt", "extender", "transmitter", "receiver", "distance", "hdmi", "ir", "rs-232", "poh", "poe"],
      blocked: ["networkhd 600", "networkhd 500", "networkhd 100", "av-over-ip", "avoip", "sdvoe"],
    };
  }

  if (/^CAM-/.test(sku)) {
    return {
      key: "camera",
      family: "Camera",
      allowed: ["camera", "ptz", "ndi", "usb", "hdmi", "video", "tracking", "conference"],
      blocked: ["hdbaset matrix", "networkhd 600", "networkhd 500", "networkhd 100"],
    };
  }

  if (/^SYN-/.test(sku)) {
    return {
      key: "control",
      family: "Control",
      allowed: ["control", "touch", "rs-232", "relay", "gpio", "ip", "room control"],
      blocked: ["networkhd 600", "networkhd 500", "networkhd 100", "video wall"],
    };
  }

  if (/^CAB-|^CBL-/.test(sku)) {
    return {
      key: "cableAccessory",
      family: "Cable / accessory",
      allowed: ["cable", "hdmi", "usb", "connector", "active", "length", "accessory"],
      blocked: ["networkhd 600", "networkhd 500", "networkhd 100", "av-over-ip", "matrix switcher", "video wall"],
    };
  }

  if (text.includes("audio")) {
    return {
      key: "audio",
      family: "Audio",
      allowed: ["audio", "amplifier", "dante", "aes67", "speaker", "line level", "dsp"],
      blocked: ["networkhd 600", "networkhd 500", "networkhd 100", "video wall"],
    };
  }

  return {
    key: "general",
    family: product.family || product.category || "WyreStorm product",
    allowed: [],
    blocked: ["newsletter", "sign up"],
  };
}

function containsBlockedTechnology(sentence, profile) {
  const lower = sentence.toLowerCase();
  return profile.blocked.some((term) => lower.includes(term.toLowerCase()));
}

function cleanDescription(product, profile) {
  const original = clean(product.description);

  const sentences = splitSentences(original)
    .filter((sentence) => !isNoiseSentence(sentence))
    .filter((sentence) => !containsBlockedTechnology(sentence, profile));

  if (sentences.length > 0) {
    return short(sentences.slice(0, 2).join(" "), 255);
  }

  if (profile.key === "matrixHdbaset") {
    return `${product.sku} is a fixed I/O matrix switching product for routing known source devices to known display destinations, commonly using HDMI and HDBaseT-style signal paths.`;
  }

  if (profile.key.startsWith("networkHd")) {
    return `${product.sku} is a NetworkHD AV-over-IP product for flexible source-to-display routing across a correctly designed AV network.`;
  }

  if (profile.key === "audioAmplifier") {
    return `${product.sku} is an audio amplifier product for room audio, speaker driving and AV audio integration.`;
  }

  if (profile.key === "presentationSwitcher") {
    return `${product.sku} is a presentation switching product for local room source connection and meeting or teaching workflows.`;
  }

  return `${product.sku} is a WyreStorm product for ${profile.family.toLowerCase()} applications.`;
}

function detectFacts(product, profile) {
  const text = `${product.sku} ${product.name || ""} ${product.description || ""} ${(product.tags || []).join(" ")}`.toLowerCase();
  const facts = [];

  if (/4k\s?60|4k60/.test(text)) {
    facts.push("Supports 4K60 where the full signal chain allows it.");
  }

  if (/4k|uhd/.test(text)) {
    facts.push("Supports 4K/UHD signal workflows.");
  }

  if (/4:4:4/.test(text)) {
    facts.push("4:4:4 support is useful for detailed PC graphics and sharp text.");
  }

  if (/hdr|dolby vision/.test(text)) {
    facts.push("HDR support matters where the display chain is expected to handle premium video content.");
  }

  if (/hdbaset|hdbt/.test(text) && profile.key !== "networkHd600" && profile.key !== "networkHd500" && profile.key !== "networkHd100") {
    facts.push("HDBaseT transport is relevant for structured-cable display runs.");
  }

  if (/hdmi/.test(text)) {
    facts.push("HDMI connectivity keeps the system aligned with common AV source and display devices.");
  }

  if (/dante/.test(text) && profile.key !== "matrixHdbaset") {
    facts.push("Dante support helps integrate the product into networked audio systems.");
  }

  if (/aes67/.test(text)) {
    facts.push("AES67 support can help with standards-based network audio interoperability.");
  }

  if (/usb-c|usbc/.test(text)) {
    facts.push("USB-C support helps with modern laptop connection workflows.");
  }

  if (/usb 3\.0|usb3/.test(text)) {
    facts.push("USB 3.0 support is useful where conferencing peripherals need higher USB bandwidth.");
  }

  if (/wireless|airplay|miracast|casting/.test(text)) {
    facts.push("Wireless presentation support helps reduce cable dependency for guest sharing.");
  }

  if (/rs-?232/.test(text)) {
    facts.push("RS-232 support can help with display, projector or device control.");
  }

  if (/\bir\b|infrared/.test(text)) {
    facts.push("IR support can help with simple source or display control.");
  }

  if (/audio de-?embed|audio breakout|de-embed/.test(text)) {
    facts.push("Audio de-embedding is useful when audio needs to feed an amplifier, DSP or local sound system.");
  }

  if (/poe/.test(text)) {
    facts.push("PoE can reduce the need for local power at endpoints.");
  }

  if (/poh/.test(text)) {
    facts.push("PoH can simplify power in compatible HDBaseT-style systems.");
  }

  if (/low z|low-z|low impedance/.test(text)) {
    facts.push("Low Z speaker support is useful for direct low-impedance loudspeaker runs.");
  }

  if (/high z|high-z|70v|100v|constant voltage/.test(text)) {
    facts.push("High Z / 70V / 100V support is useful for distributed speaker zones.");
  }

  return unique(facts).filter((fact) => !containsBlockedTechnology(fact, profile)).slice(0, 5);
}

function ioFromSku(product) {
  const sku = normSku(product.sku);
  const match = sku.match(/(?:MX|MXV)-(\d{2})(\d{2})/);

  if (!match) {
    return "";
  }

  const inputs = Number(match[1]);
  const outputs = Number(match[2]);

  if (!Number.isFinite(inputs) || !Number.isFinite(outputs)) {
    return "";
  }

  return `${inputs}x${outputs}`;
}

function buildFit(product, profile) {
  const io = ioFromSku(product);

  if (profile.key === "matrixHdbaset") {
    const ioText = io ? `a defined ${io} source/display requirement` : "a defined source/display requirement";
    return `Use where the customer has ${ioText} and needs centralised HDMI / HDBaseT routing. Confirm independent routed outputs, any mirrored outputs, cable distance, receiver requirements, audio breakout and control before positioning it.`;
  }

  if (profile.key.startsWith("networkHd")) {
    return "Use where the customer needs flexible AV-over-IP routing across a correctly designed network. Confirm source count, display count, controller requirement, switch design, bandwidth, latency, USB and multiview needs before positioning it.";
  }

  if (profile.key === "hybridEducation") {
    return "Use where the room needs an integrated teaching or meeting-room workflow with presentation, USB, display transport, audio and control considered together. Confirm source locations, USB ownership, display paths and audio requirements.";
  }

  if (profile.key === "presentationSwitcher") {
    return "Use where the room needs simple local presentation, laptop connection, display switching and clean user operation. Confirm USB-C, HDMI, wireless, display count and BYOD/BYOM requirements before quoting.";
  }

  if (profile.key === "audioAmplifier") {
    return "Use where the opportunity includes room audio, amplification, speaker zones or networked audio integration. Confirm speaker type, Low Z / High Z requirements, source type, DSP needs and control method.";
  }

  if (profile.key === "videoWallProcessor" || profile.key === "multiviewProcessor") {
    return "Use where the customer needs multiple sources arranged onto one output, display layout or wall processor input. Confirm source count, wall/display type, layout behaviour and whether fixed presets or flexible routing are required.";
  }

  if (profile.key === "usbUc") {
    return "Use where the discussion includes USB peripherals, camera/audio devices, BYOD/BYOM or conferencing workflows. Confirm host location, USB path, peripheral compatibility and room size.";
  }

  if (profile.key === "hdbasetExtender") {
    return "Use where the customer needs point-to-point AV extension over structured cable. Confirm signal format, distance, cable quality, power method and control requirements.";
  }

  if (profile.key === "cableAccessory") {
    return "Use when the accessory is required to complete a known product workflow. Confirm the paired device, connector type, signal format, length and installation position.";
  }

  return `Use where the customer requirement fits ${profile.family.toLowerCase()} applications. Confirm the practical system dependencies before moving it into a project or room design.`;
}

function buildOpeningLine(product, profile, facts) {
  const sku = normSku(product.sku);
  const io = ioFromSku(product);

  if (profile.key === "matrixHdbaset") {
    const ioText = io ? ` ${io}` : "";
    return `${sku} is a fixed-I/O${ioText} matrix direction for routing a known set of sources to a known set of displays. Lead with source/display count, HDBaseT distance and control needs.`;
  }

  if (profile.key.startsWith("networkHd")) {
    return `${sku} sits in the ${profile.family} AV-over-IP conversation: use it when the customer needs flexible routing rather than a fixed matrix path.`;
  }

  if (profile.key === "audioAmplifier") {
    return `${sku} is an audio amplifier conversation. Start by confirming speaker type, zone count, source type and whether the system needs Low Z, High Z, Dante or local analogue audio.`;
  }

  if (profile.key === "presentationSwitcher") {
    return `${sku} is a presentation-room conversation. Start with how the user connects, how many displays are involved and whether USB or wireless presentation is part of the workflow.`;
  }

  if (profile.key === "videoWallProcessor") {
    return `${sku} is a dedicated video wall processor conversation. Start with wall layout, source count and whether the user needs presets, canvas behaviour or per-display content.`;
  }

  if (profile.key === "multiviewProcessor") {
    return `${sku} is a multiview conversation. Use it when the customer needs multiple sources visible on one output rather than simply switching one source at a time.`;
  }

  if (facts.length > 0) {
    return `${sku} should be discussed around ${facts[0].replace(/\.$/, "").toLowerCase()}. Validate the customer workflow before adding it to a project.`;
  }

  return `${sku} is a ${profile.family} product discussion. Validate the exact customer requirement before turning it into a room or project design.`;
}

function buildQuestions(product, profile) {
  if (profile.key === "matrixHdbaset") {
    return [
      "How many source devices and display destinations are required?",
      "Does each display need an independently routed source, or are any outputs mirrored?",
      "What are the cable distances and are HDBaseT receivers included or required?",
      "Is audio breakout, IR, RS-232 or IP control needed?",
    ];
  }

  if (profile.key.startsWith("networkHd")) {
    return [
      "How many sources and displays need flexible routing?",
      "Is this a new NetworkHD system or an addition to an existing one?",
      "Has the NHD controller and network switch requirement been allowed for?",
      "Is USB, multiview, video wall or low latency required?",
    ];
  }

  if (profile.key === "audioAmplifier") {
    return [
      "What speakers are being driven and how many zones are needed?",
      "Is the speaker system Low Z, High Z / 70V / 100V, or mixed?",
      "Is the audio source local analogue, Dante, AES67 or from an AV switcher?",
      "Does the amplifier need DSP, RS-232, GPIO or network control?",
    ];
  }

  if (profile.key === "presentationSwitcher") {
    return [
      "How does the user connect: HDMI, USB-C, wireless or a mix?",
      "Is the room presentation only, conferencing, or BYOD/BYOM?",
      "How many displays or outputs are required?",
      "Is room control or touch-panel operation expected?",
    ];
  }

  if (profile.key === "videoWallProcessor" || profile.key === "multiviewProcessor") {
    return [
      "How many sources need to be shown?",
      "Is the output an LCD display, LCD wall, projector or LED processor?",
      "Does the customer need full canvas, presets, multiview or per-display content?",
      "Is this better as a dedicated processor or part of a wider routing system?",
    ];
  }

  if (profile.key === "usbUc") {
    return [
      "Is the room BYOD, BYOM, room PC, Teams appliance or mixed use?",
      "Which camera, microphone, speakerphone or USB device needs to connect?",
      "Where is the host laptop or room PC located?",
      "Is USB extension or switching required?",
    ];
  }

  return [
    "What customer problem is this product being used to solve?",
    "What existing source, display, audio, USB or control equipment must it work with?",
    "Is this a standalone product discussion or part of a room/project design?",
    "What must be confirmed before it is quoted?",
  ];
}

function buildProofPoints(product, profile, facts) {
  const proof = [];

  facts.forEach((fact) => {
    proof.push(fact);
  });

  if (profile.key === "matrixHdbaset") {
    const io = ioFromSku(product);
    if (io) {
      proof.push(`${io} SKU structure gives the sales person a quick I/O starting point to verify.`);
    }
    proof.push("Matrix products are strongest where the source and display count is known.");
    proof.push("HDBaseT-style outputs are relevant when displays are away from the rack or source position.");
  }

  if (profile.key.startsWith("networkHd")) {
    proof.push("NetworkHD is strongest where routing flexibility, expansion or distributed endpoints are required.");
    proof.push("Controller and network design must be part of the discussion.");
  }

  if (profile.key === "audioAmplifier") {
    proof.push("Amplifier selection depends on speaker type, zone count and audio source path.");
    proof.push("Low Z and High Z are not interchangeable speaker-system assumptions.");
  }

  if (profile.key === "presentationSwitcher") {
    proof.push("Presentation switchers are strongest where the user experience needs to stay simple.");
    proof.push("USB-C, wireless and conferencing requirements should be confirmed early.");
  }

  if (profile.key === "cableAccessory") {
    proof.push("Accessories should be attached to a confirmed product workflow rather than sold in isolation.");
  }

  return unique(proof)
    .filter((point) => !isNoiseSentence(point))
    .filter((point) => !containsBlockedTechnology(point, profile))
    .slice(0, 6);
}

function repairProduct(product) {
  const profile = deriveProfile(product);
  const beforeFamily = clean(product.family);
  const beforeFit = clean(product.fit);
  const beforeOpening = clean(product.openingLine);
  const beforeProof = Array.isArray(product.proofPoints) ? product.proofPoints.join(" | ") : "";

  const description = cleanDescription(product, profile);
  const facts = detectFacts({ ...product, description }, profile);
  const fit = buildFit({ ...product, description }, profile);
  const openingLine = buildOpeningLine({ ...product, description }, profile, facts);
  const questions = buildQuestions({ ...product, description }, profile);
  const proofPoints = buildProofPoints({ ...product, description }, profile, facts);

  const tags = unique([
    ...(Array.isArray(product.tags) ? product.tags : []),
    profile.family,
    profile.key,
  ]).filter((tag) => !containsBlockedTechnology(tag, profile));

  return {
    product: {
      ...product,
      family: profile.family,
      category: profile.family,
      description,
      fit,
      openingLine,
      questions,
      proofPoints,
      tags,
      technologyProfile: profile.key,
      copyRepairStatus: "technology-family-normalised",
      copyRepairRule: "SKU/product type controls technology family; official webpage copy supplies feature facts only.",
    },
    audit: {
      sku: product.sku,
      technologyProfile: profile.key,
      beforeFamily,
      afterFamily: profile.family,
      familyChanged: beforeFamily !== profile.family,
      removedConflictingFit: beforeFit !== fit,
      removedConflictingOpeningLine: beforeOpening !== openingLine,
      removedConflictingProofText: beforeProof !== proofPoints.join(" | "),
    },
  };
}

const raw = await fs.readFile(jsonPath, "utf8");
const payload = JSON.parse(raw);
const products = Array.isArray(payload) ? payload : Array.isArray(payload.products) ? payload.products : [];

if (products.length === 0) {
  throw new Error("No products found in product-call-card-products.json");
}

const repaired = products.map(repairProduct);
const repairedProducts = repaired.map((item) => item.product);
const audit = repaired.map((item) => item.audit);

const output = Array.isArray(payload)
  ? repairedProducts
  : {
      ...payload,
      generatedAt: new Date().toISOString(),
      copyRepairGeneratedAt: new Date().toISOString(),
      copyRepairRule: "SKU/product type controls technology family; official webpage copy supplies feature facts only.",
      count: repairedProducts.length,
      products: repairedProducts,
    };

await fs.writeFile(jsonPath, JSON.stringify(output, null, 2), "utf8");
await fs.writeFile(
  auditPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      repairedCount: repairedProducts.length,
      changedFamilyCount: audit.filter((item) => item.familyChanged).length,
      changedCopyCount: audit.filter((item) => item.removedConflictingFit || item.removedConflictingOpeningLine || item.removedConflictingProofText).length,
      audit,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`Repaired ${repairedProducts.length} product call-card records.`);
console.log(`Family changes: ${audit.filter((item) => item.familyChanged).length}`);
console.log(`Copy changes: ${audit.filter((item) => item.removedConflictingFit || item.removedConflictingOpeningLine || item.removedConflictingProofText).length}`);
console.log(auditPath);

const examples = repairedProducts
  .filter((product) => /^MX-|^MXV-/.test(normSku(product.sku)))
  .slice(0, 10)
  .map((product) => `${product.sku} => ${product.family}`);

console.log("");
console.log("Matrix check:");
console.log(examples.join("\n"));