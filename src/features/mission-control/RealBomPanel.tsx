import * as React from "react";
import { buildRealBomRecommendation, type BomRecommendation } from "@/workflow/skuRecommendations";

export default function RealBomPanel() {
  const [loading, setLoading] = React.useState(true);
  const [summary, setSummary] = React.useState("");
  const [sourcePath, setSourcePath] = React.useState<string | null>(null);
  const [available, setAvailable] = React.useState(false);
  const [recommendations, setRecommendations] = React.useState<BomRecommendation[]>([]);
  const [notes, setNotes] = React.useState<string[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      const result = await buildRealBomRecommendation();
      if (cancelled) return;

      setAvailable(result.available);
      setSourcePath(result.sourcePath);
      setSummary(result.summary);
      setRecommendations(result.recommendations);
      setNotes(result.notes);
      setLoading(false);
    }

    run();
    const id = window.setInterval(run, 1200);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <section className="wm-mc-realbom wm-card">
      <div className="wm-mc-realbom-head">
        <div>
          <div className="wm-mc-kicker">Starter BOM</div>
          <h2 className="wm-subtitle wm-mc-realbom-title">Local catalogue product mapping</h2>
          <p className="wm-muted wm-mc-realbom-copy">{loading ? "Loading catalogue recommendations..." : summary}</p>
        </div>
      </div>

      {sourcePath ? (
        <div className="wm-mc-realbom-source">Catalogue source: {sourcePath}</div>
      ) : null}

      {available && recommendations.length > 0 ? (
        <div className="wm-mc-realbom-list">
          {recommendations.map((item) => (
            <div key={item.sku} className="wm-mc-realbom-row">
              <div className="wm-mc-realbom-main">
                <div className="wm-mc-realbom-sku">{item.sku}</div>
                <div className="wm-mc-realbom-name">{item.name}</div>
                <div className="wm-mc-realbom-meta">
                  {item.family} / {item.category}
                </div>
              </div>

              <div className="wm-mc-realbom-side">
                <div className="wm-mc-realbom-qty">{item.quantityHint}</div>
                <div className="wm-mc-realbom-reason">{item.reason}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="wm-mc-realbom-empty">
          {loading ? "Loading..." : "No mapped products available yet."}
        </div>
      )}

      <div className="wm-mc-realbom-notes">
        <div className="wm-kpi-label">Notes</div>
        <ul className="wm-mc-architecture-list">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}