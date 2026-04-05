import React from "react";

type BomLine = {
  sku: string;
  qty: number;
  role: string;
  description: string;
  group: "Core" | "Supporting" | "Accessories";
  unitPrice: number;
  extPrice: number;
  marginNote: string;
};

type Props = {
  projectName: string;
  customerName: string;
  executiveSummary: string;
  technicalSummary: string;
  scopeSummary: string;
  architecture: string;
  products: string[];
  salesNarrative?: string;
  competitorSummary?: string;
  bomLines: BomLine[];
  showInternalPricing?: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function ProposalExportPreview(props: Props) {
  const grouped = {
    Core: props.bomLines.filter((x) => x.group === "Core"),
    Supporting: props.bomLines.filter((x) => x.group === "Supporting"),
    Accessories: props.bomLines.filter((x) => x.group === "Accessories"),
  };

  const subtotal = props.bomLines.reduce((sum, line) => sum + line.extPrice, 0);

  return (
    <section
      className="wm-surface-card"
      style={{
        padding: 18,
        display: "grid",
        gap: 16,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: "#93c5fd" }}>
        Export-ready proposal preview
      </div>

      <div
        id="wm-proposal-export-preview"
        style={{
          background: "var(--wm-text)",
          color: "#111827",
          borderRadius: 18,
          padding: 28,
          display: "grid",
          gap: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,0.16)",
        }}
      >
        <header style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2563eb" }}>
            WyreStorm Proposal
          </div>
          <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.05 }}>{props.projectName || "Proposal"}</h1>
          <div style={{ color: "#4b5563" }}>
            Customer: {props.customerName || "Customer not set"}
          </div>
        </header>

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Executive Summary</h2>
          <p style={{ margin: 0, lineHeight: 1.6 }}>{props.executiveSummary}</p>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Scope Summary</h2>
          <p style={{ margin: 0, lineHeight: 1.6 }}>{props.scopeSummary}</p>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Recommended Architecture</h2>
          <p style={{ margin: 0, lineHeight: 1.6 }}>{props.architecture}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {props.products.map((product) => (
              <span
                key={product}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#1d4ed8",
                }}
              >
                {product}
              </span>
            ))}
          </div>
        </section>

        {props.salesNarrative ? (
          <section style={{ display: "grid", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Commercial Positioning</h2>
            <p style={{ margin: 0, lineHeight: 1.6 }}>{props.salesNarrative}</p>
          </section>
        ) : null}

        {props.competitorSummary ? (
          <section style={{ display: "grid", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Why WyreStorm</h2>
            <p style={{ margin: 0, lineHeight: 1.6 }}>{props.competitorSummary}</p>
          </section>
        ) : null}

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Technical Summary</h2>
          <p style={{ margin: 0, lineHeight: 1.6 }}>{props.technicalSummary}</p>
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            Bill of Materials {props.showInternalPricing ? "(Internal View)" : "(Customer View)"}
          </h2>

          {(["Core", "Supporting", "Accessories"] as const).map((group) => {
            const items = grouped[group];
            if (!items.length) return null;

            return (
              <div key={group} style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#2563eb", textTransform: "uppercase" }}>
                  {group}
                </div>

                <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                  {items.map((item, index) => (
                    <div
                      key={`${group}-${item.sku}-${index}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: props.showInternalPricing
                          ? "140px 70px minmax(0,1fr) 120px 120px"
                          : "140px 70px minmax(0,1fr)",
                        gap: 12,
                        padding: "10px 12px",
                        borderTop: index === 0 ? "none" : "1px solid #e5e7eb",
                        background: index % 2 === 0 ? "var(--wm-text)" : "#f9fafb",
                        alignItems: "start",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{item.sku}</div>
                      <div>Qty {item.qty}</div>
                      <div style={{ color: "#374151", lineHeight: 1.5 }}>
                        {item.description}
                        {props.showInternalPricing ? (
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                            {item.marginNote}
                          </div>
                        ) : null}
                      </div>
                      {props.showInternalPricing ? (
                        <>
                          <div>{formatCurrency(item.unitPrice)}</div>
                          <div>{formatCurrency(item.extPrice)}</div>
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {props.showInternalPricing ? (
            <div
              style={{
                justifySelf: "end",
                padding: "10px 14px",
                borderRadius: 12,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                fontWeight: 800,
                color: "#1d4ed8",
              }}
            >
              Subtotal: {formatCurrency(subtotal)}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
