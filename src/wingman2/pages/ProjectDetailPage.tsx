import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Pencil, Save, Trash2, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { StatusChip } from "../components/StatusChip";
import {
  saveProjectRequirementsToProject,
  setActiveProjectId,
  updateStoredProject,
  type StoredCompareRun,
  type StoredProject,
  type StoredRequirementRecord,
  useProjectStore,
} from "../data/projectStore";
import { buildRecommendationEvidence } from "../lib/recommendationEvidence";
import { saveProjectAsRoomTemplate } from "../lib/customRoomTemplates";
import { getProjectRequirementRecords, requirementReadiness } from "../lib/projectRequirements";
import { getProductFamilyRankingReason } from "../lib/productFamilyShortlistRanking";
import { repTierLabelFromRun } from "../lib/repScript";
import { RequirementsAccordion } from "./project/RequirementsAccordion";
import { RecommendationEvidencePanel } from "./project/RecommendationEvidencePanel";

// Editable requirements are rendered through the extracted accordion below.

// Deep link into the Compare page's typed-SKU flow with the stored competitor,
// so the trace's Open action re-runs the re-check instead of landing on a cold
// compare. The Compare page consumes ?brand=&sku= as inbound state.
function compareDeepLink(compareRun: StoredCompareRun) {
  const params = new URLSearchParams();
  if (compareRun.competitorBrand) params.set("brand", compareRun.competitorBrand);
  const sku = compareRun.competitorSku || compareRun.competitorName;
  if (sku) params.set("sku", sku);
  const query = params.toString();
  return query ? `${routeCatalogByKey.compare.path}?${query}` : routeCatalogByKey.compare.path;
}

function projectStatusLabel(status: StoredProject["status"]) {
  if (status === "recommended") return "On track";
  if (status === "alternative") return "In progress";
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

function projectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function projectField(value: unknown, key: string, fallback = "") {
  const record = projectRecord(value);

  if (!record) {
    return fallback;
  }

  return projectText(record[key], fallback);
}

function projectNumber(value: unknown, key: string) {
  const record = projectRecord(value);
  const rawValue = record?.[key];

  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return rawValue;
  }

  const parsedValue = Number(rawValue);

  if (Number.isFinite(parsedValue)) {
    return parsedValue;
  }

  return null;
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

// WINGMAN_INLINE_BLOCKER_ANSWERS_V1
function normaliseBlockerText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.:;!?]+$/g, "");
}

function blockerRequirementLabel(blocker: string) {
  return blocker
    .replace(/^confirm\s+/i, "")
    .replace(/^what\s+is\s+/i, "")
    .replace(/^whether\s+/i, "")
    .replace(/[.:;!?]+$/g, "")
    .trim();
}

function blockerRequirementId(blocker: string) {
  const slug = normaliseBlockerText(blocker)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return `project-blocker-${slug || "requirement"}`;
}

function blockerAnswerOptions(blocker: string) {
  const text = normaliseBlockerText(blocker);

  if (text.includes("room or system scale") || text.includes("room/system scale") || text.includes("room scale")) {
    return [
      "Small (<10m)",
      "Medium (<25m)",
      "Large (<50m)",
      "Extra large / distributed (50m+)",
      "Not sure yet",
    ];
  }

  if (
    text.includes("required?") ||
    text.startsWith("confirm whether") ||
    text.startsWith("is ") ||
    text.startsWith("does ") ||
    text.startsWith("do ")
  ) {
    return ["Yes", "No", "Not sure yet"];
  }

  if (text.includes("budget")) {
    return ["Cost-sensitive", "Mid-range", "Premium / performance-led", "Not confirmed"];
  }

  if (text.includes("timescale") || text.includes("timeline") || text.includes("project stage")) {
    return ["Immediate / <4 weeks", "1-3 months", "3-6 months", "6+ months", "Not confirmed"];
  }

  if (text.includes("network")) {
    return ["AV VLAN available", "Shared network", "No suitable network", "Not confirmed"];
  }

  return [];
}

