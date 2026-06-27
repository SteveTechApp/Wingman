import { useMemo } from "react";
import { buildRoomSchematicSvg } from "../lib/roomSchematic";
import type { ProductNarrative, ProductSpec } from "../lib/productStoryEngine";

type RoomSchematicDiagramProps = {
  product: ProductSpec;
  narrative: ProductNarrative;
};

function downloadSvg(sku: string, svg: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sku}-room-schematic.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RoomSchematicDiagram({ product, narrative }: RoomSchematicDiagramProps) {
  const svg = useMemo(
    () =>
      buildRoomSchematicSvg({
        sku: product.sku,
        productType: product.productType,
        role: narrative.role,
        source: narrative.diagramSource,
        output: narrative.diagramOutput,
      }),
    [product.sku, product.productType, narrative.role, narrative.diagramSource, narrative.diagramOutput],
  );
  const svgDataUri = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, [svg]);

  return (
    <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-cyan-300">Room connectivity schematic</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/65">
            A Visio-style view of where {product.sku} sits in the wider room scheme — the source side, the product, the
            output side and the control, network, USB or audio paths that matter for this kind of product.
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadSvg(product.sku, svg)}
          className="shrink-0 rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100 transition hover:bg-cyan-500/10"
        >
          Download diagram (SVG)
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#29465e] bg-white">
        <img src={svgDataUri} alt={`${product.sku} room schematic`} className="block h-auto w-full" />
      </div>
    </section>
  );
}

export default RoomSchematicDiagram;
