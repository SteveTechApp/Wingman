import { useEffect, useState } from "react";
import {
  getWingmanJson,
  getWingmanSession,
  postWingmanJson,
  type WingmanWorkspaceSession,
} from "../api/wingmanApi";
import { clearProductIntelligenceIndexCache } from "../lib/productIntelligenceIndexCache";

type ProductRecord = Record<string, unknown> & {
  sku?: string;
  name?: string;
  family?: string;
  category?: string;
  summary?: string;
  status?: string;
};

type ProductResponse = { ok: boolean; records?: ProductRecord[]; record?: ProductRecord };

export function AdminProductRecordEditor({
  product,
  onSaved,
  onRemoved,
}: {
  product: { sku: string; name?: string; family?: string; category?: string; summary?: string };
  onSaved?: (record: ProductRecord) => void;
  onRemoved?: () => void;
}) {
  const [session, setSession] = useState<WingmanWorkspaceSession | null>(null);
  const [open, setOpen] = useState(false);
  const [recordJson, setRecordJson] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getWingmanSession()
      .then((response) => { if (active) setSession(response.session ?? null); })
      .catch(() => { if (active) setSession(null); });
    return () => { active = false; };
  }, []);

  const isAdmin = Boolean(
    session?.permissions?.canManageWorkspace ||
    session?.workspaceRole?.toLowerCase() === "admin" ||
    session?.user?.role?.toLowerCase() === "admin",
  );

  if (!isAdmin) return null;

  async function openEditor() {
    setOpen(true);
    setBusy(true);
    setStatus("Loading current product JSON...");
    try {
      const response = await getWingmanJson<ProductResponse>(
        `/api/product-intelligence?vendorType=wyrestorm&sku=${encodeURIComponent(product.sku)}&limit=1`,
      );
      const record = response.records?.[0] ?? {
        vendorType: "wyrestorm",
        brand: "WyreStorm",
        sku: product.sku,
        name: product.name || product.sku,
        family: product.family || "Unknown",
        category: product.category || "Uncategorized",
        summary: product.summary || "",
        features: [],
        status: "draft",
        sourceType: "manual",
      };
      setRecordJson(JSON.stringify(record, null, 2));
      setStatus("Record ready to edit.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load the product record.");
    } finally {
      setBusy(false);
    }
  }

  async function saveRecord() {
    let candidate: ProductRecord;
    try {
      candidate = JSON.parse(recordJson) as ProductRecord;
    } catch {
      setStatus("Invalid JSON. Correct the syntax before saving.");
      return;
    }
    if (String(candidate.sku ?? "").trim().toUpperCase() !== product.sku.trim().toUpperCase()) {
      setStatus("The SKU is the record identity and cannot be changed here.");
      return;
    }
    candidate.vendorType = "wyrestorm";
    candidate.brand = "WyreStorm";
    candidate.replaceMode = true;
    setBusy(true);
    setStatus("Validating and saving...");
    try {
      const response = await postWingmanJson<ProductResponse>("/api/product-intelligence/upsert", candidate);
      if (!response.ok || !response.record) throw new Error("The server did not return the saved record.");
      clearProductIntelligenceIndexCache();
      setRecordJson(JSON.stringify(response.record, null, 2));
      setStatus(`Saved ${product.sku}. The correction now overlays the shared testing catalogue.`);
      onSaved?.(response.record);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save the product record.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(nextStatus: "approved" | "expired") {
    if (nextStatus === "expired" && !window.confirm(`Remove ${product.sku} from the testing catalogue? The audit record will be retained.`)) return;
    setBusy(true);
    setStatus(nextStatus === "approved" ? "Allowing product for testing..." : "Removing product...");
    try {
      const response = await postWingmanJson<ProductResponse>("/api/product-intelligence/status", {
        vendorType: "wyrestorm",
        brand: "WyreStorm",
        sku: product.sku,
        status: nextStatus,
        notes: nextStatus === "approved"
          ? "ADMIN allowed this product during catalogue cleansing and testing."
          : "ADMIN removed this product from the testing catalogue; audit record retained.",
        reviewedBy: session?.user?.email || session?.user?.name || "ADMIN",
      });
      if (!response.ok || !response.record) throw new Error("The server did not confirm the status change.");
      clearProductIntelligenceIndexCache();
      if (nextStatus === "expired") {
        setOpen(false);
        onRemoved?.();
      } else {
        setRecordJson(JSON.stringify(response.record, null, 2));
        setStatus(`${product.sku} is allowed for testing.`);
        onSaved?.(response.record);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not change the testing status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={() => void openEditor()}>
        Edit product JSON
      </button>
      {open ? (
        <div className="wm-catalog-editor-backdrop" role="presentation">
          <section className="wm-catalog-editor" role="dialog" aria-modal="true" aria-labelledby="wm-direct-product-editor-title">
            <div className="wm-catalog-editor-head">
              <div>
                <p className="wm-ui-kicker">ADMIN testing record</p>
                <h2 id="wm-direct-product-editor-title">Edit {product.sku}</h2>
              </div>
              <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={() => setOpen(false)} disabled={busy}>Close</button>
            </div>
            <p className="wm-ui-copy">Changes overlay the shared catalogue used by product, Guru and comparison workflows. The SKU identity is immutable.</p>
            <textarea className="wm-catalog-record-json" aria-label={`${product.sku} product JSON`} value={recordJson} onChange={(event) => setRecordJson(event.target.value)} spellCheck={false} disabled={busy} />
            <p className="wm-ui-copy wm-catalog-editor-status" role="status">{status}</p>
            <div className="wm-catalog-editor-actions">
              <button className="wm-ui-button" type="button" onClick={() => void saveRecord()} disabled={busy || !recordJson}>Save record</button>
              <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={() => void changeStatus("approved")} disabled={busy}>Allow product</button>
              <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={() => void changeStatus("expired")} disabled={busy}>Remove product</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
