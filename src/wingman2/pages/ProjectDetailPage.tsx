import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Save, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { StatusChip } from "../components/StatusChip";
import {
  saveProjectRequirementsToProject,
  setActiveProjectId,
  type StoredRequirementRecord,
  type StoredRequirementStatus,
  useProjectStore,
} from "../data/projectStore";
import { buildRecommendationEvidence } from "../lib/recommendationEvidence";
import { getProjectRequirementRecords, requirementReadiness } from "../lib/projectRequirements";

const statusOptions: StoredRequirementStatus[] = ["confirmed", "review", "unknown"];

function statusLabel(status: StoredRequirementStatus) {
  if (status === "confirmed") return "Confirmed";
  if (status === "unknown") return "Unknown";
  return "Needs review";
}

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const { projects, syncStatus } = useProjectStore();
  const project = projects.find((item) => item.id === projectId) ?? null;
  const initialRequirements = useMemo(
    () => (project ? getProjectRequirementRecords(project) : []),
    [project],
  );
  const [requirements, setRequirements] = useState<StoredRequirementRecord[]>(initialRequirements);
  const [message, setMessage] = useState("");
  const readiness = useMemo(() => requirementReadiness(requirements), [requirements]);
  const recommendationEvidence = useMemo(
    () =>
      project
        ? project.recommendationEvidence ??
          project.discoveryBrief?.recommendationEvidence ??
          buildRecommendationEvidence({
            source: "Project Detail",
            project,
            discoveryBrief: project.discoveryBrief,
            product: project.productSelections?.[0] ?? null,
            compare: project.compareRuns?.[0] ?? null,
          })
        : null,
    [project],
  );

  useEffect(() => {
    setRequirements(initialRequirements);
    setMessage("");
  }, [initialRequirements]);

  useEffect(() => {
    if (projectId) {
      setActiveProjectId(projectId);
    }
  }, [projectId]);

  function updateRequirement(id: string, patch: Partial<StoredRequirementRecord>) {
    setRequirements((current) =>
      current.map((requirement) => (requirement.id === id ? { ...requirement, ...patch } : requirement)),
    );
  }

  function saveRequirements() {
    if (!project) return;
    saveProjectRequirementsToProject(project.id, requirements);
    setMessage("Project requirements saved.");
  }

  if (!project) {
    return (
      <div className="pb-10">
        <PageHero
          eyebrow="Project Detail"
          title="Project not found."
          purpose="The selected project could not be loaded from the local project store."
          nextMove="Return to Project Management and reopen a current opportunity."
          actions={[{ label: "Back to projects", to: routeCatalogByKey.projects.path }]}
        />
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Project Detail"
        title={project.name}
        purpose="Review the opportunity record before Wingman turns it into a SKU, replacement recommendation, or customer-presentable BOM."
        nextMove="Confirm or edit the requirements, then continue into Discovery, Finder, Compare, or Proposal with a cleaner basis."
        actions={[
          { label: "Back to projects", to: routeCatalogByKey.projects.path, variant: "secondary" },
          { label: "Open proposal", to: routeCatalogByKey.proposal.path },
        ]}
      />

      <div className="space-y-6">
        <SectionCard
          title="Opportunity record"
          subtitle="This is the editable project layer between raw discovery and recommendation output."
          rightSlot={
            <div className="flex flex-wrap gap-3">
              <Link
                to={routeCatalogByKey.projects.path}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Projects
              </Link>
              <button
                type="button"
                onClick={saveRequirements}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Save className="h-4 w-4" />
                Save requirements
              </button>
            </div>
          }
        >
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Owner</p>
              <p className="mt-2 font-semibold text-slate-900">{project.owner}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Stage</p>
              <p className="mt-2 font-semibold text-slate-900">{project.stage}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Status</p>
              <div className="mt-2">
                <StatusChip
                  label={project.status === "recommended" ? "On track" : "Needs review"}
                  variant={project.status}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Sync</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{syncStatus.message}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
              <p className="text-xs font-black uppercase tracking-[0.14em]">Requirement readiness</p>
              <p className="mt-2 text-4xl font-black">{readiness.score}%</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Confirmed</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{readiness.confirmed}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <p className="text-xs font-black uppercase tracking-[0.14em]">Needs review</p>
              <p className="mt-2 text-2xl font-black">{readiness.review}</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950">
              <p className="text-xs font-black uppercase tracking-[0.14em]">Unknown</p>
              <p className="mt-2 text-2xl font-black">{readiness.unknown}</p>
            </div>
          </div>

          {message ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </p>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Editable requirements"
          subtitle="Confirm known requirements, mark weak assumptions for review, and keep unknowns visible rather than guessing."
        >
          <div className="grid gap-3">
            {requirements.map((requirement) => (
              <div key={requirement.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[180px_1fr_160px]">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      {requirement.category}
                    </p>
                    <p className="mt-2 font-black text-slate-900">{requirement.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{requirement.source}</p>
                  </div>

                  <label className="grid gap-1">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Requirement value</span>
                    <textarea
                      value={requirement.value}
                      onChange={(event) => updateRequirement(requirement.id, { value: event.target.value })}
                      className="min-h-20 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    />
                    <span className="text-xs leading-5 text-slate-500">{requirement.whyItMatters}</span>
                  </label>

                  <label className="grid content-start gap-1">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Status</span>
                    <select
                      value={requirement.status}
                      onChange={(event) =>
                        updateRequirement(requirement.id, { status: event.target.value as StoredRequirementStatus })
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Recommendation evidence"
          subtitle="Use this to see what Wingman will carry forward into Finder, Compare, and Proposal."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {recommendationEvidence ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <p className="text-sm font-black">Quote safety</p>
                <p className="mt-2 text-lg font-black">
                  {recommendationEvidence.quoteSafetyStatus === "quote-ready"
                    ? "Quote-ready draft"
                    : recommendationEvidence.quoteSafetyStatus === "validate-before-quote"
                      ? "Validate before quote"
                      : "Do not quote yet"}
                </p>
                <p className="mt-2 text-sm leading-6">{recommendationEvidence.quoteSafetyMessage}</p>
                <p className="mt-2 text-xs leading-5">{recommendationEvidence.nextBestQuestion}</p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-black text-slate-900">Selected products</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {project.productSelections?.length ? (
                  project.productSelections.map((product) => (
                    <p key={product.sku} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="font-black text-slate-900">{product.sku}</span> {product.title || product.family || ""}
                    </p>
                  ))
                ) : (
                  <p>No products selected yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-black text-slate-900">Evidence used</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {recommendationEvidence?.evidenceUsed.length ? (
                  recommendationEvidence.evidenceUsed.slice(0, 5).map((item) => (
                    <p key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      {item}
                    </p>
                  ))
                ) : (
                  <p>No structured recommendation evidence has been captured yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-black text-slate-900">Governed dependencies</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {recommendationEvidence?.requiredDependencies.length ? (
                  recommendationEvidence.requiredDependencies.slice(0, 4).map((dependency) => (
                    <p key={dependency} className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-indigo-950">
                      <span className="inline-flex items-center gap-2 font-black">
                        <ShieldCheck className="h-4 w-4" />
                        Required
                      </span>
                      <span className="mt-1 block text-xs">{dependency}</span>
                    </p>
                  ))
                ) : project.proposal?.governedDependencies?.length ? (
                  project.proposal.governedDependencies.slice(0, 4).map((dependency) => (
                    <p key={dependency.id} className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-indigo-950">
                      <span className="inline-flex items-center gap-2 font-black">
                        <ShieldCheck className="h-4 w-4" />
                        {dependency.label}
                      </span>
                      <span className="mt-1 block text-xs">{dependency.validationQuestion}</span>
                    </p>
                  ))
                ) : (
                  <p>No governed dependency rows have been generated yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-black text-slate-900">Next actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={routeCatalogByKey.discovery.path} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  Discovery
                </Link>
                <Link to={routeCatalogByKey.finder.path} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  Finder
                </Link>
                <Link to={routeCatalogByKey.compare.path} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  Compare
                </Link>
                <Link to={routeCatalogByKey.proposal.path} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  Proposal
                </Link>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default ProjectDetailPage;
