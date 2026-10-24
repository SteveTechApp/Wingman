import { getCurrentWorkflowProject } from "../../features/projects";
import { wallDraftStatus } from "../../lib/wallDraftStatus";

/**
 * Where the wall on screen lives: this browser's draft is ahead of the project's
 * saved copy (or there is no project copy yet). It is a note, not a live region —
 * the save confirmation owns the status role — and it stays small because it
 * reports where the work is kept rather than questioning the design.
 *
 * The project's save time is read here rather than passed in so the page entry
 * only hands over the draft stamp and stays inside its line allowance; both are
 * read on the page's render, which every edit and save already causes.
 */
export function WallDraftStatusNote({ draftSavedAt }: { draftSavedAt: string | null }) {
  const status = wallDraftStatus({
    draftSavedAt,
    projectSavedAt: getCurrentWorkflowProject()?.videowall?.savedAt ?? null,
  });
  if (!status) return null;

  return (
    <p className="vw-builder-note" data-testid="videowall-draft-status" data-draft-status={status.state}>
      {status.text}
    </p>
  );
}
