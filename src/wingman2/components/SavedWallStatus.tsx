import type { StoredProject } from "../data/projectStore";
import { updateStoredProject } from "../data/projectStore";
import { wallRequirementsFromSummary } from "../lib/videowallOptions";
import { wallTransportPlan, wallTransportRequirements } from "../lib/videowallTransport";
import { normalizeWallSurveyReview } from "../lib/wallSurveyReview";
import { StatusChip } from "./StatusChip";

export function SavedWallStatus({ project, projects, showReview = false }: { project: StoredProject; projects: StoredProject[]; showReview?: boolean }) {
  const wall = project.videowall;
  if (!wall) return null;
  const requirements = wallTransportRequirements(wallRequirementsFromSummary(wall));
  const plan = requirements ? wallTransportPlan(requirements) : null;
  const orphan = wall.projectId && !projects.some(candidate => candidate.id === wall.projectId);
  const review = normalizeWallSurveyReview(requirements?.surveyReview);
  function setOwner(clear: boolean) {
    updateStoredProject(project.id, current => ({ ...current, videowall: current.videowall ? { ...current.videowall, projectId: clear ? undefined : project.id, ownershipCleared: clear } : undefined }));
  }
  return <div>
    {plan ? <StatusChip variant={plan.counts.limit ? "danger" : plan.counts.watch ? "warning" : "success"} label={plan.counts.limit ? `Wall transport: ${plan.counts.limit} over limit` : plan.counts.watch ? "Wall transport: check runs" : "Wall transport: within limits"} /> : <StatusChip variant="neutral" label="Wall transport: survey required" />}
    {orphan ? <div role="alert"><p>Saved wall project {wall.projectId} no longer exists.</p><button type="button" onClick={() => setOwner(false)}>Re-home to this project</button><button type="button" onClick={() => setOwner(true)}>Clear recorded ownership</button></div> : null}
    {showReview && review ? <section aria-label="Worksheet photo review"><h3>Worksheet photo review</h3><p>{review.photoCount} photos reviewed {new Date(review.reviewedAt).toLocaleString()}</p><table><thead><tr><th>Link</th><th>Reading</th><th>Applied run</th><th>Confidence</th><th>Decision</th></tr></thead><tbody>{review.rows.map(row => <tr key={row.id}><td>{row.label}</td><td>{row.readMetres ?? row.metres ?? "Not read"}</td><td>{row.decision === "accepted" ? row.metres ?? "Detail only" : "Unchanged"}</td><td>{Math.round(row.confidence * 100)}%</td><td>{row.decision}</td></tr>)}</tbody></table></section> : null}
  </div>;
}
