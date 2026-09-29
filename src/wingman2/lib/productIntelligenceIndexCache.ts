let productIntelligenceIndexPromise: Promise<unknown> | null = null;
let productIntelligenceSummaryPromise: Promise<ProductIndexPayload> | null = null;
let productIntelligenceDetailsPromise: Promise<{ products?: Record<string, { path?: string }> }> | null = null;
const productIntelligenceDetailPromises = new Map<string, Promise<Record<string, unknown>>>();

type ProductIndexPayload = { products?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;

function skuKey(value: unknown) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function summaryProductList(payload: ProductIndexPayload): Array<Record<string, unknown>> {
  return Array.isArray(payload) ? payload : payload.products ?? [];
}

function payloadWithProducts(payload: ProductIndexPayload, products: Array<Record<string, unknown>>): ProductIndexPayload {
  return Array.isArray(payload) ? products : { ...payload, products };
}

async function loadRuntimeAdminRecords() {
  try {
    const response = await fetch("/api/product-intelligence?vendorType=wyrestorm&limit=1000", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) return [];
    const payload = await response.json() as { records?: Array<Record<string, unknown>> };
    return Array.isArray(payload.records) ? payload.records : [];
  } catch {
    // The static catalogue remains usable when the authenticated testing API is offline.
    return [];
  }
}

export function applyRuntimeAdminRecords(
  staticPayload: ProductIndexPayload,
  runtimeRecords: Array<Record<string, unknown>>,
): ProductIndexPayload {
  const staticProducts = Array.isArray(staticPayload) ? staticPayload : staticPayload.products ?? [];
  const runtimeBySku = new Map(runtimeRecords.map((record) => [skuKey(record.sku), record]));
  const merged = staticProducts
    .map((product) => {
      const runtime = runtimeBySku.get(skuKey(product.sku));
      if (!runtime) return product;
      runtimeBySku.delete(skuKey(product.sku));
      return {
        ...product,
        name: runtime.name || product.name,
        title: runtime.name || product.title,
        family: runtime.family || product.family,
        category: runtime.category || product.category,
        summary: runtime.summary || product.summary,
        description: runtime.summary || product.description,
        features: Array.isArray(runtime.features) && runtime.features.length ? runtime.features : product.features,
        transport: runtime.transport || product.transport,
        inputs: Array.isArray(runtime.inputs) && runtime.inputs.length ? runtime.inputs : product.inputs,
        outputs: Array.isArray(runtime.outputs) && runtime.outputs.length ? runtime.outputs : product.outputs,
        control: Array.isArray(runtime.control) && runtime.control.length ? runtime.control : product.control,
        audio: Array.isArray(runtime.audio) && runtime.audio.length ? runtime.audio : product.audio,
        video: runtime.video || product.video,
        distanceMeters: runtime.distanceMeters ?? product.distanceMeters,
        testingAdminStatus: runtime.status,
        testingAdminNotes: runtime.notes,
        testingUpdatedAt: runtime.updatedAt,
      };
    })
    .filter((product) => product.testingAdminStatus !== "expired");

  for (const runtime of runtimeBySku.values()) {
    if (runtime.status === "expired") continue;
    merged.push({
      ...runtime,
      title: runtime.name,
      description: runtime.summary,
      testingAdminStatus: runtime.status,
      testingAdminNotes: runtime.notes,
      testingUpdatedAt: runtime.updatedAt,
    });
  }

  return Array.isArray(staticPayload) ? merged : { ...staticPayload, products: merged };
}

export async function loadProductIntelligenceIndex(): Promise<unknown> {
  if (!productIntelligenceIndexPromise) {
    productIntelligenceIndexPromise = Promise.all([
      fetchJson<ProductIndexPayload>("/product-intelligence-summary.json"),
      loadRuntimeAdminRecords(),
    ]).then(([payload, runtimeRecords]) => applyRuntimeAdminRecords(payload, runtimeRecords))
      .catch(async () => applyRuntimeAdminRecords(
        await fetchJson<ProductIndexPayload>("/product-intelligence-summary.json"),
        await loadRuntimeAdminRecords(),
      ))
      .catch((error) => {
        productIntelligenceIndexPromise = null;
        throw error;
      });
  }

  return productIntelligenceIndexPromise;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Product intelligence artifact unavailable: ${response.status}`);
  return response.json() as Promise<T>;
}

export function loadProductIntelligenceSummary(): Promise<ProductIndexPayload> {
  if (!productIntelligenceSummaryPromise) {
    productIntelligenceSummaryPromise = fetchJson<ProductIndexPayload>("/product-intelligence-summary.json")
      .catch(() => fetchJson<ProductIndexPayload>("/product-intelligence-summary.json"))
      .then(async (payload) => applyRuntimeAdminRecords(payload, await loadRuntimeAdminRecords()))
      .catch((error) => { productIntelligenceSummaryPromise = null; throw error; });
  }
  return productIntelligenceSummaryPromise;
}

function loadProductIntelligenceDetails() {
  if (!productIntelligenceDetailsPromise) {
    productIntelligenceDetailsPromise = fetchJson<{ products?: Record<string, { path?: string }> }>("/product-intelligence-details.json")
      .catch((error) => { productIntelligenceDetailsPromise = null; throw error; });
  }
  return productIntelligenceDetailsPromise;
}

export async function loadProductIntelligenceDetail(sku: string): Promise<Record<string, unknown> | null> {
  const summary = await loadProductIntelligenceSummary();
  const product = (Array.isArray(summary) ? summary : summary.products ?? []).find((item) => skuKey(item.sku) === skuKey(sku));
  if (!product) return null;
  try {
    const key = skuKey(sku);
    const manifest = await loadProductIntelligenceDetails();
    const path = manifest.products?.[key]?.path;
    if (!path) return product;
    if (!productIntelligenceDetailPromises.has(key)) {
      productIntelligenceDetailPromises.set(key, fetchJson<Record<string, unknown>>(path)
        .catch((error) => { productIntelligenceDetailPromises.delete(key); throw error; }));
    }
    return { ...product, ...(await productIntelligenceDetailPromises.get(key)) };
  } catch {
    return product;
  }
}

/**
 * Summary-first replacement for the former whole-index load.
 *
 * The 10 MB product-intelligence-index.json shipped every product's
 * technicalProfile/salesLanguage/dataMaintenance/sourceCatalog, so any route
 * that merely needed catalogue browsing paid for all of it. The runtime now
 * reads product-intelligence-summary.json (same shape, deferred fields
 * stripped) and hydrates those fields only for the SKUs a caller names.
 * Consumers that genuinely need every product's detail (today: the admin
 * record editor) use loadProductIntelligenceDetailRecords().
 */
export async function loadProductIntelligenceSummaryWithDetail(skus: Array<string>): Promise<ProductIndexPayload> {
  const payload = await loadProductIntelligenceSummary();
  const wanted = new Set(skus.map((sku) => skuKey(sku)).filter(Boolean));
  if (wanted.size === 0) return payload;

  await Promise.all([...wanted].map((key) => loadProductIntelligenceDetail(key).catch(() => null)));

  const detailsByKey = new Map<string, Record<string, unknown>>();
  for (const key of wanted) {
    const detail = await productIntelligenceDetailPromises.get(key);
    if (detail) detailsByKey.set(key, detail);
  }

  return payloadWithProducts(payload, summaryProductList(payload).map((product) => {
    const detail = detailsByKey.get(skuKey(product.sku));
    return detail ? { ...product, ...detail } : product;
  }));
}

/** Every product with its deferred detail fields hydrated (admin surface). */
export async function loadProductIntelligenceDetailRecords(): Promise<ProductIndexPayload> {
  const payload = await loadProductIntelligenceSummary();
  const products = summaryProductList(payload);
  const keys = products.map((product) => skuKey(product.sku)).filter(Boolean);
  await Promise.all(keys.map((key) => loadProductIntelligenceDetail(key).catch(() => null)));
  return payloadWithProducts(payload, await Promise.all(products.map(async (product) => {
    const detail = await productIntelligenceDetailPromises.get(skuKey(product.sku));
    return detail ? { ...product, ...detail } : product;
  })));
}

export function clearProductIntelligenceIndexCache(): void {
  productIntelligenceIndexPromise = null;
  productIntelligenceSummaryPromise = null;
  productIntelligenceDetailsPromise = null;
  productIntelligenceDetailPromises.clear();
}
