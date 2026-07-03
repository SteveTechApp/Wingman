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
import { resolveProductLifecycle } from "../lib/wyrestormProductLifecycle";

// The catalog engine infers lifecycle from text/manual overrides only. Overlay the
// authoritative 2026 business lists so a SKU that is discontinued, do-not-spec or
// superseded is reliably marked excludeFromNewRecommendations even when the engine
// had no override for it — otherwise it would leak past the "hide end-of-life"
// promise. (Unlisted SKUs are left as-is; only confirmed EoL signals suppress.)
export function withBusinessLifecycle(product: CatalogProduct): CatalogProduct {
  if (product.lifecycle.excludeFromNewRecommendations) return product;
  const life = resolveProductLifecycle(product.sku);
  const suppress = life.status === "discontinued" || life.status === "do-not-spec" || Boolean(life.supersededBy);
  if (!suppress) return product;
  return { ...product, lifecycle: { ...product.lifecycle, excludeFromNewRecommendations: true } };
}

// Apply the catalog match engine, then re-apply lifecycle/accessory exclusions as
// HARD filters. Smart-find mode keeps any product scoring > 0 even when
// strictMatch rejected it, so without this an exact search for a suppressed SKU
// would still render while "Hide end-of-life" is on. Exported for testing.
export function selectCatalogResults(catalog: CatalogProduct[], state: CatalogFilterState): CatalogProduct[] {
  return filterCatalogProducts(catalog, state).filter((product) => {
    if (state.excludeEolSoon && product.lifecycle.excludeFromNewRecommendations) return false;
    if (!state.includeAccessories && (product.deploymentRole === "accessory" || product.deploymentRole === "companion")) {
      return false;
    }
    return true;
  });
}

const PANEL = "rounded-3xl border border-[#29465e] bg-[#071522]";
const CARD = "rounded-3xl border border-[#29465e] bg-[#081724]";
const KICKER = "text-xs font-bold uppercase tracking-[0.12em]";

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
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
        active ? "bg-cyan-300 text-slate-950" : "border border-[#29465e] bg-[#081724] text-cyan-100 hover:border-cyan-300"
      }`}
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
    <div className="grid gap-2">
      <span className={`${KICKER} text-cyan-300`}>{title}</span>
      <div className="flex flex-wrap gap-2">
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
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
        active ? "bg-cyan-300 text-slate-950" : "border border-[#29465e] bg-[#081724] text-white/70 hover:border-cyan-300"
      }`}
    >
      {active ? "✓ " : ""}
      {label}
    </button>
  );
}

export function CatalogBrowserPage() {
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<CatalogFilterState>(() => createDefaultCatalogFilterState());

  useEffect(() => {
    let cancelled = false;
    loadProductIntelligenceIndex()
      .then((data) => {
        if (cancelled) return;
        setCatalog(applyCatalogOverrides(extractRawProducts(data)).map(withBusinessLifecycle));
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const facets = useMemo(() => buildFacetIndex(catalog), [catalog]);
  const results = useMemo(() => selectCatalogResults(catalog, state), [catalog, state]);

  const patch = (next: Partial<CatalogFilterState>) => setState((current) => ({ ...current, ...next }));

  return (
    <main className="grid gap-4 pb-6 wm-ui-page wingman-page-host">
      <section className={`${PANEL} p-5`}>
        <p className={`${KICKER} text-cyan-300`}>Catalogue browser</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight wm-ui-title wm-ui-kicker">Browse the WyreStorm range</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 wm-ui-copy">
          Filter by family, role, technology and lifecycle. End-of-life and do-not-recommend products are hidden by
          default — turn that off to see the full range.
        </p>
        <input className={["wm-ui-input", "mt-4 min-h-12 w-full rounded-2xl border border-[#29465e] bg-[#0d2133] px-4 text-sm font-bold text-white outline-none focus:border-cyan-300"].filter(Boolean).join(" ")}
          value={state.search}
          onChange={(event) => patch({ search: event.target.value })}
          placeholder="Search by SKU, name, application — e.g. NHD-500, UC, video wall, Dante"
          type="search"

        />
        <div className="mt-4 flex flex-wrap gap-2">
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

      <section className={`${PANEL} grid gap-4 p-5`}>
        <FacetGroup title="Family" options={facets.families} selected={state.families} onToggle={(value) => patch({ families: toggle(state.families, value) })} />
        <FacetGroup title="Role" options={facets.roles} selected={state.roles} onToggle={(value) => patch({ roles: toggle(state.roles, value) })} />
        <FacetGroup title="Technology" options={facets.technologies} selected={state.technologies} onToggle={(value) => patch({ technologies: toggle(state.technologies, value) })} />
      </section>

      <section className="flex items-center justify-between px-1 wm-ui-section">
        <p className="text-sm font-bold wm-ui-copy">
          {loaded ? `${results.length} product${results.length === 1 ? "" : "s"}` : "Loading catalogue..."}
        </p>
        <button className={["wm-ui-button wm-ui-button-secondary", "rounded-full border border-[#29465e] px-3 py-1.5 text-xs font-bold text-cyan-100 hover:border-cyan-300"].filter(Boolean).join(" ")}
          type="button"
          onClick={() => setState(createDefaultCatalogFilterState())}

        >
          Reset filters
        </button>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {results.map((product) => {
          const badges = getCatalogBadges(product);
          const reasons = getCatalogMatchReasons(product, state);
          const eol = product.lifecycle.excludeFromNewRecommendations;
          return (
            <Link
              key={product.id}
              to={`${routeCatalogByKey.productPitch.path}?sku=${encodeURIComponent(product.sku)}`}
              className={`${CARD} block p-4 transition hover:border-cyan-300 hover:bg-cyan-500/10`}
            >
              <span className={`block ${KICKER} text-cyan-300`}>
                {product.family} · {product.series}
              </span>
              <strong className="mt-2 block text-lg font-extrabold text-white">{product.sku}</strong>
              <span className="mt-1 block text-sm font-bold wm-ui-copy">{product.name}</span>
              {product.summary ? <p className="mt-2 line-clamp-2 text-xs leading-5 wm-ui-copy">{product.summary}</p> : null}
              {badges.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {badges.map((badge) => (
                    <span
                      key={badge}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        badge === "Legacy / suppress"
                          ? "bg-rose-500/15 text-rose-200"
                          : "bg-[#0d2133] text-cyan-100"
                      }`}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="mt-3 text-[11px] leading-4 wm-ui-copy">{reasons.join("  ·  ")}</p>
              {eol ? <p className="mt-1 text-[11px] font-bold wm-ui-copy">Suppressed from new recommendations</p> : null}
            </Link>
          );
        })}
      </div>

      {loaded && !results.length ? (
        <div className="rounded-2xl border p-4 text-sm wm-ui-card wm-ui-copy">
          No products match these filters. Reset filters or broaden the search.
        </div>
      ) : null}
    </main>
  );
}

export default CatalogBrowserPage;
