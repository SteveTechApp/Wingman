import { useMemo, useState } from "react";
import VisualStudioCanvas from "../components/VisualStudioCanvas";
import { getVisualDiagramById, visualStudioDiagrams } from "../lib/visualStudioSamples";
import type { VisualDiagramMode, VisualDiagramModel } from "../lib/visualStudioTypes";

function readVisualStudioSearchParams(): URLSearchParams {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

function readSeedSku(): string {
  const searchParams = readVisualStudioSearchParams();
  return (searchParams.get("seedSku") || searchParams.get("sku") || "").trim().toUpperCase();
}

function getInitialVisualStudioDiagramId(): string {
  const searchParams = readVisualStudioSearchParams();
  const seedSku = readSeedSku();
  const source = (searchParams.get("source") || "").trim().toLowerCase();

  if (seedSku || source === "product-discussion") {
    return getVisualDiagramById("product-port-view") ? "product-port-view" : visualStudioDiagrams[0].id;
  }

  return visualStudioDiagrams[0].id;
}

function replaceSeedProductNode(model: VisualDiagramModel, seedSku: string): VisualDiagramModel {
  if (!seedSku || model.id !== "product-port-view") {
    return model;
  }

  return {
    ...model,
    title: `${seedSku} Product Connection / Port Ownership View`,
    customerSummary: `A simple view showing what connects into ${seedSku}, what comes out, and what still needs confirming before quote.`,
    technicalSummary: `Shows likely input, output, USB, network, audio and control ownership checks around ${seedSku}. Port claims still need datasheet validation.`,
    assumptions: [
      `The selected product is ${seedSku}.`,
      ...model.assumptions,
    ],
    nodes: model.nodes.map((node) => {
      if (node.id !== "device") {
        return node;
      }

      return {
        ...node,
        label: seedSku,
        subtitle: "Selected WyreStorm product / port map",
      };
    }),
  };
}

export default function VisualStudioPage() {
  const seedSku = useMemo(() => readSeedSku(), []);
  const [selectedDiagramId, setSelectedDiagramId] = useState(() => getInitialVisualStudioDiagramId());
  const [mode, setMode] = useState<VisualDiagramMode>("technical");

  const selectedDiagram = useMemo(() => {
    return replaceSeedProductNode(getVisualDiagramById(selectedDiagramId), seedSku);
  }, [selectedDiagramId, seedSku]);

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
          {seedSku ? <p className="wm-vs-seed-note">Seed product: {seedSku}</p> : null}
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
