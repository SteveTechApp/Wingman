import type { WallRequirements } from "../lib/videowallOptions";
import {
  applyWallTransportFix,
  wallTransportFixLabel,
  type WallLinkDetail,
  type WallTransportPlan,
} from "../lib/videowallTransport";
import type { WallSurveyGap } from "../lib/wallSurvey";

const SURVEY_DETAIL_LABEL: Record<string, string> = {
  enclosure: "display housing",
  entry: "run entry",
  termination: "termination",
};
import { WallSurveyGapFixes } from "./WallSurveyGapFixes";

/**
 * The wall's two pre-issue panels: what the survey has not finished, and where a
 * cable run breaches its transport.
 *
 * A short survey does not stop the document — the installation detail table
 * prints only the links that carry a value — but the rep sees the short links
 * here before issuing it, with the cells that fill them. Those cells are the
 * shared `WallSurveyGapFixes` the template review page also mounts, so both
 * readings name the same links and clear the same warning; a wall whose owner
 * cannot take the cells (`onRecordDetail` absent) keeps the sentence pointing
 * back at the wall builder instead of offering a box that goes nowhere.
 *
 * An over-limit run does stop the document, and says so where the rep is
 * already looking.
 */
export function ProposalWallGate({
  transport,
  survey,
  requirements,
  onRequirementsChange,
  onRecordDetail,
}: {
  requirements?: WallRequirements | null;
  onRequirementsChange?: (requirements: WallRequirements) => void;
  /** Writes the typed cells onto the saved wall; false means the wall could not take them. */
  onRecordDetail?: (linkDetails: Record<string, WallLinkDetail>) => boolean;
  transport: WallTransportPlan | null;
  survey: { gaps: WallSurveyGap[]; text: string } | null;
}) {
  return (
    <>
      {survey ? (
        <div className="wm-proposal-validation-gate" data-wall-survey="incomplete">
          <div className="wm-proposal-validation-header">
            <h3>Site survey</h3>
          </div>
          <div className="wm-proposal-validation-warnings">
            <p className="wm-proposal-validation-summary">
              <strong>{survey.text}</strong>
            </p>
            <ul>
              {survey.gaps.map((gap) => (
                <li
                  key={gap.id}
                  data-wall-survey-gap={gap.id}
                  className="wm-proposal-validation-item wm-proposal-validation-item--warning"
                >
                  <span className="wm-proposal-validation-domain">Missing</span>
                  <span className="wm-proposal-validation-message">
                    {gap.link} — {gap.missing.map((field) => SURVEY_DETAIL_LABEL[field] ?? field).join(" and ")} not recorded.
                  </span>
                </li>
              ))}
            </ul>
            {onRecordDetail ? (
              <WallSurveyGapFixes gaps={survey.gaps} onRecordDetail={onRecordDetail} />
            ) : (
              <p className="wm-proposal-validation-fix">
                Record the display housing, run entry and termination for each link. The installation detail table will
                quote the saved values.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {transport ? (
        <div
          className="wm-proposal-validation-gate"
          data-wall-transport={
            transport.counts.limit
              ? "over-limit"
              : transport.counts.watch
                ? "watch"
                : "within-limit"
          }
        >
          <div className="wm-proposal-validation-header">
            <h3>Wall transport</h3>
          </div>
          <div
            className={
              transport.counts.limit
                ? "wm-proposal-validation-blockers"
                : transport.counts.watch
                  ? "wm-proposal-validation-warnings"
                  : ""
            }
          >
            <p className="wm-proposal-validation-summary">
              <strong>{transport.headline}</strong>
            </p>
            {transport.counts.limit > 0 ? (
              <p className="wm-proposal-validation-fix" data-wall-transport-blocked="true">
                Proposal export is blocked until each over-limit run is fixed; the
                Export Validation list above names the link and the cable change that clears it.
              </p>
            ) : null}
            {transport.allLinks.filter((link) => link.status !== "ok").length ? (
              <ul>
                {transport.allLinks
                  .filter((link) => link.status !== "ok")
                  .map((link) => (
                    <li
                      key={link.id}
                      data-wall-transport-link={link.id}
                      className={`wm-proposal-validation-item wm-proposal-validation-item--${link.status === "limit" ? "blocker" : "warning"}`}
                    >
                      <span className="wm-proposal-validation-domain">
                        {link.status === "limit" ? "Over limit" : "Check run"}
                      </span>
                      <span className="wm-proposal-validation-message">
                        {link.label} — {link.cable}, {link.length}. {link.note}
                      </span>
                      {link.status === "limit" && requirements && onRequirementsChange ? <button type="button" onClick={() => onRequirementsChange(applyWallTransportFix(requirements, link.id))}>{wallTransportFixLabel(link)}</button> : null}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="wm-proposal-validation-summary">
                Every run fits its transport at the designed length.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
