import { AlertTriangle, Check, Cloud, Copy, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { StatusChip, type StatusChipVariant } from "../components/StatusChip";
import { setActiveProjectId, useProjectStore, type StoredProject, type StoredProjectSyncStatus } from "../data/projectStore";

const PROJECTS_PILL_BUTTON_CLASS =
  "rounded-full border border-[#29465e] bg-[#0d2133] px-4 py-2 text-xs font-bold text-[#edf6ff] transition";
const PROJECTS_ICON_BUTTON_CLASS =
  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#29465e] bg-[#0d2133] text-[#edf6ff] transition";
const PROJECTS_DARK_BUTTON_CLASS = "rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800";
const PROJECTS_DARK_BUTTON_XS_CLASS = "rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800";

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

  return (
    <div data-wingman-page="projects" className="pb-10">
      <PageHero
        eyebrow="Project Management"
        title="Keep live opportunities, drafts, and next actions in one place."
        purpose="This page now uses the Wingman project store, so copy, delete, resume, and requirement review actions persist after refresh instead of only changing the current screen."
        nextMove="Open the priority project detail record, review requirements, then continue into Discovery, Finder, Compare, or Proposal."
        actions={[
          { label: "Start discovery", to: routeCatalogByKey.discovery.path },
          { label: "Open proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <div className="space-y-6">
        <SectionCard
          title="Active projects"
          subtitle="Use this table to reopen active opportunities, copy useful examples, or remove stale project lines."
          rightSlot={
            <div className="flex flex-wrap items-center gap-3">
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
                onClick={resetStore}
                className={`inline-flex items-center gap-2 ${PROJECTS_PILL_BUTTON_CLASS} hover:border-cyan-300 hover:bg-[#0d2133] hover:text-[#9ffcf4]`}
              >
                <RotateCcw className="h-4 w-4" />
                Reset sample store
              </button>
            </div>
          }
        >
          <div className="overflow-hidden rounded-2xl border wm-ui-card">
            <table className="min-w-full text-left text-sm wm-ui-copy">
              <thead className="text-[#edf6ff] wm-ui-card">
                <tr>
                  <th className="px-5 py-4 font-bold">Project</th>
                  <th className="px-5 py-4 font-bold">Owner</th>
                  <th className="px-5 py-4 font-bold">Stage</th>
                  <th className="px-5 py-4 font-bold">Status</th>
                  <th className="px-5 py-4 font-bold">Last updated</th>
                  <th className="px-5 py-4 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.length ? (
                  projects.map((project) => (
                    <tr key={project.id} className="border-t wm-ui-card">
                      <td className="px-5 py-4 font-semibold text-[#edf6ff]">{project.name}</td>
                      <td className="px-5 py-4 text-[#edf6ff]">{project.owner}</td>
                      <td className="px-5 py-4 text-[#edf6ff]">{project.stage}</td>
                      <td className="px-5 py-4">
                        <StatusChip
                          label={projectStatusLabel(project.status)}
                          variant={project.status}
                        />
                      </td>
                      <td className="px-5 py-4 text-[#edf6ff]">{project.updated}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`${routeCatalogByKey.projects.path}/${project.id}`}
                            onClick={() => setActiveProjectId(project.id)}
                            className={PROJECTS_PILL_BUTTON_CLASS}
                          >
                            Detail
                          </Link>

                          <Link
                            to={project.resumeTo}
                            onClick={() => setActiveProjectId(project.id)}
                            className={PROJECTS_DARK_BUTTON_XS_CLASS}
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
                            onClick={() => deleteProject(project.id)}

                            title={`Delete ${project.name}`}
                            aria-label={`Delete ${project.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
            <div className="grid gap-4 lg:grid-cols-3">
              {proposalDrafts.map((draft) => (
                <div key={draft.id} className="rounded-2xl border p-5 wm-ui-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-[#cfe6f7] wm-ui-copy">{draft.customer}</p>
                      <h3 className="mt-2 text-lg font-extrabold text-[#edf6ff] wm-ui-title">{draft.name}</h3>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button className={["wm-ui-button wm-ui-button-secondary", `${PROJECTS_ICON_BUTTON_CLASS} hover:border-cyan-300 hover:bg-[#0d2133] hover:text-[#9ffcf4]`].filter(Boolean).join(" ")}
                        type="button"
                        onClick={() => copyProposalDraft(draft.id)}

                        title={`Copy ${draft.name}`}
                        aria-label={`Copy ${draft.name}`}
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button className={["wm-ui-button wm-ui-button-secondary", `${PROJECTS_ICON_BUTTON_CLASS} hover:border-[#ff8a8a] hover:bg-[#2a1020] hover:text-[#ff8a8a]`].filter(Boolean).join(" ")}
                        type="button"
                        onClick={() => deleteProposalDraft(draft.id)}

                        title={`Delete ${draft.name}`}
                        aria-label={`Delete ${draft.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-[#edf6ff] wm-ui-copy">{draft.state}</p>

                  <div className="mt-5">
                    <Link
                      to={routeCatalogByKey.proposal.path}
                      className={PROJECTS_DARK_BUTTON_CLASS}
                    >
                      Open draft
                    </Link>
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
