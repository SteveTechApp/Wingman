import { useMemo, useState } from "react";
import GlowGuide from "@/ui2/page/GlowGuide";
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
    new Set([
      ...(product.features ?? []),
      ...(product.applications ?? []),
      ...(product.inputs ?? []),
      ...(product.outputs ?? []),
    ].filter(Boolean)),
  ).slice(0, 4),
  url: product.url,
}));

const families = ["All", ...Array.from(new Set(liveProducts.map((product) => product.family))).sort()];

export default function CatalogPage() {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("All");

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

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="wm-surface-card" style={{ padding: 18, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div className="wm-page-kicker">Catalogue</div>
          <div className="wm-page-title">Find the right WyreStorm product faster</div>
          <div className="wm-page-copy">
            Search by SKU, product family, or application theme. Keep the catalogue focused on discovery and
            positioning, not as a dense all-in-one information dump.
          </div>
        </div>

        <GlowGuide
          title="Current priority"
          activeIndex={0}
          steps={[
            { title: "Narrow by family", copy: "Start with the solution family before chasing individual SKUs." },
            { title: "Scan shortlists", copy: "Use the filtered cards to identify viable product directions quickly." },
            { title: "Open next workflow", copy: "Take the shortlisted direction into compare, room design, or proposal." },
          ]}
          note="Catalogue should feel like a product finder, not a spreadsheet."
        />
      </section>

      <section className="wm-grid-2">
        <aside className="wm-surface-card" style={{ padding: 16, display: "grid", gap: 12, alignSelf: "start" }}>
          <div>
            <div className="wm-section-title">Search</div>
            <div className="wm-section-copy">Reduce noise before showing products.</div>
          </div>

          <input
            className="wm-input-dark"
            type="text"
            placeholder="SKU, family, feature, application"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="wm-toolbar-row">
            {families.map((item) => {
              const active = item === family;
              return (
                <button
                  key={item}
                  type="button"
                  className={`wm-chip${active ? " wm-chip--active" : ""}`}
                  onClick={() => setFamily(item)}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="wm-surface-card" style={{ padding: 16, display: "grid", gap: 12, minHeight: 0 }}>
          <div>
            <div className="wm-section-title">Results</div>
            <div className="wm-section-copy">{filtered.length} matching products</div>
          </div>

          <div className="wm-fit-page__scroll">
            <div className="wm-grid-3">
              {filtered.map((product) => (
                <article key={product.sku} className="wm-product-card">
                  <div className="wm-product-card__sku">{product.sku}</div>
                  <div className="wm-product-card__title">{product.name}</div>
                  <div className="wm-product-card__copy">{product.summary}</div>
                  <div className="wm-product-card__meta">
                    <div><strong>Family:</strong> {product.family}</div>
                    <div><strong>Technology:</strong> {product.technology}</div>
                    <div><strong>Tags:</strong> {product.tags.join(" | ") || "Structured data pending"}</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
