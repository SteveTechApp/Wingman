import { useEffect, useMemo, useState } from "react";

import { Link, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { ProductMediaPanel } from "../components/ProductMediaPanel";
import { ProductPositioningStatement } from "../components/ProductPositioningStatement";
import { ProductSalesKnowledgePanel } from "../components/ProductSalesKnowledgePanel";
import {
  saveRecommendationEvidenceToProject,
  useProjectStore,
  type StoredQuoteSafetyStatus,
  type StoredRecommendationEvidence,
  type StoredProductSelection,
} from "../data/projectStore";
import { readLatestDiscoveryBrief } from "../data/workflowHandoff";
import {
  buildRecommendationEvidence,
  productToSelection,
  type RecommendationEvidenceCompare,
  type RecommendationEvidenceProduct,
} from "../lib/recommendationEvidence";
import {
  WINGMAN_APPLICATION_CONTEXTS,
  WINGMAN_AUDIENCES,
  WINGMAN_CALL_MODES,
  type WingmanApplicationContext,
  type WingmanAudience,
  type WingmanCallMode,
} from "../types/productPositioning";

type PitchObjection = {
  objection: string;
  response: string;
};

type PitchProduct = {
  sku: string;
  name: string;
  family: string;
  category: string;
  description: string;
  salientPoint: string;
  customerChallenge: string;
  wyrestormFit: string;
  proofPoint: string;
  validationQuestion: string;
  applicationFit: string[];
  majorFeatures: string[];
  summary?: string;
  features?: string[];
  url?: string;
  sourceText?: string;
  customerQuestions: string[];
  checks: string[];
  objections: PitchObjection[];
  related: string[];
  confidence: string;
  tags: string[];
  raw?: Record<string, unknown>;
};

const fallbackProducts: PitchProduct[] = [
  {
    sku: "MX-1007-HYB",
    name: "Hybrid classroom and meeting-room presentation switcher",
    family: "Presentation",
    category: "Education / Corporate",
    description:
      "A hybrid room hub for local HDMI, USB-C, USB host/hub, HDBaseT 3.0 and NetworkHD 500-series workflows.",
    salientPoint:
      "Use this when the room needs more than a basic switcher and the salesperson needs one clear story for sources, USB, audio and AV transport.",
    customerChallenge:
      "The customer wants a modern teaching or meeting space, but source, display, USB, audio and networked AV requirements are being discussed separately.",
    wyrestormFit:
      "MX-1007-HYB keeps the room outcome clear: connect local sources, manage USB, feed displays and extend into NetworkHD where needed.",
    proofPoint:
      "It is positioned as a hybrid product option where local presentation and networked AV need to work together rather than compete.",
    validationQuestion:
      "Do they need a local room switcher only, or does the room also need to connect into a wider AV-over-IP system?",
    applicationFit: [
      "Higher education teaching rooms",
      "Training spaces",
      "Boardrooms with USB and presentation requirements",
      "Hybrid rooms needing local and networked AV"
    ],
    majorFeatures: [
      "Hybrid local presentation and NetworkHD workflow",
      "USB-C and HDMI source support",
      "USB host and hub functionality",
      "HDBaseT 3.0 extension path",
      "Room-centric presentation switching"
    ],
    customerQuestions: [
      "How many sources are local to the room?",
      "Does USB need to follow the selected source?",
      "Is this room standalone or part of a wider AV-over-IP estate?",
      "Do they need a simple operator experience for lecturers or presenters?"
    ],
    checks: [
      "Confirm display count and resolution requirement",
      "Confirm whether the system needs NetworkHD integration",
      "Confirm USB peripherals and host devices",
      "Confirm audio requirement before selecting companion products"
    ],
    objections: [
      {
        objection: "Is this over-specified?",
        response:
          "Only position it where the brief combines presentation, USB and AV transport. For a simpler local-only room, move the discussion toward the smaller EDU or switcher options."
      },
      {
        objection: "Why not just use a matrix?",
        response:
          "A matrix may be right for simple source-to-display routing. MX-1007-HYB is stronger when USB, room operation and hybrid AV transport need to be considered together."
      }
    ],
    related: ["MX-0804-EDU", "SW-640-TX-W", "NHD-500 Series"],
    confidence:
      "Strong fit when the brief combines local presentation, USB and AV extension.",
    tags: ["hybrid", "usb-c", "hdbaset", "networkhd", "education"]
  },
  {
    sku: "NHD-0401-MV",
    name: "Four-input NetworkHD multiview processor",
    family: "NetworkHD",
    category: "AV-over-IP / Multiview",
    description:
      "A compact multiview product for showing multiple sources on a single output canvas.",
    salientPoint:
      "Use this when the customer needs more than source switching: they need to see several inputs at once on one display or LED processor feed.",
    customerChallenge:
      "The customer wants to monitor, compare or present several video sources at the same time without adding multiple displays.",
    wyrestormFit:
      "NHD-0401-MV gives the salesperson a simple multiview story: four inputs, one output canvas, useful for LFDs, LED processors and monitoring applications.",
    proofPoint:
      "It is a direct answer to single-screen multiview requirements and can also sit inside wider NetworkHD-led conversations.",
    validationQuestion:
      "Do they need to switch between sources, or do they need multiple sources visible at the same time?",
    applicationFit: [
      "Reception displays",
      "Command and monitoring points",
      "Hospitality sports preview displays",
      "LED processor input feeds",
      "Education and training source monitoring"
    ],
    majorFeatures: [
      "Four-input multiview workflow",
      "Single output canvas",
      "Useful with LFD and LED processor systems",
      "Clear add-on sale where normal switching is not enough"
    ],
    customerQuestions: [
      "How many sources need to be visible at the same time?",
      "Does the customer need fixed layouts or operator-controlled layouts?",
      "Is the output feeding a normal display or a processor?",
      "Is this standalone or part of a wider NetworkHD design?"
    ],
    checks: [
      "Confirm source count",
      "Confirm output display or processor resolution",
      "Confirm desired layout behaviour",
      "Confirm whether audio follows any selected source"
    ],
    objections: [
      {
        objection: "Can a normal matrix do this?",
        response:
          "A matrix routes one source to one or more outputs. Multiview is different because it shows multiple sources together on one canvas."
      },
      {
        objection: "Why not use more screens?",
        response:
          "More screens may work, but multiview is cleaner where space, cost, operator simplicity or a single LED processor input is preferred."
      }
    ],
    related: ["NHD-150-RX", "NHD-600-TRX", "SW-0206-VW"],
    confidence:
      "Strong fit for true multiview. Do not confuse this with products that simply have multiple outputs.",
    tags: ["multiview", "video wall", "networkhd", "monitoring", "led"]
  },
  {
    sku: "SW-640-TX-W",
    name: "Wireless presentation switcher for larger meeting spaces",
    family: "Presentation",
    category: "Corporate / Education",
    description:
      "A presentation switcher for rooms needing multiple inputs, wireless presentation and a more complete front-of-room workflow.",
    salientPoint:
      "Use this when the salesperson needs a direct answer for rooms with several sources and wireless presentation expectations.",
    customerChallenge:
      "The customer wants a simple presentation experience, but users are bringing a mix of laptops, USB-C devices and wireless sharing expectations.",
    wyrestormFit:
      "SW-640-TX-W helps position WyreStorm as the room workflow product rather than just an extender or switch.",
    proofPoint:
      "It gives sales teams a clear product option for rooms that have outgrown a basic two or three input device.",
    validationQuestion:
      "How many wired sources and wireless users does the room realistically need to support?",
    applicationFit: [
      "Meeting rooms",
      "Training spaces",
      "Classrooms",
      "Rooms needing wired and wireless presentation"
    ],
    majorFeatures: [
      "Multiple presentation inputs",
      "Wireless presentation support",
      "Room-focused source selection",
      "Useful upgrade path from basic switchers"
    ],
    customerQuestions: [
      "Do users need wired, wireless or both?",
      "Are there more than four regular presentation sources?",
      "Does the room need a simple front-panel or user-friendly workflow?",
      "Does USB need to be considered as part of the room experience?"
    ],
    checks: [
      "Confirm local input count",
      "Confirm wireless presentation requirement",
      "Confirm display and extension requirement",
      "Confirm control expectations"
    ],
    objections: [
      {
        objection: "Can we use a cheaper switch?",
        response:
          "Only if the brief is purely source selection. When wireless presentation and a better user workflow matter, this is a stronger conversation."
      }
    ],
    related: ["SW-620-TX-W", "MX-0804-EDU", "APO-VX20-UC"],
    confidence:
      "Good fit where the opportunity starts with user experience rather than cable extension.",
    tags: ["wireless", "presentation", "meeting room", "usb-c"]
  },
  {
    sku: "NHD-600-TRX",
    name: "10GbE SDVoE NetworkHD transceiver",
    family: "NetworkHD",
    category: "AV-over-IP",
    description:
      "A 10GbE SDVoE transceiver for high-performance AV-over-IP applications.",
    salientPoint:
      "Use this when performance, very low latency and flexible encoder/decoder deployment matter more than entry-level AV-over-IP cost.",
    customerChallenge:
      "The customer needs scalable AV distribution but cannot accept the compromises of a lower-performance transport layer.",
    wyrestormFit:
      "NHD-600-TRX gives the sales discussion a high-performance AVoIP option with transceiver flexibility.",
    proofPoint:
      "It is the correct direction for designs where 10GbE SDVoE performance is required.",
    validationQuestion:
      "Is this a performance-led AV-over-IP project, or would a 1GbE NetworkHD series meet the actual requirement?",
    applicationFit: [
      "High-performance AV-over-IP",
      "Large venues",
      "Command and control",
      "Premium multi-room distribution",
      "Projects where latency and image quality are central"
    ],
    majorFeatures: [
      "10GbE SDVoE workflow",
      "Transceiver design",
      "Flexible encoder or decoder deployment",
      "NetworkHD ecosystem positioning"
    ],
    customerQuestions: [
      "Is 10GbE switching available or planned?",
      "What latency is acceptable?",
      "Is the design fixed or likely to change over time?",
      "Are source and display counts expected to grow?"
    ],
    checks: [
      "Confirm 10GbE network design",
      "Confirm VLAN and switch suitability",
      "Confirm endpoint count",
      "Confirm whether the project needs a controller"
    ],
    objections: [
      {
        objection: "Why not use a cheaper 1GbE AVoIP system?",
        response:
          "A 1GbE system may be right if the performance requirement is lower. NHD-600-TRX is for projects where 10GbE SDVoE performance is part of the requirement."
      }
    ],
    related: ["NHD-CTL-PRO", "NHD-500 Series", "NHD-0401-MV"],
    confidence:
      "Strong fit for performance-led AVoIP. Avoid using it as the default answer for every multi-room system.",
    tags: ["sdvoe", "10gbe", "avoip", "networkhd", "transceiver"]
  }
];

const sectionLabels = [
  "Talk track",
  "Fit",
  "Features",
  "Objections",
  "Proposal support",
  "Checks"
] as const;

type PitchSection = (typeof sectionLabels)[number];

const COMPARE_RECORDS_KEY = "wm_competitor_compare_swot_records_v1";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  if (Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(", ");
  return "";
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(toText).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\n|;|\|/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function firstText(source: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const text = toText(source[key]);
    if (text) return text;
  }

  return fallback;
}

function firstArray(source: Record<string, unknown>, keys: string[], fallback: string[]): string[] {
  for (const key of keys) {
    const values = toArray(source[key]);
    if (values.length > 0) return values;
  }

  return fallback;
}

function safeSourceText(source: Record<string, unknown>) {
  try {
    return JSON.stringify(source).slice(0, 5000);
  } catch {
    return "";
  }
}

function normaliseObjections(value: unknown): PitchObjection[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        const record = asRecord(entry);
        const objection = firstText(record, ["objection", "title", "challenge", "name"], "");
        const response = firstText(record, ["response", "answer", "handling", "text", "body"], "");

        if (objection || response) {
          return {
            objection: objection || "Likely objection",
            response: response || "Add a product-specific response in the product intelligence record."
          };
        }

        const text = toText(entry);
        if (text) {
          return {
            objection: "Likely objection",
            response: text
          };
        }

        return null;
      })
      .filter((item): item is PitchObjection => Boolean(item));
  }

  const text = toText(value);

  if (text) {
    return [
      {
        objection: "Likely objection",
        response: text
      }
    ];
  }

  return [];
}

