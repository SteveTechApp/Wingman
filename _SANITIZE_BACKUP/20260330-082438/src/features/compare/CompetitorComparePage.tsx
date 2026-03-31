import { useMemo, useState } from "react";
import GlowGuide from "@/ui2/page/GlowGuide";

type CompareRecord = {
  id: string;
  category: string;
  competitorBrand: string;
  competitorModel: string;
  wyrestormOption: string;
  summary: string;
  strengths: string[];
};

const records: CompareRecord[] = [
  { id: "1", category: "AV over IP", competitorBrand: "ZeeVee", competitorModel: "Zyper4K Series", wyrestormOption: "NHD-110 / NHD-210 Series", summary: "Suitable for network-distributed HDMI applications where scalable source-to-display routing is required.", strengths: ["Scalable network model", "Familiar AV workflow", "Good for multi-display distribution"] },
  { id: "2", category: "Matrix Switching", competitorBrand: "Extron", competitorModel: "DTP / Matrix Family", wyrestormOption: "MX / H2X Matrix Range", summary: "Useful for conventional fixed switching projects where source and display counts are known up front.", strengths: ["Simple switching architecture", "Good for fixed room layouts", "Clear proposal positioning"] },
  { id: "3", category: "Presentation / UC", competitorBrand: "Lightware", competitorModel: "Taurus / UCX", wyrestormOption: "Apollo Presentation Range", summary: "Best for meeting spaces that need BYOD switching, USB-C connectivity, and collaborative room presentation.", strengths: ["Strong meeting-room fit", "Single-device simplification", "Sales-friendly value story"] },
];

const categories = ["All", "AV over IP", "Matrix Switching", "Presentation / UC", "Video Wall", "USB / KVM"];

export default function CompetitorComparePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return records.filter((record) => {
      const categoryMatch = category === "All" || record.category === category;
      const queryMatch =
        !q ||
        record.category.toLowerCase().includes(q) ||
        record.competitorBrand.toLowerCase().includes(q) ||
        record.competitorModel.toLowerCase().includes(q) ||
        record.wyrestormOption.toLowerCase().includes(q) ||
        record.summary.toLowerCase().includes(q);

      return categoryMatch && queryMatch;
    });
  }, [query, category]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="wm-surface-card" style={{ padding: 18, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div className="wm-page-kicker">Competitor Compare</div>
          <div className="wm-page-title">Position WyreStorm clearly against alternatives</div>
          <div className="wm-page-copy">
            Use a clean comparison workspace to help sales users explain why a WyreStorm approach fits the application
            without overwhelming them with too much information at once.
          </div>
        </div>

        <GlowGuide
          title="Current priority"
          activeIndex={1}
          steps={[
            { title: "Filter the scenario", copy: "Choose the comparison category before reviewing products." },
            { title: "Explain the fit", copy: "Use the WyreStorm fit area to tell the story clearly." },
            { title: "Move toward proposal", copy: "Use compare to support a decision, not as the final destination." },
          ]}
          note="Comparison pages should help sales explain value, not drown them in spec detail."
        />
      </section>

      <section className="wm-grid-2">
        <aside className="wm-surface-card" style={{ padding: 16, display: "grid", gap: 12, alignSelf: "start" }}>
          <div>
            <div className="wm-section-title">Search compare records</div>
            <div className="wm-section-copy">Reduce the result set first.</div>
          </div>

          <input
            className="wm-input-dark"
            type="text"
            placeholder="Brand, model, category, WyreStorm option"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="wm-toolbar-row">
            {categories.map((item) => {
              const active = item === category;
              return (
                <button
                  key={item}
                  type="button"
                  className={`wm-chip${active ? " wm-chip--active" : ""}`}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="wm-surface-card" style={{ padding: 16, display: "grid", gap: 12, minHeight: 0 }}>
          <div>
            <div className="wm-section-title">Comparison results</div>
            <div className="wm-section-copy">{filtered.length} active records</div>
          </div>

          <div className="wm-fit-page__scroll" style={{ display: "grid", gap: 12 }}>
            {filtered.map((record) => (
              <article key={record.id} className="wm-product-card">
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 280px)", gap: 18 }}>
                  <div>
                    <div className="wm-product-card__sku">{record.category}</div>
                    <div className="wm-product-card__title">{record.competitorBrand} {record.competitorModel}</div>
                    <div className="wm-product-card__copy">{record.summary}</div>
                  </div>

                  <div className="wm-surface-card--soft" style={{ padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#93c5fd", marginBottom: 6 }}>
                      WyreStorm fit
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", marginBottom: 10 }}>
                      {record.wyrestormOption}
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      {record.strengths.map((strength) => (
                        <div key={strength} style={{ padding: "8px 10px", borderRadius: 12, background: "rgba(148,163,184,0.08)", fontSize: 13, color: "rgba(226,232,240,0.76)" }}>
                          {strength}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}