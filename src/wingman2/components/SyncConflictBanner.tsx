import { AlertTriangle } from "lucide-react";
import { type StoredProjectSyncConflict } from "../data/projectStore";
import { projectLaneLabel } from "../data/projectSyncConflict";

export function ProjectSyncConflictBanner({ conflict }: { conflict?: StoredProjectSyncConflict }) {
  if (!conflict?.fields.length) return null;
  return (
    <section aria-label="Team member changes" className="mt-4 flex items-start gap-3 rounded-xl border border-amber-700 bg-amber-950 px-4 py-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
      <div className="text-sm leading-6 text-amber-100 wm-ui-copy">
        <p className="font-bold text-amber-50">A team member changed {conflict.fields.map(projectLaneLabel).join(", ")} since your last sync.</p>
        <p className="mt-1">Reload the page to review their latest changes before continuing.</p>
      </div>
    </section>
  );
}