function extractRawProducts(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;

  const root = asRecord(data);
  const likelyKeys = ["products", "items", "records", "index", "data", "productIntelligence"];

  for (const key of likelyKeys) {
    const candidate = root[key];

    if (Array.isArray(candidate)) return candidate;

    const candidateRecord = asRecord(candidate);
    const candidateValues = Object.values(candidateRecord);

    if (candidateValues.length > 0) return candidateValues;
  }

  const values = Object.values(root).filter((value) => {
    if (!value || typeof value !== "object") return false;
    return !Array.isArray(value);
  });

  return values;
}

function normaliseProduct(entry: unknown, index: number): PitchProduct | null {
  const source = asRecord(entry);

  if (Object.keys(source).length === 0) return null;

  const sku = firstText(
    source,
    ["sku", "SKU", "model", "partNumber", "productSku", "productCode"],
    "PRODUCT-" + String(index + 1)
  );

  const name = firstText(
    source,
    ["name", "title", "productName", "modelName", "shortName"],
    sku
  );

  const family = firstText(
    source,
    ["family", "series", "range", "productFamily", "systemType"],
    "Product"
  );

  const category = firstText(
    source,
    ["category", "vertical", "application", "type", "productType"],
    "Sales support"
  );

  const description = firstText(
    source,
    ["description", "summary", "overview", "shortDescription"],
    "Product-specific description is not yet available in the product intelligence record."
  );

  const salientPoint = firstText(
    source,
    ["salientPoint", "salesHeadline", "headline", "positioning", "salesAngle"],
    description
  );

  const customerChallenge = firstText(
    source,
    ["customerChallenge", "challenge", "problemSolved", "painPoint"],
    "Clarify the customer problem before presenting this product."
  );

  const wyrestormFit = firstText(
    source,
    ["wyrestormFit", "wyreStormFit", "fit", "whyWyrestorm", "whyWyreStorm"],
    "Use the product facts and application fit to explain when this WyreStorm product is genuinely suitable."
  );

  const proofPoint = firstText(
    source,
    ["proofPoint", "evidence", "whyItWorks", "validation"],
    "Add a proof point to the product intelligence record."
  );

  const validationQuestion = firstText(
    source,
    ["validationQuestion", "qualifyingQuestion", "qualificationQuestion", "salesQuestion"],
    "What customer requirement makes this product the right option?"
  );

  const applicationFit = firstArray(
    source,
    ["applicationFit", "applications", "useCases", "verticals", "rooms"],
    ["Use where the customer requirement matches the product's core role."]
  );

  const majorFeatures = firstArray(
    source,
    ["majorFeatures", "keyFeatures", "features", "featureSummary", "capabilities"],
    ["Add key product features to the product intelligence record."]
  );

  const url = firstText(source, ["url", "productUrl", "link", "href"], "");

  const customerQuestions = firstArray(
    source,
    ["customerQuestions", "discoveryQuestions", "questions", "qualificationQuestions"],
    [validationQuestion]
  );

  const checks = firstArray(
    source,
    ["checks", "preProposalChecks", "beforeQuoting", "whatToCheck", "designChecks"],
    ["Confirm source count, display count, signal type, distance, USB, audio, control and network requirements."]
  );

  const objections = normaliseObjections(
    source.objections || source.objectionHandling || source.commonObjections
  );

  const related = firstArray(
    source,
    ["related", "relatedProducts", "alternatives", "companionProducts"],
    []
  );

  const confidence = firstText(
    source,
    ["confidence", "recommendationConfidence", "fitConfidence"],
    "Use discovery answers to confirm whether this is a good fit, partial fit or not suitable."
  );

  const tags = firstArray(
    source,
    ["tags", "keywords", "searchTerms"],
    [sku, name, family, category]
  );

  return {
    sku,
    name,
    family,
    category,
    description,
    salientPoint,
    customerChallenge,
    wyrestormFit,
    proofPoint,
    validationQuestion,
    applicationFit,
    majorFeatures,
    summary: description,
    features: majorFeatures,
    url,
    sourceText: safeSourceText(source),
    customerQuestions,
    checks,
    objections: objections.length > 0 ? objections : [
      {
        objection: "No objection handling added yet",
        response: "Add common objections and responses to the product intelligence record for stronger sales support."
      }
    ],
    related,
    confidence,
    tags,
    raw: source,
  };
}

