import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const PRODUCT_ENRICHMENT_PATH = path.join(projectRoot, "data-sources", "wyrestorm", "enrichment.json");
const SOURCE_OUTPUT_PATH = path.join(projectRoot, "data", "wingman-source-pdf-intelligence.json");

const DEFAULT_DOCUMENTS = [
  {
    id: "product-guide-2026",
    title: "Product Guide 2026",
    filePath: "C:/Users/steve/Downloads/Product Guide 2026.pdf",
    sourceType: "product-reference",
    marketApplications: ["Product reference", "Product selection", "SKU lookup"],
    searchTags: ["2026 product guide", "product reference", "SKU reference", "product family reference"],
    wordingCues: [
      "Use the guide as the product-family anchor before making model-specific claims.",
      "Confirm the exact SKU, role and accessories before quoting.",
    ],
  },
  {
    id: "corporate-solutions-2026",
    title: "Corporate Solutions Brochure",
    filePath: "C:/Users/steve/Downloads/Corporate Solutions Brochure (EN) (1).pdf",
    sourceType: "market-application",
    marketApplications: ["Corporate", "Meeting room", "Boardroom", "Training room", "Lobby", "Executive room"],
    searchTags: ["corporate AV", "meeting room", "training room", "lobby display", "executive room", "hybrid workplace"],
    wordingCues: [
      "Lead with the business room outcome before naming the product.",
      "Frame switching, UC and routing products around simpler meetings, clearer presentations and repeatable rooms.",
    ],
  },
  {
    id: "education-solutions-2026",
    title: "Education Solutions Brochure",
    filePath: "C:/Users/steve/Downloads/Education Solutions Brochure (EN) (1).pdf",
    sourceType: "market-application",
    marketApplications: ["Education", "Classroom", "Lecture hall", "Campus", "Lab", "eSports lab", "Active learning"],
    searchTags: ["education AV", "classroom", "lecture hall", "campus AV", "lab", "active learning", "eSports"],
    wordingCues: [
      "Describe the teaching workflow first: present, share, capture, route and support the room.",
      "Separate simple classroom reliability from larger campus distribution and active-learning flexibility.",
    ],
  },
  {
    id: "hospitality-retail-solutions-2026",
    title: "Hospitality & Retail Solutions Brochure",
    filePath: "C:/Users/steve/Downloads/Hospitality & Retail Solutions Brochure (EN) (1).pdf",
    sourceType: "market-application",
    marketApplications: ["Hospitality", "Retail", "Sports bar", "Casino", "Hotel", "Restaurant", "Museum", "Digital signage"],
    searchTags: ["hospitality AV", "retail AV", "sports bar", "casino", "hotel", "restaurant", "museum", "digital signage"],
    wordingCues: [
      "Position routing and signage around guest experience, staff operation and repeatable presets.",
      "Clarify whether the venue needs independent source routing, a signage rollout or a premium video-wall feature.",
    ],
  },
  {
    id: "unified-communications-2026",
    title: "WyreStorm Unified Communications Brochure",
    filePath: "C:/Users/steve/Downloads/WyreStorm Unified Communications Brochure.pdf",
    sourceType: "product-family-reference",
    marketApplications: ["Unified communications", "BYOD", "BYOM", "Video conferencing", "Huddle room", "Boardroom", "Classroom"],
    searchTags: ["UC", "unified communications", "BYOD", "BYOM", "video conferencing", "wireless conferencing", "USB-C"],
    wordingCues: [
      "Use UC wording around joining meetings easily, sharing content and making room devices available to the user's laptop.",
      "Validate platform policy, USB topology, camera coverage and audio pickup before promising a meeting-room experience.",
    ],
  },
  {
    id: "networkhd-2026",
    title: "NetworkHD Brochure",
    filePath: "C:/Users/steve/Downloads/NetworkHD Brochure (1).pdf",
    sourceType: "product-family-reference",
    marketApplications: ["NetworkHD", "AV over IP", "Distributed AV", "Video wall", "Multiview", "Control room", "Large venue"],
    searchTags: ["NetworkHD", "AVoIP", "AV over IP", "distributed AV", "video wall", "multiview", "control room"],
    wordingCues: [
      "Explain NetworkHD as choosing the right AV-over-IP platform for the application, not one technology for every job.",
      "Validate network design, endpoint family, latency needs, USB/audio requirements and control workflow before quoting.",
    ],
  },
  {
    id: "switcher-receiver-compatibility-2026",
    title: "Switcher Receiver Compatibility Chart",
    filePath: "C:/Users/steve/Downloads/Switcher Receiver Compatibility Chart (1).pdf",
    sourceType: "compatibility-reference",
    marketApplications: ["Receiver compatibility", "HDBaseT receiver selection", "Switcher transmitter pairing"],
    searchTags: ["receiver compatibility", "HDBaseT receiver", "compatible receiver", "transmitter receiver pairing"],
    compatibilityNotes: [
      "Use the compatibility chart before quoting HDBaseT switcher, matrix, transmitter or receiver combinations.",
      "Check distance, power direction, USB pass-through, RS-232 and IR behaviour for the exact pair.",
    ],
    wordingCues: [
      "Compatibility is not just connector shape; confirm power, control, USB and distance features for the pair.",
    ],
  },
];

