import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { ProductFilterPanel, ProductSearchField, ProductWorkspaceHeader, ProductWorkspaceNav } from "../components/ProductWorkspaceChrome";
import { ProductWhyFlashCard } from "../components/ProductWhyFlashCard";
import {
  clearProductIntelligenceIndexCache,
  loadProductIntelligenceIndex,
} from "../lib/productIntelligenceIndexCache";
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
import { resolveProductTechnicalData } from "../lib/governedProductTechnicalData";
import { resolveProductLifecycle } from "../lib/wyrestormProductLifecycle";
import { GovernedDataBadge } from "../components/GovernedDataBadge";
import {
  getWingmanJson,
  getWingmanSession,
  postWingmanJson,
  type WingmanWorkspaceSession,
} from "../api/wingmanApi";

type ProductIntelligenceRecord = Record<string, unknown> & {
  sku?: string;
  vendorType?: string;
  brand?: string;
  name?: string;
  family?: string;
  summary?: string;
};

type ProductIntelligenceResponse = {
  ok: boolean;
  records?: ProductIntelligenceRecord[];
  record?: ProductIntelligenceRecord;
};

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

function createTestingCatalogFilterState(): CatalogFilterState {
  return {
    ...createDefaultCatalogFilterState(),
    includeAccessories: true,
    excludeEolSoon: false,
  };
}

