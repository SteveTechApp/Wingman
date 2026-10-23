import { wallFamilyProfiles, type WallDecision } from "../../lib/videowallDecision";
import type { WallOption } from "../../lib/videowallOptions";

/** The field of designs tested against the answers, led by the recommendation. */
export function VideowallOptionsList({ decision, options, selected, recommendedId, onSelect }: {
  decision: WallDecision;
  options: WallOption[];
  selected: WallOption | null;
  recommendedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="vw-builder-field" aria-labelledby="wall-options-title">
      <header>
        <h2 id="wall-options-title">Every design considered</h2>
        <p>
          {decision.considered} designs were tested against your answers: {decision.viableCount} fit the brief and the
          rest are listed with the requirement they break.
        </p>
      </header>
      <div className="vw-builder-option-list" role="group" aria-label="WyreStorm architecture options">
        {options.map((option) => {
          const ruled = decision.ruledOut.find((entry) => entry.id === option.id);
          const status = option.id === recommendedId
            ? "Recommended"
            : option.blockers.length
              ? "Ruled out"
              : "Also fits";
          const reason = option.id === recommendedId
            ? "Wingman's recommendation: the fewest boxes that meet every answer given."
            : option.id === decision.alternative?.option.id
              ? decision.alternative.when
              : ruled?.reason ?? "Meets every captured requirement.";
          return (
            <div
              key={option.id}
              className="vw-builder-field-row"
              data-status={status.toLowerCase().replace(/\s+/g, "-")}
            >
              <button
                type="button"
                aria-pressed={selected?.id === option.id}
                disabled={option.blockers.length > 0}
                onClick={() => onSelect(option.id)}
              >
                <span>
                  <strong>{option.title}</strong>
                  <small>{wallFamilyProfiles[option.id]?.label ?? "Design"}</small>
                </span>
                <em>{status}</em>
              </button>
              <p>{reason}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
