import * as React from "react";
import type { ProductCardView } from "./catalogue.types";
import "./catalogue2.css";

type ProductCardProps = {
  product: ProductCardView;
  compared: boolean;
  onToggleCompare: (sku: string) => void;
  onViewDetails: (sku: string) => void;
};

export default function ProductCard({
  product,
  compared,
  onToggleCompare,
  onViewDetails,
}: ProductCardProps) {
  return (
    <article className="wm-cat2__card">
      <div className="wm-cat2__card-top">
        <div>
          <p className="wm-cat2__sku">{product.sku}</p>
          <h3 className="wm-cat2__card-title">{product.name}</h3>
        </div>
        <span className="wm-cat2__status">{product.status}</span>
      </div>

      <div className="wm-cat2__badge-row">
        <span className="wm-cat2__tech-badge">{product.technology}</span>
        <span className="wm-cat2__mini-badge">{product.category}</span>
      </div>

      <p className="wm-cat2__summary">{product.summary}</p>

      <div className="wm-cat2__feature-pills">
        {product.featureTags.slice(0, 5).map((tag) => (
          <span key={tag} className="wm-cat2__pill">
            {tag}
          </span>
        ))}
      </div>

      <div className="wm-cat2__specs">
        {product.resolution ? <span>Resolution: {product.resolution}</span> : null}
        {product.distance ? <span>Distance: {product.distance}</span> : null}
        {product.transport ? <span>Transport: {product.transport}</span> : null}
      </div>

      <div className="wm-cat2__apps">
        Best for: {product.applications.slice(0, 2).join(" ?f��??s�� ")}
      </div>

      <div className="wm-cat2__actions">
        <button type="button" className="wm-cat2__btn wm-cat2__btn--ghost" onClick={() => onViewDetails(product.sku)}>
          View details
        </button>
        <button
          type="button"
          className={compared ? "wm-cat2__btn wm-cat2__btn--active" : "wm-cat2__btn wm-cat2__btn--primary"}
          onClick={() => onToggleCompare(product.sku)}
        >
          {compared ? "Remove compare" : "Add to compare"}
        </button>
      </div>
    </article>
  );
}