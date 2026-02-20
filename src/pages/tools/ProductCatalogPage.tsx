import React from "react";
import { PRODUCT_DATABASE } from "@/data/productDatabase";

export default function ProductCatalogPage() {
  return (
    <div className="wm-card wm-card-pad">
      <div className="wm-h2">Product Catalog</div>
      <div className="wm-p" style={{ marginTop: 8 }}>Loaded {PRODUCT_DATABASE.length} products.</div>
    </div>
  );
}
