import { useState } from "react";
import { AlertTriangle, Check, Cloud, Copy, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { SectionCard } from "../components/SectionCard";
import { StatusChip, type StatusChipVariant } from "../components/StatusChip";
import { setActiveProjectId, useProjectStore, type StoredProject, type StoredProjectSyncStatus } from "../data/projectStore";

const PROJECTS_PILL_BUTTON_CLASS =
  "rounded-lg border border-[#29465e] bg-[#0d2133] px-3 py-2 text-xs font-bold text-[#edf6ff] transition";
const PROJECTS_ICON_BUTTON_CLASS =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#29465e] bg-[#0d2133] text-[#edf6ff] transition";
const PROJECTS_DARK_BUTTON_CLASS = "rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800";
const PROJECTS_DARK_BUTTON_XS_CLASS = "rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800";

function projectStatusLabel(status: StoredProject["status"]) {
  if (status === "recommended") return "On track";
  if (status === "alternative") return "In progress";
  return "Needs review";
}

function syncStatusVariant(state: StoredProjectSyncStatus["state"]): StatusChipVariant {
  if (state === "synced") return "success";
  if (state === "error" || state === "conflict") return "danger";
  return "neutral";
}

/**
 * The most recent comparison's stored confidence tier (e.g. "Plausible —
 * confirm"), surfaced as a per-row badge so a rep sees the verdict without
 * opening the project. Compare runs are stored newest-first, so [0] is latest.
 */
function latestCompareConfidence(project: StoredProject): string | null {
  const confidence = project.compareRuns?.[0]?.confidence;
  return confidence && confidence.trim() ? confidence : null;
}

function compareConfidenceVariant(confidence: string): StatusChipVariant {
  const label = confidence.toLowerCase();
  if (label.includes("strong")) return "success";
  if (label.includes("no equivalent")) return "danger";
  // "Plausible — confirm" and "Evidence pending" both need review before quoting.
  return "warning";
}

export function ProjectsPage() {
  const {
    projects,
    proposalDrafts,
    activeProjectId,
    syncStatus,
    copyProject,
    deleteProject,
    copyProposalDraft,
    deleteProposalDraft,
    resetStore,
  } = useProjectStore();

  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null);
  const [confirmDeleteDraftId, setConfirmDeleteDraftId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function handleDeleteProjectClick(projectId: string) {
    if (confirmDeleteProjectId === projectId) {
      deleteProject(projectId);
      setConfirmDeleteProjectId(null);
      return;
    }

    setConfirmDeleteProjectId(projectId);
  }

  function handleDeleteDraftClick(draftId: string) {
    if (confirmDeleteDraftId === draftId) {
      deleteProposalDraft(draftId);
      setConfirmDeleteDraftId(null);
      return;
    }

    setConfirmDeleteDraftId(draftId);
  }

  function handleResetClick() {
    if (confirmReset) {
      resetStore();
      setConfirmReset(false);
      return;
    }

    setConfirmReset(true);
  }

  const realProjectCount = projects.filter((project) => !project.isDemo).length;
  const realDraftCount = proposalDrafts.filter((draft) => !draft.isDemo).length;

  return (
    <div data-wingman-page="projects" className="wm-projects-page wm-polish-shell">
      <div className="wm-projects-page-toolbar" aria-label="Project actions">
        <div className="wm-projects-compact-actions">
          <Link to={routeCatalogByKey.discovery.path} className="wm-ui-button wm-ui-button-forward">
            Start discovery
          </Link>
          <Link to={routeCatalogByKey.proposal.path} className="wm-ui-button wm-ui-button-secondary">
            Open proposal
          </Link>
        </div>
      </div>

      <div className="wm-projects-sections">
        <SectionCard
          title="Active projects"
          subtitle="Use this table to reopen active opportunities, copy useful examples, or remove stale project lines."
        >
          <div className="wm-projects-store-toolbar">
              <StatusChip
                className="max-w-xl"
                variant={syncStatusVariant(syncStatus.state)}
                label={syncStatus.message}
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
                  realProjectCount || realDraftCount
                    ? `Restores the built-in starter examples. Your ${realProjectCount} project(s) and ${realDraftCount} draft(s) are never affected.`
                    : "Restores the built-in starter examples."
                }
                className={`inline-flex items-center gap-2 ${PROJECTS_PILL_BUTTON_CLASS} hover:border-cyan-300 hover:bg-[#0d2133] hover:text-[#9ffcf4]`}
              >
                <RotateCcw className="h-4 w-4" />
                {confirmReset ? "Confirm reset?" : "Reset sample store"}
              </button>
          </div>

          <div className="wm-projects-table-wrap rounded-xl border wm-ui-card">
            <table className="text-left text-sm wm-ui-copy">
              <colgroup>
                <col className="wm-projects-col-project" />
                <col className="wm-projects-col-owner" />
                <col className="wm-projects-col-stage" />
                <col className="wm-projects-col-status" />
                <col className="wm-projects-col-updated" />
                <col className="wm-projects-col-actions" />
              </colgroup>
              <thead className="text-[#edf6ff] wm-ui-card">
                <tr>
                  <th className="px-4 py-3 font-bold">Project</th>
                  <th className="px-4 py-3 font-bold">Owner</th>
                  <th className="px-4 py-3 font-bold">Stage</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Last updated</th>
                  <th className="px-4 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.length ? (
                  projects.map((project) => {
                    const compareConfidence = latestCompareConfidence(project);
                    return (
                    <tr key={project.id} className="border-t wm-ui-card">
                      <td className="px-4 py-3 font-semibold text-[#edf6ff]">{project.name}</td>
                      <td className="px-4 py-3 text-[#edf6ff]">{project.owner}</td>
                      <td className="px-4 py-3 text-[#edf6ff]">
                        <div className="flex flex-col items-start gap-1">
                          <span>{project.stage}</span>
                          {compareConfidence ? (
                            <StatusChip
                              label={compareConfidence}
                              variant={compareConfidenceVariant(compareConfidence)}
                              className="wm-projects-compare-tier text-[10px] leading-4"
                              title="Last comparison's verdict tier"
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip
                          label={projectStatusLabel(project.status)}
                          variant={project.status}
                        />
                      </td>
                      <td className="px-4 py-3 text-[#edf6ff]">{project.updated}</td>
                      <td className="px-4 py-3">
                        <div className="wm-project-row-actions">
                          <Link
                            to={`${routeCatalogByKey.projects.path}/${project.id}`}
                            onClick={() => setActiveProjectId(project.id)}
                            className={`wm-project-row-link ${PROJECTS_PILL_BUTTON_CLASS}`}
                          >
                            Detail
                          </Link>

                          {/* WINGMAN_DISCOVERY_PROJECT_RESUME_QUERY */}
                          <Link
                            to={
                              project.resumeTo === routeCatalogByKey.discovery.path
                                ? `${project.resumeTo}?resume=project`
                                : project.resumeTo
                            }
                            onClick={() => setActiveProjectId(project.id)}
                            className={`wm-project-row-link ${PROJECTS_DARK_BUTTON_XS_CLASS}`}
                          >
                            {activeProjectId === project.id ? "Resume active" : "Resume workflow"}
                          </Link>

                          <button className={["wm-ui-button wm-ui-button-secondary", `${PROJECTS_ICON_BUTTON_CLASS} hover:border-cyan-300 hover:bg-[#0d2133] hover:text-[#9ffcf4]`].filter(Boolean).join(" ")}
                            type="button"
                            onClick={() => copyProject(project.id)}

                            title={`Copy ${project.name}`}
                            aria-label={`Copy ${project.name}`}
                          >
                            <Copy className="h-4 w-4" />
                          </button>

                          <button className={["wm-ui-button wm-ui-button-secondary", `${PROJECTS_ICON_BUTTON_CLASS} hover:border-[#ff8a8a] hover:bg-[#2a1020] hover:text-[#ff8a8a]`].filter(Boolean).join(" ")}
                            type="button"
                            onClick={() => handleDeleteProjectClick(project.id)}
                            onBlur={() => setConfirmDeleteProjectId((current) => (current === project.id ? null : current))}
                            title={confirmDeleteProjectId === project.id ? `Click again to permanently delete ${project.name}` : `Delete ${project.name}`}
                            aria-label={confirmDeleteProjectId === project.id ? `Confirm delete ${project.name}` : `Delete ${project.name}`}
                          >
                            {confirmDeleteProjectId === project.id ? <AlertTriangle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-5 py-8 text-center text-[#cfe6f7]" colSpan={6}>
                      No active projects are currently listed. Use Reset sample store to restore the starter examples.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Proposal-ready drafts"
          subtitle="Draft copy/delete actions also persist using the same project store."
        >
          {proposalDrafts.length ? (
            <div className="wm-project-draft-grid">
              {proposalDrafts.map((draft) => (
                <div key={draft.id} className="wm-project-draft-tile wm-ui-card">
                  <div className="wm-project-draft-main">
                    <p className="wm-project-draft-customer wm-ui-copy">{draft.customer}</p>
                    <h3 className="wm-project-draft-title wm-ui-title">{draft.name}</h3>
                    <p className="wm-project-draft-state wm-ui-copy">{draft.state}</p>
                  </div>

                  <div className="wm-project-draft-actions">
                    <Link
                      to={routeCatalogByKey.proposal.path}
                      className={`wm-project-draft-open ${PROJECTS_DARK_BUTTON_CLASS}`}
                    >
                      Open
                    </Link>

                    <button
                      className={["wm-ui-button wm-ui-button-secondary", `${PROJECTS_ICON_BUTTON_CLASS} hover:border-cyan-300 hover:bg-[#0d2133] hover:text-[#9ffcf4]`].filter(Boolean).join(" ")}
                      type="button"
                      onClick={() => copyProposalDraft(draft.id)}
                      title={`Copy ${draft.name}`}
                      aria-label={`Copy ${draft.name}`}
                    >
                      <Copy className="h-4 w-4" />
                    </button>

                    <button
                      className={["wm-ui-button wm-ui-button-secondary", `${PROJECTS_ICON_BUTTON_CLASS} hover:border-[#ff8a8a] hover:bg-[#2a1020] hover:text-[#ff8a8a]`].filter(Boolean).join(" ")}
                      type="button"
                      onClick={() => handleDeleteDraftClick(draft.id)}
                      onBlur={() => setConfirmDeleteDraftId((current) => (current === draft.id ? null : current))}
                      title={confirmDeleteDraftId === draft.id ? `Click again to permanently delete ${draft.name}` : `Delete ${draft.name}`}
                      aria-label={confirmDeleteDraftId === draft.id ? `Confirm delete ${draft.name}` : `Delete ${draft.name}`}
                    >
                      {confirmDeleteDraftId === draft.id ? <AlertTriangle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border p-8 text-center text-sm text-[#cfe6f7] wm-ui-card wm-ui-copy">
              No proposal drafts are currently listed. Use Reset sample store to restore the starter examples.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export default ProjectsPage;
