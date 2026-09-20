import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";

type ProductWorkspaceHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export function ProductWorkspaceHeader({
  title,
  description,
  eyebrow = "Product workspace",
  actions,
}: ProductWorkspaceHeaderProps) {
  return (
    <section className="wm-product-workspace-intro">
      <div className="wm-product-workspace-heading">
        <p className="wm-ui-kicker">{eyebrow}</p>
        <h1 className="wm-ui-title">{title}</h1>
        <p className="wm-ui-copy">{description}</p>
      </div>
      {actions ? <div className="wm-product-workspace-actions">{actions}</div> : null}
    </section>
  );
}

const productWorkspaceRoutes = [
  [`${routeCatalogByKey.products.path}?view=catalogue`, "Catalogue", routeCatalogByKey.catalogBrowser.path],
  [`${routeCatalogByKey.products.path}?view=families`, "Families", routeCatalogByKey.productFamilies.path],
  [`${routeCatalogByKey.products.path}?view=call-cards`, "Call cards", routeCatalogByKey.productCallCards.path],
  [`${routeCatalogByKey.products.path}?view=positioning`, "Positioning", routeCatalogByKey.productPitch.path],
] as const;

export function ProductWorkspaceNav() {
  const location = useLocation();
  return (
    <nav className="wm-product-workspace-nav" aria-label="Product tools">
      {productWorkspaceRoutes.map(([path, label, legacyPath]) => {
        const view = new URLSearchParams(path.split("?")[1]).get("view");
        const active = location.pathname === legacyPath || (location.pathname === routeCatalogByKey.products.path && new URLSearchParams(location.search).get("view") === view);
        return <Link
          key={path}
          to={path}
          className={`wm-product-workspace-nav-link${active ? " is-active" : ""}`}
        >
          {label}
        </Link>;
      })}
    </nav>
  );
}

type ProductSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
};

export function ProductSearchField({
  value,
  onChange,
  placeholder,
  label = "Search products",
}: ProductSearchFieldProps) {
  return (
    <label className="wm-product-search-field">
      <span className="wm-product-filter-label">{label}</span>
      <span className="wm-product-search-control">
        <Search aria-hidden="true" />
        <input
          className="wm-ui-input"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={placeholder}
          type="search"
        />
      </span>
    </label>
  );
}

export function ProductFilterPanel({ children }: { children: ReactNode }) {
  return <section className="wm-product-filter-panel wm-ui-card">{children}</section>;
}

export function ProductFilterGroup({
  label,
  children,
  compact = false,
}: {
  label: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`wm-product-filter-group${compact ? " is-compact" : ""}`}>
      <span className="wm-product-filter-label">{label}</span>
      <div className="wm-product-filter-controls">{children}</div>
    </div>
  );
}
