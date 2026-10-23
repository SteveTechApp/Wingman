import type { StoredProject } from "../../features/projects";
import { appliedRunText, wallSurveySheetImports } from "../../lib/wallSurvey";
import { wallSurveyReviewStamp } from "../../lib/wallSurveyReview";
import { SectionCard } from "../../components/SectionCard";

/**
 * The worksheet sheets this wall's runs were typed from.
 *
 * A paper sheet reaches the design through the trail, which is the right place
 * for the event but the wrong place to read it: a rep checking a length has to
 * open Activity, find the right entry and match a clause back to the table. So
 * the runs each sheet carried are printed here, beside the photo review, in the
 * same `label: N m` words the apply and the trail use.
 *
 * Nothing here is a decision: the sheet was a way of typing numbers a surveyor
 * wrote down, and the design already holds the result. A project with no
 * imported sheet renders no panel at all.
 */
export function WallSurveySheetImports({ project }: { project: StoredProject }) {
  const imports = wallSurveySheetImports(project.auditTrail);
  if (!imports.length) return null;

  return (
    <SectionCard
      title="Imported worksheet sheets"
      subtitle="Every printed sheet this wall's runs were typed from, with the runs it carried. The sheet stays with the surveyor; the design already holds what landed on each link."
    >
      <div data-testid="wall-survey-sheet-imports">
        {imports.map((entry) => (
          <article key={entry.id} className="mt-3 first:mt-0" data-sheet-import={entry.id}>
            <p className="text-sm leading-6 wm-ui-copy">
              Imported{" "}
              <time dateTime={entry.importedAt}>{wallSurveyReviewStamp(entry.importedAt)}</time>
              {entry.runs.length
                ? ` — ${entry.runs.length} run${entry.runs.length === 1 ? "" : "s"} from paper.`
                : " — no measured runs on this sheet."}
            </p>
            {entry.runs.length ? (
              <ul
                className="mt-1 list-none p-0 text-xs leading-5 wm-ui-copy"
                data-sheet-import-runs={entry.id}
                aria-label={`Runs imported from the sheet of ${wallSurveyReviewStamp(entry.importedAt)}`}
              >
                {entry.runs.map((run) => (
                  <li key={run.label} data-sheet-run={run.label}>{appliedRunText(run)}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
