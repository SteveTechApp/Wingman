import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

const BOM_ROWS = [
  { sku: "APO-210-UC", desc: "Apollo switcher", qty: 1, role: "Core room hub" },
  { sku: "SW-640L-TX-W", desc: "Wallplate transmitter", qty: 2, role: "Table / wall input" },
  { sku: "EX-70-H2", desc: "HDBaseT extender set", qty: 1, role: "Display extension" },
];

export default function ProposalBuilderPage() {
  const totalItems = BOM_ROWS.reduce((sum, row) => sum + row.qty, 0);

  return (
    <PageFrame
      title="Proposal Builder"
      subtitle="Turn selected project decisions into structured BOM and proposal-ready output."
      actions={
        <div className="wm-toolbar">
          <button className="wm-btn-secondary" type="button">Preview</button>
          <button className="wm-btn-secondary" type="button">Save</button>
          <button className="wm-btn-primary" type="button">Generate Proposal</button>
        </div>
      }
      aside={
        <div className="wm-grid-auto">
          <div className="wm-panel">
            <h4>Project</h4>
            <p>Meeting Room Refresh</p>
          </div>
          <div className="wm-panel">
            <h4>BOM Lines</h4>
            <p>{BOM_ROWS.length}</p>
          </div>
          <div className="wm-panel">
            <h4>Total Qty</h4>
            <p>{totalItems}</p>
          </div>
          <div className="wm-panel">
            <h4>Status</h4>
            <p>Draft</p>
          </div>
        </div>
      }
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Output Workspace</span>
            <h3>Build a clean commercial summary</h3>
            <p>
              Proposal Builder should present the selected products, commercial notes, and output actions
              without surrounding clutter.
            </p>
          </div>

          <div className="wm-heroCard">
            <span className="wm-kicker">Next Action</span>
            <h3>Review BOM and generate output</h3>
            <p>
              Confirm quantities and role descriptions first, then move into proposal preview and document generation.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Bill of Materials"
        subtitle="Review product lines before creating the final customer-facing output."
      >
        <table className="wm-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Description</th>
              <th>Role</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {BOM_ROWS.map((row) => (
              <tr key={row.sku}>
                <td>{row.sku}</td>
                <td>{row.desc}</td>
                <td className="wm-muted">{row.role}</td>
                <td>{row.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PageSection>

      <PageSection
        title="Proposal Notes"
        subtitle="Keep the value summary and commercial notes concise."
      >
        <div className="wm-grid-2">
          <div className="wm-field">
            <label>Executive Summary</label>
            <textarea
              className="wm-textarea"
              defaultValue="WyreStorm solution designed for a simple, reliable meeting room refresh with scalable input and display connectivity."
            />
          </div>

          <div className="wm-field">
            <label>Commercial Notes</label>
            <textarea
              className="wm-textarea"
              defaultValue="Proposal excludes installation labour, containment, and third-party display devices unless otherwise stated."
            />
          </div>
        </div>
      </PageSection>
    </PageFrame>
  );
}
