import { useEffect, useState } from "react";
import { productApplicationVisualsForSku } from "../data/productApplicationVisuals";

export function ProductApplicationVisuals({ sku }: { sku: string }) {
  const visuals = productApplicationVisualsForSku(sku);
  const layouts = visuals.filter((visual) => visual.kind === "layout");
  const supportingVisuals = visuals.filter((visual) => visual.kind !== "layout");
  const [activeLayoutIndex, setActiveLayoutIndex] = useState(0);

  useEffect(() => setActiveLayoutIndex(0), [sku]);

  if (!visuals.length) return null;
  const activeLayout = layouts[activeLayoutIndex] ?? layouts[0];

  return (
    <section className="wm-product-application-visuals" aria-labelledby="product-application-visuals-title">
      <header>
        <div>
          <span className="wm-ui-kicker">See how it works</span>
          <h2 id="product-application-visuals-title" className="wm-ui-title">Layouts and signal flow</h2>
        </div>
        <a href={visuals[0].sourceUrl} target="_blank" rel="noreferrer">Official product page</a>
      </header>
      <div className="wm-product-application-visuals__grid">
        {activeLayout ? (
          <div className="wm-product-layout-explorer">
            <figure data-visual-kind="layout">
              <a href={activeLayout.url} target="_blank" rel="noreferrer" title="Open full-size official image">
                <img src={activeLayout.url} alt={activeLayout.alt} loading="eager" decoding="async" referrerPolicy="no-referrer" />
              </a>
              <figcaption aria-live="polite">
                <strong>{activeLayout.title}</strong>
                <span>{activeLayout.description}</span>
              </figcaption>
            </figure>
            <div className="wm-product-layout-picker" aria-label="Available multiview layouts">
              {layouts.map((layout, index) => (
                <button key={layout.url} type="button" aria-pressed={index === activeLayoutIndex} onClick={() => setActiveLayoutIndex(index)}>
                  <img src={layout.url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                  <span>{layout.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {supportingVisuals.map((visual) => (
          <figure key={visual.url} data-visual-kind={visual.kind}>
            <a href={visual.url} target="_blank" rel="noreferrer" title="Open full-size official image">
              <img src={visual.url} alt={visual.alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
            </a>
            <figcaption>
              <strong>{visual.title}</strong>
              <span>{visual.description}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
