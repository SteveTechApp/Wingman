import { Link } from "react-router-dom";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { StatusChip } from "../components/StatusChip";

const activeProjects = [
  {
    name: "Northbridge Meeting Room Refresh",
    owner: "Steve",
    stage: "Discovery",
    status: "recommended" as const,
    updated: "2 hours ago",
  },
  {
    name: "Harbour Retail Signage Rollout",
    owner: "Channel Sales",
    stage: "Competitor Compare",
    status: "alternative" as const,
    updated: "Today",
  },
  {
    name: "Westbrook Classroom Standard",
    owner: "Pre-sales",
    stage: "Proposal Builder",
    status: "recommended" as const,
    updated: "Yesterday",
  },
];

const proposalDrafts = [
  {
    name: "Boardroom AV Upgrade Proposal",
    customer: "Apex Group",
    state: "Ready for review",
  },
  {
    name: "Meeting Room Standard Bundle",
    customer: "Northbridge",
    state: "Waiting on assumptions",
  },
  {
    name: "Retail Display Distribution Pack",
    customer: "Harbour Retail",
    state: "Ready for export",
  },
];

export function ProjectsPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Project Management"
        title="Keep live opportunities, drafts, and next actions in one place."
        purpose="This page gives the sales team a working view of active opportunities so they can reopen discovery, move stalled comparisons forward, and keep proposal output aligned to the current state of the project."
        nextMove="Open the priority project, update its stage, and continue the workflow from discovery, comparison, or proposal."
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
                {activeProjects.map((project) => (
                  <tr key={project.name} className="border-t border-slate-100">
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
                      <Link
                        to="/wingman/dashboard"
                        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        Open project
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Proposal-ready drafts"
          subtitle="Keep proposal output visible so sales users can see what is ready, what is blocked, and what can be sent next."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {proposalDrafts.map((draft) => (
              <div key={draft.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{draft.customer}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{draft.name}</h3>
                <p className="mt-3 text-sm text-slate-600">{draft.state}</p>
                <div className="mt-5">
                  <Link
                    to="/wingman/proposal"
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Open draft
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}