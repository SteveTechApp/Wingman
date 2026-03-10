import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

type CatalogItem = {
  sku: string;
  name: string;
  family: string;
  role: string;
  fit: string;
};

const ITEMS: CatalogItem[] = [
  { sku: "APO-210-UC", name: "Apollo UC Switcher", family: "Apollo", role: "BYOD / meeting room", fit: "Simple room systems" },
  { sku: "MX-0402-MST-H2A", name: "Presentation Matrix", family: "Matrix", role: "Switching", fit: "Multi-source rooms" },
  { sku: "NHD-110-RX", name: "AVoIP Decoder", family: "AVoIP", role: "Endpoint", fit: "Scalable IP distribution" },
  { sku: "NHD-140-TX", name: "AVoIP Encoder", family: "AVoIP", role: "Endpoint", fit: "Source ingest" },
  { sku: "EX-70-H2", name: "HDBaseT Extender Set", family: "HDBaseT", role: "Extension", fit: "Point-to-point extension" },
  { sku: "SW-640L-TX-W", name: "Wallplate Transmitter", family: "HDBaseT", role: "Input plate", fit: "Table / wall input" },
];

const FAMILIES = ["All", "Apollo", "AVoIP", "HDBaseT", "Matrix"];

export default function ProductCatalogPage() {
  const [family, setFamily] = React.useState("All");
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    return ITEMS.filter((item) => {
      const familyOk = family === "All" || item.family === family;
      const q = query.trim().toLowerCase();
      const queryOk =
        !q ||
        item.sku.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q) ||
        item.fit.toLowerCase().includes(q);
      return familyOk && queryOk;
    });
  }, [family, query]);

  return (
    <PageFrame
      title="Product Catalog"
      subtitle="Browse WyreStorm products with clearer filtering and a shortlist-first workflow."
      actions={
        <div className="wm-toolbar">
          <button className="wm-btn-secondary" type="button">Export List</button>
          <button className="wm-btn-primary" type="button">Add Selected to Project</button>
        </div>
      }
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Selection Workflow</span>
            <h3>Filter first, shortlist second</h3>
            <p>
              The catalog should help the user narrow to the right family and role quickly, rather than
              scanning a long undifferentiated product list.
            </p>
          </div>

          <div className="wm-heroCard">
            <span className="wm-kicker">Current Result</span>
            <h3>{filtered.length} product{filtered.length !== 1 ? "s" : ""}</h3>
            <p>
              Use the family filter and search field together to reduce clutter and keep product choice obvious.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Catalog Filters"
        subtitle="Reduce the list to the most likely products first."
      >
        <div className="wm-grid-2">
          <div className="wm-field">
            <label>Search</label>
            <input
              className="wm-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search SKU, name, role, or fit"
            />
          </div>

          <div className="wm-field">
            <label>Family</label>
            <select className="wm-select" value={family} onChange={(e) => setFamily(e.target.value)}>
              {FAMILIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Catalog Results"
        subtitle="Prioritise fit-for-purpose products and clear add-to-project actions."
      >
        <div className="wm-list">
          {filtered.map((item) => (
            <div key={item.sku} className="wm-listItem">
              <div className="wm-listItem__body">
                <div className="wm-listItem__title">{item.sku} â€” {item.name}</div>
                <div className="wm-listItem__meta">{item.role} Â· {item.fit}</div>
                <div className="wm-tagRow">
                  <span className="wm-tag">{item.family}</span>
                  <span className="wm-tag">{item.role}</span>
                </div>
              </div>

              <div className="wm-right">
                <button className="wm-btn-secondary" type="button">View</button>
                <button className="wm-btn-primary" type="button">Add</button>
              </div>
            </div>
          ))}
        </div>
      </PageSection>
    </PageFrame>
  );
}