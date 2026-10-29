import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import type { StoredDiscoveryBrief } from "../../features/projects";
import { discoveryResumeUrl } from "../../lib/discoveryResume";
import { projectPositioning, projectPositioningLine } from "../../lib/projectPositioning";

/**
 * Where the room sits, and what to do when the lead-in recorded only half of it.
 *
 * The line is printed for every room, positioned ones included, because the pair
 * is a record-level fact before it is a warning: it is what this record says
 * about the world its answers were given for, and the sections below show what
 * was saved rather than the frame it was answered in. The note proper is that
 * same line read against a half Discovery never recorded, and it appears only
 * then — the gap is the half a rep can still supply.
 *
 * A rep can open a project record without ever having met Discovery's lead-in —
 * a room copied from a template, one reopened days later, one whose answers a
 * teammate's sync brought over — and the answers it holds then read as complete
 * when they were asked without the frame that makes their wording mean anything.
 * The note names the missing half beside the line rather than letting the line's
 * `not recorded` stand alone: a template preset names the market and leaves the
 * space, and a rep who is told only "no environment" would have to open the brief
 * to learn what the market is.
 *
 * The link opens Discovery on the room, where the lead-in is the screen a rep
 * lands on while the space is still missing — the same resume URL the page's
 * other actions use, rather than a second wording for the same destination.
 */
export function ProjectPositioningNote({
  projectId,
  brief,
}: {
  projectId: string;
  brief?: Pick<StoredDiscoveryBrief, "roomModel"> | null;
}) {
  const positioning = projectPositioning(brief);
  const { missing } = positioning;
  const line = projectPositioningLine(positioning);

  // A positioned room says where it sits and stops there: nothing is wrong, so
  // there is no alarm, no link and no second sentence to read.
  if (!missing.length) {
    return (
      <p
        data-testid="project-positioning"
        data-project-positioning-missing=""
        className="wm-ui-copy"
      >
        {line}
      </p>
    );
  }

  const both = missing.length === 2;
  const headline = both ? "No market or environment recorded" : `No ${missing[0]} recorded`;
  const action = both
    ? "Set market and environment in Discovery"
    : `Set the ${missing[0]} in Discovery`;

  return (
    <section
      aria-label="Market and environment"
      data-testid="project-positioning"
      data-project-positioning-missing={missing.join(",")}
      className="mt-4 flex items-start gap-3 rounded-xl border border-cyan-800/70 bg-[#0b1f2c] px-4 py-3"
    >
      <Compass className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
      <div className="text-sm leading-6 text-cyan-100 wm-ui-copy">
        <p className="font-bold text-cyan-50">{headline}.</p>
        <p className="mt-1">{line}</p>
        <p className="mt-1">
          Discovery's first step records the customer's market and the space the system serves, and
          every question after it is read against them. Without that, this room is unpositioned —
          treat the design as a starting point rather than a quote.
        </p>
        <Link
          to={discoveryResumeUrl(projectId)}
          className="mt-2 inline-flex font-bold text-cyan-200 underline underline-offset-2"
        >
          {action}
        </Link>
      </div>
    </section>
  );
}
