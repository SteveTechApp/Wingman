import { useMemo, useState } from "react";
import { ProductCallCardsShell } from "./ProductCallCardsShell";
import { PRODUCT_CALL_PRODUCTS, loadCallContext, navigateCallCardPage, saveCallContext } from "./store";

const filters = ["UC", "Audio", "USB", "USB-C", "Wireless", "Switching", "Matrix", "AVoIP", "HDBaseT", "Multiview", "Education", "Video wall"];

export function ProductCallCardsSelectPage() {
  const context = loadCallContext();
  const [query, setQuery] = useState(context.selectedSku || "");
  const [selectedSku, setSelectedSku] = useState(context.selectedSku || PRODUCT_CALL_PRODUCTS[0].sku);
  const [activeFilter, setActiveFilter] = useState("");

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLowerCase();

    return PRODUCT_CALL_PRODUCTS.filter((product) => {
      const text = `${product.sku} ${product.name} ${product.category} ${product.family}`.toLowerCase();
      const matchesSearch = !search || text.includes(search);
      const matchesFilter = !activeFilter || product.tags.includes(activeFilter);

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, query]);

  const selectedProduct = PRODUCT_CALL_PRODUCTS.find((product) => product.sku === selectedSku) || filteredProducts[0] || PRODUCT_CALL_PRODUCTS[0];

  const chooseProduct = (sku: string) => {
    const product = PRODUCT_CALL_PRODUCTS.find((item) => item.sku === sku);

    if (!product) {
      return;
    }

    setSelectedSku(product.sku);
    setQuery(product.sku);
    saveCallContext({
      selectedSku: product.sku,
      selectedName: product.name
    });
  };

  const openProduct = () => {
    chooseProduct(selectedProduct.sku);
    navigateCallCardPage(`/product/${encodeURIComponent(selectedProduct.sku)}`);
  };

  return (
    <ProductCallCardsShell
      activeStep="select"
      title="Select the WyreStorm product"
      intro="Choose the SKU you want to position. Keep this page focused on selection, not the full sales card."
    >
      <section className="wm-pcc-panel">
        <div className="wm-pcc-select-grid">
          <label className="wm-pcc-field">
            <span>Search / type-ahead SKU</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type SKU or product name" />
          </label>

          <label className="wm-pcc-field">
            <span>Choose from full SKU list</span>
            <select value={selectedProduct.sku} onChange={(event) => chooseProduct(event.target.value)}>
              {PRODUCT_CALL_PRODUCTS.map((product) => (
                <option key={product.sku} value={product.sku}>
                  {product.sku} — {product.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="wm-pcc-filter-row">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`wm-pcc-filter ${activeFilter === filter ? "is-selected" : ""}`}
              onClick={() => setActiveFilter(activeFilter === filter ? "" : filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="wm-pcc-product-results">
          {filteredProducts.map((product) => (
            <button
              type="button"
              key={product.sku}
              className={`wm-pcc-product-option ${selectedProduct.sku === product.sku ? "is-selected" : ""}`}
              onClick={() => chooseProduct(product.sku)}
            >
              <strong>{product.sku}</strong>
              <span>{product.name}</span>
              <small>{product.category}</small>
            </button>
          ))}
        </div>

        <article className="wm-pcc-selected-card">
          <p className="wm-pcc-eyebrow">Selected product preview</p>
          <h2>{selectedProduct.sku}</h2>
          <h3>{selectedProduct.name}</h3>
          <p>{selectedProduct.whatItIs}</p>
          <dl>
            <div>
              <dt>Category</dt>
              <dd>{selectedProduct.category}</dd>
            </div>
            <div>
              <dt>Best fit</dt>
              <dd>{selectedProduct.bestFor}</dd>
            </div>
            <div>
              <dt>Confidence</dt>
              <dd>{selectedProduct.confidence}</dd>
            </div>
          </dl>
        </article>

        <footer className="wm-pcc-actions">
          <button type="button" className="wm-pcc-secondary" onClick={() => navigateCallCardPage("/setup")}>
            Back to call setup
          </button>
          <button type="button" className="wm-pcc-primary" onClick={openProduct}>
            Open product sales page
          </button>
        </footer>
      </section>
    </ProductCallCardsShell>
  );
}