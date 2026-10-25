import { wallFamilyProfiles, type WallDecision } from "../../lib/videowallDecision";
import { wallOptionRange, wallRangesInPlay } from "../../lib/wallRanges";
import { wallOptionVariants, wallVariantFor } from "../../lib/wallVariants";
import type { WallOption } from "../../lib/videowallOptions";

/**
 * Every design the answers were tested against, and the build each one is
 * ordered in.
 *
 * A rep is not choosing "the recommendation" against nothing: the field behind
 * it holds a matrix, a wall processor, three NetworkHD ranges and their
 * composition variants, and which one is right is a product question — the 100
 * series suits a many-window wall on a 1GbE network, the 500 suits 4K60 on
 * 1GbE, the 600 suits uncompressed 4K60 on 10GbE, and a local design suits a
 * room with no AV network at all. So the range key stays on screen above the
 * list, and each row repeats the job its own range answers, because a rep
 * reading one row is not reading the key.
 *
 * The rows are the designs that fit, one tap apart, with the ruled-out designs
 * still listed and the requirement each one breaks. A design that ships in more
 * than one build (the 500 as the full or Lite pair, the 600 on copper or fibre)
 * offers those builds on the selected row: the design stays one architecture,
 * only the order lines and the check that build brings change.
 *
 * It is the same component in both readings. The guided result and the expert
 * design pass test the same answers, so they show the same field.
 */
export function VideowallOptionsList({ decision, options, selected, recommendedId, variantId = "", onSelect, onVariant }: {
  decision: WallDecision;
  options: WallOption[];
  selected: WallOption | null;
  recommendedId: string | null;
  /** The build the rep chose for the selected design; `""` is the catalogue build. */
  variantId?: string;
  onSelect: (id: string) => void;
  onVariant: (variantId: string) => void;
}) {
  // The recommended design leads, then the ones that also fit, then the ones
  // ruled out with the requirement they break. Sorting is stable, so the
  // catalogue's order survives inside each group.
  const statusOf = (option: WallOption) => option.id === recommendedId
    ? "recommended"
    : option.blockers.length
      ? "ruled-out"
      : "also-fits";
  const rank: Record<string, number> = { recommended: 0, "also-fits": 1, "ruled-out": 2 };
  const ordered = [...options].sort((a, b) => rank[statusOf(a)] - rank[statusOf(b)]);
  const ranges = wallRangesInPlay(options.map((option) => option.id));
  const builds = selected ? wallOptionVariants(selected.id) : [];
  const activeBuildId = selected ? (wallVariantFor(selected.id, variantId) ? variantId : "") : "";
  const activeBuild = builds.find((build) => build.id === activeBuildId) ?? builds[0] ?? null;

  return (
    <section className="vw-builder-field" aria-labelledby="wall-options-title" data-testid="videowall-options">
      <header className="vw-builder-field-head">
        <h2 id="wall-options-title">Every option</h2>
        <p>{options.length} designs tested · {decision.viableCount} fit these answers</p>
      </header>

      <ul className="vw-builder-range-key" aria-label="Product ranges">
        {ranges.map((range) => (
          <li key={range.key} data-range={range.key}>
            <strong>{range.label}</strong>
            <span>{range.suits}</span>
          </li>
        ))}
      </ul>

      <div className="vw-builder-option-list" role="group" aria-label="WyreStorm architecture options">
        {ordered.map((option) => {
          const status = statusOf(option);
          const ruled = decision.ruledOut.find((entry) => entry.id === option.id);
          const range = wallOptionRange(option.id);
          const reason = status === "recommended"
            ? "Wingman's recommendation: the fewest boxes that meet every answer given."
            : option.id === decision.alternative?.option.id
              ? decision.alternative.when
              : ruled?.reason ?? "Meets every captured requirement.";
          return (
            <div key={option.id} className="vw-builder-field-row" data-status={status}>
              <button
                type="button"
                data-testid={`videowall-option-${option.id}`}
                aria-pressed={selected?.id === option.id}
                disabled={option.blockers.length > 0}
                onClick={() => onSelect(option.id)}
              >
                <span>
                  <strong>{option.title}</strong>
                  <small>{range.label} · {wallFamilyProfiles[option.id]?.label ?? "Design"}</small>
                </span>
                <em>{status === "also-fits" ? "Also fits" : status === "ruled-out" ? "Ruled out" : "Recommended"}</em>
              </button>
              <div className="vw-builder-field-copy">
                <p>{reason}</p>
                <small className="vw-builder-field-when">{range.suits}</small>
              </div>
            </div>
          );
        })}
      </div>

      {selected && builds.length ? (
        <div className="vw-builder-variants" data-testid="videowall-builds">
          <div className="vw-builder-field-head">
            <h3>Build of {selected.title}</h3>
            <p>Same signal path, different connector set. The schedule and checks below follow the build.</p>
          </div>
          <div className="vw-builder-variant-chips" role="group" aria-label={`${selected.title} build`}>
            {builds.map((build) => (
              <button
                key={build.id || "base"}
                type="button"
                data-testid={`videowall-build-${build.id || "base"}`}
                aria-pressed={build.id === activeBuildId}
                aria-label={`${build.label} for ${selected.title}`}
                onClick={() => onVariant(build.id)}
              >
                {build.label}
              </button>
            ))}
          </div>
          {activeBuild ? <p className="vw-builder-variant-summary">{activeBuild.summary}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
