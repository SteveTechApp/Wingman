import React, { useMemo, useState } from "react";
import { extractRequirements } from "@/import/extractRequirements";
import { recommendWyrestorm } from "@/import/recommendWyrestorm";

const DEMO_BRIEF = `Need design for a medium boardroom with 2 displays and 6 endpoints.
Users require BYOD over USB-C, Teams support, and 4K60.
Distances up to 60m across building floors.
Need source switching for laptop + wireless presentation.`;

export default function ImportIntakePage() {
  const [rawText, setRawText] = useState(DEMO_BRIEF);

  const parsed = useMemo(() => extractRequirements(rawText), [rawText]);
  const rec = useMemo(() => recommendWyrestorm(parsed, rawText), [parsed, rawText]);

  return (
    <div>
      <div className="wm-kicker">Workspace</div>
      <div className="wm-h1" style={{ marginTop: 6 }}>Import Intake</div>
      <p className="wm-p" style={{ marginTop: 8 }}>
        Paste client brief text to extract requirements and generate ranked WyreStorm recommendations.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 12, marginTop: 14 }}>
        <section className="wm-card wm-card-pad">
          <div className="wm-section-title">Input brief</div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="wm-input"
            rows={14}
            placeholder="Paste customer notes, RFP snippets, or site survey summary..."
            style={{ marginTop: 8, width: "100%", resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="wm-btn" onClick={() => setRawText(DEMO_BRIEF)}>Load demo brief</button>
            <button className="wm-btn" onClick={() => setRawText("")}>Clear</button>
          </div>
        </section>

        <section className="wm-card wm-card-pad">
          <div className="wm-section-title">Extracted requirements</div>
          <ul className="wm-p" style={{ marginTop: 8, paddingLeft: 18 }}>
            {parsed.summary.map((s) => <li key={s}>{s}</li>)}
          </ul>
          {parsed.notes.length > 0 && (
            <>
              <div className="wm-kicker" style={{ marginTop: 10 }}>Notes</div>
              <ul className="wm-p" style={{ marginTop: 6, paddingLeft: 18 }}>
                {parsed.notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="wm-card wm-card-pad" style={{ marginTop: 12 }}>
        <div className="wm-section-title">Recommendation</div>
        {rec.mode === "room" ? (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {rec.tiers.map((tier) => (
              <div key={tier.tier} className="wm-card" style={{ padding: 10 }}>
                <div className="wm-h2" style={{ marginTop: 0 }}>{tier.tier}</div>
                <div className="wm-p" style={{ marginTop: 6 }}>
                  {tier.rationale[0]}
                </div>
                <div className="wm-kicker" style={{ marginTop: 8 }}>Top SKUs</div>
                <div className="wm-p" style={{ marginTop: 4 }}>
                  {tier.skus.slice(0, 6).map((s) => s.sku).join(", ") || "No ranked SKUs."}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <div className="wm-kicker">Best matches</div>
            <div className="wm-p" style={{ marginTop: 4 }}>
              {rec.best.slice(0, 10).map((s) => s.sku).join(", ") || "No ranked SKUs."}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
