import { useMemo } from "react";
import {
  buildProductTopologyProfile,
  type ProductTopologyProfile,
} from "../lib/productTopology";
import { buildRoomSchematicSvg } from "../lib/roomSchematic";
import type { ProductNarrative, ProductSpec } from "../lib/productStoryEngine";

type RoomSchematicDiagramProps = {
  product: ProductSpec;
  narrative: ProductNarrative;
  profile?: ProductTopologyProfile;
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

function confidenceLabel(profile: ProductTopologyProfile) {
  if (profile.confidence === "verified") return "Verified topology";
  if (profile.confidence === "inferred") return "Family/type topology";
  return "Review required";
}

export function RoomSchematicDiagram({
  product,
  narrative,
  profile,
}: RoomSchematicDiagramProps) {
  const resolvedProfile = useMemo(
    () => profile ?? buildProductTopologyProfile(product, narrative),
    [narrative, product, profile],
  );

  const svg = useMemo(
    () =>
      buildRoomSchematicSvg({
        sku: product.sku,
        profile: resolvedProfile,
      }),
    [product.sku, resolvedProfile],
  );

  const svgDataUri = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    [svg],
  );

  return (
    <section
      className="rounded-3xl border border-[#29465e] bg-[#071522] p-5"
      data-product-topology={resolvedProfile.archetype}
      data-product-topology-confidence={resolvedProfile.confidence}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-cyan-300">
              Product-aware connectivity schematic
            </h2>
            <span className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-xs font-bold text-cyan-100">
              {confidenceLabel(resolvedProfile)}
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-white/70">
            {resolvedProfile.summary}
          </p>
        </div>

        <button
          type="button"
          onClick={() => downloadSvg(product.sku, svg)}
          className="shrink-0 rounded-lg border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100 transition hover:bg-cyan-500/10"
        >
          Download diagram (SVG)
        </button>
      </div>

      {resolvedProfile.warnings.length ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3">
          <strong className="text-sm text-amber-200">Diagram safeguards</strong>
          <ul className="mt-2 grid gap-1 text-sm leading-5 text-white/80">
            {resolvedProfile.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#29465e] bg-white">
        <img
          src={svgDataUri}
          alt={`${product.sku} product-aware room schematic`}
          className="block h-auto w-full"
        />
      </div>

      <details className="mt-4 rounded-xl border border-[#29465e] bg-[#081724] p-3">
        <summary className="cursor-pointer text-sm font-bold text-cyan-200">
          Checks before this diagram is used in a proposal
        </summary>
        <ul className="mt-3 grid gap-2 text-sm leading-5 text-white/75">
          {resolvedProfile.checks.map((check) => (
            <li key={check}>• {check}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export default RoomSchematicDiagram;
