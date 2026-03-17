import * as React from "react";
import "./catalogue2.css";

type CatalogueHeaderProps = {
  search: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
  compareCount: number;
};

export default function CatalogueHeader({
  search,
  onSearchChange,
  resultCount,
  compareCount,
}: CatalogueHeaderProps) {
  return (
    <div className="wm-cat2__header">
      <div className="wm-cat2__header-copy">
        <p className="wm-cat2__eyebrow">WyreStorm Product Finder</p>
        <h1 className="wm-cat2__title">Product Catalogue</h1>
        <p className="wm-cat2__subtitle">
          Find products by technology type, SKU, or specific feature.
        </p>
      </div>

      <div className="wm-cat2__header-tools">
        <div className="wm-cat2__search-wrap">
          <input
            className="wm-cat2__search"
            type="text"
            placeholder="Search SKU, technology, feature, or application..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="wm-cat2__meta">
          <span className="wm-cat2__meta-pill">{resultCount} results</span>
          <span className="wm-cat2__meta-pill">Compare {compareCount}</span>
        </div>
      </div>
    </div>
  );
}