const CONTEXT_RULES = [
  { label: "Classroom", terms: ["classroom", "teaching", "teacher", "active learning"] },
  { label: "Lecture hall", terms: ["lecture", "auditorium", "lecture hall", "capture"] },
  { label: "Meeting room", terms: ["meeting room", "huddle", "conference room", "collaboration"] },
  { label: "Boardroom", terms: ["boardroom", "executive room"] },
  { label: "Training room", terms: ["training room", "seminar"] },
  { label: "Lobby", terms: ["lobby", "reception"] },
  { label: "Digital signage", terms: ["digital signage", "signage"] },
  { label: "Sports bar", terms: ["sports bar", "bar", "venue"] },
  { label: "Hotel / event space", terms: ["hotel", "ballroom", "event space"] },
  { label: "Retail", terms: ["retail", "store"] },
  { label: "Control room", terms: ["control room", "command", "operations", "monitoring"] },
  { label: "Video wall", terms: ["video wall", "multiview", "multi-view"] },
  { label: "Unified communications", terms: ["unified communications", "video conferencing", "byod", "byom", "teams", "zoom"] },
  { label: "USB workflow", terms: ["usb", "usb-c", "camera", "speakerphone", "microphone"] },
  { label: "AV over IP", terms: ["networkhd", "av over ip", "avoip", "endpoint"] },
  { label: "Compatibility", terms: ["recommended receiver", "option", "compatible", "passthrough", "poh", "poc"] },
];

const SKU_ALIASES = new Map([
  ["APOVX20UCV2", ["APO-VX20-UC"]],
  ["EXP4KUHD1M", ["EXP-4KUHD-1.0"]],
  ["EXP8KUHD0", ["EXP-8KUHD-0.5"]],
  ["EXP8KUHD05M", ["EXP-8KUHD-0.5"]],
  ["EX60USB20", ["EX-60-USB2"]],
  ["MX0808KIT", ["MX-0808-KIT-V2"]],
  ["MXV0808H2A70", ["MXV-0808-H2A-70-V3"]],
  ["NHD500IWTXV2", ["NHD-500-IW-TX"]],
  ["NHD500RXV2", ["NHD-500-RX"]],
  ["NHD500TXV2", ["NHD-500-TX"]],
  ["SW130TXUX", ["SW-130-TX-US", "SW-130-TX-UK"]],
  ["SW120TX3UX", ["SW-120-TX3-US", "SW-120-TX3-UK"]],
  ["MXV0X0XH2A", ["MXV-0808-H2A", "MXV-0808-H2A-70-V3"]],
  ["MXV0X0XH2A70", ["MXV-0808-H2A-70-V3"]],
]);

const NON_PRODUCT_SKU_KEYS = new Set([
  "HDR10",
  "HDCP22",
  "HDCP23",
  "RS232",
  "USB2",
  "USB3",
  "USBC",
  "RJ45",
  "POH",
  "POC",
  "CEC",
]);

