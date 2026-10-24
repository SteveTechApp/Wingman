import { useState } from "react";
import { AlertTriangle, Check, Cloud, RotateCcw } from "lucide-react";
import type { StoredProjectSyncStatus } from "../data/projectStore";
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
  /** Real projects and drafts a reset leaves alone, so the button can promise it. */
  projectCount: number;
  draftCount: number;
  onReset: () => void;
};

/**
 * Where the store's own state is reported under the project filter: whether the
 * work has reached the workspace, and the way back to the starter examples.
 *
 * The reset is a two-step action because it is the one control here that
 * replaces the store; looking away (blur) disarms it rather than committing.
 */
export function ProjectStoreToolbar({ syncStatus, projectCount, draftCount, onReset }: ProjectStoreToolbarProps) {
  const [confirmReset, setConfirmReset] = useState(false);

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
        className="max-w-xl"
        variant={projectSyncStatusVariant(syncStatus.state)}
        label={syncStatus.state === "local" ? "Saved in this browser" : syncStatus.message}
        title={syncStatus.message}
        icon={syncStatus.state === "synced" ? (
          <Check className="h-4 w-4" />
        ) : syncStatus.state === "error" || syncStatus.state === "conflict" ? (
          <AlertTriangle className="h-4 w-4" />
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
