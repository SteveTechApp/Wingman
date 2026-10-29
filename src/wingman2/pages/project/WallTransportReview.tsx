import { Link } from "react-router-dom";
import { wallResumeUrl } from "../../lib/wallResume";
import { WALL_ENTRY_SENTENCE_NAME } from "../../lib/wallEntry";
import type { StoredProject } from "../../features/projects";
import { wallSurveyRows } from "../../lib/wallSurvey";
import { wallDraftStatus } from "../../lib/wallDraftStatus";
import { storedVideowallDraft } from "../../lib/videowallDraft";
import { WALL_TRANSPORT_REVIEW_ANCHOR, wallTransportReviewRowAnchor } from "../../lib/wallTransportReview";
import { wallRequirementsFromSummary } from "../../lib/videowallOptions";
import {
  wallStartingPointDrift,
  wallStartingPointFromSummary,
  wallStartingPointRecordText,
} from "../../lib/wallStartingPointOrigin";
import { wallLinkDetailText, wallTransportPlan, wallTransportRequirements } from "../../lib/videowallTransport";
import { ProjectPanel } from "./ProjectPanel";

const GROUPS = [
  { key: "source", title: "Sources → head end" },
  { key: "display", title: "Head end → displays" },
] as const;

/**
 * The saved wall's links, as the project record keeps them.
 *
 * A proposal quotes the transport, and the designer is where the runs are
 * entered, but a colleague asking "which link is this, and what was it allowed"
 * should not have to open either. One row per physical link — never a folded
 * group, because a folded row is a screen convenience and this is the record —
 * with the design allowance, the cable limit, the run recorded on site and the
 * install detail that was written for that link.
 *
 * Rows are anchored, so an Activity entry that names a link can land the reader
 * on it instead of the table it sits in. The page hides the panel for a wall
 * with no costable links, the same way the transport estimate itself needs
 * answers to quote anything.
 *
 * It also says when this browser's builder holds work newer than the saved
 * wall, using the builder's own line: reading the record is where a rep would
 * otherwise assume the record is everything there is. That line leads into the
 * builder, because the rep reading it is the rep who can save the work — and the
 * link names this project, so it reopens this wall rather than whichever draft
 * in this browser happens to be newer.
 */
export function WallTransportReview({ project }: { project: StoredProject }) {
  const requirements = wallTransportRequirements(wallRequirementsFromSummary(project.videowall ?? null));
  const plan = requirements ? wallTransportPlan(requirements) : null;
  if (!plan || !requirements) return null;
  // The saved wall records the card it came from, so the record says where the
  // design started as well as what it is: a quote read months later can tell an
  // adjusted wall from the card the customer was shown.
  const drift = wallStartingPointDrift(wallStartingPointFromSummary(project.videowall?.summary), requirements);
  const rows = wallSurveyRows(plan, requirements.linkDetails);
  // Read here rather than passed down: the panel is the surface that shows the
  // saved wall, and this browser's draft is only about this project when the
  // draft says so. Both are read on mount, which is when the page opens.
  const draft = storedVideowallDraft();
  const draftStatus = wallDraftStatus({
    draftSavedAt: draft?.updatedAt ?? null,
    draftProjectId: draft?.projectId ?? null,
    projectSavedAt: project.videowall?.savedAt ?? null,
    projectId: project.id,
  });

  return (
    <ProjectPanel
      projectId={project.id}
      anchorId={WALL_TRANSPORT_REVIEW_ANCHOR}
      title="Wall transport"
      subtitle="Every physical link in the saved wall, with the allowance the design assumed, the limit the cable has to stay under, the run recorded on site and the install detail that belongs to it."
    >
      <div data-testid="wall-transport-review">
        {draftStatus ? (
          <p
            className="text-sm leading-6 wm-ui-copy"
            data-testid="wall-transport-draft-status"
            data-draft-status={draftStatus.state}
          >
            {draftStatus.text}{" "}
            <Link to={wallResumeUrl(project.id)} data-testid="wall-transport-draft-link">Continue in {WALL_ENTRY_SENTENCE_NAME}</Link>
          </p>
        ) : null}
        {drift ? (
          <section className="mb-3" aria-label="Where this wall started" data-testid="wall-starting-point">
            <p className="text-sm leading-6 wm-ui-copy" data-wall-starting-point={drift.card.key}>
              {wallStartingPointRecordText(drift)}
            </p>
          </section>
        ) : null}
        <p className="text-sm leading-6 wm-ui-copy" data-testid="wall-transport-review-summary">
          {plan.headline}
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm wm-ui-copy">
            <caption className="sr-only">
              Every physical link in the saved wall, with its cable, design allowance, cable limit, recorded run and install detail.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="border-b py-2 pr-3 font-black">Link</th>
                <th scope="col" className="border-b py-2 pr-3 font-black">Cable</th>
                <th scope="col" className="border-b py-2 pr-3 font-black">Allowance</th>
                <th scope="col" className="border-b py-2 pr-3 font-black">Limit</th>
                <th scope="col" className="border-b py-2 pr-3 font-black">Recorded run</th>
                <th scope="col" className="border-b py-2 font-black">Install detail</th>
              </tr>
            </thead>
            {GROUPS.map((group) => {
              const members = rows.filter((row) => row.group === group.key);
              if (!members.length) return null;
              return (
                <tbody key={group.key}>
                  <tr>
                    <th scope="colgroup" colSpan={6} className="border-b py-3 text-xs font-black uppercase opacity-70">
                      {group.title}
                    </th>
                  </tr>
                  {members.map((row) => (
                    <tr
                      key={row.id}
                      id={wallTransportReviewRowAnchor(row.id)}
                      data-wall-transport-row={row.id}
                    >
                      <th scope="row" className="border-b py-2 pr-3 align-top font-semibold">
                        {row.link}
                        <span className="ml-1 text-xs opacity-70">· {row.id}</span>
                      </th>
                      <td className="border-b py-2 pr-3 align-top">{row.cable}</td>
                      <td className="border-b py-2 pr-3 align-top">{row.allowanceMetres} m</td>
                      <td className="border-b py-2 pr-3 align-top">{row.limitMetres} m</td>
                      <td className="border-b py-2 pr-3 align-top">
                        {row.measuredMetres == null ? "Not measured" : `${row.measuredMetres} m`}
                      </td>
                      <td className="border-b py-2 align-top">
                        {wallLinkDetailText(row.detail) || "Not recorded"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>

        <p className="mt-3 text-xs leading-5 wm-ui-copy">
          A blank recorded run keeps the design allowance, and an install cell nobody wrote is shown as not recorded rather than as confirmed.
        </p>
      </div>
    </ProjectPanel>
  );
}
