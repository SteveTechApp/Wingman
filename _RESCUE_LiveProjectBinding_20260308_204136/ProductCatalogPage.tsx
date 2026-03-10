import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";
import { addProjectSku } from "@/state/wingmanProjectStore";

type CatalogItem = {
  sku: string;
  name: string;
  family: string;
  role: string;
  fit: string;
};

const ITEMS: CatalogItem[] = [
  { sku: "APO-210-UC", name: "Apollo UC Switcher", family: "Apollo", role: "Room hub", fit: "Meeting rooms" },
  { sku: "NHD-110-RX", name: "AVoIP Decoder", family: "AVoIP", role: "Endpoint", fit: "IP distribution" },
  { sku: "NHD-140-TX", name: "AVoIP Encoder", family: "AVoIP", role: "Source ingest", fit: "IP distribution" },
  { sku: "EX-70-H2", name: "HDBaseT Extender", family: "HDBaseT", role: "Extension", fit: "Point-to-point extension" }
];

export default function ProductCatalogPage() {

  function add(item: CatalogItem){
    addProjectSku({
      sku: item.sku,
      name: item.name,
      role: item.role,
      qty: 1
    });

    alert(item.sku + " added to project BOM");
  }

  return (
    <PageFrame
      title="Product Catalog"
      subtitle="Select WyreStorm products and add them to the project BOM."
    >

      <PageSection title="Catalog">
        <div className="wm-list">
          {ITEMS.map(item => (
            <div key={item.sku} className="wm-listItem">

              <div className="wm-listItem__body">
                <div className="wm-listItem__title">{item.sku} — {item.name}</div>
                <div className="wm-listItem__meta">{item.role} · {item.fit}</div>
              </div>

              <div className="wm-right">
                <button
                  className="wm-btn-primary"
                  onClick={() => add(item)}
                >
                  Add to Project
                </button>
              </div>

            </div>
          ))}
        </div>
      </PageSection>

    </PageFrame>
  );
}