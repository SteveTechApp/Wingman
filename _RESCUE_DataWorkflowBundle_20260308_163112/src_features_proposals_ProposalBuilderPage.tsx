import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";
import { getProjectSkus, clearProjectSkus } from "@/state/wingmanProjectStore";

export default function ProposalBuilderPage(){

  const [rows,setRows] = React.useState(() => getProjectSkus());

  const total = rows.reduce((s,r)=>s+r.qty,0);

  function refresh(){
    setRows(getProjectSkus());
  }

  function clear(){
    clearProjectSkus();
    refresh();
  }

  return(
    <PageFrame
      title="Proposal Builder"
      subtitle="Review selected products and generate the project BOM."
      actions={
        <>
          <button className="wm-btn-secondary" onClick={refresh}>Refresh</button>
          <button className="wm-btn-secondary" onClick={clear}>Clear BOM</button>
        </>
      }
    >

      <PageSection title="Bill of Materials">

        {rows.length === 0 && (
          <div className="wm-panel">
            <h4>No products yet</h4>
            <p>Add products from the Product Catalog to build the proposal BOM.</p>
          </div>
        )}

        {rows.length > 0 && (
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
              {rows.map(r => (
                <tr key={r.sku}>
                  <td>{r.sku}</td>
                  <td>{r.name}</td>
                  <td>{r.role}</td>
                  <td>{r.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </PageSection>

      <PageSection title="Summary">
        <div className="wm-summaryRow">
          <span>Total Items</span>
          <span>{total}</span>
        </div>
      </PageSection>

    </PageFrame>
  )
}