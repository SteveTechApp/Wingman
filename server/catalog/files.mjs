import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "..", "..");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const CATALOG_DIR = path.join(DATA_DIR, "catalog");
export const RUNTIME_DATA_DIR = path.join(DATA_DIR, "runtime");

export const PRODUCT_INTELLIGENCE_DB_FILE = path.join(RUNTIME_DATA_DIR, "product-intelligence-state.json");
export const WINGMAN_APP_DB_FILE = path.join(RUNTIME_DATA_DIR, "wingman-app-db.json");
export const LEGACY_WINGMAN_APP_DB_FILE = path.join(DATA_DIR, "wingman-app-db.json");
export const COMPETITOR_APPROVALS_FILE = path.join(DATA_DIR, "competitor-approvals.json");
export const WINGMAN_PRODUCT_REPORTS_FILE = path.join(DATA_DIR, "wingman-product-reports.json");
export const WINGMAN_CANONICAL_PRODUCT_STORE_FILE = path.join(DATA_DIR, "wingman-canonical-product-store.json");
export const WYRESTORM_PAGE_CACHE_FILE = path.join(RUNTIME_DATA_DIR, "wyrestorm-page-cache.json");

export const WYRESTORM_SKU_MASTER_FILE = WINGMAN_CANONICAL_PRODUCT_STORE_FILE;
export const WYRESTORM_SEED_CATALOG_FILE = WINGMAN_CANONICAL_PRODUCT_STORE_FILE;
export const COMPETITOR_CATALOG_FILE = path.join(CATALOG_DIR, "competitor-products.generated.json");
export const COMPETITOR_COMPARE_SEED_FILE = COMPETITOR_CATALOG_FILE;
