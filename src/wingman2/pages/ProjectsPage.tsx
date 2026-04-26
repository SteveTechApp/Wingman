import { useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { StatusChip } from "../components/StatusChip";

type ProjectRow = {
  id: string;
  name: string;
  owner: string;
  stage: string;
  status: "recommended" | "alternative" | "caution";
  updated: string;
  resumeTo: string;
};

type ProposalDraft = {
  id: string;
  name: string;
  customer: string;
  state: string;
};

const initialActiveProjects: ProjectRow[] = [
  {
    id: "northbridge-meeting-room-refresh",
    name: "Northbridge Meeting Room Refresh",
    owner: "Steve",
    stage: "Discovery",
    status: "recommended",
    updated: "2 hours ago",
    resumeTo: routeCatalogByKey.discovery.path,
  },
  {
    id: "harbour-retail-signage-rollout",
    name: "Harbour Retail Signage Rollout",
    owner: "Channel Sales",
    stage: "Competitor Compare",
    status: "alternative",
    updated: "Today",
    resumeTo: routeCatalogByKey.compare.path,
  },
  {
    id: "westbrook-classroom-standard",
    name: "Westbrook Classroom Standard",
    owner: "Pre-sales",
    stage: "Proposal Builder",
    status: "recommended",
    updated: "Yesterday",
    resumeTo: routeCatalogByKey.proposal.path,
  },
];

const initialProposalDrafts: ProposalDraft[] = [
  {
    id: "boardroom-av-upgrade-proposal",
    name: "Boardroom AV Upgrade Proposal",
    customer: "Apex Group",
    state: "Ready for review",
  },
  {
    id: "meeting-room-standard-bundle",
    name: "Meeting Room Standard Bundle",
    customer: "Northbridge",
    state: "Waiting on assumptions",
  },
  {
    id: "retail-display-distribution-pack",
    name: "Retail Display Distribution Pack",
    customer: "Harbour Retail",
    state: "Ready for export",
  },
];

function createCopyId(id: string) {
  return `${id}-copy-${Date.now()}`;
}

function copyProject(project: ProjectRow): ProjectRow {
  return {
    ...project,
    id: createCopyId(project.id),
    name: `${project.name} Copy`,
    updated: "Just now",
  };
}

function copyDraft(draft: ProposalDraft): ProposalDraft {
  return {
    ...draft,
    id: createCopyId(draft.id),
    name: `${draft.name} Copy`,
    state: "Copied draft",
  };
}

export function ProjectsPage() {
  const [activeProjects, setActiveProjects] = useState<ProjectRow[]>(initialActiveProjects);
  const [proposalDrafts, setProposalDrafts] = useState<ProposalDraft[]>(initialProposalDrafts);

  function handleCopyProject(project: ProjectRow) {
    setActiveProjects((current) => {
      const index = current.findIndex((item) => item.id === project.id);
      const next = [...current];

      if (index < 0) {
        return [...current, copyProject(project)];
      }

      next.splice(index + 1, 0, copyProject(project));
      return next;
    });
  }

  function handleDeleteProject(projectId: string) {
    setActiveProjects((current) => current.filter((project) => project.id !== projectId));
  }

  function handleCopyDraft(draft: ProposalDraft) {
    setProposalDrafts((current) => {
      const index = current.findIndex((item) => item.id === draft.id);
      const next = [...current];

      if (index < 0) {
        return [...current, copyDraft(draft)];
      }

      next.splice(index + 1, 0, copyDraft(draft));
      return next;
    });
  }

  function handleDeleteDraft(draftId: string) {
    setProposalDrafts((current) => current.filter((draft) => draft.id !== draftId));
  }

  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Project Management"
        title="Keep live opportunities, drafts, and next actions in one place."
        purpose="This page gives the sales team a working view of active opportunities so they can reopen discovery, move stalled comparisons forward, and keep proposal output aligned to the current state of the project."
        nextMove="Open the priority project, update its stage, and continue the workflow from discovery, comparison, or proposal."
        actions={[
          { label: "Start discovery", to: routeCatalogByKey.discovery.path },
          { label: "Open proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <div className="space-y-6">
        <SectionCard
          title="Active projects"
          subtitle="Use this table to reopen active opportunities and move them to the next stage."
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
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeProjects.length ? (
                  activeProjects.map((project) => (
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
                            to={project.resumeTo}
                            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            Resume workflow
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleCopyProject(project)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                            title={`Copy ${project.name}`}
                            aria-label={`Copy ${project.name}`}
                          >
                            <Copy className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProject(project.id)}
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
                      No active projects are currently listed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Proposal-ready drafts"
          subtitle="Keep proposal output visible so sales users can see what is ready, what is blocked, and what can be sent next."
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
                        onClick={() => handleCopyDraft(draft)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                        title={`Copy ${draft.name}`}
                        aria-label={`Copy ${draft.name}`}
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(draft.id)}
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
              No proposal drafts are currently listed.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export default ProjectsPage;