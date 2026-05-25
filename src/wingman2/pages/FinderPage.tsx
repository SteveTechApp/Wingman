import { useMemo, useState } from "react";
import {
  ArrowRight,
  Cable,
  Layers3,
  Network,
  PackageSearch,
  Plus,
  Search,
  SlidersHorizontal,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

type FinderProduct = {
  sku: string;
  title: string;
  family: string;
  category: string;
  description: string;
  tags: string[];
};

type FinderRouteId = "sku" | "io" | "family" | "feature" | "avoip" | "wall";

type FinderRoute = {
  id: FinderRouteId;
  title: string;
  description: string;
  bestFor: string;
  Icon: LucideIcon;
};

const SHORTLIST_KEY = "wingman-finder-standalone-shortlist-v1";

const products: FinderProduct[] = [
  {
    sku: "SW-130-TX-UK",
    title: "In-wall HDMI and USB-C presentation transmitter",
    family: "Presentation / HDBaseT",
    category: "Presentation switcher",
    description: "Room input point for HDMI, USB-C video and USB in BYOD or BYOM workflows.",
    tags: ["HDMI", "USB-C", "USB", "HDBaseT", "BYOD"],
  },
  {
    sku: "EX-100-KVM",
    title: "4K HDMI and USB extender kit over HDBaseT",
    family: "HDBaseT",
    category: "HDMI / USB extender",
    description: "Use when HDMI and USB need to travel together over distance.",
    tags: ["HDMI", "USB", "HDBaseT", "KVM"],
  },
  {
    sku: "RX-70",
    title: "HDBaseT receiver for longer video-only paths",
    family: "HDBaseT",
    category: "HDBaseT extender",
    description: "Video-only HDBaseT receive path for longer cable runs where USB is not required.",
    tags: ["HDBaseT", "Receiver", "Video only"],
  },
  {
    sku: "MX-0402-MST",
    title: "Dual-display / MST presentation switcher",
    family: "Presentation switching",
    category: "Presentation switcher",
    description: "Compact presentation switcher for USB-C, dual-display or MST style workflows.",
    tags: ["USB-C", "MST", "Dual display", "Presentation"],
  },
  {
    sku: "MX-0403-H3-MST",
    title: "Multi-output presentation switcher with HDBaseT",
    family: "Presentation switching",
    category: "Presentation switcher",
    description: "Room switcher for HDMI and USB-C sources, multiple outputs and HDBaseT extension.",
    tags: ["USB-C", "HDBaseT", "MST", "Presentation"],
  },
  {
    sku: "MX-0404-SCL",
    title: "4x4 seamless matrix switcher",
    family: "Seamless matrix",
    category: "Matrix / routing",
    description: "Fixed I/O matrix routing with scaling or seamless switching.",
    tags: ["Matrix", "Scaling", "Seamless", "HDMI"],
  },
  {
    sku: "SW-0206-VW",
    title: "4K60 video wall processor",
    family: "Video wall processor",
    category: "Video wall",
    description: "Dedicated non-AVoIP video wall processor for fixed LCD wall applications.",
    tags: ["Video wall", "4K60", "LCD wall", "Processor"],
  },
  {
    sku: "NHD-120-TX",
    title: "NetworkHD 100 encoder",
    family: "NetworkHD 100",
    category: "AVoIP",
    description: "Cost-effective AVoIP encoder for NetworkHD 100 distribution.",
    tags: ["AVoIP", "NetworkHD 100", "Encoder"],
  },
  {
    sku: "NHD-120-RX",
    title: "NetworkHD 100 decoder",
    family: "NetworkHD 100",
    category: "AVoIP",
    description: "Cost-effective AVoIP decoder for NetworkHD 100 distribution.",
    tags: ["AVoIP", "NetworkHD 100", "Decoder"],
  },
  {
    sku: "NHD-500-TX",
    title: "NetworkHD 500 4K60 AVoIP encoder",
    family: "NetworkHD 500",
    category: "AVoIP",
    description: "Premium 4K60 AVoIP encoder for low-latency, USB and Dante-ready workflows.",
    tags: ["AVoIP", "NetworkHD 500", "4K60", "USB", "Dante"],
  },
  {
    sku: "NHD-0401-MV",
    title: "NetworkHD 500 multiview processor",
    family: "NetworkHD 500",
    category: "AVoIP",
    description: "Multiview source composition and monitoring processor for NetworkHD 500.",
    tags: ["AVoIP", "Multiview", "Processor"],
  },
  {
    sku: "NHD-600-TRX",
    title: "NetworkHD 600 10G transceiver",
    family: "NetworkHD 600",
    category: "AVoIP",
    description: "Highest-performance lossless zero-latency 10G AVoIP transceiver.",
    tags: ["AVoIP", "10G", "Lossless", "Zero latency"],
  },
  {
    sku: "NHD-128-NDI-TRX",
    title: "NDI to NetworkHD 100 bridge / transceiver",
    family: "NetworkHD 100 / NDI",
    category: "NDI / camera",
    description: "Use where NDI sources need to enter a NetworkHD 100 H.265 AVoIP workflow.",
    tags: ["NDI", "Camera", "AVoIP", "H.265"],
  },
  {
    sku: "CAM-210-NDI-PTZ",
    title: "NDI PTZ camera",
    family: "Unified Communication",
    category: "NDI / camera",
    description: "PTZ camera with NDI support for conferencing, streaming and capture.",
    tags: ["NDI", "PTZ", "Camera", "Streaming"],
  },
];

const routes: FinderRoute[] = [
  {
    id: "sku",
    title: "Search by SKU or phrase",
    description: "Use when the customer already has a product code or short requirement.",
    bestFor: "Fast lookup",
    Icon: Search,
  },
  {
    id: "io",
    title: "Search by I/O",
    description: "Start with inputs, outputs, distance and USB requirement.",
    bestFor: "Sales qualification",
    Icon: Cable,
  },
  {
    id: "family",
    title: "Search by product family",
    description: "Choose HDBaseT, presentation, matrix, NetworkHD, UC or camera.",
    bestFor: "Known product type",
    Icon: Layers3,
  },
  {
    id: "feature",
    title: "Search by feature",
    description: "Find by USB, multiview, video wall, NDI, 4K60, Dante or wireless.",
    bestFor: "Feature-led enquiry",
    Icon: SlidersHorizontal,
  },
  {
    id: "avoip",
    title: "AV-over-IP route",
    description: "Compare NetworkHD 100, 500 and 600 style applications.",
    bestFor: "Flexible distribution",
    Icon: Network,
  },
  {
    id: "wall",
    title: "Video wall route",
    description: "Separate wall processor, matrix and AVoIP wall applications.",
    bestFor: "LCD / LED walls",
    Icon: Video,
  },
];

const familyOptions = ["HDBaseT", "Presentation", "Matrix", "NetworkHD 100", "NetworkHD 500", "NetworkHD 600", "Video wall", "NDI", "Camera"];
const featureOptions = ["USB", "USB-C", "HDBaseT", "AVoIP", "Multiview", "Video wall", "NDI", "4K60", "Dante", "KVM"];
const ioOptions = ["HDMI over distance", "HDMI USB extender", "USB-C presentation", "Matrix routing", "Wireless presentation", "Camera USB"];

function searchProducts(term: string) {
  const clean = term.trim().toLowerCase();

  if (!clean) return [];

  const words = clean.split(/\s+/).filter(Boolean);

  return products.filter((product) => {
    const haystack = `${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.tags.join(" ")}`.toLowerCase();
    return words.some((word) => haystack.includes(word));
  });
}

function addToStandaloneShortlist(product: FinderProduct) {
  const saved = window.localStorage.getItem(SHORTLIST_KEY);

  const current = saved
    ? (JSON.parse(saved) as Array<{ sku: string }>)
    : [];

  const next = [
    {
      sku: product.sku,
      title: product.title,
      family: product.family,
      category: product.category,
      status: "recommended",
      tags: product.tags,
      addedAt: new Date().toISOString(),
      source: "Product Finder",
      evidence: ["Selected from simplified Product Finder."],
      cautions: ["Validate final specifications, accessories, lifecycle and regional suitability before customer issue."],
    },
    ...current.filter((item) => item.sku !== product.sku),
  ].slice(0, 10);

  window.localStorage.setItem(SHORTLIST_KEY, JSON.stringify(next));
}

export function FinderPage() {
  const [activeRoute, setActiveRoute] = useState<FinderRouteId | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("");

  const route = routes.find((item) => item.id === activeRoute) ?? null;

  const calculatedTerm = useMemo(() => {
    if (!activeRoute) return "";
    if (activeRoute === "avoip") return "AVoIP NetworkHD";
    if (activeRoute === "wall") return "Video wall";
    return searchTerm;
  }, [activeRoute, searchTerm]);

  const results = useMemo(() => searchProducts(calculatedTerm), [calculatedTerm]);

  function openRoute(id: FinderRouteId) {
    setActiveRoute(id);
    setSearchTerm("");
    setNotice("");
  }

  function closeRoute() {
    setActiveRoute(null);
    setSearchTerm("");
    setNotice("");
  }

  function addProduct(product: FinderProduct) {
    addToStandaloneShortlist(product);
    setNotice(`${product.sku} added to shortlist.`);
  }

  return (
    <main className="finder-simple-page">
      <section className="finder-simple-hero">
        <div>
          <p className="finder-simple-kicker">Product Finder - simplified route search</p>
          <h1>Choose how you want to find the product.</h1>
          <p>
            The technical filter stack is hidden. Start with the search route, then only answer what is needed for that route.
          </p>
        </div>

        <div className="finder-simple-actions">
          <Link className="finder-simple-button" to="/wingman/guided-discovery">Guided Discovery</Link>
          <Link className="finder-simple-button primary" to="/wingman/proposal">Open Proposal</Link>
        </div>
      </section>

      <section className="finder-simple-route-grid">
        {routes.map(({ id, title, description, bestFor, Icon }) => (
          <button key={id} type="button" className="finder-simple-route-card" onClick={() => openRoute(id)}>
            <Icon aria-hidden="true" />
            <strong>{title}</strong>
            <span>{description}</span>
            <small>{bestFor}</small>
          </button>
        ))}
      </section>

      {activeRoute && route ? (
        <div className="finder-simple-modal-backdrop">
          <section className="finder-simple-modal" role="dialog" aria-modal="true" aria-labelledby="finder-simple-title">
            <header>
              <div>
                <p className="finder-simple-kicker">Focused search</p>
                <h2 id="finder-simple-title">{route.title}</h2>
                <span>{route.description}</span>
              </div>

              <button type="button" className="finder-simple-icon-button" onClick={closeRoute} aria-label="Close">
                <X aria-hidden="true" />
              </button>
            </header>

            {activeRoute === "sku" ? (
              <label className="finder-simple-field">
                <span>Search SKU or phrase</span>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Example: RX-70, HDMI USB extender, NetworkHD 500"
                />
              </label>
            ) : null}

            {activeRoute === "io" ? (
              <section className="finder-simple-option-grid">
                {ioOptions.map((item) => (
                  <button key={item} type="button" className={searchTerm === item ? "is-selected" : ""} onClick={() => setSearchTerm(item)}>
                    {item}
                  </button>
                ))}
              </section>
            ) : null}

            {activeRoute === "family" ? (
              <section className="finder-simple-option-grid">
                {familyOptions.map((item) => (
                  <button key={item} type="button" className={searchTerm === item ? "is-selected" : ""} onClick={() => setSearchTerm(item)}>
                    {item}
                  </button>
                ))}
              </section>
            ) : null}

            {activeRoute === "feature" ? (
              <section className="finder-simple-option-grid">
                {featureOptions.map((item) => (
                  <button key={item} type="button" className={searchTerm === item ? "is-selected" : ""} onClick={() => setSearchTerm(item)}>
                    {item}
                  </button>
                ))}
              </section>
            ) : null}

            {activeRoute === "avoip" ? (
              <section className="finder-simple-note">
                <Network aria-hidden="true" />
                <div>
                  <strong>AV-over-IP search</strong>
                  <p>Showing NetworkHD and AVoIP products. Refine later by 100, 500 or 600 series workflow.</p>
                </div>
              </section>
            ) : null}

            {activeRoute === "wall" ? (
              <section className="finder-simple-note">
                <Video aria-hidden="true" />
                <div>
                  <strong>Video wall search</strong>
                  <p>Showing wall processors and multiview or wall-related products. Use the Video Wall page for deeper design.</p>
                </div>
              </section>
            ) : null}

            <section className="finder-simple-results">
              <div className="finder-simple-results-heading">
                <div>
                  <p className="finder-simple-kicker">Results</p>
                  <h3>{results.length ? `${results.length} possible matches` : "Choose or type a search term"}</h3>
                </div>
                {notice ? <em>{notice}</em> : null}
              </div>

              {results.length ? (
                <div className="finder-simple-product-grid">
                  {results.map((product) => (
                    <article key={product.sku} className="finder-simple-product-card">
                      <strong>{product.sku}</strong>
                      <h4>{product.title}</h4>
                      <p>{product.description}</p>
                      <div>
                        <span>{product.family}</span>
                        <span>{product.category}</span>
                        {product.tags.slice(0, 4).map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                      <button type="button" className="finder-simple-button" onClick={() => addProduct(product)}>
                        <Plus aria-hidden="true" />
                        Add to shortlist
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="finder-simple-empty">
                  <PackageSearch aria-hidden="true" />
                  <strong>No products shown yet</strong>
                  <p>Select a route option or enter a search phrase.</p>
                </div>
              )}
            </section>

            <footer>
              <button type="button" className="finder-simple-button" onClick={closeRoute}>
                Close
              </button>
              <Link className="finder-simple-button primary" to="/wingman/proposal">
                Send shortlist to Proposal
                <ArrowRight aria-hidden="true" />
              </Link>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}