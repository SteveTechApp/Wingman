import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import GlowGuide from "@/ui2/page/GlowGuide";

type IntakeMode = "document" | "notes" | "summary";

export default function ImportIntakePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<IntakeMode>("document");
  const [customerName, setCustomerName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [inputText, setInputText] = useState("");
  const [priority, setPriority] = useState("Standard");

  const summary = useMemo(() => {
    const count = inputText.trim().length;
    const readiness =
      count > 600 ? "Detailed brief" :
      count > 220 ? "Usable brief" :
      count > 40 ? "Early-stage brief" :
      "No usable brief yet";

    return {
      readiness,
      charCount: count,
      nextPath:
        mode === "document" ? "Discovery -> Catalogue / Proposal" :
        mode === "notes" ? "Discovery -> Room / Proposal" :
        "Project setup -> Proposal",
    };
  }, [inputText, mode]);

  return (
    <div className="wm-fit-page wmu-adopt">
      <section className="wm-surface-card wm-fit-page__hero" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16 }}>
        <div>
          <div className="wm-page-kicker">Import Intake</div>
          <div className="wm-page-title">Start from an existing brief or customer notes</div>
          <div className="wm-page-copy">
            Keep the page concise. Capture only what is needed to establish the project baseline, then push
            deeper discovery into the next workflow step instead of overloading the screen.
          </div>
        </div>

        <GlowGuide
          title="Current priority"
          activeIndex={0}
          steps={[
            { title: "Choose input mode", copy: "Decide whether the user is importing a document, notes, or a short summary." },
            { title: "Capture the brief", copy: "Bring in only the information needed to establish direction." },
            { title: "Open next workflow", copy: "Move into discovery or proposal once the baseline is clear." },
          ]}
          note="Import is a starting surface, not the place to finish the whole design."
        />
      </section>

      <section className="wm-fit-page__body wm-grid-2">
        <aside className="wm-surface-card" style={{ padding: 16, display: "grid", gap: 14, alignSelf: "start" }}>
          <div>
            <div className="wm-section-title">Intake mode</div>
            <div className="wm-section-copy">Choose the starting brief format.</div>
          </div>

          <div className="wm-toolbar-row">
            {[
              ["document", "Document"],
              ["notes", "Notes"],
              ["summary", "Summary"],
            ].map(([value, label]) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={`wm-chip${active ? " wm-chip--active" : ""}`}
                  onClick={() => setMode(value as IntakeMode)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="wm-surface-card--soft" style={{ padding: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 6 }}>Brief health</div>
            <div style={{ fontSize: 12, lineHeight: 1.45, color: "rgba(226,232,240,0.74)" }}>
              <div><strong>Status:</strong> {summary.readiness}</div>
              <div><strong>Length:</strong> {summary.charCount} characters</div>
              <div><strong>Suggested next path:</strong> {summary.nextPath}</div>
            </div>
          </div>
        </aside>

        <section className="wm-surface-card" style={{ padding: 16, display: "grid", gap: 14, minHeight: 0 }}>
          <div className="wm-toolbar-row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="wm-section-title">Import brief</div>
              <div className="wm-section-copy">Capture the key intake information without creating a long scrolling form.</div>
            </div>

            <div className="wm-toolbar-row">
              <button type="button" className="wm-btn-secondary" onClick={() => navigate(WM_ROUTES.discovery)}>
                Open discovery
              </button>
              <button type="button" className="wm-btn-primary" onClick={() => navigate(WM_ROUTES.proposal)}>
                Continue to proposal
              </button>
            </div>
          </div>

          <div className="wm-fit-page__scroll" style={{ display: "grid", gap: 14 }}>
            <div className="wm-grid-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <div className="wm-surface-card--soft" style={{ padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>Customer</div>
                <input className="wm-input-dark" type="text" placeholder="Customer / end user" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
              </div>

              <div className="wm-surface-card--soft" style={{ padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>Project</div>
                <input className="wm-input-dark" type="text" placeholder="Project / opportunity name" value={projectName} onChange={(event) => setProjectName(event.target.value)} />
              </div>
            </div>

            <div className="wm-grid-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <div className="wm-surface-card--soft" style={{ padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>Priority</div>
                <select className="wm-select-dark" value={priority} onChange={(event) => setPriority(event.target.value)}>
                  <option>Standard</option>
                  <option>High priority</option>
                  <option>Urgent</option>
                </select>
              </div>

              <div className="wm-surface-card--soft" style={{ padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>Source type</div>
                <div className="wm-toolbar-row">
                  <span className={`wm-chip${mode === "document" ? " wm-chip--active" : ""}`}>Document</span>
                  <span className={`wm-chip${mode === "notes" ? " wm-chip--active" : ""}`}>Notes</span>
                  <span className={`wm-chip${mode === "summary" ? " wm-chip--active" : ""}`}>Summary</span>
                </div>
              </div>
            </div>

            <div className="wm-surface-card--soft" style={{ padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>Intake text</div>
              <textarea className="wm-textarea-dark" placeholder="Paste customer notes, consultant brief, tender extract, or opportunity summary here." value={inputText} onChange={(event) => setInputText(event.target.value)} />
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
