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

function projectText(value: unknown, fallback = "Not captured") {
  if (Array.isArray(value)) {
    const text = value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ");
    return text || fallback;
  }

  const text = String(value ?? "").trim();
  return text || fallback;
}

function dedupeText(items: Array<string | undefined | null>) {
  return Array.from(
    new Set(
      items
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  );
}

type ProjectEvidenceTimelineItem = {
  id: string;
  label: string;
  source: string;
  status: string;
  detail: string;
  timestamp: string;
  route: string;
};

function formatProjectTimestamp(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "Not timestamped";

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  const selectedProducts = project?.productSelections ?? [];
  const latestCompareRun = project?.compareRuns?.[0] ?? null;
  const proposal = project?.proposal ?? null;

  const missingInformation = useMemo(() => {
    const evidenceMissing = recommendationEvidence?.missingInformation ?? [];
    const discoveryMissing = project?.discoveryBrief?.missingInformation ?? [];
    const proposalWarnings = proposal?.governanceWarnings ?? [];
    const weakRequirements = requirements
      .filter((requirement) => requirement.status === "unknown" || requirement.status === "review")
      .map((requirement) => `${requirement.label}: ${requirement.value || "Not confirmed"}`);

    return dedupeText([...evidenceMissing, ...discoveryMissing, ...proposalWarnings, ...weakRequirements]);
  }, [project, proposal, recommendationEvidence, requirements]);

  const commandCards = useMemo(() => {
    if (!project) return [];

    const capturedPercent =
      typeof project.discoveryBrief?.capturedPercent === "number"
        ? `${project.discoveryBrief.capturedPercent}% captured`
        : "Discovery not scored";

    const compareLabel = latestCompareRun
      ? projectText(
          [
            latestCompareRun.competitorBrand,
            latestCompareRun.competitorSku || latestCompareRun.competitorName,
          ]
            .filter(Boolean)
            .join(" "),
          "Compare run saved",
        )
      : "No compare run saved";

    const proposalLabel = proposal
      ? projectText(proposal.outputPurpose?.motion || proposal.title, "Proposal draft saved")
      : "No proposal draft saved";

    return [
      {
        label: "Discovery brief",
        value: capturedPercent,
        detail: project.discoveryBrief?.nextBestQuestion || "Open Discovery to capture the next customer requirement.",
      },
      {
        label: "Product direction",
        value: recommendationEvidence?.productDirection || "Not selected",
        detail: recommendationEvidence?.systemShape || "Use Finder or Product Pitch to create a safer product direction.",
      },
      {
        label: "Compare evidence",
        value: compareLabel,
        detail: latestCompareRun?.summary || "No competitor comparison evidence has been saved to this project yet.",
      },
      {
        label: "Proposal readiness",
        value: proposalLabel,
        detail:
          recommendationEvidence?.quoteSafetyMessage ||
          (proposal?.readinessScore ? `Proposal readiness score: ${proposal.readinessScore}%` : "Generate a response pack after requirements are cleaner."),
      },
    ];
  }, [latestCompareRun, project, proposal, recommendationEvidence]);

  const projectEvidenceTimeline = useMemo<ProjectEvidenceTimelineItem[]>(() => {
    if (!project) return [];

    const items: ProjectEvidenceTimelineItem[] = [];

    if (project.discoveryBrief) {
      items.push({
        id: "discovery-brief",
        label: "Discovery brief",
        source: "Discovery",
        status:
          typeof project.discoveryBrief.capturedPercent === "number"
            ? `${project.discoveryBrief.capturedPercent}% captured`
            : "Captured",
        detail:
          project.discoveryBrief.nextBestQuestion ||
          project.discoveryBrief.missingInformation?.[0] ||
          "Discovery information exists for this opportunity.",
        timestamp: formatProjectTimestamp(project.discoveryBrief.savedAt),
        route: routeCatalogByKey.discovery.path,
      });
    }

    if (recommendationEvidence) {
      items.push({
        id: "recommendation-evidence",
        label: "Recommendation evidence",
        source: recommendationEvidence.source,
        status:
          recommendationEvidence.quoteSafetyStatus === "quote-ready"
            ? "Quote-ready draft"
            : recommendationEvidence.quoteSafetyStatus === "validate-before-quote"
              ? "Validate before quote"
              : "Do not quote yet",
        detail:
          recommendationEvidence.productDirection ||
          recommendationEvidence.nextBestQuestion ||
          "Recommendation evidence exists but needs review.",
        timestamp: formatProjectTimestamp(recommendationEvidence.updatedAt),
        route: routeCatalogByKey.finder.path,
      });
    }

    selectedProducts.forEach((product, index) => {
      items.push({
        id: `product-${product.sku}-${index}`,
        label: product.sku,
        source: product.source || "Product selection",
        status: product.status === "recommended" ? "Recommended" : product.status || "Selected",
        detail: projectText(product.title || product.family || product.category, "Product direction saved to project."),
        timestamp: formatProjectTimestamp(product.addedAt),
        route: routeCatalogByKey.productPitch.path,
      });
    });

    (project.compareRuns ?? []).slice(0, 4).forEach((compareRun, index) => {
      items.push({
        id: compareRun.id || `compare-${index}`,
        label: projectText(
          [compareRun.competitorBrand, compareRun.competitorSku || compareRun.competitorName]
            .filter(Boolean)
            .join(" "),
          "Competitor comparison",
        ),
        source: compareRun.source || "Compare",
        status: compareRun.confidence || compareRun.matchType || "Comparison saved",
        detail:
          compareRun.summary ||
          compareRun.evidence?.[0] ||
          compareRun.warnings?.[0] ||
          "Comparison evidence saved to project.",
        timestamp: formatProjectTimestamp(compareRun.createdAt),
        route: routeCatalogByKey.compare.path,
      });
    });

    if (project.ingest) {
      items.push({
        id: "ingest-analysis",
        label: "Document ingest",
        source: "Documents",
        status: `${project.ingest.files.length} file${project.ingest.files.length === 1 ? "" : "s"} analysed`,
        detail:
          project.ingest.requirements[0] ||
          project.ingest.unknowns[0] ||
          "Document analysis has been saved to this project.",
        timestamp: formatProjectTimestamp(project.ingest.updatedAt),
        route: routeCatalogByKey.ingest.path,
      });
    }

    if (proposal) {
      items.push({
        id: "proposal-draft",
        label: proposal.title,
        source: "Proposal",
        status:
          typeof proposal.readinessScore === "number"
            ? `${proposal.readinessScore}% ready`
            : "Draft saved",
        detail:
          proposal.outputPurpose?.nextAction ||
          proposal.summary ||
          proposal.governanceWarnings?.[0] ||
          "Proposal draft exists for this project.",
        timestamp: formatProjectTimestamp(proposal.updatedAt),
        route: routeCatalogByKey.proposal.path,
      });
    }

    return items;
  }, [project, proposal, recommendationEvidence, selectedProducts]);

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
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-[#0d2133] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#0d2133]"
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
            <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Owner</p>
              <p className="mt-2 font-semibold text-[#edf6ff]">{project.owner}</p>
            </div>
            <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Stage</p>
              <p className="mt-2 font-semibold text-[#edf6ff]">{project.stage}</p>
            </div>
            <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Status</p>
              <div className="mt-2">
                <StatusChip
                  label={project.status === "recommended" ? "On track" : "Needs review"}
                  variant={project.status}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Sync</p>
              <p className="mt-2 text-sm font-semibold text-[#edf6ff]">{syncStatus.message}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
              <p className="text-xs font-black uppercase tracking-[0.14em]">Requirement readiness</p>
              <p className="mt-2 text-4xl font-black">{readiness.score}%</p>
            </div>
            <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Confirmed</p>
              <p className="mt-2 text-2xl font-black text-[#edf6ff]">{readiness.confirmed}</p>
            </div>
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-950">
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
          title="Opportunity command centre"
          subtitle="Single view of the live project record: discovery status, product direction, compare evidence, proposal readiness, missing information, and next workflow handoff."
        >
          <div className="grid gap-4 lg:grid-cols-4">
            {commandCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{card.label}</p>
                <p className="mt-2 text-lg font-black text-[#edf6ff]">{card.value}</p>
                <p className="mt-2 text-sm leading-6 text-[#cfe6f7]">{card.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
              <p className="text-sm font-black text-[#edf6ff]">Missing information / review blockers</p>
              <div className="mt-3 grid gap-2 text-sm text-[#cfe6f7]">
                {missingInformation.length ? (
                  missingInformation.slice(0, 8).map((item) => (
                    <p key={item} className="rounded-xl border border-[#29465e] bg-[#10283e] p-3">
                      {item}
                    </p>
                  ))
                ) : (
                  <p className="rounded-xl border border-emerald-300 bg-emerald-950/40 p-3 text-emerald-100">
                    No current blockers captured. Still check datasheets, stock, regional suitability, and final system dependencies before quoting.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
              <p className="text-sm font-black text-[#edf6ff]">Workflow handoff</p>
              <p className="mt-2 text-sm leading-6 text-[#cfe6f7]">
                Continue from this project record rather than starting each page cold.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={routeCatalogByKey.discovery.path} className="rounded-full border border-[#29465e] bg-[#10283e] px-4 py-2 text-sm font-semibold text-[#edf6ff]">
                  Discovery
                </Link>
                <Link to={routeCatalogByKey.finder.path} className="rounded-full border border-[#29465e] bg-[#10283e] px-4 py-2 text-sm font-semibold text-[#edf6ff]">
                  Finder
                </Link>
                <Link to={routeCatalogByKey.compare.path} className="rounded-full border border-[#29465e] bg-[#10283e] px-4 py-2 text-sm font-semibold text-[#edf6ff]">
                  Compare
                </Link>
                <Link to={routeCatalogByKey.productPitch.path} className="rounded-full border border-[#29465e] bg-[#10283e] px-4 py-2 text-sm font-semibold text-[#edf6ff]">
                  Product Pitch
                </Link>
                <Link to={routeCatalogByKey.visualStudio.path} className="rounded-full border border-cyan-300 bg-[#10283e] px-4 py-2 text-sm font-semibold text-[#9ffcf4]">
                  Visual Studio
                </Link>
                <Link to={routeCatalogByKey.proposal.path} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  Proposal
                </Link>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Project evidence trace"
          subtitle="Trace what Wingman has actually captured, where it came from, what it proves, and which workflow should be opened next."
        >
          {projectEvidenceTimeline.length ? (
            <div className="grid gap-3">
              {projectEvidenceTimeline.map((item) => (
                <div key={item.id} className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
                  <div className="grid gap-3 lg:grid-cols-[180px_1fr_180px_140px]">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{item.source}</p>
                      <p className="mt-2 font-black text-[#edf6ff]">{item.label}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#edf6ff]">{item.status}</p>
                      <p className="mt-1 text-sm leading-6 text-[#cfe6f7]">{item.detail}</p>
                    </div>
                    <p className="text-sm text-[#cfe6f7]">{item.timestamp}</p>
                    <Link to={item.route} className="inline-flex items-center justify-center rounded-full border border-[#29465e] bg-[#10283e] px-4 py-2 text-sm font-semibold text-[#edf6ff]">
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-300 bg-amber-950/30 p-4 text-amber-100">
              No saved discovery, product, compare, ingest, or proposal evidence is attached to this project yet. Start with Discovery or Finder before treating this opportunity as ready for proposal.
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Editable requirements"
          subtitle="Confirm known requirements, mark weak assumptions for review, and keep unknowns visible rather than guessing."
        >
          <div className="grid gap-3">
            {requirements.map((requirement) => (
              <div key={requirement.id} className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[180px_1fr_160px]">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      {requirement.category}
                    </p>
                    <p className="mt-2 font-black text-[#edf6ff]">{requirement.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{requirement.source}</p>
                  </div>

                  <label className="grid gap-1">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Requirement value</span>
                    <textarea
                      value={requirement.value}
                      onChange={(event) => updateRequirement(requirement.id, { value: event.target.value })}
                      className="min-h-20 rounded-2xl border border-[#29465e] bg-[#0d2133] px-4 py-3 text-sm leading-6 text-[#edf6ff] outline-none focus:border-cyan-400 focus:ring-4 focus:ring-amber-100"
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
                      className="rounded-2xl border border-[#29465e] bg-[#0d2133] px-3 py-2 text-sm font-semibold text-[#edf6ff] outline-none focus:border-cyan-400 focus:ring-4 focus:ring-amber-100"
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
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-950">
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

            <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
              <p className="text-sm font-black text-[#edf6ff]">Selected products</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {project.productSelections?.length ? (
                  project.productSelections.map((product) => (
                    <p key={product.sku} className="rounded-xl border border-[#29465e] bg-[#0d2133] p-3">
                      <span className="font-black text-[#edf6ff]">{product.sku}</span> {product.title || product.family || ""}
                    </p>
                  ))
                ) : (
                  <p>No products selected yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
              <p className="text-sm font-black text-[#edf6ff]">Evidence used</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {recommendationEvidence?.evidenceUsed.length ? (
                  recommendationEvidence.evidenceUsed.slice(0, 5).map((item) => (
                    <p key={item} className="rounded-xl border border-[#29465e] bg-[#0d2133] p-3">
                      {item}
                    </p>
                  ))
                ) : (
                  <p>No structured recommendation evidence has been captured yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
              <p className="text-sm font-black text-[#edf6ff]">Governed dependencies</p>
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

            <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
              <p className="text-sm font-black text-[#edf6ff]">Next actions</p>
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