function blockerAnswerNeedsReview(answer: string) {
  const text = normaliseBlockerText(answer);
  return text.includes("not sure") || text.includes("not confirmed") || text.includes("unknown");
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

type ProjectReadinessGate = {
  status: "Do not quote yet" | "Validate before proposal" | "Proposal-ready draft";
  tone: "block" | "review" | "ready";
  summary: string;
  blockers: string[];
  nextAction: string;
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
  const navigate = useNavigate();
  const { projects, syncStatus, deleteProject } = useProjectStore();
  const project = projects.find((item) => item.id === projectId) ?? null;
  const initialRequirements = useMemo(
    () => (project ? getProjectRequirementRecords(project) : []),
    [project],
  );
  const [requirements, setRequirements] = useState<StoredRequirementRecord[]>(initialRequirements);
  const [message, setMessage] = useState("");
  const [savedTemplatePath, setSavedTemplatePath] = useState("");
  // Detail body (opportunity record, evidence trace, requirements, recommendation evidence)
  // renders expanded by default so the evidence timeline - including the compare-run
  // confidence chip - is visible without an extra click. The toggle still collapses it.
  const [showSupportingDetails, setShowSupportingDetails] = useState(true);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [projectDraft, setProjectDraft] = useState({ name: "", owner: "" });
  const [showBlockerReview, setShowBlockerReview] = useState(false);
  const [activeBlockerIndex, setActiveBlockerIndex] = useState(0);
  const [blockerDraft, setBlockerDraft] = useState("");
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

  const selectedProducts = useMemo(() => project?.productSelections ?? [], [project?.productSelections]);
  const productFamilyScores = useMemo(
    () => recommendationEvidence?.productFamilyScores ?? [],
    [recommendationEvidence],
  );
  const leadingProductFamilyScore = productFamilyScores[0] ?? null;

  const visualStudioLink = useMemo(() => {
    const seedSku = selectedProducts[0]?.sku;

    if (!seedSku) {
      return routeCatalogByKey.proposalVisuals.path;
    }

    const params = new URLSearchParams({ seedSku, source: "product-discussion" });
    return `${routeCatalogByKey.proposalVisuals.path}?${params.toString()}`;
  }, [selectedProducts]);

  const selectedProductRankingReasons = useMemo(
    () =>
      selectedProducts
        .map((product) => ({
          sku: product.sku,
          reason: getProductFamilyRankingReason(product, productFamilyScores),
        }))
        .filter((item) => Boolean(item.reason)),
    [productFamilyScores, selectedProducts],
  );
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
    if (!project) return [
      {
        label: "Ranking reason",
        value: selectedProductRankingReasons[0]?.sku || "No ranked product",
        detail:
          selectedProductRankingReasons[0]?.reason ||
          "No product-family ranking reason has been stored for the selected products yet.",
      },];

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
        detail: recommendationEvidence?.systemShape || "Use Recommendations or Product Positioning to create a safer product direction.",
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
  }, [latestCompareRun, project, proposal, recommendationEvidence, selectedProductRankingReasons]);

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
        route: routeCatalogByKey.recommendations.path,
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
        // Tier label for a stored run comes from repScript (single source of
        // truth for the comparison narrative) - honest "Comparison saved"
        // fallback for runs saved before the confidence field existed.
        status: repTierLabelFromRun(compareRun),
        detail:
          compareRun.summary ||
          compareRun.evidence?.[0] ||
          compareRun.warnings?.[0] ||
          "Comparison evidence saved to project.",
        timestamp: formatProjectTimestamp(compareRun.createdAt),
        route: compareDeepLink(compareRun),
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

  const projectReadinessGate = useMemo<ProjectReadinessGate>(() => {
    const unknownRequirementCount = requirements.filter((requirement) => requirement.status === "unknown").length;
    const reviewRequirementCount = requirements.filter((requirement) => requirement.status === "review").length;
    const weakRequirementCount = unknownRequirementCount + reviewRequirementCount;
    const evidenceCount = projectEvidenceTimeline.length;
    const proposalScore = projectNumber(proposal, "readinessScore");
    const quoteSafetyStatus = projectField(recommendationEvidence, "quoteSafetyStatus");
    const productDirection = projectField(recommendationEvidence, "productDirection");
    const hasDiscovery = Boolean(project?.discoveryBrief);
    const hasProductDirection = Boolean(productDirection || selectedProducts.length);
    const blockers = dedupeText([
      ...missingInformation,
      !hasDiscovery ? "Discovery brief is missing." : null,
      !hasProductDirection ? "Product direction has not been saved." : null,
      evidenceCount === 0 ? "No evidence has been saved against this project." : null,
      weakRequirementCount > 0 ? `${weakRequirementCount} requirement${weakRequirementCount === 1 ? "" : "s"} still need confirmation or review.` : null,
      quoteSafetyStatus === "do-not-quote-yet" ? "Recommendation evidence is marked do not quote." : null,
    ]);

    if (blockers.length > 0) {
      return {
        status: "Do not quote yet",
        tone: "block",
        summary: "This project still has blockers. Keep it in discovery or technical review before sending a customer proposal.",
        blockers,
        nextAction: "Clear the blockers first. Start with Discovery, Finder, or Compare depending on what is missing.",
        route: routeCatalogByKey.discovery.path,
      };
    }

    if (quoteSafetyStatus === "validate-before-quote" || reviewRequirementCount > 0 || (proposalScore !== null && proposalScore < 80)) {
      return {
        status: "Validate before proposal",
        tone: "review",
        summary: "The project has enough structure to prepare a draft, but it still needs technical or commercial validation before it is customer-safe.",
        blockers: dedupeText([
          quoteSafetyStatus === "validate-before-quote" ? "Recommendation evidence asks for validation before quote." : null,
          reviewRequirementCount > 0 ? `${reviewRequirementCount} requirement${reviewRequirementCount === 1 ? "" : "s"} are marked for review.` : null,
          proposalScore !== null && proposalScore < 80 ? `Proposal readiness score is ${proposalScore}%.` : null,
        ]),
        nextAction: "Open Proposal to draft the response, then validate the system shape, dependencies, and customer assumptions before sending.",
        route: routeCatalogByKey.proposal.path,
      };
    }

    return {
      status: "Proposal-ready draft",
      tone: "ready",
      summary: "The project has a usable discovery record, product direction, and no current missing-information blockers.",
      blockers: [],
      nextAction: "Open Proposal or Visual Studio to turn the project record into customer-facing output.",
      route: routeCatalogByKey.proposal.path,
    };
  }, [missingInformation, project, projectEvidenceTimeline.length, proposal, recommendationEvidence, requirements, selectedProducts.length]);

  const activeBlocker = projectReadinessGate.blockers[activeBlockerIndex] ?? null;
  const activeBlockerWorkflow = useMemo(() => {
    const blocker = activeBlocker?.toLowerCase() ?? "";
    if (blocker.includes("product direction") || blocker.includes("recommendation")) {
      return { label: "Open Finder", route: routeCatalogByKey.recommendations.path };
    }
    if (blocker.includes("evidence") || blocker.includes("compare")) {
      return { label: "Open Compare", route: routeCatalogByKey.compare.path };
    }
    if (blocker.includes("proposal")) {
      return { label: "Open Proposal", route: routeCatalogByKey.proposal.path };
    }
    // WINGMAN_DISCOVERY_PROJECT_DETAIL_RESUME_QUERY
    return { label: "Open full Discovery", route: `${routeCatalogByKey.discovery.path}?resume=project` };
  }, [activeBlocker]);

  const activeBlockerOptions = useMemo(
    () => (activeBlocker ? blockerAnswerOptions(activeBlocker) : []),
    [activeBlocker],
  );

  const activeBlockerCanAnswerInline = useMemo(() => {
    if (!activeBlocker) return false;
    const text = normaliseBlockerText(activeBlocker);

    return !(
      text.includes("product direction") ||
      text.includes("recommendation evidence") ||
      text.includes("no evidence") ||
      text.includes("compare") ||
      text.includes("proposal readiness") ||
      text.includes("proposal draft") ||
      text.includes("marked do not quote")
    );
  }, [activeBlocker]);

  useEffect(() => {
    setBlockerDraft("");
  }, [activeBlocker]);

  function saveActiveBlockerAnswer() {
    if (!project || !activeBlocker) return;

    const answer = blockerDraft.trim();
    if (!answer) {
      setMessage("Enter or select an answer before saving this requirement.");
      return;
    }

    const blockerKey = normaliseBlockerText(activeBlocker);
    const now = new Date().toISOString();
    const matchedRequirement = requirements.find((requirement) => {
      const label = normaliseBlockerText(requirement.label);
      const blocker = normaliseBlockerText(activeBlocker);

      return blocker.includes(label) || label.includes(blocker);
    });

    const nextRequirement: StoredRequirementRecord = {
      id: matchedRequirement?.id ?? blockerRequirementId(activeBlocker),
      label: matchedRequirement?.label ?? blockerRequirementLabel(activeBlocker),
      value: answer,
      category: matchedRequirement?.category ?? "Project completion",
      source: "Project Detail - Next Step",
      status: blockerAnswerNeedsReview(answer) ? "review" : "confirmed",
      whyItMatters:
        matchedRequirement?.whyItMatters ||
        "Captured from the Project Detail Next Step panel to clear a missing project requirement.",
      updatedAt: now,
    };

    const nextRequirements = matchedRequirement
      ? requirements.map((requirement) =>
          requirement.id === matchedRequirement.id ? nextRequirement : requirement,
        )
      : [...requirements, nextRequirement];

    const withoutResolvedBlocker = (items?: string[]) =>
      (items ?? []).filter((item) => normaliseBlockerText(item) !== blockerKey);

    updateStoredProject(project.id, (current) => ({
      ...current,
      requirements: nextRequirements,
      discoveryBrief: current.discoveryBrief
        ? {
            ...current.discoveryBrief,
            missingInformation: withoutResolvedBlocker(current.discoveryBrief.missingInformation),
            nextBestQuestion:
              normaliseBlockerText(current.discoveryBrief.nextBestQuestion) === blockerKey
                ? undefined
                : current.discoveryBrief.nextBestQuestion,
          }
        : current.discoveryBrief,
      recommendationEvidence: current.recommendationEvidence
        ? {
            ...current.recommendationEvidence,
            missingInformation: withoutResolvedBlocker(current.recommendationEvidence.missingInformation),
            nextBestQuestion:
              normaliseBlockerText(current.recommendationEvidence.nextBestQuestion) === blockerKey
                ? undefined
                : current.recommendationEvidence.nextBestQuestion,
          }
        : current.recommendationEvidence,
      proposal: current.proposal
        ? {
            ...current.proposal,
            governanceWarnings: withoutResolvedBlocker(current.proposal.governanceWarnings),
            updatedAt: now,
          }
        : current.proposal,
      updated: "Just now",
      updatedAt: now,
    }));

    setRequirements(nextRequirements);
    setBlockerDraft("");
    setMessage(`Requirement saved: ${nextRequirement.label}.`);

    const remainingCount = Math.max(0, projectReadinessGate.blockers.length - 1);
    if (remainingCount === 0) {
      setShowBlockerReview(false);
      setActiveBlockerIndex(0);
      return;
    }

    setActiveBlockerIndex((current) => Math.min(current, remainingCount - 1));
  }

  useEffect(() => {
    setRequirements(initialRequirements);
    setMessage("");
    setSavedTemplatePath("");
    setProjectDraft({ name: project?.name ?? "", owner: project?.owner ?? "" });
    setIsEditingProject(false);
    setConfirmDelete(false);
    setShowBlockerReview(false);
    setActiveBlockerIndex(0);
  }, [initialRequirements, project?.name, project?.owner]);

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

  function saveCurrentProjectAsTemplate() {
    if (!project) return;

    const template = saveProjectAsRoomTemplate(project);
    setSavedTemplatePath(`${routeCatalogByKey.templates.path}/${template.id}`);
    setMessage("Project saved as a custom room template.");
  }

  function saveProjectDetails() {
    if (!project) return;
    const name = projectDraft.name.trim();
    const owner = projectDraft.owner.trim();
    if (!name) {
      setMessage("Project name is required.");
      return;
    }

    updateStoredProject(project.id, (current) => ({
      ...current,
      name,
      owner: owner || "Wingman user",
      updated: "Just now",
      updatedAt: new Date().toISOString(),
    }));
    setIsEditingProject(false);
    setMessage("Project details saved.");
  }

  function deleteCurrentProject() {
    if (!project) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    deleteProject(project.id);
    navigate(routeCatalogByKey.projects.path);
  }

  if (!project) {
    return (
      <main className="wm-project-detail-page wm-ui-page pb-10">
        <PageHero
          eyebrow="Project Detail"
          title="Project not found."
          purpose="The selected project could not be loaded from the local project store."
          nextMove="Return to Project Management and reopen a current opportunity."
          actions={[{ label: "Back to projects", to: routeCatalogByKey.projects.path }]}
        />
      </main>
    );
  }

  return (
    <main className="wm-project-detail-page wm-ui-page pb-10" data-wingman-page="project-detail">
      <PageHero
        eyebrow="Project Detail"
        title={project.name}
        purpose="See the current product direction, readiness and next action."
        nextMove="Use the highlighted action below; open supporting project detail only when needed."
        actions={[
          { label: "Back to projects", to: routeCatalogByKey.projects.path, variant: "secondary" },
          { label: "Save as template", onClick: saveCurrentProjectAsTemplate },
        ]}
      />

      <nav className="wm-project-detail-nav wm-ui-card" aria-label="Project review navigation">
        <div className="wm-project-detail-nav__links">
          <Link to={routeCatalogByKey.projects.path} className="wm-ui-button wm-ui-button-secondary">
            <ArrowLeft className="h-4 w-4" /> All projects
          </Link>
          <a href="#project-overview" className="wm-ui-button wm-ui-button-secondary">Overview</a>
          <a href="#project-requirements" className="wm-ui-button wm-ui-button-secondary">Requirements</a>
          <a href="#project-evidence" className="wm-ui-button wm-ui-button-secondary">Evidence</a>
        </div>
        <div className="wm-project-detail-nav__actions">
          <button type="button" className="wm-ui-button wm-ui-button-primary" onClick={() => setIsEditingProject((current) => !current)}>
            {isEditingProject ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {isEditingProject ? "Cancel edit" : "Edit project"}
          </button>
          <button
            type="button"
            className={`wm-ui-button ${confirmDelete ? "wm-project-delete-confirm" : "wm-ui-button-secondary"}`}
            onClick={deleteCurrentProject}
            onBlur={() => setConfirmDelete(false)}
          >
            <Trash2 className="h-4 w-4" />
            {confirmDelete ? "Confirm delete" : "Delete"}
          </button>
        </div>
      </nav>

      {isEditingProject ? (
        <section className="wm-project-detail-editor wm-ui-section wm-ui-card" aria-label="Edit project details">
          <label>
            <span>Project name</span>
            <input className="wm-ui-input" value={projectDraft.name} onChange={(event) => setProjectDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            <span>Owner / customer</span>
            <input className="wm-ui-input" value={projectDraft.owner} onChange={(event) => setProjectDraft((current) => ({ ...current, owner: event.target.value }))} />
          </label>
          <button type="button" className="wm-ui-button wm-ui-button-primary" onClick={saveProjectDetails}>
            <Save className="h-4 w-4" /> Save project
          </button>
        </section>
      ) : null}

      <div id="project-overview" className="wm-project-detail-stack space-y-6">
        {savedTemplatePath ? (
          <section className="rounded-2xl border p-3 text-sm wm-output-panel">
            <div className="flex flex-wrap items-center gap-3">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-semibold">This project is now available as a custom room template.</span>
              <Link to={savedTemplatePath} className="rounded-full border px-3 py-1 font-semibold wm-ui-button wm-ui-button-secondary">
                Open template
              </Link>
            </div>
          </section>
        ) : null}

        <section className="wm-project-current-result rounded-3xl border p-5 wm-ui-card">
          <div className="wm-project-current-result__layout grid gap-4 lg:grid-cols-[1fr_280px] lg:items-center">
            <div className="wm-project-current-result__summary">
              <p className="text-xs font-black uppercase tracking-[0.14em] wm-ui-kicker">Current result</p>
              <h2 className="mt-2 text-3xl font-black wm-ui-title">
                {selectedProducts[0]?.sku || leadingProductFamilyScore?.family || "No product direction selected"}
              </h2>
              <p className="mt-2 text-sm leading-6 wm-ui-copy">
                {selectedProducts[0]?.title || selectedProducts[0]?.family || projectReadinessGate.summary}
              </p>
              {selectedProducts.length > 1 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedProducts.slice(1, 6).map((product) => (
                    <span key={product.sku} className="rounded-full border px-3 py-1 text-xs font-black wm-ui-card wm-ui-copy">
                      {product.sku}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="wm-project-current-result__next rounded-2xl border p-4 wm-ui-section wm-ui-card">
              <p className="text-xs font-black uppercase tracking-[0.14em] wm-ui-kicker">Next step</p>
              <p className="mt-2 font-black wm-ui-copy">{projectReadinessGate.status}</p>
              {projectReadinessGate.blockers.length ? (
                <button
                  type="button"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-black wm-ui-button wm-ui-button-primary"
                  onClick={() => {
                    setActiveBlockerIndex(0);
                    setShowBlockerReview(true);
                  }}
                  aria-expanded={showBlockerReview}
                  aria-controls="project-blocker-walkthrough"
                >
                  Review {projectReadinessGate.blockers.length} project blocker{projectReadinessGate.blockers.length === 1 ? "" : "s"}
                </button>
              ) : (
                <Link
                  to={projectReadinessGate.route}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-black wm-ui-button wm-ui-button-primary"
                >
                  Continue to proposal
                </Link>
              )}

              {showBlockerReview && activeBlocker ? (
                <div id="project-blocker-walkthrough" className="wm-project-blocker-walkthrough" role="region" aria-label="Proposal blocker walkthrough">
                  <div className="wm-project-blocker-walkthrough__progress">
                    <span>Blocker {activeBlockerIndex + 1} of {projectReadinessGate.blockers.length}</span>
                    <button type="button" onClick={() => setShowBlockerReview(false)} aria-label="Close blocker review">Close</button>
                  </div>
                  <div className="wm-project-blocker-walkthrough__bar" aria-hidden="true">
                    <span style={{ width: `${((activeBlockerIndex + 1) / projectReadinessGate.blockers.length) * 100}%` }} />
                  </div>
                  <div className="wm-project-blocker-walkthrough__question">
                    <p className="wm-project-blocker-walkthrough__item">{activeBlocker}</p>
                    {activeBlockerCanAnswerInline ? (
                      <p className="wm-project-blocker-walkthrough__why">
                        Answer here to update the project requirement without leaving this page.
                      </p>
                    ) : (
                      <p className="wm-project-blocker-walkthrough__why">
                        This blocker needs the linked Wingman workflow rather than a simple project answer.
                      </p>
                    )}
                  </div>

                  {activeBlockerCanAnswerInline ? (
                    <div className="wm-project-blocker-answer">
                      {activeBlockerOptions.length ? (
                        <div className="wm-project-blocker-answer__options" role="group" aria-label="Answer options">
                          {activeBlockerOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              className={`wm-project-blocker-answer__option ${blockerDraft === option ? "is-selected" : ""}`}
                              onClick={() => setBlockerDraft(option)}
                              aria-pressed={blockerDraft === option}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <label className="wm-project-blocker-answer__field">
                        <span>{activeBlockerOptions.length ? "Or enter a different answer" : "Answer"}</span>
                        <input
                          type="text"
                          className="wm-ui-input"
                          value={blockerDraft}
                          onChange={(event) => setBlockerDraft(event.target.value)}
                          placeholder="Enter the customer or project answer"
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              saveActiveBlockerAnswer();
                            }
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        className="wm-ui-button wm-ui-button-primary wm-project-blocker-answer__save"
                        onClick={saveActiveBlockerAnswer}
                        disabled={!blockerDraft.trim()}
                      >
                        Save &amp; next
                      </button>
                    </div>
                  ) : (
                    <Link to={activeBlockerWorkflow.route} className="wm-ui-button wm-ui-button-primary">
                      {activeBlockerWorkflow.label}
                    </Link>
                  )}

                  <div className="wm-project-blocker-walkthrough__controls">
                    <button
                      type="button"
                      className="wm-ui-button wm-ui-button-secondary"
                      onClick={() => setActiveBlockerIndex((current) => Math.max(0, current - 1))}
                      disabled={activeBlockerIndex === 0}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="wm-ui-button wm-ui-button-secondary"
                      onClick={() => setActiveBlockerIndex((current) => Math.min(projectReadinessGate.blockers.length - 1, current + 1))}
                      disabled={activeBlockerIndex === projectReadinessGate.blockers.length - 1}
                    >
                      Skip for now
                    </button>
                  </div>

                  {activeBlockerCanAnswerInline ? (
                    <Link to={activeBlockerWorkflow.route} className="wm-project-blocker-walkthrough__discovery-link">
                      Open full Discovery
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="wm-project-current-result__footer">
            <button
              type="button"
              onClick={() => setShowSupportingDetails((current) => !current)}
              className="rounded-full border px-4 py-2 text-sm font-black wm-ui-button wm-ui-button-secondary"
              aria-expanded={showSupportingDetails}
            >
              {showSupportingDetails ? "Hide project detail" : "Review project detail"}
            </button>
          </div>
        </section>

        {showSupportingDetails ? (
        <>
        {/* Compact project stats bar */}
        <section className="rounded-2xl border p-4 wm-ui-card">
          <div className="flex flex-wrap items-center gap-4">
            {/* Project info */}
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-2xl font-black wm-ui-copy">{readiness.score}%</p>
                <p className="text-[10px] uppercase tracking-wider wm-ui-kicker">Ready</p>
              </div>
              <div className="h-8 w-px wm-ui-card" />
              <div className="flex items-center gap-2">
                <StatusChip label={projectStatusLabel(project.status)} variant={project.status} />
                <span className="text-xs wm-ui-copy">{project.owner}</span>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="font-bold wm-ui-copy">{readiness.confirmed}</span>
                <span className="wm-ui-copy">confirmed</span>
              </span>
              {readiness.review > 0 && (
                <span className="flex items-center gap-1">
                  <span className="font-bold wm-ui-copy">{readiness.review}</span>
                  <span className="wm-ui-copy">review</span>
                </span>
              )}
              {readiness.unknown > 0 && (
                <span className="flex items-center gap-1">
                  <span className="font-bold wm-ui-copy">{readiness.unknown}</span>
                  <span className="wm-ui-copy">unknown</span>
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={saveRequirements}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold wm-ui-button wm-ui-button-primary"
              >
                <Save className="h-3 w-3" />
                Save
              </button>
              <Link
                to={routeCatalogByKey.projects.path}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold wm-ui-button wm-ui-button-secondary"
              >
                <ArrowLeft className="h-3 w-3" />
                Projects
              </Link>
            </div>
          </div>
          {message ? (
            <p className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs wm-ui-card wm-ui-copy">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {message}
            </p>
          ) : null}
        </section>

        {/* Compact command cards - always visible */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {commandCards.map((card) => (
            <div key={card.label} className="rounded-xl border p-3 wm-ui-card">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] wm-ui-kicker">{card.label}</p>
              <p className="mt-1.5 text-sm font-bold line-clamp-1 wm-ui-copy">{card.value}</p>
              <p className="mt-1 text-xs line-clamp-2 wm-ui-copy">{card.detail}</p>
            </div>
          ))}
        </section>

        {/* Collapsible detailed view */}
        <SectionCard
          title="Opportunity details"
          subtitle="Discovery status, product direction, blockers, and workflow handoff."
        >
          {/* Product family decision */}
          {leadingProductFamilyScore ? (
            <div className="mb-4 rounded-xl border p-4 wm-ui-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] wm-ui-kicker">Leading product family</p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-lg font-black wm-ui-copy">{leadingProductFamilyScore.family}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold wm-ui-card wm-ui-copy">
                      {leadingProductFamilyScore.score}/100
                    </span>
                  </div>
                </div>
                {productFamilyScores.length > 1 ? (
                  <div className="flex gap-2">
                    {productFamilyScores.slice(1, 3).map((score) => (
                      <span key={score.family} className="rounded-full border px-2 py-0.5 text-[10px] wm-ui-card wm-ui-copy">
                        {score.family} {score.score}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              {leadingProductFamilyScore.reasons[0] ? (
                <p className="mt-2 text-xs line-clamp-1 wm-ui-copy">{leadingProductFamilyScore.reasons[0]}</p>
              ) : null}
            </div>
          ) : null}

          {/* Missing information */}
          {missingInformation.length > 0 ? (
            <div className="mb-4">
              <p className="mb-2 text-xs font-bold wm-ui-copy">⚠ {missingInformation.length} items need attention</p>
              <div className="flex flex-wrap gap-1.5">
                {missingInformation.slice(0, 4).map((item) => (
                  <span key={item} className="rounded-full px-2.5 py-1 text-[10px] line-clamp-1 wm-ui-card wm-ui-copy">
                    {item}
                  </span>
                ))}
                {missingInformation.length > 4 ? (
                  <span className="rounded-full px-2.5 py-1 text-[10px] wm-ui-card wm-ui-copy">
                    +{missingInformation.length - 4} more
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Workflow handoff */}
          <div className="flex flex-wrap gap-2">
            <Link to={routeCatalogByKey.discovery.path} className="rounded-full border px-3 py-1.5 text-xs font-semibold wm-ui-button wm-ui-button-secondary">
              Discovery
            </Link>
            <Link to={routeCatalogByKey.recommendations.path} className="rounded-full border px-3 py-1.5 text-xs font-semibold wm-ui-button wm-ui-button-secondary">
              Finder
            </Link>
            <Link to={routeCatalogByKey.compare.path} className="rounded-full border px-3 py-1.5 text-xs font-semibold wm-ui-button wm-ui-button-secondary">
              Compare
            </Link>
            <Link to={routeCatalogByKey.productPitch.path} className="rounded-full border px-3 py-1.5 text-xs font-semibold wm-ui-button wm-ui-button-secondary">
              Products
            </Link>
            <Link to={routeCatalogByKey.proposal.path} className="rounded-full border px-3 py-1.5 text-xs font-semibold wm-ui-button wm-ui-button-primary">
              Proposal
            </Link>
          </div>
        </SectionCard>

        <SectionCard
          title="Proposal readiness gate"
          subtitle="Use this as the commercial safety check before turning the project into a customer proposal or quote request."
        >
          <div
            className={
              projectReadinessGate.tone === "ready"
                ? "rounded-2xl border border-emerald-300 bg-emerald-950/30 p-5"
                : projectReadinessGate.tone === "review"
                  ? "rounded-2xl border border-amber-300 bg-amber-950/30 p-5"
                  : "rounded-2xl border border-rose-300 bg-rose-950/30 p-5"
            }
          >
            <div className="grid gap-4 lg:grid-cols-[240px_1fr_220px]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] wm-ui-copy wm-ui-kicker">Current status</p>
                <p className="mt-2 text-2xl font-black text-[#edf6ff] wm-ui-copy">{projectReadinessGate.status}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#edf6ff] wm-ui-copy">{projectReadinessGate.summary}</p>
                <p className="mt-2 text-sm leading-6 text-[#cfe6f7] wm-ui-copy">{projectReadinessGate.nextAction}</p>
              </div>
              <Link
                to={projectReadinessGate.route}
                className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-black wm-ui-card wm-ui-copy"
              >
                Open next workflow
              </Link>
            </div>

            {projectReadinessGate.blockers.length > 0 && (
              <div className="mt-5 grid gap-2">
                <p className="text-xs font-black uppercase tracking-[0.14em] wm-ui-copy wm-ui-kicker">Blockers / checks</p>
                {projectReadinessGate.blockers.slice(0, 8).map((blocker) => (
                  <p key={blocker} className="rounded-xl border p-3 text-sm leading-6 text-[#edf6ff] wm-ui-copy wm-ui-card">
                    {blocker}
                  </p>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Project evidence trace"
          subtitle="Trace what Wingman has actually captured, where it came from, what it proves, and which workflow should be opened next."
          >
          <span id="project-evidence" className="wm-project-detail-anchor" aria-hidden="true" />
          {projectEvidenceTimeline.length ? (
            <div className="grid gap-3">
              {projectEvidenceTimeline.map((item) => (
                <div key={item.id} className="rounded-2xl border p-4 wm-ui-card">
                  <div className="grid gap-3 lg:grid-cols-[180px_1fr_180px_140px]">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] wm-ui-copy wm-ui-kicker">{item.source}</p>
                      <p className="mt-2 font-black text-[#edf6ff] wm-ui-copy">{item.label}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#edf6ff] wm-ui-copy">{item.status}</p>
                      <p className="mt-1 text-sm leading-6 text-[#cfe6f7] wm-ui-copy">{item.detail}</p>
                    </div>
                    <p className="text-sm text-[#cfe6f7] wm-ui-copy">{item.timestamp}</p>
                    <Link to={item.route} className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold text-[#edf6ff] wm-ui-card wm-ui-copy">
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border p-4 wm-ui-card">
              No saved discovery, product, compare, ingest, or proposal evidence is attached to this project yet. Start with Discovery or Finder before treating this opportunity as ready for proposal.
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Requirements"
          subtitle="Confirmed requirements grouped by category. Edit inline or mark for review."
        >
          <span id="project-requirements" className="wm-project-detail-anchor" aria-hidden="true" />
          <RequirementsAccordion
            requirements={requirements}
            onUpdate={updateRequirement}
          />
        </SectionCard>

        <SectionCard
          title="Recommendation evidence"
          subtitle="What Wingman carries forward into Finder, Compare, and Proposal."
        >
          <RecommendationEvidencePanel
            evidence={recommendationEvidence}
            productFamilyScores={productFamilyScores}
            selectedProducts={selectedProducts}
          />
        </SectionCard>
        </>
        ) : null}
      </div>
    </main>
  );
}

export default ProjectDetailPage;
