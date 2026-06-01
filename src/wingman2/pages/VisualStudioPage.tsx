import { useMemo, useState } from "react";
import VisualStudioCanvas from "../components/VisualStudioCanvas";
import { getVisualDiagramById, visualStudioDiagrams } from "../lib/visualStudioSamples";
import type { VisualDiagramMode } from "../lib/visualStudioTypes";

export default function VisualStudioPage() {
  const [selectedDiagramId, setSelectedDiagramId] = useState(visualStudioDiagrams[0].id);
  const [mode, setMode] = useState<VisualDiagramMode>("technical");

  const selectedDiagram = useMemo(() => {
    return getVisualDiagramById(selectedDiagramId);
  }, [selectedDiagramId]);

  return (
    <main className="wm-vs-page">
      <header className="wm-vs-header">
        <div>
          <p className="wm-vs-eyebrow">Wingman Visual Studio</p>
          <h1>Native AV schematic and concept graphics</h1>
          <p>
            Generate customer-safe visuals and technical system shapes directly inside Wingman.
            This first pass uses Wingman-ready AV scenarios and is designed to connect later to
            Discovery, Finder, Product Pitch and Proposal data.
          </p>
        </div>

        <div className="wm-vs-header-card">
          <span>Current output</span>
          <strong>{mode === "technical" ? "Technical schematic" : "Customer concept graphic"}</strong>
          <small>PNG and SVG export ready</small>
        </div>
      </header>

      <section className="wm-vs-layout">
        <aside className="wm-vs-left-rail">
          <div className="wm-vs-panel">
            <p className="wm-vs-eyebrow">Diagram type</p>
            <div className="wm-vs-diagram-list">
              {visualStudioDiagrams.map((diagram) => (
                <button
                  key={diagram.id}
                  type="button"
                  className={`wm-vs-choice ${selectedDiagramId === diagram.id ? "is-active" : ""}`}
                  onClick={() => setSelectedDiagramId(diagram.id)}
                >
                  <span>{diagram.title}</span>
                  <small>{diagram.subtitle}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="wm-vs-panel">
            <p className="wm-vs-eyebrow">View mode</p>
            <div className="wm-vs-mode-grid">
              <button
                type="button"
                className={`wm-vs-mode ${mode === "technical" ? "is-active" : ""}`}
                onClick={() => setMode("technical")}
              >
                <span>Technical</span>
                <small>Shows devices, paths and quote checks.</small>
              </button>
              <button
                type="button"
                className={`wm-vs-mode ${mode === "customer" ? "is-active" : ""}`}
                onClick={() => setMode("customer")}
              >
                <span>Customer</span>
                <small>Simplifies the graphic for discussion.</small>
              </button>
            </div>
          </div>
        </aside>

        <VisualStudioCanvas model={selectedDiagram} mode={mode} />

        <aside className="wm-vs-right-rail">
          <div className="wm-vs-panel wm-vs-summary-panel">
            <p className="wm-vs-eyebrow">What this shows</p>
            <h2>{selectedDiagram.title}</h2>
            <p>{mode === "technical" ? selectedDiagram.technicalSummary : selectedDiagram.customerSummary}</p>
          </div>

          <div className="wm-vs-panel">
            <p className="wm-vs-eyebrow">Assumptions</p>
            <ul className="wm-vs-list">
              {selectedDiagram.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="wm-vs-panel wm-vs-warning-panel">
            <p className="wm-vs-eyebrow">Missing information</p>
            <ul className="wm-vs-list">
              {selectedDiagram.missingInformation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="wm-vs-panel wm-vs-risk-panel">
            <p className="wm-vs-eyebrow">Quote risks</p>
            <ul className="wm-vs-list">
              {selectedDiagram.quoteRisks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="wm-vs-panel">
            <p className="wm-vs-eyebrow">Next action</p>
            <ul className="wm-vs-list">
              {selectedDiagram.nextActions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}