function normaliseProducts(data: unknown): PitchProduct[] {
  const rawProducts = extractRawProducts(data);
  const products = rawProducts
    .map((entry, index) => normaliseProduct(entry, index))
    .filter((product): product is PitchProduct => Boolean(product));

  if (products.length > 0) return products;

  return fallbackProducts;
}

function includesSearch(product: PitchProduct, term: string): boolean {
  const haystack = [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.description,
    product.salientPoint,
    product.customerChallenge,
    ...product.tags,
    ...product.majorFeatures,
    ...product.applicationFit
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(term);
}

function productSearchUrl(sku: string): string {
  return `https://wyrestorm.com/?s=${encodeURIComponent(sku)}`;
}

function readCompareContext(compareId: string): RecommendationEvidenceCompare | null {
  if (typeof window === "undefined" || !compareId) return null;

  try {
    const raw = window.localStorage.getItem(COMPARE_RECORDS_KEY);
    if (!raw) return null;

    const records = JSON.parse(raw) as Array<Record<string, unknown>>;
    const record = records.find((item) => toText(item.id) === compareId);
    if (!record) return null;

    const competitor = asRecord(record.competitor);
    const shortlist = Array.isArray(record.shortlist) ? record.shortlist : [];
    const top = asRecord(shortlist.find((item) => Object.keys(asRecord(item)).length > 0));

    return {
      id: toText(record.id),
      competitorBrand: toText(record.manufacturer) || toText(competitor.manufacturer),
      competitorSku: toText(record.model) || toText(competitor.sku),
      competitorName: toText(competitor.title),
      wyrestormSku: toText(top.sku),
      wyrestormTitle: toText(top.title),
      matchScore: Number.isFinite(Number(record.matchScore)) ? Number(record.matchScore) : Number(top.confidence),
      confidence: toText(top.confidence),
      summary: toText(competitor.summary),
      warnings: toArray(record.reviewNotes),
      evidence: toArray(competitor.evidence),
      source: "Competitor Compare",
    };
  } catch {
    return null;
  }
}

function productEvidenceContext(product: PitchProduct): RecommendationEvidenceProduct {
  return {
    sku: product.sku,
    title: product.name,
    name: product.name,
    family: product.family,
    category: product.category,
    summary: product.summary || product.description,
    features: product.features || product.majorFeatures,
    tags: product.tags,
    source: "Product Pitch",
    isFallback: !product.sourceText,
  };
}

function quoteSafetyLabel(status: StoredQuoteSafetyStatus) {
  if (status === "quote-ready") return "Quote-ready draft";
  if (status === "validate-before-quote") return "Validate before quote";
  return "Do not quote yet";
}

function evidenceSelection(product: RecommendationEvidenceProduct, evidence: StoredRecommendationEvidence): StoredProductSelection {
  const status =
    evidence.quoteSafetyStatus === "quote-ready"
      ? "recommended"
      : evidence.quoteSafetyStatus === "do-not-quote-yet"
        ? "caution"
        : "alternative";
  const selection = productToSelection(product, "Product Pitch");

  return {
    ...selection,
    status,
    evidence: evidence.evidenceUsed.slice(0, 8),
    cautions: [...evidence.missingInformation, ...evidence.quoteChecks].slice(0, 8),
  };
}

function HelperCard(props: { title: string; value: string; eyebrow?: string }) {
  return (
    <article className="wm-pitch-helper-card">
      {props.eyebrow ? <span>{props.eyebrow}</span> : null}
      <h3>{props.title}</h3>
      <p>{props.value}</p>
    </article>
  );
}

function BulletList(props: { items: string[] }) {
  const items = props.items.filter(Boolean);

  if (items.length === 0) {
    return <p className="wm-pitch-muted">No product-specific content available yet.</p>;
  }

  return (
    <ul className="wm-pitch-bullet-list">
      {items.map((item, index) => (
        <li key={item + "-" + index}>{item}</li>
      ))}
    </ul>
  );
}

function ObjectionList(props: { objections: PitchObjection[] }) {
  return (
    <div className="wm-pitch-objection-list">
      {props.objections.map((item, index) => (
        <article key={item.objection + "-" + index}>
          <h4>{item.objection}</h4>
          <p>{item.response}</p>
        </article>
      ))}
    </div>
  );
}

function EvidenceMiniList(props: { items: string[]; empty: string }) {
  return <BulletList items={props.items.length > 0 ? props.items.slice(0, 4) : [props.empty]} />;
}

export function ProductPitchPage() {
  const [products, setProducts] = useState<PitchProduct[]>(fallbackProducts);
  const [selectedSku, setSelectedSku] = useState(fallbackProducts[0]?.sku || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFamily, setActiveFamily] = useState("All");
  const [activeSection, setActiveSection] = useState<PitchSection>("Talk track");
  const [indexStatus, setIndexStatus] = useState("Starter sales-support data loaded");
  const [saveMessage, setSaveMessage] = useState("");
  const [audience, setAudience] = useState<WingmanAudience>("DEALER");
  const [callMode, setCallMode] = useState<WingmanCallMode>("PROJECT_DISCOVERY");
  const [application, setApplication] = useState<WingmanApplicationContext>("MEETING_ROOM");
  const [searchParams] = useSearchParams();
  const { activeProject } = useProjectStore();

  useEffect(() => {
    let cancelled = false;

    fetch("/product-intelligence-index.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Product intelligence index was not available.");
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (cancelled) return;

        const loadedProducts = normaliseProducts(data);
        setProducts(loadedProducts);
        setIndexStatus("Product intelligence index connected");
      })
      .catch(() => {
        if (cancelled) return;
        setProducts(fallbackProducts);
        setIndexStatus("Using starter data until product index is available");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const skuParam = (searchParams.get("sku") ?? "").trim().toUpperCase();
    const queryParam = (searchParams.get("q") ?? "").trim();
    const familyParam = (searchParams.get("family") ?? "").trim();

    if (skuParam) {
      setSelectedSku(skuParam);
      setSearchTerm(skuParam);
      setSaveMessage("");
      return;
    }

    if (queryParam) {
      setSearchTerm(queryParam);
      setSaveMessage("");
    }

    if (familyParam) {
      setActiveFamily(familyParam);
      setSaveMessage("");
    }
  }, [searchParams]);

  const families = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.family).filter(Boolean))).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const familyMatches = activeFamily === "All" || product.family === activeFamily;
      const searchMatches = !term || includesSearch(product, term);
      return familyMatches && searchMatches;
    });
  }, [activeFamily, products, searchTerm]);

  useEffect(() => {
    if (products.some((product) => product.sku === selectedSku)) return;

    const firstProduct = filteredProducts[0] || products[0];

    if (firstProduct && !searchTerm.trim()) {
      setSelectedSku(firstProduct.sku);
    }
  }, [filteredProducts, products, searchTerm, selectedSku]);

  const selectedProduct = useMemo(() => {
    return (
      products.find((product) => product.sku === selectedSku) ||
      filteredProducts[0] ||
      products[0] ||
      fallbackProducts[0]
    );
  }, [filteredProducts, products, selectedSku]);

  const talkTrack = useMemo(() => {
    return [
      selectedProduct.salientPoint,
      "Check what the room needs to do before treating " + selectedProduct.sku + " as the right product.",
      selectedProduct.validationQuestion
    ];
  }, [selectedProduct]);

  // A clean, customer-facing positioning record for the statement view. Prefer the
  // real product-intelligence record (which carries the rich salesLanguage block);
  // fall back to synthesising one from the normalised pitch fields.
  const positioningProduct = useMemo<Record<string, unknown>>(() => {
    if (selectedProduct.raw && typeof selectedProduct.raw === "object") {
      return selectedProduct.raw;
    }

    return {
      sku: selectedProduct.sku,
      name: selectedProduct.name,
      family: selectedProduct.family,
      category: selectedProduct.category,
      description: selectedProduct.description,
      features: selectedProduct.majorFeatures,
      salesLanguage: {
        headline: selectedProduct.salientPoint,
        plainEnglishSummary: selectedProduct.summary ?? selectedProduct.description,
        realWorldApplication: selectedProduct.applicationFit.join(" • "),
        customerValue: selectedProduct.customerChallenge,
        salespersonCue: selectedProduct.proofPoint,
        talkTrack: selectedProduct.majorFeatures,
      },
    };
  }, [selectedProduct]);

  const selectedEvidenceProduct = useMemo(
    () => productEvidenceContext(selectedProduct),
    [selectedProduct],
  );

  const compareContext = useMemo(
    () => readCompareContext((searchParams.get("compare") ?? "").trim()),
    [searchParams],
  );

  const discoveryBrief = useMemo(
    () => activeProject?.discoveryBrief ?? readLatestDiscoveryBrief(),
    [activeProject],
  );

  const recommendationEvidence = useMemo(() => {
    return buildRecommendationEvidence({
      source: compareContext ? "Competitor Compare" : searchParams.get("source") === "finder" ? "Product Finder" : "Product Pitch",
      project: activeProject,
      discoveryBrief,
      product: selectedEvidenceProduct,
      compare: compareContext,
      query: searchTerm,
    });
  }, [activeProject, compareContext, discoveryBrief, searchParams, searchTerm, selectedEvidenceProduct]);

  function selectProduct(sku: string): void {
    setSelectedSku(sku);
    setActiveSection("Talk track");
    setSaveMessage("");
  }

  function savePitchEvidence(): void {
    const project = saveRecommendationEvidenceToProject(
      recommendationEvidence,
      evidenceSelection(selectedEvidenceProduct, recommendationEvidence),
    );
    setSaveMessage(`Saved pitch evidence to ${project.name}.`);
  }

  function renderPitchSection() {
    if (activeSection === "Talk track") {
      return (
        <div className="wm-pitch-section-content">
          <div className="wm-pitch-two-column">
            <article>
              <h3>Use this in the conversation</h3>
              <BulletList items={talkTrack} />
            </article>
            <article>
              <h3>Discovery prompts</h3>
              <BulletList items={selectedProduct.customerQuestions} />
            </article>
          </div>
        </div>
      );
    }

    if (activeSection === "Fit") {
      return (
        <div className="wm-pitch-section-content">
          <div className="wm-pitch-two-column">
            <article>
              <h3>Application fit</h3>
              <BulletList items={selectedProduct.applicationFit} />
            </article>
            <article>
              <h3>Recommendation confidence</h3>
              <p>{selectedProduct.confidence}</p>
            </article>
          </div>
        </div>
      );
    }

    if (activeSection === "Features") {
      return (
        <div className="wm-pitch-section-content">
          <div className="wm-pitch-two-column">
            <article>
              <h3>Key product facts</h3>
              <BulletList items={selectedProduct.majorFeatures} />
            </article>
            <article>
              <h3>Related products</h3>
              <BulletList items={selectedProduct.related.length > 0 ? selectedProduct.related : ["No related products added yet."]} />
            </article>
          </div>
          <ProductSalesKnowledgePanel product={selectedProduct} mode="pitch" />
        </div>
      );
    }

    if (activeSection === "Objections") {
      return (
        <div className="wm-pitch-section-content">
          <ObjectionList objections={selectedProduct.objections} />
        </div>
      );
    }

    if (activeSection === "Proposal support") {
      return (
        <div className="wm-pitch-section-content">
          <div className="wm-pitch-two-column">
            <article>
              <h3>Customer-facing wording</h3>
              <p>
                {selectedProduct.sku} is a suitable product option where the customer requirement is: {selectedProduct.customerChallenge}
              </p>
              <p>
                The product fit is strongest when: {selectedProduct.wyrestormFit}
              </p>
            </article>
            <article>
              <h3>Suggested next action</h3>
              <p>{selectedProduct.validationQuestion}</p>
              <p className="wm-pitch-muted">
                Capture the answer before moving this into a proposal support pack.
              </p>
            </article>
            <article>
              <h3>Customer-safe wording</h3>
              <EvidenceMiniList
                items={recommendationEvidence.customerSafeWording}
                empty="Confirm the requirement before presenting customer wording."
              />
            </article>
            <article>
              <h3>Project evidence</h3>
              <EvidenceMiniList
                items={recommendationEvidence.evidenceUsed}
                empty="No structured evidence has been captured yet."
              />
            </article>
          </div>
        </div>
      );
    }

    return (
      <div className="wm-pitch-section-content">
        <div className="wm-pitch-two-column">
          <article>
            <h3>What to check before quoting</h3>
            <BulletList items={selectedProduct.checks} />
          </article>
          <article>
            <h3>Do not assume</h3>
            <BulletList
              items={[
                "Confirm the actual source and display count.",
                "Confirm whether USB, audio, control, network or power requirements change the product choice.",
                "Confirm whether the opportunity is standalone, matrix-led or AV-over-IP-led."
              ]}
            />
          </article>
          <article>
            <h3>Quote safety</h3>
            <p>{recommendationEvidence.quoteSafetyMessage}</p>
            <EvidenceMiniList
              items={recommendationEvidence.missingInformation}
              empty="No major missing information is currently flagged."
            />
          </article>
          <article>
            <h3>Required dependencies</h3>
            <EvidenceMiniList
              items={recommendationEvidence.requiredDependencies}
              empty="No governed required dependency is selected yet."
            />
          </article>
        </div>
      </div>
    );
  }

  return (
    <main className="wm-product-pitch-page" data-wingman-product-pitch-sales-desk="true">
      <header className="wm-pitch-header">
        <div>
          <span className="wm-pitch-eyebrow">Product Pitch</span>
          <h1>Product sales support desk</h1>
          <p>
            Select a product, choose who you are speaking to, then shape the wording around the room or use case.
          </p>
          <nav className="wm-pitch-header-actions" aria-label="Related pitch tools">
            <Link to={routeCatalogByKey.productFamilies.path}>Product Families</Link>
            <Link to={routeCatalogByKey.finder.path}>Product Finder</Link>
          </nav>
        </div>

        <div className="wm-pitch-header-status">
          <strong>{products.length}</strong>
          <span>products available</span>
          <small>{indexStatus}</small>
        </div>
      </header>

      <section className="wm-pitch-workbench">
        <aside className="wm-pitch-product-picker" aria-label="Product selector">
          <div className="wm-pitch-panel-heading">
            <span>1</span>
            <div>
              <h2>Select product</h2>
              <p>Search by SKU, range, use case or feature.</p>
            </div>
          </div>

          <input
            className="wm-pitch-search"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setSaveMessage("");
            }}
            placeholder="Search product, feature or use case"
            type="search"
          />

          <div className="wm-pitch-family-chips">
            <button
              className={activeFamily === "All" ? "is-active" : ""}
              type="button"
              onClick={() => {
                setActiveFamily("All");
                setSaveMessage("");
              }}
            >
              All
            </button>
            {families.map((family) => (
              <button
                className={activeFamily === family ? "is-active" : ""}
                key={family}
                type="button"
                onClick={() => {
                  setActiveFamily(family);
                  setSaveMessage("");
                }}
              >
                {family}
              </button>
            ))}
          </div>

          <div className="wm-pitch-product-list">
            {filteredProducts.slice(0, 24).map((product) => (
              <button
                className={selectedProduct.sku === product.sku ? "is-selected" : ""}
                key={product.sku}
                type="button"
                onClick={() => selectProduct(product.sku)}
              >
                <strong>{product.sku}</strong>
                <span>{product.name}</span>
                <small>{product.category}</small>
              </button>
            ))}

            {filteredProducts.length === 0 ? (
              <p className="wm-pitch-muted">No matching product found. Clear the search or choose another range.</p>
            ) : null}
          </div>
        </aside>

        <section className="wm-pitch-centre" aria-label="Product sales content">
          <article className="wm-pitch-product-hero">
            <div>
              <span className="wm-pitch-eyebrow">{selectedProduct.family}</span>
              <h2>{selectedProduct.sku}</h2>
              <h3>{selectedProduct.name}</h3>
              <p>{selectedProduct.description}</p>
            </div>

            <div className="wm-pitch-category-card">
              <span>Best used for</span>
              <strong>{selectedProduct.category}</strong>
              <small>{quoteSafetyLabel(recommendationEvidence.quoteSafetyStatus)}</small>
            </div>
          </article>

          <ProductMediaPanel sku={selectedProduct.sku} title={selectedProduct.name} compact />

          <div className="wm-pitch-context-controls" aria-label="Positioning context">
            <label>
              <span>Customer type</span>
              <select value={audience} onChange={(event) => setAudience(event.target.value as WingmanAudience)}>
                {WINGMAN_AUDIENCES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Application</span>
              <select value={application} onChange={(event) => setApplication(event.target.value as WingmanApplicationContext)}>
                {WINGMAN_APPLICATION_CONTEXTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Call mode</span>
              <select value={callMode} onChange={(event) => setCallMode(event.target.value as WingmanCallMode)}>
                {WINGMAN_CALL_MODES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ProductPositioningStatement
            product={positioningProduct}
            showHeader={false}
            audience={audience}
            callMode={callMode}
            application={application}
          />

          <div className="wm-pitch-evidence-strip">
            <div>
              <span>Project evidence</span>
              <strong>{quoteSafetyLabel(recommendationEvidence.quoteSafetyStatus)}</strong>
              <p>{recommendationEvidence.quoteSafetyMessage}</p>
            </div>
            <button type="button" className="wm-pitch-save-button" onClick={savePitchEvidence}>
              Save pitch to project
            </button>
            {saveMessage ? <small>{saveMessage}</small> : null}
          </div>

        </section>

        <aside className="wm-pitch-assist-rail" aria-label="Sales helper cards">
          <div className="wm-pitch-panel-heading">
            <span>2</span>
            <div>
              <h2>Helper cards</h2>
              <p>Keep these visible during the call.</p>
            </div>
          </div>

          <article>
            <h3>Ask now</h3>
            <p>{selectedProduct.validationQuestion}</p>
          </article>

          <article>
            <h3>Source links</h3>
            <p>Open the source page or search WyreStorm before turning this into a final quote.</p>
            <div className="wm-pitch-link-stack">
              {selectedProduct.url ? (
                <a href={selectedProduct.url} target="_blank" rel="noreferrer">Product page</a>
              ) : null}
              <a href={productSearchUrl(selectedProduct.sku)} target="_blank" rel="noreferrer">WyreStorm search</a>
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}

export default ProductPitchPage;
