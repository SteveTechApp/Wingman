import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { setActiveProjectId } from "../data/projectStore";
import { projectAnchorHref } from "../lib/projectAnchors";
import {
  WALL_SURVEY_REVIEW_ANCHOR,
  projectSurveyClearedFlag,
  projectSurveyReviewedFlag,
} from "../lib/wallSurveyReview";
import { statusChipClassName, type StatusChipVariant } from "./StatusChip";

// The two states of this flag are chip variants, named rather than written into
// the class expression: the class list comes from StatusChip's tokens, so these
// are not classes of their own.
const CLEARED_VARIANT: StatusChipVariant = "warning";
const REVIEWED_VARIANT: StatusChipVariant = "neutral";

/**
 * The flag a project list puts beside a project whose worksheet photo review has
 * been applied, and the way into the rows it decided.
 *
 * Two states share one chip because they answer the same question — has anyone
 * read the sheet? A review that cleared rows warns, and says how many; a review
 * that kept every row is quieter, because it is good news, but it is still not
 * the same as no survey at all. Either way the chip opens the project on the
 * review that decided the rows, rather than the top of Requirements, and a
 * cleared review opens it at the first cleared row: the count is only useful if
 * the rows behind it are the thing on screen.
 *
 * The same chip is used on the projects page and both dashboard readings, so a
 * rep does not have to remember which surface hides the follow-up. Because it is
 * a link, it must not be placed inside another link: the guided dashboard's card
 * keeps its own hit area beneath this chip rather than wrapping it.
 *
 * The chip also says how long ago the review was applied, because "reviewed"
 * alone reads the same this morning and last season. Once the survey is old
 * enough that the room may have moved on, a clean review loses its tick for a
 * clock, takes a slate wash and a broken edge, and says "re-confirm" beside the
 * date: still not an alarm, but no longer indistinguishable from one taken this
 * week. The words are there because a wash and an icon are only a glance away
 * from being read as decoration on a busy card.
 */
export function SurveyReviewChip({
  project,
  className = "",
}: {
  project: { id: string; videowall?: unknown };
  className?: string;
}) {
  const cleared = projectSurveyClearedFlag(project);
  const reviewed = cleared ? null : projectSurveyReviewedFlag(project);
  // The address is built from the page's own anchor registry, so a chip cannot
  // promise a section the panel no longer lives in, or a row the address reader
  // would not open. A clean review has no cleared row to land on, so it lands
  // on the panel like any other anchor.
  const href = projectAnchorHref(project.id, WALL_SURVEY_REVIEW_ANCHOR, cleared?.rowId);
  if ((!cleared && !reviewed) || !href) return null;
  const flag = cleared ?? reviewed!;
  const age = flag.age;
  return (
    <Link
      to={href}
      onClick={() => setActiveProjectId(project.id)}
      className={statusChipClassName(cleared ? CLEARED_VARIANT : REVIEWED_VARIANT, className)}
      title={flag.title}
      data-survey-review-link={project.id}
      data-survey-review={cleared ? "cleared" : "reviewed"}
      data-survey-review-age={age ? (age.stale ? "stale" : "fresh") : undefined}
      {...(cleared ? { "data-survey-review-row": cleared.rowId } : {})}
      data-testid="survey-review-flag"
    >
      {cleared
        ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        : age?.stale
          ? <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
      <span className="wm-status-chip-label">{flag.label}</span>
      {/* An old clean reading says what to do about it: the age alone is a fact,
          and the chip is the link that re-confirms the room. A cleared review
          keeps its alarm instead — its rows are the follow-up. */}
      {age ? (
        <span className="wm-status-chip-age">
          {age.stale && reviewed ? `${age.text} · re-confirm` : age.text}
        </span>
      ) : null}
    </Link>
  );
}
