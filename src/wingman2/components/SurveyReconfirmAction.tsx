import { reconfirmWallSurveyReview } from "../data/projectStore";
import { projectSurveyReconfirmDue } from "../lib/wallSurveyReview";

/**
 * The one tap that tells a card the room has been looked at again.
 *
 * A clean survey ages: past `SURVEY_REVIEW_STALE_DAYS` its chip says the room may
 * have moved on, even though the rep was standing in it last week for a different
 * reason. Re-opening the wall builder to change one date is a detour, so the card
 * that shows the doubt is also the place that settles it — the command stamps
 * today on the review, and because the card re-reads the project from the store,
 * its chip immediately reads as current again.
 *
 * Only a review that kept every row has a date to renew: a cleared review is rows
 * to work, not a room to re-confirm, so `projectSurveyReconfirmDue` is the one
 * condition and the action renders nothing for every other state. Nothing here is
 * a navigation — the rep stays where they were, which is the point.
 *
 * The action sits beside the chip rather than inside it: the chip is a link, and
 * a control cannot live inside another control.
 */
export function SurveyReconfirmAction({
  project,
  className = "",
}: {
  project: { id: string; name: string; videowall?: unknown };
  className?: string;
}) {
  if (!projectSurveyReconfirmDue(project)) return null;
  return (
    <button
      type="button"
      className={["wm-ui-button", "wm-ui-button-secondary", className].filter(Boolean).join(" ")}
      aria-label={`Re-confirm the survey for ${project.name}`}
      title="Records today as this survey's review date, so the room counts as checked again. The wall, its rows and runs stay as they are."
      data-survey-reconfirm={project.id}
      onClick={() => reconfirmWallSurveyReview({ projectId: project.id })}
    >
      Re-confirm survey
    </button>
  );
}