const COMPATIBILITY_RULES = [
  compatibility("MX-1616-SCL", ["RX-70-4K"], 2, "Recommended receiver for custom HDBaseT matrix use with 70m 4K A/V plus PoH, IR and RS-232 notes."),
  compatibility("MX-1007-HYB", ["RX3-100"], 2, "Recommended receiver for hybrid matrix / TX-SCL-HDBT path with 100m 4K 18Gbps A/V plus PoH, IR and RS-232 notes."),
  compatibility("TX-SCL-HDBT", ["RX3-100"], 2, "Recommended receiver path with 100m 4K 18Gbps A/V plus PoH, IR and RS-232 notes."),
  compatibility("MXV-0808-H2L", ["RXV-35-4K", "RXV-35-SCL"], 3, "Receiver options for 1U HDBaseT matrix use; confirm scaler and audio de-embed requirement."),
  compatibility("MXV-0808-H2A", ["RXV-35-4K"], 3, "Recommended receiver for MXV H2A matrix path with 35m 4K 18Gbps A/V."),
  compatibility("MXV-0808-H2A-70-V3", ["RXV-70-4K-G2"], 3, "Recommended receiver for H2A-70 matrix path with 70m 4K 18Gbps A/V."),
  compatibility("TX-35-IW", ["RX-35-POH"], 4, "Recommended receiver for 35m in-wall transmitter path; confirm PoH, IR and RS-232 direction."),
  compatibility("TX-35-IW-KVM", ["RX-500"], 4, "Recommended receiver for KVM transmitter path with USB and RS-232 pass-through."),
  compatibility("SW-130-TX-US", ["RX-700", "SW-515-RX", "RX-70-4K", "RX3-100"], 5, "Receiver options for SW-130-TX-Ux; confirm USB pass-through, power direction and 4K distance."),
  compatibility("SW-130-TX-UK", ["RX-700", "SW-515-RX", "RX-70-4K", "RX3-100"], 5, "Receiver options for SW-130-TX-Ux; confirm USB pass-through, power direction and 4K distance."),
  compatibility("SW-120-TX3", ["RX-700", "RX3-100"], 5, "Receiver options for SW-120-TX3; confirm 100m 4K 18Gbps and control pass-through needs."),
  compatibility("SW-120-TX3-US", ["RX-700", "RX3-100"], 5, "Receiver options for SW-120-TX3-Ux; confirm 100m 4K 18Gbps and control pass-through needs."),
  compatibility("SW-120-TX3-UK", ["RX-700", "RX3-100"], 5, "Receiver options for SW-120-TX3-Ux; confirm 100m 4K 18Gbps and control pass-through needs."),
  compatibility("SW-510-TX", ["SW-515-RX", "RX-700"], 6, "Recommended receiver path for presentation switcher use with USB, Ethernet, RS-232 and IR pass-through notes."),
  compatibility("SW-515-RX", ["SW-510-TX", "SW-130-TX-US", "SW-130-TX-UK", "TX-35-IW"], 6, "Compatible transmitter options for SW-515-RX; confirm power, USB and control requirements."),
];

function compatibility(sourceSku, compatibleSkus, sourcePage, note) {
  return {
    sourceDocumentId: "switcher-receiver-compatibility-2026",
    sourcePage,
    sourceSku,
    compatibleSkus,
    note,
  };
}

function parseArgs() {
  return {
    dryRun: process.argv.includes("--dry-run"),
  };
}

