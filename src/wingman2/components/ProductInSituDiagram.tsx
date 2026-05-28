import type { ProductCableLegend, ProductDiagramNode, ResolvedProductSalesKnowledge } from "../data/productSalesKnowledge";

function nodeClass(tone: ProductDiagramNode["tone"]) {
  return `wm-product-diagram-node wm-product-diagram-node-${tone}`;
}

function cableClass(tone: ProductCableLegend["tone"]) {
  return `wm-product-cable-pill wm-product-cable-${tone}`;
}

export function ProductInSituDiagram({ knowledge, compact = false }: { knowledge: ResolvedProductSalesKnowledge; compact?: boolean }) {
  return (
    <section className="wm-product-in-situ" data-compact={compact ? "true" : "false"}>
      <div className="wm-product-in-situ-header">
        <div>
          <p>In-situ system view</p>
          <h4>{knowledge.diagram.title}</h4>
        </div>
        <span>{knowledge.classLabel}</span>
      </div>

      <div className="wm-product-diagram-flow" aria-label={`In-situ diagram for ${knowledge.sku}`}>
        {knowledge.diagram.nodes.map((node, index) => (
          <div className="wm-product-diagram-step" key={`${node.label}-${node.title}`}>
            <article className={nodeClass(node.tone)}>
              <small>{node.label}</small>
              <strong>{node.title}</strong>
              <span>{node.detail}</span>
            </article>

            {index < knowledge.diagram.nodes.length - 1 ? (
              <div className="wm-product-diagram-arrow" aria-hidden="true">
                <span />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {!compact ? (
        <div className="wm-product-cable-legend">
          {knowledge.diagram.cableLegend.map((item) => (
            <article key={`${item.label}-${item.cable}`}>
              <div>
                <span className={cableClass(item.tone)}>{item.label}</span>
                <strong>{item.cable}</strong>
              </div>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default ProductInSituDiagram;