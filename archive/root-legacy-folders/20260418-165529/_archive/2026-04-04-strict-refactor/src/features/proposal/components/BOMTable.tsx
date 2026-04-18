import React from "react";
import type { ProposalViewModel } from "../proposalModel";

type Props = {
  model: ProposalViewModel;
};

export default function BOMTable({ model }: Props) {
  return (
    <section
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          minHeight: 52,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 900 }}>Bill of Materials</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {model.bom.length} line{model.bom.length === 1 ? "" : "s"}
        </div>
      </div>

      {model.bom.length ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th style={thStyle}>Qty</th>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {model.bom.map((item, index) => (
                <tr key={`${item.sku}-${index}`} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={tdStyle}>{item.qty}</td>
                  <td style={tdStyleStrong}>{item.sku}</td>
                  <td style={tdStyle}>{item.description}</td>
                  <td style={tdStyle}>{item.notes ?? "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: 16, fontSize: 13, opacity: 0.76 }}>
          No project BOM items were found yet. The proposal is now connected to live project data, so this section will populate as soon as BOM or equipment items exist in the active project.
        </div>
      )}
    </section>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 12,
  fontWeight: 900,
  opacity: 0.72,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  verticalAlign: "top",
  lineHeight: 1.45,
};

const tdStyleStrong: React.CSSProperties = {
  ...tdStyle,
  fontWeight: 900,
};

