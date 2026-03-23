import * as React from "react";
import "./catalogue2.css";

type CatalogueHeaderProps = {
  search: string;
  onSearchChange: (value: string) => void;
};

export default function CatalogueHeader({
  search,
  onSearchChange,
}: CatalogueHeaderProps) {
  return (
    <div className="wm-cat2__header">
      <div className="wm-cat2__header-copy">
        <h1 className="wm-cat2__title">Product Catalogue</h1>
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
      </div>
    </div>
  );
}
