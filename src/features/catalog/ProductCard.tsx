import * as React from "react";
import { buildAccentCardStyle } from "./catalogCategoryAccent";
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
  const accentStyle = buildAccentCardStyle(`${product.technology} ${product.category} ${product.subType}`);
  const factItems = [
    product.resolution ? `Resolution: ${product.resolution}` : null,
    product.distance ? `Distance: ${product.distance}` : null,
    product.transport ? `Transport: ${product.transport}` : null,
  ].filter(Boolean) as string[];
  const visibleTags = product.featureTags.slice(0, 3);
  const hiddenTagCount = Math.max(product.featureTags.length - visibleTags.length, 0);
  const showSubType = product.subType && product.subType !== product.category;
  const cardStyle = {
    border: accentStyle.border,
    background: accentStyle.background,
    boxShadow: accentStyle.boxShadow,
    "--wm-cat2-card-accent-bar": accentStyle.accentBar,
    "--wm-cat2-accent-chip-bg": accentStyle.chipBg,
    "--wm-cat2-accent-chip-text": accentStyle.chipText,
  } as React.CSSProperties;

  return (
    <article className="wm-work-card wm-cat2__card" style={cardStyle}>
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
        {showSubType ? <span className="wm-cat2__mini-badge">{product.subType}</span> : null}
      </div>

      <p className="wm-cat2__summary">{product.summary}</p>

      <div className="wm-cat2__feature-pills">
        {visibleTags.map((tag) => (
          <span key={tag} className="wm-cat2__pill">
            {tag}
          </span>
        ))}
        {hiddenTagCount > 0 ? <span className="wm-cat2__pill wm-cat2__pill--muted">+{hiddenTagCount} more</span> : null}
      </div>

      {factItems.length > 0 ? (
        <div className="wm-cat2__specs">
          {factItems.slice(0, 2).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}

      <div className="wm-cat2__apps">
        Best for: {product.applications.slice(0, 2).join(", ")}
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
