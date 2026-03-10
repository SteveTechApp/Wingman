import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

export default function ProductCatalogPage() {
  return (
    <PageFrame
      title="Product Catalog"
      subtitle="Browse WyreStorm products with cleaner filtering and a more focused shortlist flow."
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Focused Layout</span>
            <h3>Product Catalog</h3>
            <p>The catalog should be selection-led, not just a long list of products.</p>
          </div>

          <div className="wm-heroCard">
            <span className="wm-kicker">Wingman Guidance</span>
            <h3>Keep the task obvious</h3>
            <p>
              Use one primary action, reduce competing panels, and show supporting detail only where it helps
              the sales or design workflow progress.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Catalog View"
        subtitle="Browse WyreStorm products with cleaner filtering and a more focused shortlist flow."
      >
        <div className="wm-tool-grid">
          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Primary</span>
              <h4>Catalog View</h4>
              <p>Prioritise fit-for-purpose products, product-family filters, and clear add-to-project actions.</p>
            </div>
          </div>

          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Support</span>
              <h4>Shortlist Workflow</h4>
              <p>Surface product family, role, range, and suitability before deep technical detail.</p>
            </div>
          </div>
        </div>
      </PageSection>
    </PageFrame>
  );
}