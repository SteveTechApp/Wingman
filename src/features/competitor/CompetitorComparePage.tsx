import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

const ROWS = [
  { brand: "Extron", model: "DA HD 4K PLUS", alt: "WyreStorm extender / matrix path", note: "Common spec comparison" },
  { brand: "Atlona", model: "AT-OME-MS42", alt: "Apollo / matrix equivalent", note: "Room switcher comparison" },
  { brand: "Kramer", model: "VIA / switcher family", alt: "Apollo equivalent workflow", note: "Collaboration comparison" },
];

export default function CompetitorComparePage() {
  return (
    <PageFrame
      title="Competitor Compare"
      subtitle="Position WyreStorm against alternative options with a simpler comparison workflow."
      actions={
        <div className="wm-toolbar">
          <button className="wm-btn-secondary" type="button">Export Comparison</button>
          <button className="wm-btn-primary" type="button">Add Alternative Note</button>
        </div>
      }
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Comparison Workspace</span>
            <h3>Support substitution decisions</h3>
            <p>
              This page should focus on equivalent categories, strengths, and recommended substitutes rather than dense matrices.
            </p>
          </div>

          <div className="wm-heroCard">
            <span className="wm-kicker">Best Use</span>
            <h3>Help sales answer “what is our equivalent?”</h3>
            <p>
              Lead with likely substitutions, then allow deeper comparison only where needed.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Comparison List"
        subtitle="Simple comparison view for likely alternatives."
      >
        <table className="wm-table">
          <thead>
            <tr>
              <th>Brand</th>
              <th>Model</th>
              <th>WyreStorm Path</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.brand + row.model}>
                <td>{row.brand}</td>
                <td>{row.model}</td>
                <td>{row.alt}</td>
                <td className="wm-muted">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PageSection>
    </PageFrame>
  );
}