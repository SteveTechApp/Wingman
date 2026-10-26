import type { StoredProject } from "../../features/projects";
import { DISPLAY_RUN_ANCHOR, displayRunRecord } from "../../lib/displayRunRecord";
import { ProjectPanel } from "./ProjectPanel";

/**
 * The room's display link, as the project record keeps it.
 *
 * A surveyed run chooses an HDBaseT display receiver, and both facts live in the
 * saved project — the distance on the room model, the part in what the schedule
 * quotes — but a reader asking “which receiver is on this run, and why that one”
 * should not have to open the design and reconstruct it. The panel reads the
 * record rather than re-deciding: a rep who changed the receiver is shown the
 * part they chose, and the reason line is the sentence the proposal already
 * carries, so the two surfaces cannot explain the same choice differently.
 *
 * A project holding neither fact renders no panel: no run and no receiver is a
 * room with no HDBaseT display link, not a room whose record is blank.
 */
export function DisplayRunReview({ project }: { project: StoredProject }) {
  const record = displayRunRecord(project);
  if (!record) return null;
  const unmeasured = record.metres === null;
  const unquoted = record.receiverSku === null;

  return (
    <ProjectPanel
      projectId={project.id}
      anchorId={DISPLAY_RUN_ANCHOR}
      title="Display cable run"
      subtitle="The run the survey measured to this room's display, the HDBaseT receiver this project's schedule quotes for it, and why that receiver was chosen."
    >
      <div data-testid="display-run-review">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-black uppercase tracking-[0.14em] wm-ui-kicker">Longest surveyed display run</dt>
            <dd className="mt-1 text-sm font-semibold wm-ui-copy" data-testid="display-run-length">
              {record.metres === null ? "Not recorded" : `${record.metres} m`}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-black uppercase tracking-[0.14em] wm-ui-kicker">Display receiver</dt>
            <dd className="mt-1 text-sm font-semibold wm-ui-copy" data-testid="display-run-receiver">
              {record.receiverSku ?? "Not quoted"}
            </dd>
          </div>
        </dl>
        {record.reason ? (
          <p className="mt-3 text-sm leading-6 wm-ui-copy" data-testid="display-run-reason">
            {record.reason}
          </p>
        ) : null}
        {unmeasured || unquoted ? (
          <p className="mt-3 text-xs leading-5 wm-ui-copy">
            {unmeasured
              ? "No display run is measured for this room yet, so the schedule keeps the receiver the design quoted."
              : "No HDBaseT display receiver is quoted for this run, so the link has no part chosen for it."}
          </p>
        ) : null}
      </div>
    </ProjectPanel>
  );
}
