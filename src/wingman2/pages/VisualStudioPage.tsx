import { useEffect, useMemo, useState } from "react";
import VisualStudioCanvas from "../components/VisualStudioCanvas";
import { useProjectStore } from "../data/projectStore";
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";
import { buildWholeProjectVisualDiagram } from "../lib/schematic/wholeProjectVisualDiagram";
import {
  buildProductConnectionDiagram,
  findProductIntelligenceEntry,
} from "../lib/visualStudioProductConnection";
import { getVisualDiagramById, visualStudioDiagrams } from "../lib/visualStudioSamples";
import type { VisualDiagramMode, VisualDiagramModel } from "../lib/visualStudioTypes";

const WHOLE_PROJECT_DIAGRAM_ID = "whole-project";

// "product-port-view" is a base template inside visualStudioDiagrams that is
// only ever reached via a seedSku deep link (see buildProductConnectionDiagram),
// so it's excluded from the general sample picker below.
const SAMPLE_DIAGRAMS = visualStudioDiagrams.filter((diagram) => diagram.id !== "product-port-view");

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

function getInitialVisualStudioDiagramId(hasActiveProject: boolean): string {
  const searchParams = readVisualStudioSearchParams();
  const seedSku = readSeedSku();
  const source = (searchParams.get("source") || "").trim().toLowerCase();

  if (seedSku || source === "product-discussion") {
    return getVisualDiagramById("product-port-view") ? "product-port-view" : visualStudioDiagrams[0].id;
  }

  if (hasActiveProject) {
    return WHOLE_PROJECT_DIAGRAM_ID;
  }

  return visualStudioDiagrams[0].id;
}

export default function VisualStudioPage() {
  const seedSku = useMemo(() => readSeedSku(), []);
  const { activeProject } = useProjectStore();
  const [selectedDiagramId, setSelectedDiagramId] = useState(() =>
    getInitialVisualStudioDiagramId(Boolean(activeProject)),
  );
  const [mode, setMode] = useState<VisualDiagramMode>("technical");
  const [productIntelligenceIndex, setProductIntelligenceIndex] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    if (!seedSku) {
      return undefined;
    }

    loadProductIntelligenceIndex()
      .then((index) => {
        if (!cancelled) {
          setProductIntelligenceIndex(index);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("[wingman] VisualStudio: product intelligence index load failed", error);
          setProductIntelligenceIndex(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [seedSku]);

  const selectedDiagram = useMemo<VisualDiagramModel>(() => {
    if (selectedDiagramId === WHOLE_PROJECT_DIAGRAM_ID) {
      return buildWholeProjectVisualDiagram(activeProject);
    }

    const baseModel = getVisualDiagramById(selectedDiagramId);
    const productRecord = findProductIntelligenceEntry(productIntelligenceIndex, seedSku);

    return buildProductConnectionDiagram(baseModel, seedSku, productRecord);
  }, [activeProject, productIntelligenceIndex, selectedDiagramId, seedSku]);

  return (
    <main className="wm-vs-page">
      <header className="wm-vs-header">
        <div className="wm-vs-header-copy">
          <p className="wm-vs-eyebrow">Wingman Visual Studio</p>
          <h1>Native AV schematic and concept graphics</h1>
          <p>
            Generate readable customer-safe visuals and technical system shapes directly inside
            Wingman. Product connection view now keeps the selected WyreStorm SKU at the centre
            and treats support lanes as quote checks rather than the main architecture.
          </p>
          {seedSku ? <p className="wm-vs-seed-note">Seed product: {seedSku}</p> : null}
        </div>

        <div className="wm-vs-header-card">
          <span>Current output</span>
          <strong>{mode === "technical" ? "Technical schematic" : "Customer concept"}</strong>
          <small>
            {selectedDiagram.id === "product-port-view" ? "Product-led connection map" : "PNG and SVG export ready"}
          </small>
        </div>
      </header>

      <section className="wm-vs-layout">
        <aside className="wm-vs-left-rail">
          <div className="wm-vs-panel">
            <p className="wm-vs-eyebrow">Diagram source</p>
            <div className="wm-vs-diagram-list">
              <button
                type="button"
                className={`wm-vs-choice${selectedDiagramId === WHOLE_PROJECT_DIAGRAM_ID ? " is-active" : ""}`}
                onClick={() => setSelectedDiagramId(WHOLE_PROJECT_DIAGRAM_ID)}
              >
                <span>Whole project</span>
                <small>
                  {activeProject
                    ? `Generated from ${activeProject.name}'s saved products`
                    : "No active project yet - shows generic placeholders"}
                </small>
              </button>

              {seedSku ? (
                <button
                  type="button"
                  className={`wm-vs-choice${selectedDiagramId === "product-port-view" ? " is-active" : ""}`}
                  onClick={() => setSelectedDiagramId("product-port-view")}
                >
                  <span>{seedSku} product view</span>
                  <small>Signal ownership for the seeded SKU</small>
                </button>
              ) : null}

              {SAMPLE_DIAGRAMS.map((diagram) => (
                <button
                  key={diagram.id}
                  type="button"
                  className={`wm-vs-choice${selectedDiagramId === diagram.id ? " is-active" : ""}`}
                  onClick={() => setSelectedDiagramId(diagram.id)}
                >
                  <span>{diagram.title}</span>
                  <small>{diagram.subtitle}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="wm-vs-panel">
            <p className="wm-vs-eyebrow">Output mode</p>
            <div className="wm-vs-mode-grid">
              <button
                type="button"
                className={`wm-vs-mode${mode === "technical" ? " is-active" : ""}`}
                onClick={() => setMode("technical")}
              >
                <span>Technical schematic</span>
                <small>Signal references and part codes</small>
              </button>
              <button
                type="button"
                className={`wm-vs-mode${mode === "customer" ? " is-active" : ""}`}
                onClick={() => setMode("customer")}
              >
                <span>Customer concept</span>
                <small>Plain-language walkthrough</small>
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