function asString(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function clean(value) {
  return asString(value).replace(/\s+/g, " ").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function normaliseSkuKey(value) {
  return clean(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function unique(values) {
  const seen = new Set();
  const output = [];

  for (const value of values.flat().map(clean).filter(Boolean)) {
    const key = lower(value);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }

  return output;
}

function uniqueObjects(values, keySelector) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const key = keySelector(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }

  return output;
}

function textIncludesAny(text, terms) {
  const haystack = lower(text);
  return terms.some((term) => haystack.includes(lower(term)));
}

function inferContexts(text) {
  return CONTEXT_RULES
    .filter((rule) => textIncludesAny(text, rule.terms))
    .map((rule) => rule.label);
}

async function extractPdfDocument(document) {
  const absolutePath = path.resolve(document.filePath);
  const [data, stat] = await Promise.all([
    fs.readFile(absolutePath),
    fs.stat(absolutePath),
  ]);
  const pdf = await getDocument({ data: new Uint8Array(data), disableWorker: true, verbosity: 0 }).promise;
  const pages = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent({ includeMarkedContent: false });
    const text = clean(content.items.map((item) => item.str || "").join(" "));
    pages.push({
      pageNo,
      text,
      skuTextKey: normaliseSkuKey(text),
      contexts: inferContexts(text),
    });
  }

  return {
    ...document,
    fileName: path.basename(absolutePath),
    path: absolutePath,
    lastModified: stat.mtime.toISOString(),
    sizeBytes: stat.size,
    pageCount: pdf.numPages,
    pages,
  };
}

function extractRawSkuKeys(text) {
  const skuPattern = /\b(?:[A-Z]{2,8}|[A-Z]{1,5}\d)(?:-[A-Z0-9]+(?:\.[0-9]+)?[A-Z0-9]*){1,8}(?:\s+v\d+)?\b/g;
  const keys = new Set();

  for (const match of text.matchAll(skuPattern)) {
    const key = normaliseSkuKey(match[0]);
    if (!key || NON_PRODUCT_SKU_KEYS.has(key)) continue;
    keys.add(key);
  }

  for (const [aliasKey] of SKU_ALIASES.entries()) {
    if (normaliseSkuKey(text).includes(aliasKey)) keys.add(aliasKey);
  }

  return keys;
}

function buildMentions(extractedDocuments, records) {
  const recordByKey = new Map(records.map((record) => [normaliseSkuKey(record.sku), record]).filter(([key]) => key));
  const skuKeys = Array.from(recordByKey.keys()).sort((a, b) => b.length - a.length);
  const mentions = new Map();

  function addMention(skuKey, document, page) {
    const record = recordByKey.get(skuKey);
    if (!record) return;

    const sku = clean(record.sku);
    if (!mentions.has(sku)) {
      mentions.set(sku, {
        sku,
        documents: new Map(),
      });
    }

    const productMention = mentions.get(sku);
    if (!productMention.documents.has(document.id)) {
      productMention.documents.set(document.id, {
        documentId: document.id,
        title: document.title,
        sourceType: document.sourceType,
        fileName: document.fileName,
        pages: new Set(),
        contexts: new Set(),
        marketApplications: new Set(document.marketApplications || []),
        searchTags: new Set(document.searchTags || []),
        wordingCues: new Set(document.wordingCues || []),
        compatibilityNotes: new Set(document.compatibilityNotes || []),
      });
    }

    const documentMention = productMention.documents.get(document.id);
    documentMention.pages.add(page.pageNo);
    for (const context of page.contexts) documentMention.contexts.add(context);
  }

  for (const document of extractedDocuments) {
    for (const page of document.pages) {
      for (const skuKey of skuKeys) {
        if (page.skuTextKey.includes(skuKey)) addMention(skuKey, document, page);
      }

      for (const rawKey of extractRawSkuKeys(page.text)) {
        const aliases = SKU_ALIASES.get(rawKey) || [rawKey];
        for (const alias of aliases) addMention(normaliseSkuKey(alias), document, page);
      }
    }
  }

  return Array.from(mentions.values())
    .map((mention) => ({
      sku: mention.sku,
      documents: Array.from(mention.documents.values()).map((documentMention) => ({
        ...documentMention,
        pages: Array.from(documentMention.pages).sort((a, b) => a - b),
        contexts: Array.from(documentMention.contexts).sort(),
        marketApplications: Array.from(documentMention.marketApplications).sort(),
        searchTags: Array.from(documentMention.searchTags).sort(),
        wordingCues: Array.from(documentMention.wordingCues).sort(),
        compatibilityNotes: Array.from(documentMention.compatibilityNotes).sort(),
      })).sort((a, b) => a.documentId.localeCompare(b.documentId)),
    }))
    .sort((a, b) => a.sku.localeCompare(b.sku));
}

function sourceLabelForDocument(documentMention) {
  const pages = documentMention.pages.length ? ` pages ${documentMention.pages.join(", ")}` : "";
  return `${documentMention.title}${pages}`;
}

function mergeSalesLanguage(record, marketApplications, wordingCues, compatibilityNotes) {
  const existing = record.salesLanguage && typeof record.salesLanguage === "object"
    ? record.salesLanguage
    : {};

  return {
    ...existing,
    marketApplications: unique([
      ...(Array.isArray(existing.marketApplications) ? existing.marketApplications : []),
      ...marketApplications,
    ]),
    positioningNotes: unique([
      ...(Array.isArray(existing.positioningNotes) ? existing.positioningNotes : []),
      ...wordingCues,
      ...compatibilityNotes,
    ]),
  };
}

function mergeSourceQuality(record, documentMentions) {
  if (!record.technicalProfile || typeof record.technicalProfile !== "object") {
    return record.technicalProfile;
  }

  const existingSources = Array.isArray(record.technicalProfile.sourceQuality?.sourcePdfs)
    ? record.technicalProfile.sourceQuality.sourcePdfs
    : [];

  const sourcePdfs = uniqueObjects([
    ...existingSources,
    ...documentMentions.map((documentMention) => ({
      documentId: documentMention.documentId,
      title: documentMention.title,
      fileName: documentMention.fileName,
      sourceType: documentMention.sourceType,
      pageReferences: documentMention.pages,
    })),
  ], (source) => `${source.documentId}:${(source.pageReferences || []).join(",")}`);

  return {
    ...record.technicalProfile,
    sourceQuality: {
      ...(record.technicalProfile.sourceQuality || {}),
      sourcePdfs,
    },
  };
}

function compatibilityForSku(sku) {
  const key = normaliseSkuKey(sku);
  return COMPATIBILITY_RULES.flatMap((rule) => {
    const sourceKey = normaliseSkuKey(rule.sourceSku);
    const compatibleKeys = rule.compatibleSkus.map(normaliseSkuKey);

    if (sourceKey === key) {
      return [{
        ...rule,
        role: "source",
      }];
    }

    if (compatibleKeys.includes(key)) {
      return [{
        ...rule,
        role: "compatible-device",
      }];
    }

    return [];
  });
}

function enrichRecords(productDbRaw, mentions) {
  const mentionBySku = new Map(mentions.map((mention) => [normaliseSkuKey(mention.sku), mention]));
  const records = Array.isArray(productDbRaw.records) ? productDbRaw.records : [];
  let changedCount = 0;

  const enrichedRecords = records.map((record) => {
    const mention = mentionBySku.get(normaliseSkuKey(record.sku));
    const compatibilityReferences = compatibilityForSku(record.sku);

    if (!mention && compatibilityReferences.length === 0) return record;

    const documentMentions = mention?.documents || [];
    const marketApplications = unique(documentMentions.flatMap((document) => [
      ...document.marketApplications,
      ...document.contexts,
    ]));
    const searchTags = unique(documentMentions.flatMap((document) => [
      document.title,
      document.sourceType,
      ...document.searchTags,
      ...document.contexts,
    ]));
    const wordingCues = unique(documentMentions.flatMap((document) => document.wordingCues));
    const compatibilityNotes = unique([
      ...documentMentions.flatMap((document) => document.compatibilityNotes),
      ...compatibilityReferences.map((reference) => reference.note),
    ]);
    const compatibilityTags = compatibilityReferences.flatMap((reference) => [
      "Receiver compatibility",
      `Compatibility chart page ${reference.sourcePage}`,
      reference.role === "source"
        ? `Compatible receivers: ${reference.compatibleSkus.join(", ")}`
        : `Compatible with ${reference.sourceSku}`,
    ]);

    changedCount += 1;

    return {
      ...record,
      applications: unique([
        ...(Array.isArray(record.applications) ? record.applications : []),
        ...marketApplications,
      ]),
      tags: unique([
        ...(Array.isArray(record.tags) ? record.tags : []),
        ...searchTags,
        ...marketApplications,
        ...compatibilityTags,
      ]),
      source: unique([
        record.source || "",
        ...documentMentions.map(sourceLabelForDocument),
      ]).join(" | "),
      salesLanguage: mergeSalesLanguage(record, marketApplications, wordingCues, compatibilityNotes),
      technicalProfile: mergeSourceQuality(record, documentMentions),
      brochureEvidence: uniqueObjects([
        ...(Array.isArray(record.brochureEvidence) ? record.brochureEvidence : []),
        ...documentMentions.map((document) => ({
          documentId: document.documentId,
          title: document.title,
          sourceType: document.sourceType,
          fileName: document.fileName,
          pageReferences: document.pages,
          marketApplications: document.marketApplications,
          contexts: document.contexts,
        })),
      ], (evidence) => `${evidence.documentId}:${(evidence.pageReferences || []).join(",")}`),
      compatibilityReferences: uniqueObjects([
        ...(Array.isArray(record.compatibilityReferences) ? record.compatibilityReferences : []),
        ...compatibilityReferences,
      ], (reference) => `${reference.sourceDocumentId}:${reference.sourceSku}:${reference.compatibleSkus.join(",")}:${reference.role || ""}`),
    };
  });

  return {
    changedCount,
    productDb: {
      ...productDbRaw,
      records: enrichedRecords,
    },
  };
}

async function main() {
  const { dryRun } = parseArgs();
  const enrichmentRecords = JSON.parse(await fs.readFile(PRODUCT_ENRICHMENT_PATH, "utf8"));
  const records = Array.isArray(enrichmentRecords) ? enrichmentRecords : [];
  const productDbRaw = { records, meta: {} };
  const extractedDocuments = [];

  for (const document of DEFAULT_DOCUMENTS) {
    extractedDocuments.push(await extractPdfDocument(document));
  }

  const mentions = buildMentions(extractedDocuments, records);
  const { productDb, changedCount } = enrichRecords(productDbRaw, mentions);
  const sourceIntelligence = {
    meta: {
      importedAt: new Date().toISOString(),
      source: "Wingman local source PDF importer",
      documentCount: extractedDocuments.length,
      productMentionCount: mentions.length,
      enrichedProductCount: changedCount,
      compatibilityRuleCount: COMPATIBILITY_RULES.length,
    },
    documents: extractedDocuments.map((document) => ({
      id: document.id,
      title: document.title,
      sourceType: document.sourceType,
      fileName: document.fileName,
      lastModified: document.lastModified,
      sizeBytes: document.sizeBytes,
      pageCount: document.pageCount,
      marketApplications: document.marketApplications,
      searchTags: document.searchTags,
      wordingCues: document.wordingCues,
      compatibilityNotes: document.compatibilityNotes || [],
    })),
    productMentions: mentions,
    compatibilityReferences: COMPATIBILITY_RULES,
  };

  productDb.meta = {
    ...(productDb.meta || {}),
    latestSourcePdfImport: sourceIntelligence.meta,
    sourcePdfDocuments: sourceIntelligence.documents.map((document) => ({
      id: document.id,
      title: document.title,
      fileName: document.fileName,
      sourceType: document.sourceType,
      pageCount: document.pageCount,
    })),
  };

  console.log("[source-pdf-import] Import summary:");
  console.log(JSON.stringify(sourceIntelligence.meta, null, 2));

  if (dryRun) {
    console.log("[source-pdf-import] Dry run only. No files written.");
    return;
  }

  await fs.writeFile(PRODUCT_ENRICHMENT_PATH, `${JSON.stringify(productDb.records, null, 2)}\n`, "utf8");
  await fs.writeFile(SOURCE_OUTPUT_PATH, `${JSON.stringify(sourceIntelligence, null, 2)}\n`, "utf8");
  console.log(`[source-pdf-import] Wrote ${path.relative(projectRoot, PRODUCT_ENRICHMENT_PATH)}`);
  console.log(`[source-pdf-import] Wrote ${path.relative(projectRoot, SOURCE_OUTPUT_PATH)}`);
  console.log("[source-pdf-import] Run npm run data:sources:build to publish the updated source package.");
}

main().catch((error) => {
  console.error("[source-pdf-import] Failed.");
  console.error(error);
  process.exitCode = 1;
});
