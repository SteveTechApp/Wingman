import { useEffect, useMemo, useState } from "react";
import { ExternalLink, HelpCircle, Search, Sparkles } from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

type ProductIndex = {
  products?: ProductRecord[];
};

type ProductVoiceId = "endUser" | "systemIntegrator" | "consultant";

type ProductSalesVoice = {
  label?: string;
  audience?: string;
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
  marketApplications?: string[];
  voices?: Partial<Record<ProductVoiceId, ProductSalesVoice>>;
};

type ProductRecord = {
  id?: string;
  sku?: string;
  name?: string;
  title?: string;
  description?: string;
  summary?: string;
  category?: string;
  family?: string;
  routingClass?: string;
  technologies?: string[];
  connectors?: string[];
  features?: string[];
  applications?: string[];
  tags?: string[];
  searchTerms?: string[];
  salesLanguage?: ProductSalesLanguage;
  technicalProfile?: {
    salesLanguage?: ProductSalesLanguage;
  };
  raw?: Record<string, unknown>;
};

type SimplePitch = {
  headline: string;
  customerPitch: string;
  helpsWith: string[];
  bestFit: string;
  askBeforeQuoting: string[];
  termExplanations: string[];
  architectureChecks?: string[];
};

const indexUrl = "/product-intelligence-index.json";

const voiceOptions: { id: ProductVoiceId; label: string; shortLabel: string }[] = [
  { id: "endUser", label: "End user", shortLabel: "Customer" },
  { id: "systemIntegrator", label: "SI / installer", shortLabel: "Installer" },
  { id: "consultant", label: "Consultant / technical", shortLabel: "Consultant" },
];

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&#x2122;|&#8482;|&trade;/gi, "TM")
    .replace(/&#x00ae;|&#174;|&reg;/gi, "R")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function asList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(cleanText).filter(Boolean);
}

function collectTextValues(value: unknown, output: string[] = [], depth = 0) {
  if (depth > 5 || value == null) return output;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = cleanText(value);
    if (text) output.push(text);
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectTextValues(item, output, depth + 1));
    return output;
  }

  if (typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => collectTextValues(item, output, depth + 1));
  }

  return output;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}

function compactTexts(values: unknown[]) {
  return unique(values.map(cleanText));
}

function salesLanguageForProduct(product?: ProductRecord) {
  if (!product) return undefined;

  const direct = product.salesLanguage;
  if (direct && typeof direct === "object") return direct;

  const profile = product.technicalProfile?.salesLanguage;
  if (profile && typeof profile === "object") return profile;

  const rawSalesLanguage = product.raw?.salesLanguage;
  if (rawSalesLanguage && typeof rawSalesLanguage === "object") return rawSalesLanguage as ProductSalesLanguage;

  const rawProfile = product.raw?.technicalProfile;
  if (rawProfile && typeof rawProfile === "object") {
    const rawProfileSalesLanguage = (rawProfile as Record<string, unknown>).salesLanguage;
    if (rawProfileSalesLanguage && typeof rawProfileSalesLanguage === "object") return rawProfileSalesLanguage as ProductSalesLanguage;
  }

  return undefined;
}

function salesVoiceForProduct(product: ProductRecord | undefined, voice: ProductVoiceId) {
  return salesLanguageForProduct(product)?.voices?.[voice];
}

function productSku(product?: ProductRecord) {
  if (!product) return "";
  return cleanText(product.sku || product.id || product.raw?.sku || "").toUpperCase();
}

function productTitle(product?: ProductRecord) {
  if (!product) return "WyreStorm product";
  return cleanText(product.name || product.title || product.raw?.title || product.sku || "WyreStorm product");
}

function productSummary(product?: ProductRecord) {
  if (!product) return "";
  return cleanText(product.summary || product.description || product.raw?.summary || product.raw?.description || "");
}

function productFamily(product?: ProductRecord) {
  if (!product) return "WyreStorm product";
  return cleanText(product.family || product.category || product.raw?.family || product.raw?.category || "WyreStorm product");
}

