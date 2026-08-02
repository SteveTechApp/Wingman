import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { NavLink } from "react-router-dom";
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
  [routeCatalogByKey.catalogBrowser.path, "Catalogue"],
  [routeCatalogByKey.productFamilies.path, "Families"],
  [routeCatalogByKey.productCallCards.path, "Call cards"],
  [routeCatalogByKey.productPitch.path, "Positioning"],
] as const;

export function ProductWorkspaceNav() {
  return (
    <nav className="wm-product-workspace-nav" aria-label="Product tools">
      {productWorkspaceRoutes.map(([path, label]) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) => `wm-product-workspace-nav-link${isActive ? " is-active" : ""}`}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

type ProductSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  autoFocus?: boolean;
};

export function ProductSearchField({
  value,
  onChange,
  placeholder,
  label = "Search products",
  autoFocus = false,
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
          autoFocus={autoFocus}
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
