import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../../app/routeCatalog";
import type { StoredProject } from "../../features/projects";
import {
  WALL_SURVEY_REVIEW_ANCHOR,
  wallSurveyReviewCounts,
  wallSurveyReviewFlagMeasure,
  wallSurveyReviewFromSummary,
  wallSurveyReviewRowAnchor,
  wallSurveyReviewStamp,
  wallSurveyReviewSummary,
  type WallSurveyReviewFlag,
  type WallSurveyReviewRow,
} from "../../lib/wallSurveyReview";
import { ProjectPanel } from "./ProjectPanel";

/**
 * The worksheet photo review as the project keeps it, for someone who is not
 * the person who applied it.
 *
 * The wall builder shows the review while the rep is working; the project
 * record has to explain it afterwards, when a colleague asks why a run is
 * missing or why a length differs from the sheet. So this panel is read-only:
 * every row the photo offered, the run it read, and whether the design kept it
 * or the row was cleared. A cleared row is named with the value that was
 * rejected, because that value is what the decision was about. A run the rep
 * typed by hand is marked where it sits when it fell far from the link's
 * printed allowance, because the record has to carry the same doubt the apply
 * bar raised before the row landed.
 */
export function WallSurveyPhotoReview({ project }: { project: StoredProject }) {
  const review = wallSurveyReviewFromSummary(project.videowall ?? null);
  if (!review) return null;
  const { rejected } = wallSurveyReviewCounts(review);
  // A flag belongs to the row it names, so the doubt shows on that run rather
  // than in a note the reader has to match back to a link.
  const flaggedRuns = new Map((review.flags ?? []).map((flag) => [flag.id, flag]));

  return (
    <ProjectPanel
      projectId={project.id}
      anchorId={WALL_SURVEY_REVIEW_ANCHOR}
      title="Site survey photo review"
      subtitle="Every row the worksheet photo offered, with the run it read and whether the design kept it. A cleared row left the design's own run and install detail untouched."
    >
      {/* The card itself carries the panel's id and focus, so an audit entry lands
          a reader on the panel rather than only scrolling past it. */}
      <div data-testid="wall-survey-photo-review" data-cleared={rejected}>
        <p className="text-sm leading-6 wm-ui-copy" data-testid="wall-survey-photo-review-summary">
          Recorded{" "}
          <time dateTime={review.reviewedAt}>{wallSurveyReviewStamp(review.reviewedAt)}</time>
          {" — "}
          {wallSurveyReviewSummary(review)}.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm wm-ui-copy">
            <caption className="sr-only">
              Rows the worksheet photo offered, with the run read, its confidence, whether the design kept it, and any run marked as far from its printed allowance.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="border-b py-2 pr-3 font-black">Link</th>
                <th scope="col" className="border-b py-2 pr-3 font-black">Run in the photo</th>
                <th scope="col" className="border-b py-2 pr-3 font-black">Confidence</th>
                <th scope="col" className="border-b py-2 font-black">Decision</th>
              </tr>
            </thead>
            <tbody>
              {review.rows.map((row) => {
                const flag = flaggedRuns.get(row.id);
                return (
                  <tr
                    key={row.id}
                    id={wallSurveyReviewRowAnchor(row.id)}
                    data-survey-review-row={row.id}
                    data-decision={row.decision}
                    data-flagged-run={flag ? "true" : undefined}
                  >
                    <th scope="row" className="border-b py-2 pr-3 align-top font-semibold">
                      {row.label}
                      <span className="ml-1 text-xs opacity-70">· {row.id}</span>
                    </th>
                    <td className="border-b py-2 pr-3 align-top">
                      {runRead(row)}
                      {flag ? <RunFlag flag={flag} /> : null}
                    </td>
                    <td className="border-b py-2 pr-3 align-top">
                      {row.typed ? <span className="text-xs">Typed</span> : `${Math.round(row.confidence * 100)}%`}
                    </td>
                    <td className="border-b py-2 align-top">
                      {row.decision === "accepted" ? "Accepted" : "Cleared"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs leading-5 wm-ui-copy">
          {rejected
            ? `${rejected} row${rejected === 1 ? " was" : "s were"} cleared, so those links keep the run and install detail already recorded on the design.`
            : "Every row the photo offered was accepted onto the design."}{" "}
          <Link to={routeCatalogByKey.videowall.path}>Open the wall builder</Link> to record a run by hand.
        </p>
      </div>
    </ProjectPanel>
  );
}

/**
 * The doubt the apply bar raised, kept beside the run it concerned: the marked
 * number next to the allowance it was far from, in the words the trail uses.
 */
function RunFlag({ flag }: { flag: WallSurveyReviewFlag }) {
  return (
    <span className="mt-1 block text-xs font-semibold text-amber-300" data-flagged-run-note>
      Outside the printed allowance — {wallSurveyReviewFlagMeasure(flag)}
    </span>
  );
}

/**
 * The run the photo reported for one row, with the number the rep corrected it
 * to. A typed row was not in the photograph, so it names the person instead of
 * implying a reading.
 */
function runRead(row: WallSurveyReviewRow) {
  if (row.typed) return row.metres == null ? "No run typed" : `${row.metres} m, typed by the rep`;
  if (row.metres == null) return "No run read";
  return (
    <>
      {row.metres} m
      {row.readMetres != null ? <span className="ml-1 text-xs opacity-70">read {row.readMetres} m</span> : null}
    </>
  );
}