function productSearchBlob(product: ProductRecord) {
  return [
    productSku(product),
    productTitle(product),
    productSummary(product),
    productFamily(product),
    cleanText(product.category),
    cleanText(product.routingClass),
    ...asList(product.technologies),
    ...asList(product.connectors),
    ...asList(product.features),
    ...asList(product.applications),
    ...asList(product.tags),
    ...asList(product.searchTerms),
    ...collectTextValues(salesLanguageForProduct(product)),
  ]
    .join(" ")
    .toLowerCase();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function liveProductUrl(sku: string) {
  return `https://wyrestorm.com/product/${encodeURIComponent(sku.toLowerCase())}/`;
}

function liveSearchUrl(sku: string) {
  return `https://wyrestorm.com/?s=${encodeURIComponent(sku)}`;
}

function firstUsefulApplication(product: ProductRecord) {
  const apps = asList(product.applications);
  const weak = new Set(["AV rack", "Control system", "Meeting room", "UC space"]);

  const better = apps.find((app) => !weak.has(app));
  if (better) return better;

  return apps[0] || "";
}

function simplePitchForProduct(product?: ProductRecord, voice: ProductVoiceId = "endUser"): SimplePitch {
  if (!product) {
    return {
      headline: "Select a SKU to create a simple sales pitch.",
      customerPitch: "Wingman will turn the product data into plain customer language.",
      helpsWith: [],
      bestFit: "Choose a product from the list.",
      askBeforeQuoting: [],
      termExplanations: [],
    };
  }

  const sku = productSku(product);
  const title = productTitle(product);
  const summary = productSummary(product);
  const family = productFamily(product);
  const blob = productSearchBlob(product);
  const application = firstUsefulApplication(product);
  const proofTerms = unique([...asList(product.features), ...asList(product.technologies), ...asList(product.connectors), ...asList(product.tags)]);
  const salesLanguage = salesLanguageForProduct(product);
  const selectedVoice = salesVoiceForProduct(product, voice);

  if (salesLanguage) {
    const talkTrack = compactTexts([
      ...(selectedVoice?.talkTrack ?? []),
      ...(salesLanguage.talkTrack ?? []),
      salesLanguage.salespersonCue,
      salesLanguage.realWorldApplication,
    ]);
    const askBeforeQuoting = compactTexts([
      ...(selectedVoice?.discoveryPrompts ?? []),
      ...(salesLanguage.discoveryPrompts ?? []),
    ]);
    const architectureChecks = compactTexts([
      ...(selectedVoice?.positioningNotes ?? []),
      ...(salesLanguage.positioningNotes ?? []),
      salesLanguage.thirdOutputUseCase,
      ...(selectedVoice?.avoidPositioningAs ?? []).map((item) => `Avoid: ${item}`),
      ...(salesLanguage.avoidPositioningAs ?? []).map((item) => `Avoid: ${item}`),
    ]);

    return {
      headline: cleanText(selectedVoice?.headline || salesLanguage.headline || `${sku}: ${title}`),
      customerPitch:
        cleanText(selectedVoice?.pitch || salesLanguage.plainEnglishSummary || summary) ||
        `${title} supports a specific part of a professional WyreStorm AV system. Confirm the application before positioning it to the customer.`,
      helpsWith: talkTrack.length
        ? talkTrack.slice(0, 4)
        : [
            "Solves a specific AV system requirement.",
            "Fits into a wider WyreStorm design.",
            "Should be positioned based on the customer outcome, not just the specification.",
          ],
      bestFit:
        cleanText(selectedVoice?.value || salesLanguage.customerValue || salesLanguage.realWorldApplication) ||
        application ||
        family,
      askBeforeQuoting: askBeforeQuoting.length
        ? askBeforeQuoting.slice(0, 5)
        : [
            "What is the customer trying to achieve?",
            "Where are the sources, displays and users located?",
            "Does the system need video, USB, audio, control or network integration?",
          ],
      architectureChecks: architectureChecks.slice(0, 5),
      termExplanations: explainTerms(blob, proofTerms, "general"),
    };
  }

  const isAmplifier = includesAny(blob, ["amplifier", "amp-", "speaker output", "60w", "120w", "4ohm"]);
  const isAudio = isAmplifier || includesAny(blob, ["audio", "dante", "aes67", "microphone", "mic ", "speaker", "de-embed", "audio / control"]);
  const isVideoBar = includesAny(blob, ["video bar", "videobar", "apo-vx", "halo-vx"]);
  const isCamera = includesAny(blob, ["camera", "ptz", "webcam", "ndi"]);
  const isVideoWall = includesAny(blob, ["video wall", "videowall", "sw-0204", "sw-0206"]);
  const isMatrix = includesAny(blob, ["matrix", "mx-", "mxv-", "scl", "seamless"]);
  const isNetworkHd = includesAny(blob, ["networkhd", "av over ip", "avoip", "encoder", "decoder", "transceiver"]);
  const isExtender = includesAny(blob, ["extender", "hdbaset", "kvm", "rx-", "tx-", "ex-"]);
  const isControl = includesAny(blob, ["control", "touch", "keypad", "relay", "rs-232"]);
  const isCable = includesAny(blob, ["cable", "cab-", "aoc", "active optical"]);
  const isSplitter = includesAny(blob, ["splitter", "distribution"]);
  const isPresentation = includesAny(blob, ["presentation", "usb-c", "byod", "byom", "wireless", "casting", "conference room switcher"]);

  if (isAmplifier) {
    return {
      headline: `${sku}: Amplifies and manages room audio`,
      customerPitch: `${title} is used when the room needs reliable speaker output and controlled audio as part of the AV system. It is not a video switcher; its job is to help get sound to the speakers and, where required, connect audio into a network audio workflow.`,
      helpsWith: [
        "Powers installed speakers in a room or zone.",
        "Helps keep room audio controlled and consistent.",
        includesAny(blob, ["dante", "aes67"]) ? "Can connect into a network audio system when Dante or AES67 is being used." : "Supports the audio side of the room rather than the video switching side.",
      ],
      bestFit: application || "Meeting rooms, classrooms or AV racks where installed speakers need amplification and control.",
      askBeforeQuoting: [
        "How many speakers need to be driven?",
        "What speaker type and impedance are being used?",
        "Does the project need Dante/network audio, analogue audio, or both?",
      ],
      termExplanations: explainTerms(blob, proofTerms, "audio"),
    };
  }

  if (isVideoBar) {
    return {
      headline: `${sku}: Makes smaller meeting rooms easier to use`,
      customerPitch: `${title} helps improve the video meeting experience by combining room camera, microphone, speaker and presentation functions into a simpler front-of-room solution.`,
      helpsWith: [
        "Improves the experience for remote meeting participants.",
        "Reduces the number of separate devices in the room.",
        "Makes everyday meetings easier for non-technical users.",
      ],
      bestFit: application || "Small and medium meeting rooms that need a cleaner conferencing experience.",
      askBeforeQuoting: [
        "How many people normally use the room?",
        "How far are users from the display and camera?",
        "Does the room need one display, two displays, wireless sharing, or laptop connection?",
      ],
      termExplanations: explainTerms(blob, proofTerms, "camera"),
    };
  }

  if (isCamera) {
    return {
      headline: `${sku}: Improves camera capture for meetings, teaching or streaming`,
      customerPitch: `${title} helps remote viewers see the room, presenter or audience more clearly, making calls, lessons and recordings feel more professional.`,
      helpsWith: [
        "Improves how people appear on video calls or recordings.",
        "Captures the right area of the room more effectively.",
        "Supports hybrid meetings, teaching, streaming or recorded sessions.",
      ],
      bestFit: application || "Rooms where a laptop webcam is not good enough.",
      askBeforeQuoting: [
        "What needs to be captured: presenter, audience, table or whiteboard?",
        "Where will the camera be mounted?",
        "Does the camera need USB, HDMI, NDI or another output?",
      ],
      termExplanations: explainTerms(blob, proofTerms, "camera"),
    };
  }

  if (isVideoWall) {
    return {
      headline: `${sku}: Creates a larger visual feature from multiple screens`,
      customerPitch: `${title} helps turn several displays into a more impactful visual wall for signage, sports, monitoring, events or feature-wall content.`,
      helpsWith: [
        "Makes content larger and more visible.",
        "Lets multiple displays work together.",
        "Supports more visual impact than a single display.",
      ],
      bestFit: application || "LCD video walls, hospitality spaces, retail feature walls and monitoring displays.",
      askBeforeQuoting: [
        "What is the wall layout, such as 2x2, 3x3 or 1x4?",
        "Should the screens show one big image or different content?",
        "How many sources need to feed the wall?",
      ],
      termExplanations: explainTerms(blob, proofTerms, "videoWall"),
    };
  }

  if (isMatrix) {
    return {
      headline: `${sku}: Routes sources to screens from one central point`,
      customerPitch: `${title} helps the customer choose which source appears on which screen without manually swapping cables. It is for rooms or systems with multiple sources, multiple displays, or more controlled switching needs. For smaller systems with fewer than around 12 outputs, a matrix should often be checked before leading with AV-over-IP.`,
      helpsWith: [
        "Connects several source devices and screens into one managed system.",
        "Makes switching cleaner and more professional.",
        "Helps rooms support more than one display or source device.",
      ],
      bestFit: application || "Boardrooms, training rooms, classrooms and smaller fixed multi-display spaces.",
      askBeforeQuoting: [
        "How many source devices need to connect?",
        "How many screens need to be controlled?",
        "Does the room need simple switching, scaling, multiview or video wall layouts?",
      ],
      architectureChecks: [
        "Strong fit when the source and display count is known, centralised and unlikely to expand heavily.",
        "Often commercially stronger than AV-over-IP for under around 12 outputs with fixed or predictable routing.",
        "Check whether cable routes, rack location and display distances favour HDMI, HDBaseT or mixed matrix outputs.",
      ],
      termExplanations: explainTerms(blob, proofTerms, "matrix"),
    };
  }

  if (isNetworkHd) {
    return {
      headline: `${sku}: Sends AV around the building using the network`,
      customerPitch: `${title} helps route content between sources and displays using a network-based AV system instead of fixed one-to-one cabling. Position it when the customer needs flexibility, distributed routing or future expansion, not simply because there is more than one display.`,
      helpsWith: [
        "Makes larger systems more flexible.",
        "Allows source and display locations to change or expand more easily.",
        "Reduces reliance on one large fixed matrix for distributed AV projects.",
      ],
      bestFit: application || "Sites with several sources and displays, especially where routing changes, distributed locations or future growth matter.",
      askBeforeQuoting: [
        "How many sources and displays are needed now?",
        "Are there fewer than around 12 outputs, and would a matrix be simpler or more cost-effective?",
        "Is there suitable network access, or permission to deploy the right AV network switches and configuration?",
      ],
      architectureChecks: [
        "Lead with AV-over-IP when flexibility, expansion, shared sources, distributed displays or room-to-room routing are important.",
        "Compare against matrix where the system is under around 12 outputs, budget-sensitive or mostly fixed in behaviour.",
        "Check cable restrictions, network ownership and whether the site allows dedicated or non-standard AV networking equipment.",
      ],
      termExplanations: explainTerms(blob, proofTerms, "network"),
    };
  }

  if (isExtender) {
    return {
      headline: `${sku}: Carries AV signals over longer cable runs`,
      customerPitch: `${title} helps place sources, displays or USB devices where they need to be when normal short cables are not practical.`,
      helpsWith: [
        "Extends signals beyond normal short cable limits.",
        "Keeps the installation tidy and practical.",
        "Helps avoid unreliable long HDMI or USB cable runs.",
      ],
      bestFit: application || "Rooms where the source, screen or USB device is not close to the main equipment.",
      askBeforeQuoting: [
        "What is the real installed cable distance?",
        "Is it video only, USB only, or both?",
        "Where are the source, display and USB devices located?",
      ],
      termExplanations: explainTerms(blob, proofTerms, "extender"),
    };
  }

  if (isPresentation) {
    return {
      headline: `${sku}: Makes presenting and collaboration easier`,
      customerPitch: `${title} helps people connect laptops, share content and use the room more easily without needing to understand the AV system.`,
      helpsWith: [
        "Makes the room easier for everyday users.",
        "Reduces adapters, cable swapping and support calls.",
        "Supports laptop-based presentation or collaboration.",
      ],
      bestFit: application || "Meeting rooms, classrooms and collaboration spaces.",
      askBeforeQuoting: [
        "Will users bring their own laptops?",
        "Do they need wired connection, wireless sharing, or both?",
        "Are cameras, microphones, speakerphones or touch displays involved?",
      ],
      termExplanations: explainTerms(blob, proofTerms, "presentation"),
    };
  }

  if (isControl) {
    return {
      headline: `${sku}: Makes the room easier to operate`,
      customerPitch: `${title} helps users control the AV room more easily, reducing confusion and support calls.`,
      helpsWith: [
        "Gives users a clearer way to operate the room.",
        "Can simplify actions like source selection, display power or volume.",
        "Makes the AV system feel more polished.",
      ],
      bestFit: application || "Rooms where non-technical users need simple AV control.",
      askBeforeQuoting: [
        "Who will use the room day to day?",
        "What actions should be simple for the user?",
        "Does the customer want keypad, touch panel or third-party control?",
      ],
      termExplanations: explainTerms(blob, proofTerms, "control"),
    };
  }

  if (isAudio) {
    return {
      headline: `${sku}: Supports the audio side of the AV system`,
      customerPitch: `${title} helps handle room audio, such as sound distribution, audio extraction, microphones or network audio integration.`,
      helpsWith: [
        "Keeps the audio path properly considered.",
        "Helps connect audio into the wider AV system.",
        "Supports cleaner room sound or audio routing.",
      ],
      bestFit: application || "Rooms or AV racks where audio needs to be managed properly.",
      askBeforeQuoting: [
        "Is the audio for speech, programme sound or conferencing?",
        "Are microphones, speakers or a DSP involved?",
        "Where does the audio need to go?",
      ],
      termExplanations: explainTerms(blob, proofTerms, "audio"),
    };
  }

  if (isCable || isSplitter) {
    return {
      headline: `${sku}: Supports a reliable AV signal path`,
      customerPitch: `${title} supports the practical connection side of the system, helping content reach displays cleanly and reliably.`,
      helpsWith: [
        "Keeps the signal path reliable.",
        "Supports the main AV equipment with the right connection hardware.",
        "Reduces avoidable installation issues.",
      ],
      bestFit: application || "AV racks, display connections and source-to-screen signal paths.",
      askBeforeQuoting: [
        "What distance does the signal need to travel?",
        "What resolution does the customer expect?",
        "Is this a permanent installation or a user-facing cable?",
      ],
      termExplanations: explainTerms(blob, proofTerms, "signal"),
    };
  }

  return {
    headline: `${sku}: ${title}`,
    customerPitch: summary || `${title} supports a specific part of a professional WyreStorm AV system. Confirm the application before positioning it to the customer.`,
    helpsWith: [
      "Solves a specific AV system requirement.",
      "Fits into a wider WyreStorm design.",
      "Should be positioned based on the customer outcome, not just the specification.",
    ],
    bestFit: application || family,
    askBeforeQuoting: [
      "What is the customer trying to achieve?",
      "Where are the sources, displays and users located?",
      "Does the system need video, USB, audio, control or network integration?",
    ],
    termExplanations: explainTerms(blob, proofTerms, "general"),
  };
}

function explainTerms(blob: string, proofTerms: string[], role: string) {
  const explanations: string[] = [];

  if (role === "audio") {
    if (includesAny(blob, ["amplifier", "amp-"])) {
      explanations.push("Amplifier means it powers speakers. It is different from a switcher, which chooses between video or AV sources.");
    }

    if (includesAny(blob, ["dante"])) {
      explanations.push("Dante is network audio. It moves audio between devices over the network instead of using lots of separate audio cables.");
    }

    if (includesAny(blob, ["dsp"])) {
      explanations.push("DSP means digital signal processing. In plain terms, it helps adjust and manage the sound, such as level, tone, delay or limiting.");
    }

    if (includesAny(blob, ["poe"])) {
      explanations.push("PoE means power over network cable. It can power some devices from a suitable network switch, but power limits must be checked.");
    }
  }

  if (includesAny(blob, ["4k", "uhd"])) {
    explanations.push("4K means a sharper picture than standard HD. It matters most on larger screens or where people sit close to the display.");
  }

  if (includesAny(blob, ["60hz"])) {
    explanations.push("60Hz means smoother motion than 30Hz. It is useful for fast-moving video, live content, sports, control rooms or premium presentation.");
  }

  if (includesAny(blob, ["4:4:4"])) {
    explanations.push("4:4:4 means full colour detail, which keeps text and fine graphics clearer. The common alternative is 4:2:0 or 4:2:2, which uses less bandwidth but can look less sharp with text.");
  }

  if (includesAny(blob, ["hdbaset"])) {
    explanations.push("HDBaseT carries AV signals over network-style cable, but it is normally point-to-point cabling rather than normal office network traffic.");
  }

  if (includesAny(blob, ["av over ip", "avoip", "networkhd"])) {
    explanations.push("AV-over-IP means sending AV around a network. It is useful for flexible routing, but it needs suitable network infrastructure and is not always the simplest answer for smaller fixed systems.");
  }

  if (includesAny(blob, ["usb-c"])) {
    explanations.push("USB-C is the modern laptop connector. It can carry video, USB data and charging, but not every USB-C port supports all of those.");
  }

  if (includesAny(blob, ["ndi"])) {
    explanations.push("NDI is network video often used by cameras and streaming systems. It lets video move around the network for capture, production or recording.");
  }

  if (includesAny(blob, ["multiview"])) {
    explanations.push("Multiview means showing more than one source on a single screen at the same time.");
  }

  if (includesAny(blob, ["video wall", "videowall"])) {
    explanations.push("A video wall uses multiple displays together to create one larger visual area or a more flexible display layout.");
  }

  if (!explanations.length && proofTerms.length) {
    explanations.push("Technical details are available on the product page, but lead the conversation with the customer problem first.");
  }

  return unique(explanations).slice(0, 3);
}

function selectBestProduct(products: ProductRecord[], query: string) {
  const search = query.trim().toLowerCase();
  if (!search) return undefined;

  const exact = products.find((product) => productSku(product).toLowerCase() === search);
  if (exact) return exact;

  return products.find((product) => productSearchBlob(product).includes(search));
}

export function ProductPitchPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedSku, setSelectedSku] = useState("");
  const [voice, setVoice] = useState<ProductVoiceId>("endUser");
  const [indexError, setIndexError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(indexUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load product index (${response.status})`);
        return response.json() as Promise<ProductIndex>;
      })
      .then((data) => {
        if (cancelled) return;

        const indexedProducts = Array.isArray(data.products) ? data.products : [];
        setProducts(indexedProducts);

        const firstSku = productSku(indexedProducts[0]);
        setSelectedSku((current) => current || firstSku);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setIndexError(error instanceof Error ? error.message : "Unable to load product index");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const productOptions = useMemo(() => {
    return [...products]
      .filter((product) => productSku(product))
      .sort((a, b) => productSku(a).localeCompare(productSku(b)));
  }, [products]);

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return productOptions.slice(0, 80);

    return productOptions.filter((product) => productSearchBlob(product).includes(search)).slice(0, 80);
  }, [productOptions, query]);

  const selectedProduct = useMemo(() => {
    return selectBestProduct(products, selectedSku) || selectBestProduct(products, query);
  }, [products, query, selectedSku]);

  const pitch = useMemo(() => simplePitchForProduct(selectedProduct, voice), [selectedProduct, voice]);
  const selectedProductSku = productSku(selectedProduct);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Product pitch"
        title="Simple WyreStorm sales pitch"
        purpose="Select a SKU and get a short, plain-language customer pitch. No datasheet dump. No unexplained technical jargon."
        nextMove="Use this as a quick sales crib sheet before a call, meeting or proposal."
        actions={[
          { label: "Open Product Families", to: routeCatalogByKey.productFamilies.path, variant: "secondary" },
          { label: "Open Product Finder", to: routeCatalogByKey.finder.path, variant: "secondary" },
          { label: "Build proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.9fr)]">
        <SectionCard title="Select SKU" subtitle="Search by SKU or simple words like meeting, camera, wall, USB-C or extender.">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-800">
                <Search className="h-4 w-4" />
                Find product
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Example: MX-0402-MST or camera"
                className="w-full px-3 py-2"
              />
            </label>

            {indexError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{indexError}</div> : null}

            <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
              {filteredOptions.map((product) => {
                const sku = productSku(product);
                const active = sku === selectedProductSku;

                return (
                  <button
                    key={sku}
                    type="button"
                    onClick={() => {
                      setSelectedSku(sku);
                      setQuery(sku);
                    }}
                    className={[
                      "w-full rounded-2xl border p-3 text-left transition",
                      active ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-black text-slate-950">{sku}</span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">{productTitle(product)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <section className="wingman-section-card wingman-surface overflow-hidden rounded-3xl">
          <header className="border-b border-slate-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="wingman-kicker">Sales crib sheet</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{selectedProductSku || "Select a SKU"}</h2>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                  {selectedProduct ? productTitle(selectedProduct) : "Choose a product on the left."}
                </p>
              </div>

              {selectedProductSku ? (
                <div className="flex flex-wrap gap-2">
                  <a href={liveProductUrl(selectedProductSku)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50">
                    Product page
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <a href={liveSearchUrl(selectedProductSku)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50">
                    WyreStorm search
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : null}
            </div>
          </header>

          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Voice</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{voiceOptions.find((option) => option.id === voice)?.label}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {voiceOptions.map((option) => {
                  const active = option.id === voice;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setVoice(option.id)}
                      className={[
                        "rounded-full border px-3 py-2 text-xs font-black transition",
                        active
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800",
                      ].join(" ")}
                    >
                      {option.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <Sparkles className="h-4 w-4 text-orange-600" />
                Simple customer pitch
              </div>
              <h3 className="mt-3 text-xl font-black leading-7 text-slate-950">{pitch.headline}</h3>
              <p className="mt-3 text-base font-semibold leading-8 text-slate-700">{pitch.customerPitch}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <SimpleBlock title="What it helps with" items={pitch.helpsWith} />
              <SimpleBlock title="Best fit" items={[pitch.bestFit]} />
              <SimpleBlock title="Ask before quoting" items={pitch.askBeforeQuoting} />
            </div>

            {pitch.architectureChecks?.length ? (
              <SimpleBlock title="Architecture check" items={pitch.architectureChecks} />
            ) : null}

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
                <HelpCircle className="h-4 w-4 text-orange-600" />
                Technical terms explained
              </h3>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                Use these only when the customer asks, or when the term appears in the product conversation.
              </p>
              <ul className="mt-3 space-y-2">
                {pitch.termExplanations.map((item) => (
                  <li key={item} className="flex gap-2 text-sm font-semibold leading-6 text-slate-700">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-orange-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SimpleBlock({ title, items }: { title: string; items: string[] }) {
  const cleanItems = unique(items);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <ul className="mt-3 space-y-2">
        {cleanItems.map((item) => (
          <li key={item} className="flex gap-2 text-sm font-semibold leading-6 text-slate-700">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-orange-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProductPitchPage;
