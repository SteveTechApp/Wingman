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
  eyebrow,
  actions,
}: ProductWorkspaceHeaderProps) {
  return (
    <section className="wm-product-workspace-intro">
      <div className="wm-product-workspace-heading">
        {eyebrow ? <p className="wm-ui-copy wm-ui-kicker">{eyebrow}</p> : null}
        <h1 className="wm-ui-title">{title}</h1>
        <details className="wingman-page-help"><summary>About this view</summary><p>{description}</p></details>
      </div>
      {actions ? <div className="wm-product-workspace-actions">{actions}</div> : null}
    </section>
  );
}

function selectedProductSku(pathname: string, search: string): string {
  const querySku = new URLSearchParams(search).get("sku");
  if (querySku) return querySku;

  const segments = pathname.split("/").filter(Boolean);
  const last = segments.at(-1) ?? "";
  if (pathname.startsWith(`${routeCatalogByKey.productCallCards.path}/`) && last !== "select") {
    try {
      return decodeURIComponent(last);
    } catch {
      return last;
    }
  }
  return "";
}

function isFocusedProductView(pathname: string, search: string): boolean {
  const view = new URLSearchParams(search).get("view");
  return pathname === routeCatalogByKey.productCallCards.path
    || pathname.startsWith(`${routeCatalogByKey.productCallCards.path}/`)
    || (pathname === routeCatalogByKey.products.path && (view === "focused" || view === "call-cards"));
}

function isExpertProductView(pathname: string, search: string): boolean {
  const view = new URLSearchParams(search).get("view");
  return pathname === routeCatalogByKey.productPitch.path
    || (pathname === routeCatalogByKey.products.path && (view === "expert" || view === "positioning"));
}

export function ProductWorkspaceNav() {
  const location = useLocation();
  const sku = selectedProductSku(location.pathname, location.search);
  const focusedPath = sku
    ? `${routeCatalogByKey.productCallCards.path}/${encodeURIComponent(sku)}`
    : `${routeCatalogByKey.products.path}?view=focused`;
  const expertPath = sku
    ? `${routeCatalogByKey.productPitch.path}?sku=${encodeURIComponent(sku)}`
    : `${routeCatalogByKey.products.path}?view=expert`;
  const productWorkspaceRoutes = [
    { path: routeCatalogByKey.productFinder.path, label: "Product Finder", active: location.pathname === routeCatalogByKey.productFinder.path },
    { path: `${routeCatalogByKey.products.path}?view=catalogue`, label: "Catalogue", active: location.pathname === routeCatalogByKey.catalogBrowser.path || (location.pathname === routeCatalogByKey.products.path && new URLSearchParams(location.search).get("view") === "catalogue") },
    { path: `${routeCatalogByKey.products.path}?view=families`, label: "Families", active: location.pathname === routeCatalogByKey.productFamilies.path || (location.pathname === routeCatalogByKey.products.path && new URLSearchParams(location.search).get("view") === "families") },
    { path: focusedPath, label: "Focused view", active: isFocusedProductView(location.pathname, location.search) },
    { path: expertPath, label: "Expert view", active: isExpertProductView(location.pathname, location.search) },
  ];
  return (
    <nav className="wm-product-workspace-nav" aria-label="Product tools">
      {productWorkspaceRoutes.map(({ path, label, active }) => <Link
        key={label}
        to={path}
        className={`wm-product-workspace-nav-link${active ? " is-active" : ""}`}
      >
        {label}
      </Link>)}
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
