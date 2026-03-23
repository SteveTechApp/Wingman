import * as React from "react";

import { buildAccentCardStyle } from "./catalogCategoryAccent";
import type { ProductCardView } from "./catalogue.types";
import "./catalogue2.css";

type ProductDigestRowProps = {
  product: ProductCardView;
  compared: boolean;
  onToggleCompare: (sku: string) => void;
  onViewDetails: (sku: string) => void;
};

export default function ProductDigestRow({
  product,
  compared,
  onToggleCompare,
  onViewDetails,
}: ProductDigestRowProps) {
  const accentStyle = buildAccentCardStyle(`${product.technology} ${product.category} ${product.subType}`);
  const factItems = [
    product.resolution ? `Resolution: ${product.resolution}` : null,
    product.distance ? `Distance: ${product.distance}` : null,
    product.transport ? `Transport: ${product.transport}` : null,
  ].filter(Boolean) as string[];
  const visibleTags = product.featureTags.slice(0, 4);
  const showSubType = product.subType && product.subType !== product.category;
  const rowStyle = {
    border: accentStyle.border,
    background: accentStyle.background,
    boxShadow: accentStyle.boxShadow,
    "--wm-cat2-card-accent-bar": accentStyle.accentBar,
    "--wm-cat2-accent-chip-bg": accentStyle.chipBg,
    "--wm-cat2-accent-chip-text": accentStyle.chipText,
  } as React.CSSProperties;

  return (
    <article className="wm-work-card wm-cat2__row" style={rowStyle}>
      <div className="wm-cat2__row-copy">
        <div className="wm-cat2__row-head">
          <div>
            <p className="wm-cat2__sku">{product.sku}</p>
            <h3 className="wm-cat2__row-title">{product.name}</h3>
          </div>
          <span className="wm-cat2__status">{product.status}</span>
        </div>

        <p className="wm-cat2__row-summary">{product.summary}</p>

        <div className="wm-cat2__badge-row">
          <span className="wm-cat2__tech-badge">{product.technology}</span>
          <span className="wm-cat2__mini-badge">{product.category}</span>
          {showSubType ? <span className="wm-cat2__mini-badge">{product.subType}</span> : null}
          {visibleTags.map((tag) => (
            <span key={tag} className="wm-cat2__pill">
              {tag}
            </span>
          ))}
        </div>

        <div className="wm-cat2__row-meta">
          <span className="wm-cat2__row-bestfor">Best fit: {product.applications.slice(0, 3).join(", ")}</span>
          {factItems.map((item) => (
            <span key={item} className="wm-cat2__row-fact">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="wm-cat2__row-actions">
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
