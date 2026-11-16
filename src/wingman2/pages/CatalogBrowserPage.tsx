import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { ProductWorkspaceHeader, ProductWorkspaceNav } from "../components/ProductWorkspaceChrome";
import { ProductCatalogFilters } from "../components/ProductCatalogFilters";
import { ProductWhyFlashCard } from "../components/ProductWhyFlashCard";
import {
  clearProductIntelligenceIndexCache,
  loadProductIntelligenceSummary,
} from "../lib/productIntelligenceIndexCache";
import { extractRawProducts } from "../lib/productStoryEngine";
import { productFamilyWashClass, productFamilyWashGroup } from "../lib/productFamilyWash";
import {
  applyCatalogOverrides,
  createDefaultCatalogFilterState,
  filterCatalogProducts,
  isExplicitCableIntent,
  type CatalogFilterState,
  type CatalogProduct,
} from "../../features/catalog/catalogIntelligence";
import { selectWingmanProducts } from "../lib/productSelectorEngine";
import { normaliseSkuKey } from "../lib/skuAliasResolver";
import { resolveProductLifecycle } from "../lib/wyrestormProductLifecycle";
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

// Let the shared catalog filter own accessory/cable visibility. The selector pass
// admits these candidates so an explicit cable query or SKU can reach that gate.
export function computeAllowedSkus(
  catalog: CatalogProduct[],
  opts: Pick<CatalogFilterState, "includeAccessories" | "excludeEolSoon">,
): Set<string> {
  return new Set(
    selectWingmanProducts(catalog, {
      mode: "catalogue",
      includeAccessories: true,
      includeDependencies: true,
      includeCables: true,
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
    if (!state.includeAccessories && (product.deploymentRole === "accessory" || product.deploymentRole === "companion")
      && !(product.roles.includes("cable") && isExplicitCableIntent(product, state))) {
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

function catalogVisualGroupKey(product: CatalogProduct): string {
  return productFamilyWashGroup(product.sku);
}

function createBrowseCatalogFilterState(): CatalogFilterState {
  return {
    ...createDefaultCatalogFilterState(),
    includeAccessories: true,
    excludeEolSoon: false,
  };
}

export function CatalogBrowserPage() {
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  // Keep raw index records alongside the display shape so the admin editor can
  // preserve fields that applyCatalogOverrides does not expose.
  const [rawBySku, setRawBySku] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [state, setState] = useState<CatalogFilterState>(createBrowseCatalogFilterState);
  const [session, setSession] = useState<WingmanWorkspaceSession | null>(null);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [recordJson, setRecordJson] = useState("");
  const [editorStatus, setEditorStatus] = useState("");
  const [editorBusy, setEditorBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadProductIntelligenceSummary()
      .then((data) => {
        if (cancelled) return;
        const rawRecords = extractRawProducts(data);
        setCatalog(applyCatalogOverrides(rawRecords).map(withBusinessLifecycle));
        const rawMap = new Map<string, Record<string, unknown>>();
        for (const raw of rawRecords) {
          const record = raw as Record<string, unknown>;
          const sku = normaliseSkuKey(String(record.sku ?? record.model ?? "").trim());
          if (sku) rawMap.set(sku, record);
        }
        setRawBySku(rawMap);
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
      const key = normaliseSkuKey(editingProduct.sku);
      const raw = { ...rawBySku.get(key), ...saved };
      const rebuilt = applyCatalogOverrides([raw]).map(withBusinessLifecycle)[0];
      setRawBySku((current) => new Map(current).set(key, raw));
      setCatalog((current) => rebuilt
        ? current.map((product) => normaliseSkuKey(product.sku) === key ? rebuilt : product)
        : current.filter((product) => normaliseSkuKey(product.sku) !== key));
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

      <ProductCatalogFilters catalog={catalog} state={state} onChange={patch} />

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
          onClick={() => setState(createBrowseCatalogFilterState())}

        >
          Reset filters
        </button>
      </section>

      <div className="wm-catalog-product-grid">
        {results.map((product) => {
          const visualGroup = catalogVisualGroupKey(product);
          return (
            <article
              key={product.id}
              className={`wm-catalog-product-card ${productFamilyWashClass(product.sku)}`}
              data-catalog-group={visualGroup}
            >
              <Link
                to={`${routeCatalogByKey.productPitch.path}?sku=${encodeURIComponent(product.sku)}`}
                className="wm-catalog-product-link"
              >
                <span className="wm-catalog-product-meta">
                  {product.family} · {product.series}
                </span>
                <strong className="wm-catalog-product-sku">{product.sku}</strong>
                <span className="wm-ui-copy wm-catalog-product-name">{product.name}</span>
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
