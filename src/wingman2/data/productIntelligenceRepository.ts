import { getWingmanJson, postWingmanJson } from "../api/wingmanApi";
import { clearProductIntelligenceIndexCache } from "../lib/productIntelligenceIndexCache";
import type { CompetitorEquivalenceRecord, ProductTruth } from "../types/productTruth";

export type AdminLifecycle = "live" | "review" | "draft" | "do-not-use" | "discontinued" | "superseded" | "unlisted";
export type ProductPort = { type: string; count: number; label?: string };
export type ProductEvidence = { id?: string; type?: string; label: string; value: string; sourceUrl?: string; notes?: string };
export type ProductIntelligenceRecord = Record<string, unknown> & {
  id?: string; vendorType: "wyrestorm" | "competitor"; brand: string; sku: string; name: string;
  family: string; category: string; summary: string; status: string; lifecycle?: AdminLifecycle;
  inputs: ProductPort[]; outputs: ProductPort[]; mirroredOutputs?: ProductPort[]; features: string[];
  applications?: string[]; dependencies?: string[]; compatibility?: string[]; limitations?: string[];
  salesGuidance?: string; evidence: ProductEvidence[]; notes?: string; updatedAt?: string; reviewedBy?: string;
  archived?: boolean; changeNote?: string;
  confidence?: number; lastReviewedAt?: string; sourceUrls?: string[];
  productTruth?: ProductTruth; equivalence?: CompetitorEquivalenceRecord;
};

type ListResponse = { ok: boolean; records?: ProductIntelligenceRecord[]; total?: number };
type SaveResponse = { ok: boolean; record?: ProductIntelligenceRecord; error?: string };

export const PRODUCT_LIFECYCLES: AdminLifecycle[] = ["live", "review", "draft", "do-not-use", "discontinued", "superseded", "unlisted"];
export const lifecycleToApiStatus = (lifecycle: AdminLifecycle) => lifecycle === "live" ? "approved" : lifecycle === "review" || lifecycle === "draft" || lifecycle === "unlisted" ? "draft" : "expired";
export const isArchivedProduct = (record: ProductIntelligenceRecord) => lifecycleToApiStatus(record.lifecycle || (record.status === "approved" ? "live" : "draft")) === "expired" || record.status === "expired";
export const displayLifecycle = (record: ProductIntelligenceRecord): AdminLifecycle => record.lifecycle || (record.status === "approved" ? "live" : record.status === "expired" ? "do-not-use" : "draft");

export interface ProductIntelligenceRepository {
  list(vendorType?: "wyrestorm" | "competitor"): Promise<ProductIntelligenceRecord[]>;
  save(record: ProductIntelligenceRecord): Promise<ProductIntelligenceRecord>;
  changeLifecycle(record: ProductIntelligenceRecord, lifecycle: AdminLifecycle, editor: string): Promise<ProductIntelligenceRecord>;
}

export const productIntelligenceRepository: ProductIntelligenceRepository = {
  async list(vendorType) {
    const query = vendorType ? `?vendorType=${vendorType}&limit=1000` : "?limit=1000";
    const response = await getWingmanJson<ListResponse>(`/api/product-intelligence${query}`);
    return response.records || [];
  },
  async save(record) {
    const response = await postWingmanJson<SaveResponse>("/api/product-intelligence/upsert", {
      ...record, replaceMode: true, status: lifecycleToApiStatus(record.lifecycle || "draft"),
    });
    if (!response.ok || !response.record) throw new Error(response.error || "The server did not return the saved product.");
    clearProductIntelligenceIndexCache();
    window.dispatchEvent(new CustomEvent("wingman:product-intelligence-updated", { detail: response.record }));
    return response.record;
  },
  async changeLifecycle(record, lifecycle, editor) {
    const response = await postWingmanJson<SaveResponse>("/api/product-intelligence/status", {
      vendorType: record.vendorType, brand: record.brand, sku: record.sku,
      status: lifecycleToApiStatus(lifecycle), reviewedBy: editor,
      lifecycle,
      notes: `${record.notes || ""}\nLifecycle: ${lifecycle}.`.trim(),
    });
    if (!response.ok || !response.record) throw new Error(response.error || "Lifecycle update failed.");
    clearProductIntelligenceIndexCache();
    window.dispatchEvent(new CustomEvent("wingman:product-intelligence-updated", { detail: response.record }));
    return { ...response.record, lifecycle };
  },
};

export function validateProductRecord(record: ProductIntelligenceRecord, existing: ProductIntelligenceRecord[] = []) {
  const errors: Record<string, string> = {};
  if (!record.brand.trim()) errors.brand = "Manufacturer is required.";
  if (!record.sku.trim()) errors.sku = "SKU is required.";
  if (!record.name.trim()) errors.name = "Product name is required.";
  if (!record.family.trim()) errors.family = "Family is required.";
  if (!record.category.trim()) errors.category = "Recognised product class is required.";
  if (existing.some((item) => item !== record && item.brand.toLowerCase() === record.brand.toLowerCase() && item.sku.toLowerCase() === record.sku.toLowerCase())) errors.sku = "SKU must be unique within the manufacturer.";
  if ([...record.inputs, ...record.outputs, ...(record.mirroredOutputs || [])].some((port) => !Number.isInteger(port.count) || port.count < 0)) errors.ports = "Port quantities must be whole numbers of zero or more.";
  if (/avoip|networkhd/i.test(`${record.category} ${record.family}`) && !record.transport) errors.transport = "AVoIP products require a network/transport requirement.";
  if (record.lifecycle === "superseded" && !record.replacementSku) errors.replacementSku = "A superseded product requires a replacement SKU.";
  if (["live", "review"].includes(record.lifecycle || "") && record.evidence.length === 0) errors.evidence = "Evidence is required for publishable critical specifications.";
  return errors;
}

export function emptyProduct(vendorType: "wyrestorm" | "competitor" = "wyrestorm"): ProductIntelligenceRecord {
  return { vendorType, brand: vendorType === "wyrestorm" ? "WyreStorm" : "", sku: "", name: "", family: "", category: "", summary: "", status: "draft", lifecycle: "draft", inputs: [], outputs: [], mirroredOutputs: [], features: [], applications: [], dependencies: [], compatibility: [], limitations: [], evidence: [], notes: "" };
}
