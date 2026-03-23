import React from "react";
import type { CatalogueProduct } from "./catalogue.types";
import type { ProjectCatalogBomItem, StoredProject } from "@/features/projects/projectStore";

type SelectedSystemPanelProps = {
  project: StoredProject | null;
  products: CatalogueProduct[];
  onAddQty: (sku: string) => void;
  onReduceQty: (sku: string) => void;
  onRemoveSku: (sku: string) => void;
  onCreateBomItem: (sku: string) => void;
};

function findProduct(products: CatalogueProduct[], sku: string): CatalogueProduct | undefined {
  return products.find((item) => item.sku === sku);
}

function findBomItem(project: StoredProject | null, sku: string): ProjectCatalogBomItem | undefined {
  return project?.catalog?.bomItems?.find((item) => item.sku === sku);
}

export default function SelectedSystemPanel(props: SelectedSystemPanelProps) {
  const { project, products, onAddQty, onReduceQty, onRemoveSku, onCreateBomItem } = props;

  const skus = project?.catalog?.skus ?? [];
  const bomItems = project?.catalog?.bomItems ?? [];
  const totalLines = skus.length;
  const totalQty = bomItems.reduce((sum, item) => sum + Math.max(0, item.quantity || 0), 0);

  return (
    <aside
      style={{
        display: "grid",
        gap: 14,
        padding: 16,
        borderRadius: 18,
        border: "1px solid rgba(140,170,255,0.14)",
        background: "linear-gradient(180deg, rgba(12,19,34,0.96), rgba(8,13,24,0.96))",
        boxShadow: "0 16px 34px rgba(0,0,0,0.24)",
        position: "sticky",
        top: 16
      }}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.72
          }}
        >
          Selected System
        </div>

        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em" }}>
          BOM Builder
        </div>

        <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.8 }}>
          Review selected catalogue items, set quantities, and shape the project bill of materials.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10
        }}
      >
        <div
          style={{
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(140,170,255,0.12)",
            background: "rgba(255,255,255,0.03)"
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.68 }}>Selected lines</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{totalLines}</div>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(140,170,255,0.12)",
            background: "rgba(255,255,255,0.03)"
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.68 }}>Total quantity</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{totalQty}</div>
        </div>
      </div>

      {skus.length === 0 ? (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            border: "1px dashed rgba(140,170,255,0.18)",
            background: "rgba(255,255,255,0.02)",
            fontSize: 13,
            lineHeight: 1.6,
            opacity: 0.82
          }}
        >
          No products have been added to the active project yet.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {skus.map((sku) => {
            const product = findProduct(products, sku);
            const bomItem = findBomItem(project, sku);
            const quantity = bomItem?.quantity ?? 0;

            return (
              <article
                key={sku}
                style={{
                  display: "grid",
                  gap: 10,
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(140,170,255,0.12)",
                  background: "rgba(255,255,255,0.03)"
                }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        minHeight: 24,
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: "1px solid rgba(66,182,255,0.25)",
                        background: "rgba(66,182,255,0.12)",
                        fontSize: 12,
                        fontWeight: 700
                      }}
                    >
                      {sku}
                    </span>

                    <button
                      type="button"
                      onClick={() => onRemoveSku(sku)}
                      style={{
                        appearance: "none",
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.03)",
                        color: "inherit",
                        borderRadius: 10,
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 800 }}>
                    {product?.name ?? "Catalogue item"}
                  </div>

                  <div style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.76 }}>
                    {bomItem?.description || product?.summary || "No BOM description yet."}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => onReduceQty(sku)}
                    style={{
                      appearance: "none",
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.03)",
                      color: "inherit",
                      borderRadius: 10,
                      padding: "6px 10px",
                      cursor: "pointer",
                      minWidth: 34,
                      fontWeight: 800
                    }}
                  >
                    −
                  </button>

                  <div
                    style={{
                      minWidth: 42,
                      textAlign: "center",
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(140,170,255,0.12)",
                      background: "rgba(255,255,255,0.03)",
                      fontWeight: 800
                    }}
                  >
                    {quantity}
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddQty(sku)}
                    style={{
                      appearance: "none",
                      border: "1px solid rgba(66,182,255,0.28)",
                      background: "rgba(66,182,255,0.12)",
                      color: "inherit",
                      borderRadius: 10,
                      padding: "6px 10px",
                      cursor: "pointer",
                      minWidth: 34,
                      fontWeight: 800
                    }}
                  >
                    +
                  </button>

                  {quantity === 0 ? (
                    <button
                      type="button"
                      onClick={() => onCreateBomItem(sku)}
                      style={{
                        appearance: "none",
                        border: "none",
                        background: "linear-gradient(180deg, #42b6ff, #1e8fff)",
                        color: "#07111f",
                        borderRadius: 10,
                        padding: "7px 12px",
                        cursor: "pointer",
                        fontWeight: 800
                      }}
                    >
                      Add to BOM
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </aside>
  );
}