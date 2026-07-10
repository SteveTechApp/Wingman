import { useEffect, useMemo, useState } from "react";
import VisualStudioCanvas from "../components/VisualStudioCanvas";
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";
import {
  buildProductConnectionDiagram,
  findProductIntelligenceEntry,
} from "../lib/visualStudioProductConnection";
import { getVisualDiagramById, visualStudioDiagrams } from "../lib/visualStudioSamples";
import type { VisualDiagramMode } from "../lib/visualStudioTypes";

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

export default function VisualStudioPage() {
  const seedSku = useMemo(() => readSeedSku(), []);
  const [selectedDiagramId, setSelectedDiagramId] = useState(() => getInitialVisualStudioDiagramId());
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
      .catch(() => {
        if (!cancelled) {
          setProductIntelligenceIndex(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [seedSku]);

  const selectedDiagram = useMemo(() => {
    const baseModel = getVisualDiagramById(selectedDiagramId);
    const productRecord = findProductIntelligenceEntry(productIntelligenceIndex, seedSku);

    return buildProductConnectionDiagram(baseModel, seedSku, productRecord);
  }, [productIntelligenceIndex, selectedDiagramId, seedSku]);

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
