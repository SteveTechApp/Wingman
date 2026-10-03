import fs from "node:fs/promises";

const root = process.cwd();
const inputPath = `${root}/public/product-call-card-products.json`;
const outputPath = inputPath;
const auditPath = `${root}/public/product-call-card-products.official-audit.json`;

const FACT_PATTERNS = [
  {
    key: "usb-c",
    regex: /\bUSB-C\b/i,
    point: "USB-C connectivity for current laptop and collaboration workflows.",
    question: "Does the user need USB-C for video, USB data, laptop charging or all three?"
  },
  {
    key: "100w-pd",
    regex: /\b100\s?W\b|\b100W PD\b|Power Delivery/i,
    point: "Power Delivery support helps simplify laptop connection at the table or lectern.",
    question: "Does the laptop need charging from the room connection?"
  },
  {
    key: "mst",
    regex: /\bMST\b|Multi[- ]?Stream Transport/i,
    point: "MST support enables more flexible multi-display presentation workflows.",
    question: "Is the room expected to support one display, dual displays or extended desktop use?"
  },
  {
    key: "wireless",
    regex: /wireless|AirPlay|Miracast|casting|APO-DG2/i,
    point: "Wireless presentation support reduces cable dependency for guest and casual sharing.",
    question: "Is wireless sharing required for guests, managed users or both?"
  },
  {
    key: "usb3",
    regex: /USB 3\.0|USB3/i,
    point: "USB 3.0 support is useful where conferencing peripherals need higher USB performance.",
    question: "Which USB camera, microphone, speakerphone or peripheral needs to follow the source?"
  },
  {
    key: "dante",
    regex: /\bDante\b/i,
    point: "Dante support is valuable where audio needs to integrate with a wider networked audio system.",
    question: "Is Dante required by the audio design, DSP, amplifier or wider building standard?"
  },
  {
    key: "aes67",
    regex: /\bAES67\b/i,
    point: "AES67 support helps with standards-based network audio interoperability.",
    question: "Does the project need Dante only, AES67 interoperability or both?"
  },
  {
    key: "h265",
    regex: /H\.?265|HEVC/i,
    point: "H.265 compression helps keep AV-over-IP bandwidth efficient.",
    question: "Is the network designed for low-bandwidth AV-over-IP distribution?"
  },
  {
    key: "h264",
    regex: /H\.?264/i,
    point: "H.264 support helps with widely compatible low-bandwidth AV-over-IP workflows.",
    question: "Is compatibility with existing H.264/H.265 NetworkHD endpoints required?"
  },
  {
    key: "jpeg2000",
    regex: /JPEG\s?2000|JPEG2000/i,
    point: "JPEG 2000 support points to higher-quality AV-over-IP image transport.",
    question: "Is the project prioritising image quality, latency, bandwidth or cost?"
  },
  {
    key: "4k60",
    regex: /4K60|4K\s?60/i,
    point: "4K60 support is important where modern high-resolution sources and displays are expected.",
    question: "Is the customer expecting 4K60 throughout the signal chain?"
  },
  {
    key: "4k30",
    regex: /4K30|4K\s?30/i,
    point: "4K30 support is suitable for many presentation and distribution applications.",
    question: "Is 4K30 sufficient, or does the application need 4K60?"
  },
  {
    key: "444",
    regex: /4:4:4/i,
    point: "4:4:4 colour support is valuable for detailed PC graphics and text clarity.",
    question: "Will the room show detailed PC content, spreadsheets, CAD or fine text?"
  },
  {
    key: "hdr",
    regex: /\bHDR\b|Dolby Vision/i,
    point: "HDR capability matters where the display chain needs high-quality video playback.",
    question: "Is HDR required, or is standard presentation content the priority?"
  },
  {
    key: "hdbaset",
    regex: /HDBaseT|HDBT/i,
    point: "HDBaseT transport is useful for reliable point-to-point extension over structured cable.",
    question: "What are the cable distances between rack, source position and display?"
  },
  {
    key: "multiview",
    regex: /multiview|multi-view/i,
    point: "Multiview support allows multiple sources to be shown on a single output canvas.",
    question: "Does the user need one source per display, or several sources visible on one screen?"
  },
  {
    key: "video-wall",
    regex: /video wall|videowall/i,
    point: "Video wall support is relevant where the requirement is a wall layout, not just a single display.",
    question: "Is the wall expected to show one canvas, fixed presets, per-display content or mixed layouts?"
  },
  {
    key: "poe",
    regex: /\bPoE\b|\bPOE\b|Power over Ethernet/i,
    point: "PoE support can reduce local power requirements at endpoints.",
    question: "Will endpoints be powered locally or through the network infrastructure?"
  },
  {
    key: "poh",
    regex: /\bPoH\b|\bPOH\b|Power over HDBaseT/i,
    point: "PoH can simplify endpoint power in HDBaseT-style systems.",
    question: "Is one-way or two-way power required over the cable run?"
  },
  {
    key: "arc",
    regex: /\bARC\b|\beARC\b/i,
    point: "ARC/eARC support matters when display audio needs to return into the system.",
    question: "Does display audio need to return to an amplifier, DSP or central audio system?"
  },
  {
    key: "rs232",
    regex: /RS-?232/i,
    point: "RS-232 support is useful for device control in integrated AV systems.",
    question: "Is device control required over RS-232, IP, IR or a control panel?"
  },
  {
    key: "ir",
    regex: /\bIR\b|infrared/i,
    point: "IR support can be useful for simple source or display control.",
    question: "Is simple IR control required, or is the room moving to IP/RS-232 control?"
  },
  {
    key: "audio-breakout",
    regex: /audio breakout|audio de-embed|audio deembed|de-embed/i,
    point: "Audio breakout/de-embedding is useful when audio needs to feed an amplifier, DSP or local sound system.",
    question: "Where does the audio need to go: display speakers, amplifier, DSP or network audio?"
  }
];

