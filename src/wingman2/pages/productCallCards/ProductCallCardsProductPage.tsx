import { useEffect, useMemo, useState } from "react";
import { ProductCallCardsModal } from "./ProductCallCardsModal";
import { ProductCallCardsShell } from "./ProductCallCardsShell";
import { findProduct, getLanguageAwareWording, getLanguageProfile, loadCallContext, navigateCallCardPage } from "./store";

type ProductCallCardsProductPageProps = {
  sku?: string;
};

type DashboardView =
  | "overview"
  | "features"
  | "io"
  | "applications"
  | "sales"
  | "checks"
  | "media";

type IndexedProductRecord = Record<string, unknown>;

type ProductDashboardSpec = {
  found: boolean;
  sourceLabel: string;
  keyFeatures: string[];
  ioSummary: string[];
  applications: string[];
  controlIntegration: string[];
  notes: string[];
};

const dashboardViews: { key: DashboardView; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "features", label: "Key features" },
  { key: "io", label: "I/O" },
  { key: "applications", label: "Applications" },
  { key: "sales", label: "Sales language" },
  { key: "checks", label: "Checks" },
  { key: "media", label: "Images / diagrams" }
];

function normaliseSku(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toTextList(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => toTextList(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|;|\|/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return Object.entries(record)
      .map(([key, item]) => {
        if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
          return `${key}: ${item}`;
        }

        return "";
      })
      .filter(Boolean);
  }

  return [];
}

function valueForKeys(record: IndexedProductRecord, keys: string[]): unknown {
  const normalisedKeys = Object.keys(record).reduce<Record<string, string>>((acc, key) => {
    acc[key.toLowerCase().replace(/[^a-z0-9]/g, "")] = key;
    return acc;
  }, {});

  for (const key of keys) {
    const actual = normalisedKeys[key.toLowerCase().replace(/[^a-z0-9]/g, "")];

    if (actual) {
      return record[actual];
    }
  }

  return undefined;
}

function flattenProductCandidates(data: unknown): IndexedProductRecord[] {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data.flatMap((item) => flattenProductCandidates(item));
  }

  if (typeof data === "object") {
    const record = data as IndexedProductRecord;
    const likelySku = valueForKeys(record, ["sku", "model", "productSku", "partNumber"]);

    if (likelySku) {
      return [record];
    }

    return Object.values(record).flatMap((item) => flattenProductCandidates(item));
  }

  return [];
}

function getFallbackDashboardSpec(product: ReturnType<typeof findProduct>): ProductDashboardSpec {
  return {
    found: false,
    sourceLabel: "Call-card starter data",
    keyFeatures: [
      product.whatItIs,
      product.whatItDoes,
      product.whyItMatters
    ].filter(Boolean),
    ioSummary: [
      "Detailed I/O is not yet connected to the confirmed product data source.",
      "Use the product intelligence index or a confirmed WyreStorm spec record for input/output type and count.",
      "Do not guess ports or quantities from sales wording."
    ],
    applications: product.goodFit,
    controlIntegration: [
      "Control and integration details need to be pulled from confirmed product data.",
      "Check control, USB, audio, network and power details before using as proposal wording."
    ],
    notes: [
      product.avoidIf,
      "This dashboard is ready for richer product intelligence data when available."
    ].filter(Boolean)
  };
}

function buildDashboardSpec(product: ReturnType<typeof findProduct>, record?: IndexedProductRecord): ProductDashboardSpec {
  if (!record) {
    return getFallbackDashboardSpec(product);
  }

  const features = [
    ...toTextList(valueForKeys(record, ["keyFeatures", "features", "majorFeatures", "featureSummary", "sellingPoints"])),
    ...toTextList(valueForKeys(record, ["description", "summary"]))
  ];

  const io = [
    ...toTextList(valueForKeys(record, ["ioSummary", "iOSummary", "inputsOutputs", "inputs", "outputs", "ports", "connectivity", "connections"])),
    ...toTextList(valueForKeys(record, ["videoInputs", "videoOutputs", "audioInputs", "audioOutputs", "usb", "network", "power"]))
  ];

  const applications = [
    ...toTextList(valueForKeys(record, ["applications", "useCases", "bestFor", "verticals", "roomTypes"])),
    ...product.goodFit
  ];

  const controlIntegration = [
    ...toTextList(valueForKeys(record, ["control", "integration", "rs232", "ir", "api", "cec", "ethernet", "networkControl", "audio", "usb"]))
  ];

  const notes = [
    ...toTextList(valueForKeys(record, ["notes", "limitations", "warnings", "compatibility", "checkBeforeQuoting"])),
    product.avoidIf
  ];

  return {
    found: true,
    sourceLabel: "Product intelligence index",
    keyFeatures: features.length ? Array.from(new Set(features)).slice(0, 8) : getFallbackDashboardSpec(product).keyFeatures,
    ioSummary: io.length ? Array.from(new Set(io)).slice(0, 10) : getFallbackDashboardSpec(product).ioSummary,
    applications: applications.length ? Array.from(new Set(applications)).slice(0, 8) : product.goodFit,
    controlIntegration: controlIntegration.length ? Array.from(new Set(controlIntegration)).slice(0, 8) : getFallbackDashboardSpec(product).controlIntegration,
    notes: notes.length ? Array.from(new Set(notes)).slice(0, 8) : getFallbackDashboardSpec(product).notes
  };
}

