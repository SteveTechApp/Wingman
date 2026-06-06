import { AlertTriangle, Check, Cloud, Copy, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { StatusChip } from "../components/StatusChip";
import { setActiveProjectId, useProjectStore } from "../data/projectStore";

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
              <div
                className={`inline-flex max-w-xl items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${
                  syncStatus.state === "synced"
                    ? "border-[#29465e] bg-[#0d2133] text-emerald-800"
                    : syncStatus.state === "error" || syncStatus.state === "conflict"
                      ? "border-[#29465e] bg-[#0d2133] text-rose-800"
                      : "border-[#29465e] bg-[#0d2133] text-[#edf6ff]"
                }`}
                title={syncStatus.message}
              >
                {syncStatus.state === "synced" ? (
                  <Check className="h-4 w-4" />
                ) : syncStatus.state === "error" || syncStatus.state === "conflict" ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Cloud className="h-4 w-4" />
                )}
                <span className="truncate">{syncStatus.message}</span>
              </div>
              <button
                type="button"
                onClick={resetStore}
                className="inline-flex items-center gap-2 rounded-full border border-[#29465e] bg-[#0d2133] px-4 py-2 text-xs font-semibold text-[#edf6ff] transition hover:border-cyan-300 hover:bg-[#0d2133] hover:text-[#9ffcf4]"
              >
                <RotateCcw className="h-4 w-4" />
                Reset sample store
              </button>
            </div>
          }
        >
          <div className="overflow-hidden rounded-2xl border border-[#29465e] bg-[#0d2133]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#0d2133] text-[#edf6ff]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Project</th>
                  <th className="px-5 py-4 font-semibold">Owner</th>
                  <th className="px-5 py-4 font-semibold">Stage</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Last updated</th>
                  <th className="px-5 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.length ? (
                  projects.map((project) => (
                    <tr key={project.id} className="border-t border-[#29465e]">
                      <td className="px-5 py-4 font-medium text-[#edf6ff]">{project.name}</td>
                      <td className="px-5 py-4 text-[#edf6ff]">{project.owner}</td>
                      <td className="px-5 py-4 text-[#edf6ff]">{project.stage}</td>
                      <td className="px-5 py-4">
                        <StatusChip
                          label={project.status === "recommended" ? "On track" : "Needs review"}
                          variant={project.status}
                        />
                      </td>
                      <td className="px-5 py-4 text-[#edf6ff]">{project.updated}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`${routeCatalogByKey.projects.path}/${project.id}`}
                            onClick={() => setActiveProjectId(project.id)}
                            className="rounded-full border border-[#29465e] bg-[#0d2133] px-4 py-2 text-xs font-semibold text-[#edf6ff] transition hover:bg-[#0d2133]"
                          >
                            Detail
                          </Link>

                          <Link
                            to={project.resumeTo}
                            onClick={() => setActiveProjectId(project.id)}
                            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            {activeProjectId === project.id ? "Resume active" : "Resume workflow"}
                          </Link>

                          <button
                            type="button"
                            onClick={() => copyProject(project.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#29465e] bg-[#0d2133] text-[#edf6ff] transition hover:border-cyan-300 hover:bg-[#0d2133] hover:text-[#9ffcf4]"
                            title={`Copy ${project.name}`}
                            aria-label={`Copy ${project.name}`}
                          >
                            <Copy className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteProject(project.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#29465e] bg-[#0d2133] text-[#edf6ff] transition hover:border-[#ff8a8a] hover:bg-[#2a1020] hover:text-[#ff8a8a]"
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
                <div key={draft.id} className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-[#cfe6f7]">{draft.customer}</p>
                      <h3 className="mt-2 text-lg font-semibold text-[#edf6ff]">{draft.name}</h3>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyProposalDraft(draft.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#29465e] bg-[#0d2133] text-[#edf6ff] transition hover:border-cyan-300 hover:bg-[#0d2133] hover:text-[#9ffcf4]"
                        title={`Copy ${draft.name}`}
                        aria-label={`Copy ${draft.name}`}
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteProposalDraft(draft.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#29465e] bg-[#0d2133] text-[#edf6ff] transition hover:border-[#ff8a8a] hover:bg-[#2a1020] hover:text-[#ff8a8a]"
                        title={`Delete ${draft.name}`}
                        aria-label={`Delete ${draft.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-[#edf6ff]">{draft.state}</p>

                  <div className="mt-5">
                    <Link
                      to={routeCatalogByKey.proposal.path}
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Open draft
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-8 text-center text-sm text-[#cfe6f7]">
              No proposal drafts are currently listed. Use Reset sample store to restore the starter examples.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export default ProjectsPage;