function clean(value) {
  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-")
    .replace(/&trade;/gi, "™")
    .replace(/&reg;/gi, "®")
    .replace(/&copy;/gi, "©");
}

function stripHtml(html) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, ". ")
      .replace(/\s+/g, " ")
  ).trim();
}

function extractMeta(html) {
  const patterns = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["'][^>]*>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return clean(decodeHtml(match[1]));
    }
  }

  return "";
}

function extractTitle(html) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  return clean(decodeHtml(title.replace(/\|.*$/g, "")));
}

function extractHeadings(html) {
  const headings = [];
  const pattern = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let match = pattern.exec(html);

  while (match) {
    const heading = clean(stripHtml(match[1]));

    if (heading && heading.length < 90) {
      headings.push(heading);
    }

    match = pattern.exec(html);
  }

  return unique(headings).slice(0, 8);
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

function short(value, max = 235) {
  const text = clean(value);

  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}.`;
}

function sentences(text) {
  return clean(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => clean(sentence))
    .filter((sentence) => sentence.length > 35 && sentence.length < 320);
}

function likelyDescription(seed, htmlText, meta) {
  if (meta && meta.length > 45) {
    return short(meta, 245);
  }

  const sku = clean(seed.sku);
  const found = sentences(htmlText).find((sentence) => sentence.toUpperCase().includes(sku.toUpperCase()));

  if (found) {
    return short(found, 245);
  }

  const firstUseful = sentences(htmlText).find((sentence) => {
    const lower = sentence.toLowerCase();
    return !lower.includes("login") && !lower.includes("cookie") && !lower.includes("download");
  });

  if (firstUseful) {
    return short(firstUseful, 245);
  }

  return short(seed.description || `${sku} WyreStorm product.`, 245);
}

function detectedFacts(text) {
  return FACT_PATTERNS.filter((fact) => fact.regex.test(text));
}

function classify(seed, text) {
  const source = `${seed.sku} ${seed.name || ""} ${seed.family || ""} ${seed.category || ""} ${seed.description || ""} ${text}`.toLowerCase();

  if (source.includes("nhd-600") || source.includes("networkhd 600") || source.includes("10g")) {
    return "NetworkHD 600";
  }

  if (source.includes("nhd-500") || source.includes("networkhd 500")) {
    return "NetworkHD 500";
  }

  if (source.includes("nhd-1") || source.includes("networkhd 100") || source.includes("networkhd 120")) {
    return "NetworkHD 100";
  }

  if (source.includes("networkhd") || source.includes("av-over-ip") || source.includes("avoip")) {
    return "NetworkHD";
  }

  if (source.includes("video wall") || source.includes("videowall") || source.includes("-vw")) {
    return "Video wall";
  }

  if (source.includes("multiview") || source.includes("multi-view") || source.includes("-mv")) {
    return "Multiview";
  }

  if (source.includes("dante") || source.includes("amplifier") || source.includes("audio")) {
    return "Audio / Control";
  }

  if (source.includes("usb") || source.includes("uc") || source.includes("byod") || source.includes("conference")) {
    return "USB / UC";
  }

  if (source.includes("hdbaset") || source.includes("hdbt") || source.includes("extender")) {
    return "HDBaseT";
  }

  if (source.includes("matrix") || source.startsWith("mx-")) {
    return "Matrix";
  }

  if (source.includes("presentation") || source.includes("switcher") || source.startsWith("sw-")) {
    return "Presentation";
  }

  if (source.includes("camera") || source.includes("ptz") || source.includes("ndi")) {
    return "Cameras";
  }

  if (source.includes("touch") || source.includes("control")) {
    return "Control";
  }

  if (source.includes("cable")) {
    return "Cable";
  }

  return seed.family || seed.category || "WyreStorm product";
}

function buildFit(product, facts) {
  const family = clean(product.family).toLowerCase();

  if (family.includes("networkhd")) {
    return "Use where the requirement is flexible AV-over-IP distribution rather than a fixed point-to-point link. Confirm source count, display count, controller requirement, switch design, bandwidth, USB and multiview needs before positioning it.";
  }

  if (family.includes("presentation")) {
    return "Use where the room needs a simple presentation-first workflow with local source connection, guest sharing and clean user operation. Confirm USB-C, wireless, display count and BYOD/BYOM requirements before quoting.";
  }

  if (family.includes("audio")) {
    return "Use where the opportunity includes room audio, amplification, control or networked audio integration. Confirm speaker zones, audio source type, DSP requirements, Dante/AES67 needs and control method.";
  }

  if (family.includes("video wall") || family.includes("multiview")) {
    return "Use where the customer needs several sources arranged on one display, LED processor or wall output. Confirm wall type, layout behaviour, source count and whether fixed presets or flexible routing are required.";
  }

  if (family.includes("matrix") || family.includes("hdbaset")) {
    return "Use where the project has a defined number of sources and displays and a centralised routing requirement. Confirm I/O count, cable distances, display locations, audio breakout and control before quoting.";
  }

  if (family.includes("usb") || family.includes("uc")) {
    return "Use where the room discussion includes USB peripherals, BYOD/BYOM, camera/audio devices or conferencing workflows. Confirm host location, USB path, peripheral compatibility and room size.";
  }

  const featurePhrase = facts.length > 0 ? facts.slice(0, 2).map((fact) => fact.key).join(", ") : "the stated product requirement";
  return `Use where the customer requirement lines up with ${featurePhrase}. Confirm the practical system dependencies before making this the recommended product.`;
}

function buildOpeningLine(product, facts) {
  const sku = product.sku;
  const family = product.family;

  if (facts.length >= 2) {
    const factText = facts.slice(0, 2).map((fact) => fact.point.replace(/\.$/, "")).join(" and ");
    return `${sku} is the ${family} option to discuss when the customer needs ${factText.toLowerCase()}.`;
  }

  if (facts.length === 1) {
    return `${sku} is the ${family} option to discuss when ${facts[0].point.toLowerCase()}`;
  }

  return `${sku} is a ${family} product direction. Use the official product facts to validate whether it fits the customer requirement before moving it into a room or project design.`;
}

function buildQuestions(product, facts) {
  const questions = facts.map((fact) => fact.question);

  if (product.family.toLowerCase().includes("networkhd")) {
    questions.push("Is this a new NetworkHD design or an addition to an existing NetworkHD system?");
    questions.push("Has the NHD controller and network switch requirement been allowed for?");
  }

  if (product.family.toLowerCase().includes("presentation")) {
    questions.push("How many people will use the room and how technical are they?");
    questions.push("Is the expected workflow wired presentation, wireless presentation, conferencing or a mix?");
  }

  if (product.family.toLowerCase().includes("audio")) {
    questions.push("What speakers, zones and audio source types are being used?");
    questions.push("Is the audio standalone, local line-level, Dante, AES67 or part of a DSP design?");
  }

  if (product.family.toLowerCase().includes("cable")) {
    questions.push("What device is this accessory or cable being paired with?");
    questions.push("Is the cable length, connector type and signal format confirmed?");
  }

  questions.push("What is the customer trying to achieve with this product rather than with the wider room?");
  return unique(questions).slice(0, 4);
}

function buildProofPoints(seed, url, facts, headings) {
  const proof = [];

  for (const fact of facts.slice(0, 5)) {
    proof.push(fact.point);
  }

  for (const heading of headings) {
    if (proof.length >= 6) {
      break;
    }

    if (/features|image|download|login|quick view/i.test(heading)) {
      continue;
    }

    proof.push(`Official page highlights: ${heading}.`);
  }

  if (url) {
    proof.push("Source checked against the WyreStorm product page.");
  }

  if (proof.length === 0) {
    proof.push("Use this as a product discussion card, then confirm the full customer requirement before quoting.");
  }

  return unique(proof).slice(0, 6);
}

function slugForSku(sku) {
  return clean(sku).toLowerCase();
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "WingmanProductCopyEnrichment/1.0"
      }
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    if (!html || html.length < 500) {
      return null;
    }

    return html;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOfficialPage(seed) {
  const slug = slugForSku(seed.sku);
  const urls = [
    `https://www.wyrestorm.com/product/${slug}/`,
    `https://www.wyrestorm.com/global/product/${slug}/`
  ];

  for (const url of urls) {
    const html = await fetchWithTimeout(url);

    if (!html) {
      continue;
    }

    const text = stripHtml(html);
    const textUpper = text.toUpperCase();

    if (!textUpper.includes(clean(seed.sku).toUpperCase()) && !textUpper.includes("WYRESTORM")) {
      continue;
    }

    return {
      url,
      html,
      text
    };
  }

  return null;
}

function normaliseProductsPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.products)) {
    return payload.products;
  }

  return [];
}

async function enrichProduct(seed) {
  const source = await fetchOfficialPage(seed);

  if (!source) {
    const family = classify(seed, "");
    const fallback = {
      ...seed,
      family,
      category: seed.category || family,
      description: seed.description || `${seed.sku} WyreStorm product.`,
      fit: buildFit({ ...seed, family }, []),
      openingLine: buildOpeningLine({ ...seed, family }, []),
      questions: buildQuestions({ ...seed, family }, []),
      proofPoints: buildProofPoints(seed, "", [], []),
      tags: unique([...(seed.tags || []), family]),
      officialUrl: "",
      officialCopyStatus: "not-found"
    };

    return fallback;
  }

  const meta = extractMeta(source.html);
  const title = extractTitle(source.html);
  const headings = extractHeadings(source.html);
  const facts = detectedFacts(`${source.text} ${meta} ${title} ${headings.join(" ")}`);
  const family = classify(seed, `${source.text} ${meta} ${title} ${headings.join(" ")}`);
  const description = likelyDescription(seed, source.text, meta);

  return {
    ...seed,
    name: seed.name || title || seed.sku,
    family,
    category: seed.category || family,
    description,
    fit: buildFit({ ...seed, family }, facts),
    openingLine: buildOpeningLine({ ...seed, family }, facts),
    questions: buildQuestions({ ...seed, family }, facts),
    proofPoints: buildProofPoints(seed, source.url, facts, headings),
    tags: unique([
      ...(seed.tags || []),
      family,
      ...facts.map((fact) => fact.key),
      ...headings.slice(0, 5)
    ]),
    officialUrl: source.url,
    officialCopyStatus: "enriched"
  };
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let index = 0;

  async function runner() {
    while (index < items.length) {
      const current = index;
      index += 1;
      output[current] = await worker(items[current], current);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, () => runner());
  await Promise.all(runners);
  return output;
}

const raw = await fs.readFile(inputPath, "utf8");
const payload = JSON.parse(raw);
const products = normaliseProductsPayload(payload);

if (products.length === 0) {
  throw new Error("No products found in product-call-card-products.json");
}

console.log(`Enriching ${products.length} products from official WyreStorm product pages...`);

const enriched = await mapLimit(products, 4, async (product, index) => {
  const result = await enrichProduct(product);
  const status = result.officialCopyStatus === "enriched" ? "ENRICHED" : "FALLBACK";
  console.log(`[${index + 1}/${products.length}] ${status} ${result.sku}`);
  return result;
});

const enrichedCount = enriched.filter((product) => product.officialCopyStatus === "enriched").length;
const notFoundCount = enriched.length - enrichedCount;

const output = {
  ...(Array.isArray(payload) ? {} : payload),
  generatedAt: new Date().toISOString(),
  source: "product-call-card-products.json + official WyreStorm product pages",
  count: enriched.length,
  enrichedCount,
  notFoundCount,
  products: enriched
};

await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");

await fs.writeFile(
  auditPath,
  JSON.stringify(
    {
      generatedAt: output.generatedAt,
      count: enriched.length,
      enrichedCount,
      notFoundCount,
      enriched: enriched
        .filter((product) => product.officialCopyStatus === "enriched")
        .map((product) => ({
          sku: product.sku,
          officialUrl: product.officialUrl,
          family: product.family,
          proofPoints: product.proofPoints
        })),
      notFound: enriched
        .filter((product) => product.officialCopyStatus !== "enriched")
        .map((product) => product.sku)
    },
    null,
    2
  ),
  "utf8"
);

console.log("");
console.log(`Done. Enriched: ${enrichedCount}. Fallback: ${notFoundCount}.`);
console.log(outputPath);
console.log(auditPath);