export function ProductCallCardsProductPage({ sku }: ProductCallCardsProductPageProps) {
  const product = findProduct(sku);
  const context = loadCallContext();
  const wording = getLanguageAwareWording(product, context);
  const languageProfile = getLanguageProfile(context);
  const [activeView, setActiveView] = useState<DashboardView>("overview");
  const [modal, setModal] = useState<"images" | "diagrams" | "">("");
  const [indexRecord, setIndexRecord] = useState<IndexedProductRecord | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function loadIndex() {
      try {
        const response = await fetch("/product-intelligence-index.json", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const candidates = flattenProductCandidates(data);
        const found = candidates.find((candidate) => {
          const candidateSku = String(valueForKeys(candidate, ["sku", "model", "productSku", "partNumber"]) || "");
          return normaliseSku(candidateSku) === normaliseSku(product.sku);
        });

        if (!cancelled) {
          setIndexRecord(found);
        }
      } catch {
        if (!cancelled) {
          setIndexRecord(undefined);
        }
      }
    }

    void loadIndex();

    return () => {
      cancelled = true;
    };
  }, [product.sku]);

  const dashboardSpec = useMemo(() => buildDashboardSpec(product, indexRecord), [indexRecord, product]);

  const renderList = (items: string[]) => (
    <ul className="wm-pcc-dashboard-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );

  const renderSelectedView = () => {
    if (activeView === "overview") {
      return (
        <div className="wm-pcc-dashboard-overview">
          <article className="wm-pcc-card">
            <h2>Product summary</h2>
            <p>{wording.headline}</p>
            <p><strong>What it is:</strong> {wording.whatItIs}</p>
            <p><strong>Why it matters:</strong> {wording.whyItMatters}</p>
          </article>

          <article className="wm-pcc-card">
            <h2>Snapshot</h2>
            <dl className="wm-pcc-dashboard-dl">
              <div>
                <dt>SKU</dt>
                <dd>{product.sku}</dd>
              </div>
              <div>
                <dt>Product</dt>
                <dd>{product.name}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{product.category}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{dashboardSpec.sourceLabel}</dd>
              </div>
            </dl>
          </article>
        </div>
      );
    }

    if (activeView === "features") {
      return (
        <article className="wm-pcc-card">
          <h2>Key features</h2>
          {renderList(dashboardSpec.keyFeatures)}
        </article>
      );
    }

    if (activeView === "io") {
      return (
        <article className="wm-pcc-card">
          <h2>I/O type and count</h2>
          <p className="wm-pcc-guidance-note">
            This should come from confirmed product data. The dashboard will show exact input/output details when the product intelligence index contains them.
          </p>
          {renderList(dashboardSpec.ioSummary)}
        </article>
      );
    }

    if (activeView === "applications") {
      return (
        <article className="wm-pcc-card">
          <h2>Applications and fit</h2>
          {renderList(dashboardSpec.applications)}
        </article>
      );
    }

    if (activeView === "sales") {
      return (
        <article className="wm-pcc-card">
          <h2>Sales language</h2>
          <div className="wm-pcc-sales-language-grid">
            <section>
              <h3>Customer benefit</h3>
              <p>{wording.customerBenefit}</p>
            </section>
            <section>
              <h3>Sales angle</h3>
              <p>{wording.salespersonAngle}</p>
            </section>
            <section>
              <h3>Follow-up wording</h3>
              <textarea className="wm-pcc-textarea" value={product.followUp} readOnly />
            </section>
          </div>
        </article>
      );
    }

    if (activeView === "checks") {
      return (
        <div className="wm-pcc-dashboard-overview">
          <article className="wm-pcc-card">
            <h2>Checks that affect fit</h2>
            {renderList(product.checks)}
          </article>
          <article className="wm-pcc-card">
            <h2>Integration / control notes</h2>
            {renderList(dashboardSpec.controlIntegration)}
          </article>
          <article className="wm-pcc-card">
            <h2>Avoid saying</h2>
            {renderList(product.avoidSaying)}
          </article>
          <article className="wm-pcc-card">
            <h2>Notes / limits</h2>
            {renderList(dashboardSpec.notes)}
          </article>
        </div>
      );
    }

    return (
      <article className="wm-pcc-card">
        <h2>Images and diagrams</h2>
        <p>Keep images and diagrams out of the main dashboard. Open them only when the salesperson needs visual support.</p>
        <div className="wm-pcc-dashboard-actions">
          <button type="button" onClick={() => setModal("images")}>Open product images</button>
          <button type="button" onClick={() => setModal("diagrams")}>Open system diagrams</button>
        </div>
      </article>
    );
  };

  return (
    <ProductCallCardsShell
      activeStep="product"
      title={`${product.sku} product dashboard`}
      intro="Use this as a live product dashboard. Pick what you want to view instead of scrolling through every sales section."
    >
      <section className="wm-pcc-panel wm-pcc-dashboard-panel">
        <article className="wm-pcc-dashboard-hero">
          <div>
            <p className="wm-pcc-eyebrow">{product.category}</p>
            <h2>{product.sku}</h2>
            <h3>{product.name}</h3>
            <p>{wording.headline}</p>
          </div>

          <div className="wm-pcc-dashboard-actions">
            <button type="button" onClick={() => setModal("images")}>Product images</button>
            <button type="button" onClick={() => setModal("diagrams")}>System diagrams</button>
            <button type="button" onClick={() => navigateCallCardPage(`/response/${encodeURIComponent(product.sku)}`)}>
              Response pack
            </button>
          </div>
        </article>

        <section className="wm-pcc-dashboard-snapshot">
          <article>
            <span>Features</span>
            <strong>{dashboardSpec.keyFeatures.length}</strong>
            <small>available points</small>
          </article>
          <article>
            <span>I/O</span>
            <strong>{dashboardSpec.ioSummary.length}</strong>
            <small>available entries</small>
          </article>
          <article>
            <span>Applications</span>
            <strong>{dashboardSpec.applications.length}</strong>
            <small>fit examples</small>
          </article>
          <article>
            <span>Data source</span>
            <strong>{dashboardSpec.found ? "Indexed" : "Starter"}</strong>
            <small>{dashboardSpec.sourceLabel}</small>
          </article>
        </section>

        <section className="wm-pcc-dashboard-viewbar" aria-label="Product dashboard views">
          {dashboardViews.map((view) => (
            <button
              key={view.key}
              type="button"
              className={activeView === view.key ? "is-selected" : ""}
              onClick={() => setActiveView(view.key)}
            >
              {view.label}
            </button>
          ))}
        </section>

        <section className="wm-pcc-dashboard-content">
          {renderSelectedView()}
        </section>

        <footer className="wm-pcc-actions">
          <button type="button" className="wm-pcc-secondary" onClick={() => navigateCallCardPage("/select")}>
            Back to product selection
          </button>
          <button type="button" className="wm-pcc-primary" onClick={() => navigateCallCardPage(`/response/${encodeURIComponent(product.sku)}`)}>
            Generate response pack
          </button>
        </footer>
      </section>

      {modal === "images" ? (
        <ProductCallCardsModal title={`Product images — ${product.sku}`} onClose={() => setModal("")}>
          <div className="wm-pcc-modal-grid">
            <article>
              <h3>Front / product view</h3>
              <div className="wm-pcc-image-placeholder">Product image window</div>
              <p>Connect this to confirmed product image assets in Phase 2.</p>
            </article>
            <article>
              <h3>Rear / connection view</h3>
              <div className="wm-pcc-image-placeholder">Connection image window</div>
              <p>Rear-panel and connection views should remain separate from the main dashboard.</p>
            </article>
          </div>
        </ProductCallCardsModal>
      ) : null}

      {modal === "diagrams" ? (
        <ProductCallCardsModal title={`System diagrams — ${product.sku}`} onClose={() => setModal("")}>
          <div className="wm-pcc-diagram-placeholder">
            <h3>Diagram canvas</h3>
            <p>Use this for straight-line signal-flow diagrams, application examples and SKU-labelled room layouts.</p>
            <ul>
              <li>Simple room example</li>
              <li>Input/output path</li>
              <li>Display or projector connection path</li>
              <li>Control, USB, audio or network path where relevant</li>
            </ul>
          </div>
        </ProductCallCardsModal>
      ) : null}
    </ProductCallCardsShell>
  );
}