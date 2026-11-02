import { Link } from "react-router-dom";
import { Boxes, PackageCheck } from "lucide-react";

import { routeCatalogByKey } from "../../app/routeCatalog";

/**
 * The recommendation page's handoff surface, in the pieces the page places.
 *
 * Three blocks on that page belong to the same moment — what the reviewed
 * design becomes next — and they were written inline, which pushed the page
 * entry past the line ceiling it holds an allowance for. They are presentational
 * and take no state, so the page passes its callbacks and its reads in and keeps
 * owning what happens; this module owns only the wording and the markup.
 *
 * The section and the links are separate exports because the page prints the
 * status message between them: one component cannot hold both without also
 * holding a slot the page fills.
 */
export function RecommendationHandoffPanel({
  unfilledCount,
  onReviewSystem,
  onAddWholeSystem,
}: {
  /** Roles the design still has to fill before it is priced. */
  unfilledCount: number;
  onReviewSystem: () => void;
  onAddWholeSystem: () => void;
}) {
  return (
    <section className="wm-rec-handoff" aria-labelledby="wm-rec-handoff-title">
      <div>
        <p className="wm-ui-kicker">Ready for the next workflow</p>
        <h2 id="wm-rec-handoff-title">Carry the reviewed design into the active project.</h2>
        <p>{unfilledCount ? "Some roles still need review, so keep the design in validation before quoting." : "The role structure is ready to become a project selection. Add the system, then continue to the response pack."}</p>
      </div>
      <div className="wm-rec-handoff__actions">
        <button className="wm-ui-button wm-ui-button-primary" type="button" onClick={onReviewSystem}>
          <Boxes size={16} aria-hidden="true" /> Review system
        </button>
        <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={onAddWholeSystem}>
          <PackageCheck size={16} aria-hidden="true" /> Add complete system
        </button>
      </div>
    </section>
  );
}

/** The way out of the handoff stage: the project it landed in, or the response pack. */
export function RecommendationHandoffLinks({ activeProjectId }: { activeProjectId: string | null }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <Link
        className="wm-ui-button wm-ui-button-secondary rounded-xl px-4 py-3 font-black"
        to={
          activeProjectId
            ? `${routeCatalogByKey.projects.path}/${activeProjectId}`
            : routeCatalogByKey.projects.path
        }
      >
        Open project
      </Link>
      <Link
        className="wm-ui-button wm-ui-button-primary rounded-xl px-4 py-3 font-black"
        to={routeCatalogByKey.proposal.path}
      >
        Continue to response pack
      </Link>
    </div>
  );
}

export type BrandOutcomeRow = {
  brand: string;
  lossCount: number;
  winCount: number;
  whySnippets: string[];
};

/**
 * Brands the deal history says are winning and losing against WyreStorm.
 *
 * It prints on the handoff stage because objection handling belongs to the
 * moment a rep is about to send, not to the read of the design.
 */
export function RecommendationBrandLandscape({ brands }: { brands: BrandOutcomeRow[] }) {
  return (
    <section className="wm-ui-card rounded-2xl border p-5">
      <header className="mb-4">
        <p className="wm-ui-kicker">Competitive landscape</p>
        <h2 className="wm-ui-title text-xl font-black">Brands winning and losing against WyreStorm</h2>
        <p className="wm-ui-copy text-sm">These patterns are extracted from deal outcomes across your projects. Brands with the most losses are shown first — check the battle cards for objection handling.</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {brands.slice(0, 9).map((brand) => (
          <li key={brand.brand} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
            <div className="flex items-center justify-between">
              <strong className="font-black">{brand.brand}</strong>
              <div className="flex gap-1.5">
                {brand.lossCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/40 text-red-400">
                    {brand.lossCount} lost
                  </span>
                )}
                {brand.winCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400">
                    {brand.winCount} won
                  </span>
                )}
              </div>
            </div>
            {brand.whySnippets.length > 0 && (
              <p className="mt-2 text-xs opacity-70 line-clamp-2">
                {brand.whySnippets[0]}
              </p>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <Link
          className="wm-ui-button wm-ui-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
          to={routeCatalogByKey.battleCards?.path ?? "/wingman/battle-cards"}
        >
          Open battle cards for objection handling
        </Link>
      </div>
    </section>
  );
}