export function CatalogBrowserPage() {
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [state, setState] = useState<CatalogFilterState>(createTestingCatalogFilterState);
  const [session, setSession] = useState<WingmanWorkspaceSession | null>(null);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [recordJson, setRecordJson] = useState("");
  const [editorStatus, setEditorStatus] = useState("");
  const [editorBusy, setEditorBusy] = useState(false);

  // Governed-data tier per catalogue SKU, resolved once from the same engine
  // the Compare page and Product Pitch use, so the badge on every product card
  // tells the same story as the compare match cards.
  const governedTiers = useMemo(() => {
    const tiers = new Map<string, string>();
    for (const product of catalog) {
      tiers.set(normaliseSkuKey(product.sku), resolveProductTechnicalData(product).sourceTier);
    }
    return tiers;
  }, [catalog]);

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

  useEffect(() => {
    let cancelled = false;
    getWingmanSession()
      .then((response) => {
        if (!cancelled) setSession(response.session ?? null);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isAdmin = Boolean(
    session?.permissions?.canManageWorkspace ||
    session?.workspaceRole?.toLowerCase() === "admin" ||
    session?.user?.role?.toLowerCase() === "admin",
  );

  const facets = useMemo(() => buildFacetIndex(catalog), [catalog]);
  // Only recomputed when the toggles that actually affect it change - typing in the
  // search box (part of `state`) no longer reruns the full-catalogue selector pass.
  const allowedSkus = useMemo(
    () => state.excludeEolSoon
      ? computeAllowedSkus(catalog, state)
      : new Set(catalog.map((product) => normaliseSkuKey(product.sku))),
    // The selector only consumes these two fields; depending on all of `state`
    // would rerun a full-catalogue eligibility pass on every search keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, state.includeAccessories, state.excludeEolSoon],
  );
  const results = useMemo(
    () => applyAllowedSkuFilter(catalog, state, allowedSkus),
    [catalog, state, allowedSkus],
  );

  const patch = (next: Partial<CatalogFilterState>) => setState((current) => ({ ...current, ...next }));

  async function openRecordEditor(product: CatalogProduct) {
    setEditingProduct(product);
    setEditorBusy(true);
    setEditorStatus("Loading the current WyreStorm JSON record...");
    setRecordJson("");

    try {
      const response = await getWingmanJson<ProductIntelligenceResponse>(
        `/api/product-intelligence?vendorType=wyrestorm&sku=${encodeURIComponent(product.sku)}&limit=1`,
      );
      const record = response.records?.[0] ?? {
        vendorType: "wyrestorm",
        brand: "WyreStorm",
        sku: product.sku,
        name: product.name,
        family: product.family,
        category: product.category,
        summary: product.summary,
        features: [],
        status: "approved",
        sourceType: "manual",
      };
      setRecordJson(JSON.stringify(record, null, 2));
      setEditorStatus(response.records?.[0] ? "Record ready to edit." : "No runtime record existed; a new record has been prepared.");
    } catch (error) {
      setEditorStatus(error instanceof Error ? error.message : "Could not load the product record.");
    } finally {
      setEditorBusy(false);
    }
  }

  async function saveRecord() {
    if (!editingProduct) return;

    let candidate: ProductIntelligenceRecord;
    try {
      candidate = JSON.parse(recordJson) as ProductIntelligenceRecord;
    } catch {
      setEditorStatus("Invalid JSON. Correct the syntax before saving.");
      return;
    }

    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      setEditorStatus("The product record must be a JSON object.");
      return;
    }
    if (String(candidate.sku ?? "").trim().toUpperCase() !== editingProduct.sku.trim().toUpperCase()) {
      setEditorStatus("The SKU is the record identity and cannot be changed in this editor.");
      return;
    }

    candidate.vendorType = "wyrestorm";
    candidate.brand = "WyreStorm";
    candidate.replaceMode = true;
    setEditorBusy(true);
    setEditorStatus("Validating and saving...");

    try {
      const response = await postWingmanJson<ProductIntelligenceResponse>("/api/product-intelligence/upsert", candidate);
      const saved = response.record;
      if (!response.ok || !saved) throw new Error("The server did not return the saved record.");

      setRecordJson(JSON.stringify(saved, null, 2));
      clearProductIntelligenceIndexCache();
      setCatalog((current) =>
        current.map((product) =>
          normaliseSkuKey(product.sku) === normaliseSkuKey(editingProduct.sku)
            ? {
                ...product,
                name: String(saved.name ?? product.name),
                family: String(saved.family ?? product.family),
                summary: String(saved.summary ?? product.summary),
              }
            : product,
        ),
      );
      setEditorStatus(`Saved ${editingProduct.sku} to the WyreStorm product JSON.`);
    } catch (error) {
      setEditorStatus(error instanceof Error ? error.message : "Could not save the product record.");
    } finally {
      setEditorBusy(false);
    }
  }

  async function setTestingStatus(status: "approved" | "expired") {
    if (!editingProduct) return;
    if (status === "expired" && !window.confirm(`Remove ${editingProduct.sku} from the testing catalogue? The audit record will be retained.`)) {
      return;
    }

    setEditorBusy(true);
    setEditorStatus(status === "approved" ? "Allowing product for testing..." : "Removing product from the testing catalogue...");
    try {
      const response = await postWingmanJson<ProductIntelligenceResponse>("/api/product-intelligence/status", {
        vendorType: "wyrestorm",
        brand: "WyreStorm",
        sku: editingProduct.sku,
        status,
        notes: status === "approved"
          ? "ADMIN allowed this product during catalogue cleansing and testing."
          : "ADMIN removed this product from the testing catalogue; audit record retained.",
        reviewedBy: session?.user?.email || session?.user?.name || "ADMIN",
      });
      if (!response.ok || !response.record) throw new Error("The server did not confirm the status change.");
      clearProductIntelligenceIndexCache();
      if (status === "expired") {
        setCatalog((current) => current.filter((product) => normaliseSkuKey(product.sku) !== normaliseSkuKey(editingProduct.sku)));
        setEditingProduct(null);
      } else {
        setRecordJson(JSON.stringify(response.record, null, 2));
        setEditorStatus(`${editingProduct.sku} is allowed for testing.`);
      }
    } catch (error) {
      setEditorStatus(error instanceof Error ? error.message : "Could not change the testing status.");
    } finally {
      setEditorBusy(false);
    }
  }

  return (
    <main className="wm-ui-page wingman-page-host wm-catalog-page" data-wingman-page="catalog-browser">
      <ProductWorkspaceHeader
        eyebrow="Products / Catalogue"
        title="Browse the WyreStorm range"
        description="Search the complete stored range, then narrow it by family, role, technology or lifecycle."
      />
      <ProductWorkspaceNav />

      <ProductFilterPanel>
        <ProductSearchField
          value={state.search}
          onChange={(search) => patch({ search })}
          placeholder="Search by SKU, name, application — e.g. NHD-500, UC, video wall, Dante"
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
        <div className="wm-catalog-facets">
          <FacetGroup title="Family" options={facets.families} selected={state.families} onToggle={(value) => patch({ families: toggle(state.families, value) })} />
          <FacetGroup title="Role" options={facets.roles} selected={state.roles} onToggle={(value) => patch({ roles: toggle(state.roles, value) })} />
          <FacetGroup title="Technology" options={facets.technologies} selected={state.technologies} onToggle={(value) => patch({ technologies: toggle(state.technologies, value) })} />
        </div>
      </ProductFilterPanel>

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
          onClick={() => setState(createTestingCatalogFilterState())}

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
            <article key={product.id} className="wm-catalog-product-card">
              <Link
                to={`${routeCatalogByKey.productPitch.path}?sku=${encodeURIComponent(product.sku)}`}
                className="wm-catalog-product-link"
              >
                <span className="wm-catalog-product-meta">
                  {product.family} · {product.series}
                </span>
                <strong className="wm-catalog-product-sku">{product.sku}</strong>
                <span className="wm-ui-copy wm-catalog-product-name">{product.name}</span>
                {product.summary ? <p className="wm-ui-copy wm-catalog-product-summary">{product.summary}</p> : null}
                <GovernedDataBadge tier={governedTiers.get(normaliseSkuKey(product.sku))} />
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
              <ProductWhyFlashCard context={{ sku: product.sku, name: product.name, family: product.family, summary: product.summary }} />
              {isAdmin ? (
                <button
                  className="wm-ui-button wm-ui-button-secondary wm-catalog-edit-record"
                  type="button"
                  onClick={() => void openRecordEditor(product)}
                >
                  Edit record
                </button>
              ) : null}
            </article>
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

      {editingProduct ? (
        <div className="wm-catalog-editor-backdrop" role="presentation">
          <section
            className="wm-catalog-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wm-catalog-editor-title"
          >
            <div className="wm-catalog-editor-head">
              <div>
                <p className="wm-ui-kicker">Admin product JSON</p>
                <h2 id="wm-catalog-editor-title">Edit {editingProduct.sku}</h2>
              </div>
              <button
                className="wm-ui-button wm-ui-button-secondary"
                type="button"
                onClick={() => setEditingProduct(null)}
                disabled={editorBusy}
              >
                Close
              </button>
            </div>
            <p className="wm-ui-copy">
              Edit the complete record as JSON. The SKU is immutable; the server validates and sanitises supported fields.
            </p>
            <textarea
              className="wm-catalog-record-json"
              aria-label={`${editingProduct.sku} product JSON`}
              value={recordJson}
              onChange={(event) => setRecordJson(event.target.value)}
              spellCheck={false}
              disabled={editorBusy}
            />
            <p className="wm-ui-copy wm-catalog-editor-status" role="status">{editorStatus}</p>
            <div className="wm-catalog-editor-actions">
              <button
                className="wm-ui-button"
                type="button"
                onClick={() => void saveRecord()}
                disabled={editorBusy || !recordJson}
              >
                {editorBusy ? "Working..." : "Save record"}
              </button>
              <button
                className="wm-ui-button wm-ui-button-secondary"
                type="button"
                onClick={() => void setTestingStatus("approved")}
                disabled={editorBusy}
              >
                Allow product
              </button>
              <button
                className="wm-ui-button wm-ui-button-secondary"
                type="button"
                onClick={() => void setTestingStatus("expired")}
                disabled={editorBusy}
              >
                Remove product
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default CatalogBrowserPage;
