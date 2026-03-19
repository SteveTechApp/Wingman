import * as React from "react";
import type { CatalogueProduct } from "./catalogue.types";
import "./catalogue2.css";

type ProductDetailDrawerProps = {
 product: CatalogueProduct | null;
 onClose: () => void;
};

export default function ProductDetailDrawer({
  product,
  onClose,
}: ProductDetailDrawerProps) {
  if (!product) return null;

  return (
    <div className="wm-cat2__detail-backdrop" onClick={onClose}>
      <aside
        className="wm-work-card wm-cat2__detail"
        onClick={(e) => e.stopPropagation()}
        aria-label="Product details"
      >
        <div className="wm-cat2__detail-head">
          <div>
            <p className="wm-cat2__sku">{product.sku}</p>
            <h2 className="wm-cat2__detail-title">{product.name}</h2>
            <p className="wm-cat2__detail-subtitle">{product.technology} / {product.category}</p>
          </div>

          <button type="button" className="wm-cat2__icon-btn" onClick={onClose} aria-label="Close details">
            Close
          </button>
        </div>

        <div className="wm-cat2__detail-section">
          <h3>Summary</h3>
          <p>{product.summary}</p>
        </div>

        <div className="wm-cat2__detail-section">
          <h3>Key metadata</h3>
          <div className="wm-cat2__detail-meta">
            <span className="wm-cat2__mini-badge">Status: {product.status}</span>
            {product.resolution ? <span className="wm-cat2__mini-badge">Resolution: {product.resolution}</span> : null}
            {product.distance ? <span className="wm-cat2__mini-badge">Distance: {product.distance}</span> : null}
            {product.transport ? <span className="wm-cat2__mini-badge">Transport: {product.transport}</span> : null}
          </div>
        </div>

        <div className="wm-cat2__detail-section">
          <h3>Feature tags</h3>
          <div className="wm-cat2__feature-pills">
            {product.featureTags.length > 0 ? (
              product.featureTags.map((tag) => (
                <span key={tag} className="wm-cat2__pill">{tag}</span>
              ))
            ) : (
              <span className="wm-cat2__mini-badge">No extracted tags</span>
            )}
          </div>
        </div>

        <div className="wm-cat2__detail-section">
          <h3>Applications</h3>
          <div className="wm-cat2__feature-pills">
            {product.applications.map((app) => (
              <span key={app} className="wm-cat2__mini-badge">{app}</span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
