import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";
import { extractRawProducts } from "../lib/productStoryEngine";
import {
  applyCatalogOverrides,
  buildFacetIndex,
  createDefaultCatalogFilterState,
  filterCatalogProducts,
  getCatalogBadges,
  getCatalogMatchReasons,
  type CatalogFilterState,
  type CatalogProduct,
} from "../../features/catalog/catalogIntelligence";
import { selectWingmanProducts } from "../lib/productSelectorEngine";
import { normaliseSkuKey } from "../lib/skuAliasResolver";
import { resolveProductLifecycle } from "../lib/wyrestormProductLifecycle";

// The catalog engine infers lifecycle from text/manual overrides only. Overlay the
// authoritative 2026 business lists so a SKU that is discontinued, do-not-spec or
// superseded is reliably marked excludeFromNewRecommendations even when the engine
// had no override for it — otherwise it would leak past the "hide end-of-life"
// promise. (Unlisted SKUs are left as-is; only confirmed EoL signals suppress.)
export function withBusinessLifecycle(product: CatalogProduct): CatalogProduct {
  if (product.lifecycle.excludeFromNewRecommendations) return product;
  const life = resolveProductLifecycle(product.sku);
  const suppress = life.status === "discontinued" || life.status === "do-not-spec" || Boolean(life.supersededBy) || life.adminBlocked;
  if (!suppress) return product;
  return { ...product, lifecycle: { ...product.lifecycle, excludeFromNewRecommendations: true } };
}

// The product-selector eligibility pass only depends on includeAccessories/excludeEolSoon,
// never on search text - split out so the page can memoize it separately and avoid
// rerunning full-catalogue classification on every keystroke in the search box.
export function computeAllowedSkus(
  catalog: CatalogProduct[],
  opts: Pick<CatalogFilterState, "includeAccessories" | "excludeEolSoon">,
): Set<string> {
  return new Set(
    selectWingmanProducts(catalog, {
      mode: "catalogue",
      includeAccessories: opts.includeAccessories,
      includeDependencies: opts.includeAccessories,
      includeCables: opts.includeAccessories,
      includeBrowseOnly: !opts.excludeEolSoon,
      includeDiscontinued: !opts.excludeEolSoon,
    })
      .filter((decision) => decision.eligible)
      .map((decision) => normaliseSkuKey(decision.sku)),
  );
}

function applyAllowedSkuFilter(catalog: CatalogProduct[], state: CatalogFilterState, allowedSkus: Set<string>): CatalogProduct[] {
  return filterCatalogProducts(catalog, state).filter((product) => {
    if (!allowedSkus.has(normaliseSkuKey(product.sku))) return false;
    if (state.excludeEolSoon && product.lifecycle.excludeFromNewRecommendations) return false;
    if (!state.includeAccessories && (product.deploymentRole === "accessory" || product.deploymentRole === "companion")) {
      return false;
    }
    return true;
  });
}

// Apply the catalog match engine, then re-apply lifecycle/accessory exclusions as
// HARD filters. Smart-find mode keeps any product scoring > 0 even when
// strictMatch rejected it, so without this an exact search for a suppressed SKU
// would still render while "Hide end-of-life" is on. Exported for testing.
export function selectCatalogResults(catalog: CatalogProduct[], state: CatalogFilterState): CatalogProduct[] {
  return applyAllowedSkuFilter(catalog, state, computeAllowedSkus(catalog, state));
}

const humanize = (value: string) => value.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`wm-catalog-chip ${active ? "is-active" : ""}`}
    >
      {label}
    </button>
  );
}

