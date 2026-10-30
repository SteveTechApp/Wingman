import { useState } from "react";
import { AlertTriangle, Check, Cloud, RotateCcw } from "lucide-react";
import type { StoredProjectSyncStatus } from "../data/projectStore";
import {
  syncConflictChipLabel,
  syncConflictStatusMessage,
  type ProjectSyncConflictSummary,
} from "../data/projectSyncConflict";
import { PROJECTS_PILL_BUTTON_CLASS } from "./projectGalleryStyles";
import { StatusChip, type StatusChipVariant } from "./StatusChip";

/**
 * The tone a sync state wears. A conflict reads as a danger because the rep has
 * to choose which copy to keep, while a local save is neutral rather than an
 * error — nothing is wrong, the work is just in this browser only.
 */
export function projectSyncStatusVariant(state: StoredProjectSyncStatus["state"]): StatusChipVariant {
  if (state === "synced") return "success";
  if (state === "error" || state === "conflict") return "danger";
  return "neutral";
}

type ProjectStoreToolbarProps = {
  syncStatus: StoredProjectSyncStatus;
  /**
   * The rooms the store reports a team member's change on, in
   * `syncConflictStatusMessage`'s own shape — read off the projects, which is
   * where the gallery cards read their badges from.
   */
  syncConflicts: readonly ProjectSyncConflictSummary[];
  /** Real projects and drafts a reset leaves alone, so the button can promise it. */
  projectCount: number;
  draftCount: number;
  onReset: () => void;
};

/**
 * Where the store's own state is reported under the project filter: whether the
 * work has reached the workspace, and the way back to the starter examples.
 *
 * A team member's change reads the way a gallery card's badge reads it — the
 * lanes that moved, folded by the same rule, in the same words — because this
 * line is the store-wide reading of those badges: the chip one line above a
 * room's card names the change the card names, and at a phone width the chip's
 * shared one-line rule would cut the lanes it is there to report.
 *
 * The reset is a two-step action because it is the one control here that
 * replaces the store; looking away (blur) disarms it rather than committing.
 */
export function ProjectStoreToolbar({ syncStatus, syncConflicts, projectCount, draftCount, onReset }: ProjectStoreToolbarProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const conflictLabel = syncConflicts.length ? syncConflictChipLabel(syncConflicts) : null;
  // The stored sentence names the rooms; the chip's visible text is the lanes,
  // so the sentence rides in the title the way a card's does.
  const conflictTitle = syncConflicts.length ? syncConflictStatusMessage([...syncConflicts]) : null;
  // A conflict is reported from the store's own conflict flags, not only from
  // the sync status: the cards below wear their badges from those flags in
  // every storage mode, and this line cannot go quiet while they speak.
  const conflicted = Boolean(conflictLabel) || syncStatus.state === "conflict";
  const label = conflictLabel ?? (syncStatus.state === "local" ? "Saved in this browser" : syncStatus.message);

  function handleResetClick() {
    if (confirmReset) {
      onReset();
      setConfirmReset(false);
      return;
    }

    setConfirmReset(true);
  }

  return (
    <div className="wm-projects-store-toolbar">
      <StatusChip
        className={["max-w-xl", conflicted ? "wm-projects-sync-conflict" : ""].filter(Boolean).join(" ")}
        variant={conflicted ? "danger" : projectSyncStatusVariant(syncStatus.state)}
        label={label}
        title={conflictTitle ?? syncStatus.message}
        icon={conflicted ? (
          <AlertTriangle className="h-4 w-4" />
        ) : syncStatus.state === "synced" ? (
          <Check className="h-4 w-4" />
        ) : (
          <Cloud className="h-4 w-4" />
        )}
      />
      <button
        type="button"
        onClick={handleResetClick}
        onBlur={() => setConfirmReset(false)}
        title={
          projectCount || draftCount
            ? `Restores the built-in starter examples. Your ${projectCount} project(s) and ${draftCount} draft(s) are never affected.`
            : "Restores the built-in starter examples."
        }
        className={`inline-flex items-center gap-2 ${PROJECTS_PILL_BUTTON_CLASS} hover:border-cyan-300 hover:bg-[#0d2133] hover:text-[#9ffcf4]`}
      >
        <RotateCcw className="h-4 w-4" />
        {confirmReset ? "Confirm reset?" : "Reset sample store"}
      </button>
    </div>
  );
}
