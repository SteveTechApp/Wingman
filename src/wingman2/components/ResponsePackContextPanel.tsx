import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { readProductWorkspaceHandoff, type ProductWorkspaceHandoff } from "../data/productWorkspaceHandoff";
import { readSchematicWorkspaceHandoff, type SchematicWorkspaceHandoff } from "../data/schematicWorkspaceHandoff";

function copyText(value: string, callback: () => void) {
  if (!navigator.clipboard) return;

  void navigator.clipboard.writeText(value).then(() => {
    callback();
    window.setTimeout(callback, 1400);
  });
}

function MiniList({ items }: { items: string[] }) {
  const cleanItems = items.map((item) => item.trim()).filter(Boolean).slice(0, 5);

  if (!cleanItems.length) {
    return <p className="text-sm leading-6 text-white/55">No saved items yet.</p>;
  }

  return (
    <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/70">
      {cleanItems.map((item) => (
        <li key={item} className="rounded-2xl border border-[#29465e] bg-[#081724] px-3 py-2">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function ResponsePackContextPanel() {
  const [productHandoff, setProductHandoff] = useState<ProductWorkspaceHandoff | null>(() => readProductWorkspaceHandoff());
  const [schematicHandoff, setSchematicHandoff] = useState<SchematicWorkspaceHandoff | null>(() => readSchematicWorkspaceHandoff());
  const [copiedVisual, setCopiedVisual] = useState(false);
  const [copiedMermaid, setCopiedMermaid] = useState(false);

  useEffect(() => {
    const sync = () => {
      setProductHandoff(readProductWorkspaceHandoff());
      setSchematicHandoff(readSchematicWorkspaceHandoff());
    };

    window.addEventListener("storage", sync);
    window.addEventListener("wingman:product-workspace-handoff-updated", sync);
    window.addEventListener("wingman:schematic-workspace-handoff-updated", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("wingman:product-workspace-handoff-updated", sync);
      window.removeEventListener("wingman:schematic-workspace-handoff-updated", sync);
    };
  }, []);

  const hasContext = Boolean(productHandoff || schematicHandoff);

  const responseSummary = useMemo(() => {
    if (productHandoff && schematicHandoff) {
      return `${productHandoff.sku} has product positioning and a saved schematic context ready for the response pack.`;
    }

    if (productHandoff) {
      return `${productHandoff.sku} has product positioning saved. Open Schematic Builder if a diagram is also needed.`;
    }

    if (schematicHandoff) {
      return "A schematic context is saved. Add product positioning if the response needs SKU-specific language.";
    }

    return "No Product Workspace or Schematic Builder context has been saved yet.";
  }, [productHandoff, schematicHandoff]);

  return (
    <section className="rounded-3xl border border-cyan-500/30 bg-[#071522] p-5 text-white" data-wingman-response-pack-context="true">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Response Pack context</p>
          <h2 className="mt-2 text-2xl font-black text-white">Saved product and schematic handoff</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/70">{responseSummary}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to={routeCatalogByKey.productPitch.path}
            className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100"
          >
            Open Product Workspace
          </Link>

          <Link
            to={routeCatalogByKey.visualDesign.path}
            className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950"
          >
            Open Schematic Builder
          </Link>
        </div>
      </div>

      {hasContext ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <article className="rounded-3xl border border-[#29465e] bg-[#081724] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Product context</p>

            {productHandoff ? (
              <>
                <h3 className="mt-2 text-xl font-black text-white">{productHandoff.sku}</h3>
                <p className="mt-1 text-sm font-semibold text-white/70">{productHandoff.name}</p>
                <p className="mt-3 text-sm leading-6 text-white/70">{productHandoff.headline}</p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#29465e] bg-[#071522] p-3">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-white/45">Source side</span>
                    <strong className="mt-1 block text-white">{productHandoff.diagramSource}</strong>
                  </div>

                  <div className="rounded-2xl border border-[#29465e] bg-[#071522] p-3">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-white/45">Destination side</span>
                    <strong className="mt-1 block text-white">{productHandoff.diagramOutput}</strong>
                  </div>
                </div>

                <MiniList items={productHandoff.checks} />
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-white/55">No product handoff saved yet.</p>
            )}
          </article>

          <article className="rounded-3xl border border-[#29465e] bg-[#081724] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Schematic context</p>

            {schematicHandoff ? (
              <>
                <h3 className="mt-2 text-xl font-black text-white">{schematicHandoff.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/70">{schematicHandoff.summary}</p>

                <MiniList items={schematicHandoff.blockers} />

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyText(schematicHandoff.mermaid, () => setCopiedMermaid((current) => !current))}
                    className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100"
                  >
                    {copiedMermaid ? "Copied" : "Copy Mermaid"}
                  </button>

                  {schematicHandoff.visualPrompt ? (
                    <button
                      type="button"
                      onClick={() => copyText(schematicHandoff.visualPrompt || "", () => setCopiedVisual((current) => !current))}
                      className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100"
                    >
                      {copiedVisual ? "Copied" : "Copy room visual prompt"}
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-white/55">No schematic handoff saved yet.</p>
            )}
          </article>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-[#29465e] bg-[#081724] p-4 text-sm leading-6 text-white/65">
          Start in Product Workspace, select a product, then send its diagram context to Schematic Builder.
        </div>
      )}
    </section>
  );
}