function FacetGroup<T extends string>({
  title,
  options,
  selected,
  onToggle,
  format = humanize,
}: {
  title: string;
  options: T[];
  selected: T[];
  onToggle: (value: T) => void;
  format?: (value: string) => string;
}) {
  if (!options.length) return null;
  return (
    <div className="wm-catalog-facet-group">
      <span className="wm-catalog-facet-label">{title}</span>
      <div className="wm-catalog-chip-row">
        {options.map((option) => (
          <Chip key={option} label={format(option)} active={selected.includes(option)} onClick={() => onToggle(option)} />
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`wm-catalog-chip ${active ? "is-active" : ""}`}
    >
      {active ? "✓ " : ""}
      {label}
    </button>
  );
}

export function CatalogBrowserPage() {
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [state, setState] = useState<CatalogFilterState>(() => createDefaultCatalogFilterState());

  useEffect(() => {
    let cancelled = false;
    loadProductIntelligenceIndex()
      .then((data) => {
        if (cancelled) return;
        setCatalog(applyCatalogOverrides(extractRawProducts(data)).map(withBusinessLifecycle));
        setLoaded(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[wingman] CatalogBrowser: product intelligence index load failed", error);
        setLoadError(true);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const facets = useMemo(() => buildFacetIndex(catalog), [catalog]);
  // Only recomputed when the toggles that actually affect it change - typing in the
  // search box (part of `state`) no longer reruns the full-catalogue selector pass.
  const allowedSkus = useMemo(
    () => computeAllowedSkus(catalog, state),
    [catalog, state.includeAccessories, state.excludeEolSoon],
  );
  const results = useMemo(
    () => applyAllowedSkuFilter(catalog, state, allowedSkus),
    [catalog, state, allowedSkus],
  );

  const patch = (next: Partial<CatalogFilterState>) => setState((current) => ({ ...current, ...next }));

  return (
    <main className="wm-ui-page wingman-page-host wm-catalog-page" data-wingman-page="catalog-browser">
      <section className="wm-catalog-panel wm-catalog-intro">
        <p className="wm-ui-kicker">Catalogue browser</p>
        <h1 className="wm-ui-title">Browse the WyreStorm range</h1>
        <p className="wm-ui-copy wm-catalog-description">
          Filter by family, role, technology and lifecycle. End-of-life and do-not-recommend products are hidden by
          default — turn that off to see the full range.
        </p>
        <input className="wm-ui-input wm-catalog-search"
          value={state.search}
          onChange={(event) => patch({ search: event.target.value })}
          placeholder="Search by SKU, name, application — e.g. NHD-500, UC, video wall, Dante"
          type="search"

        />
        <div className="wm-catalog-chip-row wm-catalog-toggle-row">
          <Toggle
            label={state.matchMode === "filter" ? "Strict filter" : "Smart find"}
            active={state.matchMode === "filter"}
            onClick={() => patch({ matchMode: state.matchMode === "filter" ? "find" : "filter" })}
          />
          <Toggle label="Standalone only" active={state.standaloneOnly} onClick={() => patch({ standaloneOnly: !state.standaloneOnly })} />
          <Toggle label="Include accessories" active={state.includeAccessories} onClick={() => patch({ includeAccessories: !state.includeAccessories })} />
          <Toggle label="Hide end-of-life" active={state.excludeEolSoon} onClick={() => patch({ excludeEolSoon: !state.excludeEolSoon })} />
        </div>
      </section>

      <section className="wm-catalog-panel wm-catalog-facets">
        <FacetGroup title="Family" options={facets.families} selected={state.families} onToggle={(value) => patch({ families: toggle(state.families, value) })} />
        <FacetGroup title="Role" options={facets.roles} selected={state.roles} onToggle={(value) => patch({ roles: toggle(state.roles, value) })} />
        <FacetGroup title="Technology" options={facets.technologies} selected={state.technologies} onToggle={(value) => patch({ technologies: toggle(state.technologies, value) })} />
      </section>

      <section className="wm-ui-section wm-catalog-results-head">
        <p className="wm-ui-copy">
          {loadError
            ? "Catalogue unavailable"
            : loaded
              ? `${results.length} product${results.length === 1 ? "" : "s"}`
              : "Loading catalogue..."}
        </p>
        <button className="wm-ui-button wm-ui-button-secondary"
          type="button"
          onClick={() => setState(createDefaultCatalogFilterState())}

        >
          Reset filters
        </button>
      </section>

      <div className="wm-catalog-product-grid">
        {results.map((product) => {
          const badges = getCatalogBadges(product);
          const reasons = getCatalogMatchReasons(product, state);
          const eol = product.lifecycle.excludeFromNewRecommendations;
          return (
            <Link
              key={product.id}
              to={`${routeCatalogByKey.productPitch.path}?sku=${encodeURIComponent(product.sku)}`}
              className="wm-catalog-product-card"
            >
              <span className="wm-catalog-product-meta">
                {product.family} · {product.series}
              </span>
              <strong className="wm-catalog-product-sku">{product.sku}</strong>
              <span className="wm-ui-copy wm-catalog-product-name">{product.name}</span>
              {product.summary ? <p className="wm-ui-copy wm-catalog-product-summary">{product.summary}</p> : null}
              {badges.length ? (
                <div className="wm-catalog-badge-row">
                  {badges.map((badge) => (
                    <span
                      key={badge}
                      className={`wm-catalog-badge ${badge === "Legacy / suppress" ? "is-warning" : ""}`}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="wm-ui-copy wm-catalog-reasons">{reasons.join("  ·  ")}</p>
              {eol ? <p className="wm-ui-copy wm-catalog-suppressed">Suppressed from new recommendations</p> : null}
            </Link>
          );
        })}
      </div>

      {loadError ? (
        <div className="wm-ui-card wm-ui-copy wm-catalog-empty">
          The product catalogue could not be loaded. Check your connection and reload the page.
        </div>
      ) : loaded && !results.length ? (
        <div className="wm-ui-card wm-ui-copy wm-catalog-empty">
          No products match these filters. Reset filters or broaden the search.
        </div>
      ) : null}
    </main>
  );
}

export default CatalogBrowserPage;
