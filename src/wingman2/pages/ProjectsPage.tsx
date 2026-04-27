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
    <div className="pb-10">
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
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : syncStatus.state === "error" || syncStatus.state === "conflict"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : "border-slate-200 bg-slate-50 text-slate-700"
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
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
              >
                <RotateCcw className="h-4 w-4" />
                Reset sample store
              </button>
            </div>
          }
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
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
                    <tr key={project.id} className="border-t border-slate-100">
                      <td className="px-5 py-4 font-medium text-slate-900">{project.name}</td>
                      <td className="px-5 py-4 text-slate-700">{project.owner}</td>
                      <td className="px-5 py-4 text-slate-700">{project.stage}</td>
                      <td className="px-5 py-4">
                        <StatusChip
                          label={project.status === "recommended" ? "On track" : "Needs review"}
                          variant={project.status}
                        />
                      </td>
                      <td className="px-5 py-4 text-slate-700">{project.updated}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`${routeCatalogByKey.projects.path}/${project.id}`}
                            onClick={() => setActiveProjectId(project.id)}
                            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
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
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                            title={`Copy ${project.name}`}
                            aria-label={`Copy ${project.name}`}
                          >
                            <Copy className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteProject(project.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
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
                    <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
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
                <div key={draft.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">{draft.customer}</p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-900">{draft.name}</h3>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyProposalDraft(draft.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                        title={`Copy ${draft.name}`}
                        aria-label={`Copy ${draft.name}`}
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteProposalDraft(draft.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                        title={`Delete ${draft.name}`}
                        aria-label={`Delete ${draft.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">{draft.state}</p>

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
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No proposal drafts are currently listed. Use Reset sample store to restore the starter examples.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export default ProjectsPage;
