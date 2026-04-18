import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "..", "..");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const CATALOG_DIR = path.join(DATA_DIR, "catalog");

export const PRODUCT_INTELLIGENCE_DB_FILE = path.join(DATA_DIR, "product-intelligence-db.json");
export const COMPETITOR_APPROVALS_FILE = path.join(DATA_DIR, "competitor-approvals.json");
export const WYRESTORM_PRODUCT_INTELLIGENCE_FILE = path.join(DATA_DIR, "wyrestorm-product-intelligence.json");

export const WYRESTORM_SKU_MASTER_FILE = path.join(CATALOG_DIR, "wyrestormSkuCatalog.2026.json");
export const WYRESTORM_SEED_CATALOG_FILE = path.join(CATALOG_DIR, "wyrestorm-catalog.phase1.json");
export const COMPETITOR_CATALOG_FILE = path.join(CATALOG_DIR, "competitor-catalog.phase4.json");
export const COMPETITOR_COMPARE_SEED_FILE = path.join(CATALOG_DIR, "competitor-compare.seed.json");
