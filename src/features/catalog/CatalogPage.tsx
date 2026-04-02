import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SplitWorkspaceFrame from "@/components/workspace/SplitWorkspaceFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { getAllProducts } from "@/data/productService";

type ProductCard = {
  sku: string;
  name: string;
  family: string;
  technology: string;
  summary: string;
  tags: string[];
  url?: string;
};

const liveProducts: ProductCard[] = getAllProducts().map((product) => ({
  sku: product.sku || "UNKNOWN",
  name: product.name || product.sku || "Unnamed product",
  family: product.category || product.technology || "Other",
  technology: product.technology || product.category || "Other",
  summary: product.description || "Structured product detail is still being expanded for this SKU.",
  tags: Array.from(
    new Set(
      [
        ...(product.features ?? []),
        ...(product.applications ?? []),
        ...(product.inputs ?? []),
        ...(product.outputs ?? []),
      ].filter(Boolean),
    ),
  ).slice(0, 5),
  url: product.url,
}));

const families = ["All", ...Array.from(new Set(liveProducts.map((product) => product.family))).sort()];

export default function CatalogPage() {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("All");
  const [panel, setPanel] = useState<"detail" | "matches">("detail");
  const [selectedSku, setSelectedSku] = useState(liveProducts[0]?.sku ?? "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return liveProducts.filter((product) => {
      const familyMatch = family === "All" || product.family === family;
      const queryMatch =
        !q ||
        product.sku.toLowerCase().includes(q) ||
        product.name.toLowerCase().includes(q) ||
        product.technology.toLowerCase().includes(q) ||
        product.summary.toLowerCase().includes(q) ||
        product.tags.some((tag) => tag.toLowerCase().includes(q));

      return familyMatch && queryMatch;
    });
  }, [query, family]);

  useEffect(() => {
    if (filtered.length === 0) return;
    if (!filtered.some((product) => product.sku === selectedSku)) {
      setSelectedSku(filtered[0].sku);
    }
  }, [filtered, selectedSku]);

  const selectedProduct = filtered.find((product) => product.sku === selectedSku) ?? filtered[0] ?? null;

  const left = (
    <div className="wm-workspace-stack">
      <div className="wm-start-step">
        Narrow the product family first. Keep SKU-level detail in view only after the shortlist is clean.
      </div>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Filter products</h3>
          <p className="wm-workspace-card__copy">Reduce the list before asking the user to react to individual SKUs.</p>
        </div>

        <div className="wm-workspace-form">
          <div className="wm-workspace-field">
            <label htmlFor="catalog-query">Search</label>
            <input
              id="catalog-query"
              className="wm-input-dark"
              type="text"
              placeholder="SKU, family, feature, application"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="wm-workspace-field">
            <span className="wm-workspace-label">Product family</span>
            <div className="wm-workspace-tag-row">
              {families.map((item) => {
                const active = item === family;
                return (
                  <button
                    key={item}
                    type="button"
                    className={`wm-workspace-tab${active ? " wm-workspace-tab--active" : ""}`}
                    onClick={() => setFamily(item)}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-grid-2">
          <div className="wm-workspace-metric">
            <span>Matches</span>
            <strong>{filtered.length}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Selected</span>
            <strong>{selectedProduct?.sku ?? "None"}</strong>
          </div>
        </div>

        <div className="wm-next-step">
          Open Compare when the user is weighing options. Open Proposal when the shortlist is stable enough to move forward.
        </div>
      </section>
    </div>
  );

  const right = (
    <div className="wm-workspace-stack">
      <section className="wm-workspace-card">
        <div className="wm-workspace-tab-row">
          <button
            type="button"
            className={`wm-workspace-tab${panel === "detail" ? " wm-workspace-tab--active" : ""}`}
            onClick={() => setPanel("detail")}
          >
            Selected product
          </button>
          <button
            type="button"
            className={`wm-workspace-tab${panel === "matches" ? " wm-workspace-tab--active" : ""}`}
            onClick={() => setPanel("matches")}
          >
            Matching products
          </button>
        </div>

        {panel === "detail" ? (
          selectedProduct ? (
            <div className="wm-workspace-tabpanel">
              <div className="wm-workspace-card wm-workspace-card--muted">
                <div className="wm-workspace-card__header">
                  <span className="wm-workspace-list-item__eyebrow">{selectedProduct.sku}</span>
                  <h3 className="wm-workspace-card__title">{selectedProduct.name}</h3>
                  <p className="wm-workspace-card__copy">{selectedProduct.summary}</p>
                </div>

                <div className="wm-workspace-grid-2">
                  <div className="wm-workspace-metric">
                    <span>Family</span>
                    <strong>{selectedProduct.family}</strong>
                  </div>
                  <div className="wm-workspace-metric">
                    <span>Technology</span>
                    <strong>{selectedProduct.technology}</strong>
                  </div>
                </div>

                <div className="wm-workspace-tag-row">
                  {selectedProduct.tags.length > 0
                    ? selectedProduct.tags.map((tag) => (
                        <span key={tag} className="wm-workspace-tag">
                          {tag}
                        </span>
                      ))
                    : <span className="wm-workspace-tag">Structured detail pending</span>}
                </div>
              </div>

              <div className="wm-workspace-action-row">
                <Link to={WM_ROUTES.compare} className="wm-btn-secondary">
                  Open compare
                </Link>
                <Link to={WM_ROUTES.proposal} className="wm-btn-primary">
                  Continue to proposal
                </Link>
                {selectedProduct.url ? (
                  <a href={selectedProduct.url} target="_blank" rel="noreferrer" className="wm-btn">
                    Manufacturer page
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="wm-workspace-empty">No matching products. Adjust the search or clear the family filter.</div>
          )
        ) : (
          <div className="wm-workspace-list">
            {filtered.length > 0 ? (
              filtered.map((product) => (
                <button
                  key={product.sku}
                  type="button"
                  className={`wm-workspace-list-item${selectedProduct?.sku === product.sku ? " wm-workspace-list-item--active" : ""}`}
                  onClick={() => {
                    setSelectedSku(product.sku);
                    setPanel("detail");
                  }}
                >
                  <span className="wm-workspace-list-item__eyebrow">{product.sku}</span>
                  <span className="wm-workspace-list-item__title">{product.name}</span>
                  <span className="wm-workspace-list-item__copy">{product.family} | {product.technology}</span>
                </button>
              ))
            ) : (
              <div className="wm-workspace-empty">No matching products. Adjust the search or clear the family filter.</div>
            )}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <SplitWorkspaceFrame
      title="Product Catalogue"
      subtitle="Keep the controls on the left and the shortlisted detail on the right so users can always see what narrowed the result."
      leftTitle="Filters"
      rightTitle="Results"
      left={left}
      right={right}
      top={
        <div className="wm-workspace-action-row">
          <Link to={WM_ROUTES.compare} className="wm-btn-secondary">
            Compare options
          </Link>
          <Link to={WM_ROUTES.proposal} className="wm-btn-primary">
            Move to proposal
          </Link>
        </div>
      }
    />
  );
}
