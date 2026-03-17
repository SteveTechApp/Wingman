import * as React from "react";
import type { CatalogueProduct } from "./catalogue.types";
import "./catalogue2.css";

type CompareDrawerProps = {
 products: CatalogueProduct[];
 onRemove: (sku: string) => void;
};

export default function CompareDrawer({ products, onRemove }: CompareDrawerProps) {
 return (
 <aside className="wm-cat2__compare">
 <div className="wm-cat2__compare-head">
 <h2>Compare</h2>
 <span className="wm-cat2__meta-pill">{products.length}/4</span>
 </div>

 {products.length === 0 ? (
 <p className="wm-cat2__compare-empty">
 Select up to 4 products to compare key options side by side.
 </p>
 ) : (
 <div className="wm-cat2__compare-list">
 {products.map((product) => (
 <div key={product.sku} className="wm-cat2__compare-item">
 <div>
 <p className="wm-cat2__sku">{product.sku}</p>
 <strong>{product.name}</strong>
 <p className="wm-cat2__compare-copy">{product.technology}</p>
 </div>
 <button
 type="button"
 className="wm-cat2__icon-btn"
 onClick={() => onRemove(product.sku)}
 aria-label={"Remove " + product.sku}
 >
 f ?"
 </button>
 </div>
 ))}
 </div>
 )}
 </aside>
 );
}