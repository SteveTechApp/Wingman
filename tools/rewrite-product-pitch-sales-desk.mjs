import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const pagePath = join(root, "src", "wingman2", "pages", "ProductPitchPage.tsx");
const stylePath = join(root, "src", "wingman2", "styles", "wingman-style-stack.css");
const backupDir = join(root, "backups", "product-pitch-sales-desk-" + new Date().toISOString().replace(/[:.]/g, "-"));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function ensureFile(path, label) {
  if (existsSync(path)) return;
  fail("Missing " + label + ": " + path);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

ensureFile(pagePath, "ProductPitchPage.tsx");
ensureFile(stylePath, "wingman-style-stack.css");

mkdirSync(backupDir, { recursive: true });
copyFileSync(pagePath, join(backupDir, "ProductPitchPage.tsx.bak"));
copyFileSync(stylePath, join(backupDir, "wingman-style-stack.css.bak"));

const page = String.raw`import { useEffect, useMemo, useState } from "react";

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
  customerQuestions: string[];
  checks: string[];
  objections: PitchObjection[];
  related: string[];
  confidence: string;
  tags: string[];
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
      "MX-1007-HYB keeps the conversation around the room outcome: connect local sources, manage USB, feed displays and extend into NetworkHD where needed.",
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
    "Use the product facts and application fit to explain why this is the practical WyreStorm option."
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
    tags
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

export default function ProductPitchPage() {
  const [products, setProducts] = useState<PitchProduct[]>(fallbackProducts);
  const [selectedSku, setSelectedSku] = useState(fallbackProducts[0]?.sku || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFamily, setActiveFamily] = useState("All");
  const [activeSection, setActiveSection] = useState<PitchSection>("Talk track");
  const [indexStatus, setIndexStatus] = useState("Starter sales-support data loaded");

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
    if (products.some((product) => product.sku === selectedSku)) return;

    const firstProduct = products[0];

    if (firstProduct) {
      setSelectedSku(firstProduct.sku);
    }
  }, [products, selectedSku]);

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
      "Lead with the customer requirement, then explain why " + selectedProduct.sku + " is the practical WyreStorm option.",
      selectedProduct.validationQuestion
    ];
  }, [selectedProduct]);

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
            Select a product, lead with the customer problem, then keep the sales helper cards visible while the conversation moves.
          </p>
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
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search product, feature or use case"
            type="search"
          />

          <div className="wm-pitch-family-chips">
            <button
              className={activeFamily === "All" ? "is-active" : ""}
              type="button"
              onClick={() => setActiveFamily("All")}
            >
              All
            </button>
            {families.map((family) => (
              <button
                className={activeFamily === family ? "is-active" : ""}
                key={family}
                type="button"
                onClick={() => setActiveFamily(family)}
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
                onClick={() => {
                  setSelectedSku(product.sku);
                  setActiveSection("Talk track");
                }}
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
            </div>
          </article>

          <div className="wm-pitch-helper-grid" aria-label="Immediate helper cards">
            <HelperCard
              eyebrow="Problem"
              title="Customer challenge"
              value={selectedProduct.customerChallenge}
            />
            <HelperCard
              eyebrow="Fit"
              title="WyreStorm angle"
              value={selectedProduct.wyrestormFit}
            />
            <HelperCard
              eyebrow="Proof"
              title="Proof point"
              value={selectedProduct.proofPoint}
            />
            <HelperCard
              eyebrow="Question"
              title="Validation question"
              value={selectedProduct.validationQuestion}
            />
          </div>

          <nav className="wm-pitch-tabs" aria-label="Product support sections">
            {sectionLabels.map((label) => (
              <button
                className={activeSection === label ? "is-active" : ""}
                key={label}
                type="button"
                onClick={() => setActiveSection(label)}
              >
                {label}
              </button>
            ))}
          </nav>

          {renderPitchSection()}
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
            <h3>Lead with</h3>
            <p>{selectedProduct.salientPoint}</p>
          </article>

          <article>
            <h3>Ask now</h3>
            <p>{selectedProduct.validationQuestion}</p>
          </article>

          <article>
            <h3>Next best action</h3>
            <p>
              Confirm the missing room, source, display, USB, audio, control and network details before recommending the final system shape.
            </p>
          </article>

          <article>
            <h3>Quick warning</h3>
            <p>
              Do not present this as a guaranteed fit until the product role matches the actual customer requirement.
            </p>
          </article>
        </aside>
      </section>
    </main>
  );
}
`;

const markerStart = "/* === Product Pitch Sales Desk redesign start === */";
const markerEnd = "/* === Product Pitch Sales Desk redesign end === */";

const css = String.raw`${markerStart}
.wm-product-pitch-page[data-wingman-product-pitch-sales-desk="true"] {
  min-height: calc(100vh - 24px);
  max-height: calc(100vh - 24px);
  overflow: hidden;
  padding: 14px;
  color: #ffffff;
  background:
    radial-gradient(circle at top left, rgba(45, 212, 191, 0.12), transparent 34rem),
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.1), transparent 32rem),
    #020817;
}

.wm-product-pitch-page[data-wingman-product-pitch-sales-desk="true"] * {
  box-sizing: border-box;
}

.wm-product-pitch-page[data-wingman-product-pitch-sales-desk="true"] h1,
.wm-product-pitch-page[data-wingman-product-pitch-sales-desk="true"] h2,
.wm-product-pitch-page[data-wingman-product-pitch-sales-desk="true"] h3,
.wm-product-pitch-page[data-wingman-product-pitch-sales-desk="true"] h4,
.wm-product-pitch-page[data-wingman-product-pitch-sales-desk="true"] p,
.wm-product-pitch-page[data-wingman-product-pitch-sales-desk="true"] span,
.wm-product-pitch-page[data-wingman-product-pitch-sales-desk="true"] small,
.wm-product-pitch-page[data-wingman-product-pitch-sales-desk="true"] strong,
.wm-product-pitch-page[data-wingman-product-pitch-sales-desk="true"] li {
  color: #ffffff;
}

.wm-pitch-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 14px;
  align-items: stretch;
  min-height: 104px;
  margin-bottom: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(94, 234, 212, 0.22);
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(8, 18, 32, 0.96), rgba(8, 47, 73, 0.62));
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
}

.wm-pitch-header h1 {
  margin: 2px 0 4px;
  font-size: clamp(1.55rem, 2vw, 2.15rem);
  line-height: 1.02;
  color: #5eead4 !important;
}

.wm-pitch-header p {
  max-width: 900px;
  margin: 0;
  color: rgba(255, 255, 255, 0.78) !important;
  font-size: 0.95rem;
}

.wm-pitch-eyebrow,
.wm-pitch-helper-card > span {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 6px;
  color: #67e8f9 !important;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.wm-pitch-header-status {
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 2px;
  padding: 12px;
  border: 1px solid rgba(103, 232, 249, 0.18);
  border-radius: 18px;
  background: rgba(2, 8, 23, 0.54);
}

.wm-pitch-header-status strong {
  color: #5eead4 !important;
  font-size: 2rem;
  line-height: 1;
}

.wm-pitch-header-status span {
  font-size: 0.82rem;
  font-weight: 800;
}

.wm-pitch-header-status small {
  color: rgba(255, 255, 255, 0.62) !important;
  font-size: 0.72rem;
}

.wm-pitch-workbench {
  display: grid;
  grid-template-columns: minmax(245px, 0.78fr) minmax(520px, 1.75fr) minmax(260px, 0.85fr);
  gap: 12px;
  height: calc(100vh - 154px);
  min-height: 560px;
}

.wm-pitch-product-picker,
.wm-pitch-centre,
.wm-pitch-assist-rail {
  min-height: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 22px;
  background: rgba(5, 12, 24, 0.9);
  box-shadow: 0 18px 70px rgba(0, 0, 0, 0.26);
}

.wm-pitch-product-picker,
.wm-pitch-assist-rail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  overflow: hidden;
}

.wm-pitch-centre {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  gap: 10px;
  padding: 12px;
  overflow: hidden;
}

.wm-pitch-panel-heading {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.wm-pitch-panel-heading > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid rgba(94, 234, 212, 0.42);
  border-radius: 999px;
  background: rgba(20, 184, 166, 0.16);
  color: #5eead4 !important;
  font-weight: 900;
}

.wm-pitch-panel-heading h2 {
  margin: 0;
  color: #5eead4 !important;
  font-size: 1rem;
}

.wm-pitch-panel-heading p {
  margin: 2px 0 0;
  color: rgba(255, 255, 255, 0.62) !important;
  font-size: 0.78rem;
}

.wm-pitch-search {
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid rgba(103, 232, 249, 0.22);
  border-radius: 14px;
  color: #ffffff;
  background: rgba(2, 8, 23, 0.82);
  outline: none;
}

.wm-pitch-search::placeholder {
  color: rgba(255, 255, 255, 0.42);
}

.wm-pitch-search:focus {
  border-color: rgba(94, 234, 212, 0.7);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.16);
}

.wm-pitch-family-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 78px;
  overflow: auto;
  padding-right: 2px;
}

.wm-pitch-family-chips button,
.wm-pitch-tabs button {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.88);
  color: rgba(255, 255, 255, 0.82);
  cursor: pointer;
  font-weight: 800;
}

.wm-pitch-family-chips button {
  padding: 7px 9px;
  font-size: 0.72rem;
}

.wm-pitch-family-chips button.is-active,
.wm-pitch-tabs button.is-active {
  border-color: rgba(94, 234, 212, 0.68);
  background: rgba(20, 184, 166, 0.18);
  color: #5eead4 !important;
}

.wm-pitch-product-list {
  display: grid;
  gap: 8px;
  min-height: 0;
  overflow: auto;
  padding-right: 3px;
}

.wm-pitch-product-list button {
  display: grid;
  gap: 3px;
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  text-align: left;
  background: rgba(15, 23, 42, 0.72);
  cursor: pointer;
}

.wm-pitch-product-list button:hover,
.wm-pitch-product-list button.is-selected {
  border-color: rgba(94, 234, 212, 0.66);
  background: rgba(8, 47, 73, 0.76);
}

.wm-pitch-product-list button strong {
  color: #5eead4 !important;
  font-size: 0.88rem;
}

.wm-pitch-product-list button span {
  font-size: 0.82rem;
  line-height: 1.25;
}

.wm-pitch-product-list button small {
  color: rgba(255, 255, 255, 0.58) !important;
  font-size: 0.7rem;
}

.wm-pitch-product-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(94, 234, 212, 0.24);
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(8, 47, 73, 0.62), rgba(15, 23, 42, 0.92));
}

.wm-pitch-product-hero h2 {
  margin: 3px 0 0;
  color: #5eead4 !important;
  font-size: 1.55rem;
  line-height: 1;
}

.wm-pitch-product-hero h3 {
  margin: 4px 0 6px;
  color: #ffffff !important;
  font-size: 1rem;
}

.wm-pitch-product-hero p {
  margin: 0;
  color: rgba(255, 255, 255, 0.74) !important;
  font-size: 0.86rem;
  line-height: 1.38;
}

.wm-pitch-category-card {
  display: grid;
  align-content: center;
  gap: 5px;
  padding: 12px;
  border: 1px solid rgba(103, 232, 249, 0.2);
  border-radius: 16px;
  background: rgba(2, 8, 23, 0.55);
}

.wm-pitch-category-card span {
  color: rgba(255, 255, 255, 0.58) !important;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.wm-pitch-category-card strong {
  color: #5eead4 !important;
  font-size: 0.95rem;
  line-height: 1.2;
}

.wm-pitch-helper-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.wm-pitch-helper-card,
.wm-pitch-section-content article,
.wm-pitch-assist-rail article,
.wm-pitch-objection-list article {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.66);
}

.wm-pitch-helper-card {
  min-height: 118px;
  padding: 10px;
}

.wm-pitch-helper-card h3,
.wm-pitch-section-content h3,
.wm-pitch-assist-rail h3,
.wm-pitch-objection-list h4 {
  margin: 4px 0 6px;
  color: #5eead4 !important;
  font-size: 0.9rem;
}

.wm-pitch-helper-card p,
.wm-pitch-section-content p,
.wm-pitch-assist-rail p,
.wm-pitch-objection-list p {
  margin: 0;
  color: rgba(255, 255, 255, 0.76) !important;
  font-size: 0.8rem;
  line-height: 1.35;
}

.wm-pitch-tabs {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
}

.wm-pitch-tabs button {
  min-height: 36px;
  padding: 6px 8px;
  font-size: 0.72rem;
}

.wm-pitch-section-content {
  min-height: 0;
  overflow: auto;
  padding-right: 3px;
}

.wm-pitch-two-column {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.wm-pitch-section-content article {
  min-height: 190px;
  padding: 12px;
}

.wm-pitch-bullet-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;
}

.wm-pitch-bullet-list li {
  color: rgba(255, 255, 255, 0.78) !important;
  font-size: 0.82rem;
  line-height: 1.35;
}

.wm-pitch-objection-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.wm-pitch-objection-list article {
  padding: 12px;
}

.wm-pitch-assist-rail article {
  padding: 12px;
}

.wm-pitch-assist-rail {
  overflow: auto;
}

.wm-pitch-muted {
  color: rgba(255, 255, 255, 0.56) !important;
}

@media (max-width: 1240px) {
  .wm-product-pitch-page[data-wingman-product-pitch-sales-desk="true"] {
    max-height: none;
    overflow: auto;
  }

  .wm-pitch-workbench {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
  }

  .wm-pitch-product-picker,
  .wm-pitch-centre,
  .wm-pitch-assist-rail {
    overflow: visible;
  }

  .wm-pitch-helper-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .wm-pitch-header,
  .wm-pitch-product-hero,
  .wm-pitch-two-column,
  .wm-pitch-objection-list {
    grid-template-columns: 1fr;
  }

  .wm-pitch-helper-grid,
  .wm-pitch-tabs {
    grid-template-columns: 1fr;
  }
}
${markerEnd}
`;

writeFileSync(pagePath, page, "utf8");

const existingStyle = readFileSync(stylePath, "utf8");
const markerPattern = new RegExp(
  escapeRegExp(markerStart) + "[\\s\\S]*?" + escapeRegExp(markerEnd) + "\\n?",
  "g"
);

const cleanedStyle = existingStyle.replace(markerPattern, "").trimEnd();
writeFileSync(stylePath, cleanedStyle + "\n\n" + css + "\n", "utf8");

console.log("");
console.log("Product Pitch sales desk rewrite complete.");
console.log("Updated: " + pagePath);
console.log("Updated: " + stylePath);
console.log("Backups: " + backupDir);
console.log("");
