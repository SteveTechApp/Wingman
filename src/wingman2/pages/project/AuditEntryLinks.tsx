import { Fragment, useMemo } from "react";
import { Link } from "react-router-dom";
import type { ProjectAuditEntry } from "../../data/projectStore";
import type { StoredProject } from "../../features/projects";
import { rowIdFromAnchor } from "../../lib/anchorIds";
import { projectAnchorHref } from "../../lib/projectAnchors";
import {
  WALL_SURVEY_REVIEW_ANCHOR,
  wallSurveyClearedLink,
  wallSurveyReviewFlagLinks,
  wallSurveyReviewFromSummary,
} from "../../lib/wallSurveyReview";
import { WALL_TRANSPORT_REVIEW_ANCHOR, wallTransportReviewEntryLinks } from "../../lib/wallTransportReview";
import { wallRequirementsFromSummary } from "../../lib/videowallOptions";
import { wallTransportPlan, wallTransportRequirements } from "../../lib/videowallTransport";

/**
 * The Activity timeline's way into the wall rows it names.
 *
 * The trail records what a survey decided and what it measured: a review keeps
 * a count of cleared rows and the numbers of the runs the apply bar doubted, a
 * sheet entry names the runs it imported, and the proposal's install cells name
 * the links they filled. All of it lives in Requirements — the photo review for
 * decisions, the wall transport for the runs and install detail — so an entry
 * carries links instead of leaving the reader to find the row.
 *
 * Each one is an ordinary address on the project's row-anchor contract
 * (`?view=<section>#<panel>-row-<row>`), built with `projectAnchorHref` exactly
 * as a copied panel link is. The page's `useProjectAnchorJump` is what opens the
 * section, scrolls the row into view and focuses the panel, so the timeline, the
 * survey chip and a pasted address all land the same way — this component only
 * says which row an entry is about, never how to get there.
 *
 * Only the newest `wall-survey-review` entry is decorated with review links,
 * because a project keeps one review — an older entry has no rows of its own to
 * open — while every sheet and install-detail entry names its own links.
 */
export function AuditEntryLinks({ project, entry }: { project: StoredProject; entry: ProjectAuditEntry }) {
  const review = useMemo(() => wallSurveyReviewFromSummary(project.videowall ?? null), [project.videowall]);
  const plan = useMemo(() => {
    const requirements = wallTransportRequirements(wallRequirementsFromSummary(project.videowall ?? null));
    return requirements ? wallTransportPlan(requirements) : null;
  }, [project.videowall]);
  const latestReviewId = useMemo(
    () => (project.auditTrail ?? []).find((item) => item.action === "wall-survey-review")?.id ?? null,
    [project.auditTrail],
  );

  // A row the trail names is already the panel's own row anchor
  // (`<panel>-row-<link>`), while the address contract takes the bare row id —
  // so the prefix comes off here rather than being written a second time.
  const rowHref = (anchorId: string, rowAnchor: string) => {
    const row = rowIdFromAnchor(anchorId, rowAnchor);
    return (projectAnchorHref(project.id, anchorId, row) ?? projectAnchorHref(project.id, anchorId)) ?? "";
  };

  // The newest review keeps the panel's own links; a review with nothing cleared
  // and nothing flagged has no row of its own to open.
  const cleared = entry.id === latestReviewId ? wallSurveyClearedLink(review) : null;
  const flaggedRuns = entry.id === latestReviewId && review ? wallSurveyReviewFlagLinks(review) : [];
  const transportLinks = wallTransportReviewEntryLinks(entry, plan);
  if (!cleared && !flaggedRuns.length && !transportLinks.length) return null;

  return (
    <>
      {cleared ? (
        <p className="wm-audit-entry-detail">
          <Link
            to={rowHref(WALL_SURVEY_REVIEW_ANCHOR, cleared.rowId)}
            className="wm-audit-entry-link"
            data-testid="audit-survey-cleared-link"
            title={cleared.title}
          >
            {cleared.label}
          </Link>
        </p>
      ) : null}
      {flaggedRuns.length ? (
        // The same clause the note prints, as the way into the row it was read
        // from: a reader checking "20 m against ≈5 m" wants the decision, not a
        // second sentence.
        <p className="wm-audit-entry-detail" data-testid="audit-survey-flag-links">
          {flaggedRuns.map((flag, index) => (
            <Fragment key={flag.rowId}>
              {index ? "; " : null}
              <Link
                to={rowHref(WALL_SURVEY_REVIEW_ANCHOR, flag.rowId)}
                className="wm-audit-entry-link"
                data-testid="audit-survey-flag-link"
                data-survey-flag-run={flag.rowId}
                title={flag.title}
              >
                {flag.label}
              </Link>
            </Fragment>
          ))}
        </p>
      ) : null}
      {transportLinks.length ? (
        // The wall's own rows: the run a sheet imported, or the link whose install
        // cells the proposal filled, with the allowance and limit the design kept
        // beside it.
        <p className="wm-audit-entry-detail" data-testid="audit-wall-transport-links">
          On the wall:{" "}
          {transportLinks.map((link, index) => (
            <Fragment key={link.rowId}>
              {index ? "; " : null}
              <Link
                to={rowHref(WALL_TRANSPORT_REVIEW_ANCHOR, link.rowId)}
                className="wm-audit-entry-link"
                data-testid="audit-wall-transport-link"
                data-wall-transport-row={link.linkId}
                title={link.title}
              >
                {link.label}
              </Link>
            </Fragment>
          ))}
        </p>
      ) : null}
    </>
  );
}
