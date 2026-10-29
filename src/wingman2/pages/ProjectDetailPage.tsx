import { SavedWallStatus } from "../components/SavedWallStatus";
import { ProjectTemplateLineage } from "../components/ProjectTemplateLineage";
import { OpenTemplateLink } from "../components/OpenTemplateLink";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { AuditLogPanel } from "../components/AuditLogPanel";
import { WebhookDropsNote } from "../components/WebhookDropsNote";
import { useWorkflowPage } from "../components/WorkflowPages";
import { PageHero } from "../components/PageHero";
import { ProjectSyncConflictBanner } from "../components/SyncConflictBanner";


import {
  removeProductSelectionFromProject,
  setActiveProjectId,
  updateStoredProject,
  type StoredCompareRun,
  type StoredRequirementRecord,
  useProjectStore,
} from "../features/projects";
import { CrmSharePanel } from "../components/CrmSharePanel";
import { buildRecommendationEvidence } from "../lib/recommendationEvidence";
import { discoveryResumeInfo, discoveryResumeUrl } from "../lib/discoveryResume";
import { projectRoomTemplate, saveProjectAsRoomTemplate } from "../lib/customRoomTemplates";
import { getProjectRequirementRecords } from "../lib/projectRequirements";
import { repTierLabelFromRun } from "../lib/repScript";
import { RecommendationEvidencePanel } from "./project/RecommendationEvidencePanel";
import { DiscoveryConversationReview } from "../components/DiscoveryConversationReview";
import { ProposalVersionHistory } from "../components/ProposalVersionHistory";
import { ProjectComparisonHistory } from "./project/ProjectComparisonHistory";
import { DependencyScopeReview } from "./project/DependencyScopeReview";
import { DisplayRunReview } from "./project/DisplayRunReview";
import { WallSurveyPhotoReview } from "./project/WallSurveyPhotoReview";
import { WallSurveySheetImports } from "./project/WallSurveySheetImports";
import { WallTransportReview } from "./project/WallTransportReview";
import { projectDetailSections } from "../lib/projectAnchors";
import { AuditEntryLinks } from "./project/AuditEntryLinks";
import { useProjectAnchorJump } from "./project/useProjectAnchorJump";
import { DealOutcomeSection } from "./project/DealOutcomeSection";

import { ProjectWorkflowNavigator } from "./project/ProjectWorkflowNavigator";
import { ProjectPanel } from "./project/ProjectPanel";
import { ProjectRequirementList } from "./project/ProjectRequirementList";
import { ProjectPositioningNote } from "./project/ProjectPositioningNote";
import { CopyPanelLink } from "./project/CopyPanelLink";
import {
  dedupeText,
  formatProjectTimestamp,
  projectField,
  projectNumber,
  projectText,
} from "./project/projectDetailText";

function compareDeepLink(compareRun: StoredCompareRun, projectId?: string) {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (compareRun.competitorBrand) params.set("brand", compareRun.competitorBrand);
  const sku = compareRun.competitorSku || compareRun.competitorName;
  if (sku) params.set("sku", sku);
  const query = params.toString();
  return query ? `${routeCatalogByKey.compare.path}?${query}` : routeCatalogByKey.compare.path;
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
  status: "Do not quote yet" | "Validate before response" | "Response-ready draft";
  tone: "block" | "review" | "ready";
  summary: string;
  blockers: string[];
  nextAction: string;
  route: string;
};


/** The template a page action produced, carried on the confirmation it prints. */
type TemplateLink = { id: string; name: string };

/** One line under the hero: what happened, and where to look if it made a record. */
type PageNotice = { text: string; template?: TemplateLink };

export function ProjectDetailPage() {
  const { projectId } = useParams();


  const navigate = useNavigate();
  const { projects, deleteProject } = useProjectStore();
  const project = projects.find((item) => item.id === projectId) ?? null;
  const responsePath = project ? `${routeCatalogByKey.responsePack.path}?projectId=${encodeURIComponent(project.id)}` : routeCatalogByKey.responsePack.path;

  function deleteSavedComparison(runId: string) {
    if (!project) return;
    updateStoredProject(project.id, (current) => ({ ...current, compareRuns: (current.compareRuns ?? []).filter((run) => run.id !== runId), updated: "Just now", updatedAt: new Date().toISOString() }));
    say("Saved comparison snapshot deleted.");
  }

  function removeProductLine(sku: string) {
    if (!project || !window.confirm(`Remove ${sku} from this project?`)) return;
    const updated = removeProductSelectionFromProject(project.id, sku);
    say(updated ? `${sku} removed from the project.` : `${sku} could not be removed.`);
  }
  const initialRequirements = useMemo(
    () => (project ? getProjectRequirementRecords(project) : []),
    [project],
  );
  const [requirements, setRequirements] = useState<StoredRequirementRecord[]>(initialRequirements);
  const [notice, setNotice] = useState<PageNotice | null>(null);
  /**
   * The one line under the hero for whatever this page just did.
   *
   * A notice may carry the template the action produced, so a save can offer the
   * record instead of only naming it; every other caller drops it, because a
   * saved requirement must not sit beside a link to a template it never touched.
   */
  function say(text: string, template?: TemplateLink) {
    setNotice(text ? { text, ...(template ? { template } : {}) } : null);
  }
  const { current: activeSection, go: setActiveSection } = useWorkflowPage(projectDetailSections);
  // The address's hash is the page's one way into a panel: the Activity
  // timeline's links are ordinary addresses, so the same reader lands them as a
  // pasted survey link. Nothing scrolls rows itself.
  useProjectAnchorJump(activeSection, setActiveSection);
  const [searchParams] = useSearchParams();
  const [isEditingProject, setIsEditingProject] = useState(searchParams.get("edit") === "true");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [projectDraft, setProjectDraft] = useState({ name: "", owner: "" });
  const [showBlockerReview, setShowBlockerReview] = useState(false);
  const [activeBlockerIndex, setActiveBlockerIndex] = useState(0);
  const [blockerDraft, setBlockerDraft] = useState("");
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

  const proposal = project?.proposal ?? null;
  const discoveryResume = discoveryResumeInfo(project?.discoveryBrief);
  const discoveryResumeInterview = Boolean(discoveryResume && discoveryResume.hasContent && !discoveryResume.complete);

  const missingInformation = useMemo(() => {
    const evidenceMissing = recommendationEvidence?.missingInformation ?? [];
    const discoveryMissing = project?.discoveryBrief?.missingInformation ?? [];
    const proposalWarnings = proposal?.governanceWarnings ?? [];
    const weakRequirements = requirements
      .filter((requirement) => requirement.status === "unknown" || requirement.status === "review")
      .map((requirement) => `${requirement.label}: ${requirement.value || "Not confirmed"}`);

    return dedupeText([...evidenceMissing, ...discoveryMissing, ...proposalWarnings, ...weakRequirements]);
  }, [project, proposal, recommendationEvidence, requirements]);

  const projectEvidenceTimeline = useMemo<ProjectEvidenceTimelineItem[]>(() => {
    if (!project) return [];

    const items: ProjectEvidenceTimelineItem[] = [];

    if (project.discoveryBrief) {
      const resume = discoveryResumeInfo(project.discoveryBrief);
      const resumeInterview = Boolean(resume && resume.hasContent && !resume.complete);
      items.push({
        id: "discovery-brief",
        label: "Discovery brief",
        source: "Discovery",
        status: resumeInterview
          ? `${resume!.answeredCount} answers · ${resume!.percent ?? 0}% captured`
          : typeof project.discoveryBrief.capturedPercent === "number"
            ? `${project.discoveryBrief.capturedPercent}% captured`
            : "Captured",
        detail: resumeInterview
          ? `Resume the guided interview — next: ${resume!.nextQuestion || `open question ${resume!.answeredCount + 1}`}.`
          : project.discoveryBrief.nextBestQuestion ||
            project.discoveryBrief.missingInformation?.[0] ||
            "Discovery information exists for this opportunity.",
        timestamp: formatProjectTimestamp(project.discoveryBrief.savedAt),
        route: resumeInterview ? discoveryResumeUrl() : routeCatalogByKey.discovery.path,
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
        route: compareDeepLink(compareRun, project.id),
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
        source: "Response",
        status:
          typeof proposal.readinessScore === "number"
            ? `${proposal.readinessScore}% ready`
            : "Draft saved",
        detail:
          proposal.outputPurpose?.nextAction ||
          proposal.summary ||
          proposal.governanceWarnings?.[0] ||
          "Response draft exists for this project.",
        timestamp: formatProjectTimestamp(proposal.updatedAt),
        route: responsePath,
      });
    }

    return items;
  }, [project, proposal, recommendationEvidence, responsePath, selectedProducts]);

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
        status: "Validate before response",
        tone: "review",
        summary: "The project has enough structure to prepare a draft, but it still needs technical or commercial validation before it is customer-safe.",
        blockers: dedupeText([
          quoteSafetyStatus === "validate-before-quote" ? "Recommendation evidence asks for validation before quote." : null,
          reviewRequirementCount > 0 ? `${reviewRequirementCount} requirement${reviewRequirementCount === 1 ? "" : "s"} are marked for review.` : null,
          proposalScore !== null && proposalScore < 80 ? `Response readiness score is ${proposalScore}%.` : null,
        ]),
        nextAction: "Open Responses to draft the customer output, then validate the system shape, dependencies, and assumptions before sending.",
        route: responsePath,
      };
    }

    return {
      status: "Response-ready draft",
      tone: "ready",
      summary: "The project has a usable discovery record, product direction, and no current missing-information blockers.",
      blockers: [],
      nextAction: "Open Responses or Visual Studio to turn the project record into customer-facing output.",
      route: responsePath,
    };
  }, [missingInformation, project, projectEvidenceTimeline.length, proposal, recommendationEvidence, requirements, responsePath, selectedProducts.length]);

  const activeBlocker = projectReadinessGate.blockers[activeBlockerIndex] ?? null;
  const activeBlockerWorkflow = useMemo(() => {
    const blocker = activeBlocker?.toLowerCase() ?? "";
    if (blocker.includes("product direction") || blocker.includes("recommendation")) {
      return { label: "Open Finder", route: routeCatalogByKey.recommendations.path };
    }
    if (blocker.includes("evidence") || blocker.includes("compare")) {
      return { label: "Open Compare", route: routeCatalogByKey.compare.path };
    }
    if (blocker.includes("proposal") || blocker.includes("response")) {
      return { label: "Open Responses", route: responsePath };
    }
    // WINGMAN_DISCOVERY_PROJECT_DETAIL_RESUME_QUERY
    return { label: "Open full Discovery", route: `${routeCatalogByKey.discovery.path}?resume=project` };
  }, [activeBlocker, responsePath]);

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
      text.includes("response readiness") ||
      text.includes("response draft") ||
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
      say("Enter or select an answer before saving this requirement.");
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
    say(`Requirement saved: ${nextRequirement.label}.`);

    const remainingCount = Math.max(0, projectReadinessGate.blockers.length - 1);
    if (remainingCount === 0) {
      setShowBlockerReview(false);
      setActiveBlockerIndex(0);
      return;
    }

    setActiveBlockerIndex((current) => Math.min(current, remainingCount - 1));
  }

  // The rows follow the record: an answer saved elsewhere — Discovery in another
  // tab, a teammate's save, a sync — reaches the panel without a reload.
  useEffect(() => { setRequirements(initialRequirements); }, [initialRequirements]);
  // The editor follows the record's identity, and the page's transient state
  // restarts on the room. Kept apart from the rows because a write to *this*
  // room (a deal outcome, a proposal save) is not a move to another project, and
  // one effect for both closed the sentence an action had just printed.
  useEffect(() => { setProjectDraft({ name: project?.name ?? "", owner: project?.owner ?? "" }); }, [project?.name, project?.owner]);
  useEffect(() => { setNotice(null); setConfirmDelete(false); setShowBlockerReview(false); setActiveBlockerIndex(0); }, [project?.id]);

  useEffect(() => {
    if (projectId) {
      setActiveProjectId(projectId);
    }
  }, [projectId]);

  function saveCurrentProjectAsTemplate() {
    if (!project) return;

    // A room has one template, so a second save republishes the record the first
    // one wrote. Ask before saving which of the two the click is about to do,
    // and say it: "saved" when nothing was there, "updated" when something was.
    const existing = projectRoomTemplate(project.id);
    // The written record is what the confirmation opens, so the link names the
    // template the sentence just described — including the id of the record a
    // second click republished rather than the project's own id.
    const saved = saveProjectAsRoomTemplate(project);
    say(
      existing
        ? `Updated this room's existing template: ${saved.name}.`
        : "Saved a new custom room template for this room.",
      { id: saved.id, name: saved.name },
    );
  }

  function saveProjectDetails() {
    if (!project) return;
    const name = projectDraft.name.trim();
    const owner = projectDraft.owner.trim();
    if (!name) {
      say("Project name is required.");
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
    say("Project details saved.");
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
          { label: "Back to projects", to: routeCatalogByKey.projects.path },
          { label: "Save as template", onClick: saveCurrentProjectAsTemplate },
        ]}
      />

      {/* The page's confirmations — a saved template, saved requirements, a
          removed line — surface here, under the action that produced them. */}
      {notice ? (
        <p className="wm-ui-copy" role="status" data-testid="project-detail-message">
          {notice.text}
          {notice.template ? (
            // The same row the lineage strip prints, from the same component: a
            // long name wraps at the page's left edge instead of centring in a
            // pill, and the wording cannot drift from the other surfaces.
            <OpenTemplateLink
              template={notice.template}
              className="wm-project-template-lineage__link"
              labelClassName="wm-project-template-lineage__name"
              trailing={
                <span className="wm-project-template-lineage__arrow" aria-hidden="true">
                  →
                </span>
              }
              data-testid="project-detail-message-template"
            />
          ) : null}
        </p>
      ) : null}

      <details><summary>Project actions</summary><nav className="wm-project-detail-nav wm-ui-card" aria-label="Project review navigation">
        <div className="wm-project-detail-nav__actions">
          <button type="button" className="wm-ui-button wm-ui-button-primary" onClick={() => { setActiveProjectId(project.id); navigate(discoveryResumeUrl(project.id)); }}>
            {isEditingProject ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            Edit project
          </button>
          <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => setIsEditingProject((current) => !current)}>Rename project</button>
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
      </nav></details>

      <ProjectSyncConflictBanner conflict={project.syncConflict} />
      {/* Record-level, like the sync banner: the record can hold a full set of
          answers and still have no market or space behind them, and the sections
          below only show what is saved rather than what was never asked. */}
      <ProjectPositioningNote projectId={project.id} brief={project.discoveryBrief} />

      {isEditingProject ? (
        <section className="wm-project-detail-editor wm-ui-section wm-ui-card" aria-label="Edit project details">
          <div className="wm-project-editor-intro"><p className="wm-ui-kicker">Project details</p><h2>Give this project a clear identity</h2><p>Update the name and customer, then choose an area of the workspace below.</p></div>
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

        <ProjectWorkflowNavigator current={activeSection} projectId={project.id} responsePath={responsePath} />
      <div id="project-overview" className="wm-project-detail-stack space-y-6">
        <ProjectTemplateLineage projectId={project.id} />

        {activeSection === "overview" ? (
        <section
          id="project-current-result"
          tabIndex={-1}
          aria-label="Current result"
          className="wm-project-current-result rounded-3xl border p-5 wm-ui-card"
        >
          <div className="wm-project-current-result__layout grid gap-4 lg:grid-cols-[1fr_280px] lg:items-center">
            <div className="wm-project-current-result__summary">
              <div className="wm-project-current-result__topline">
                <p className="text-xs font-black uppercase tracking-[0.14em] wm-ui-kicker">Current result</p>
                <CopyPanelLink projectId={project.id} anchorId="project-current-result" compact />
              </div>
              <h2 className="mt-2 text-3xl font-black wm-ui-title">
                {selectedProducts[0]?.sku || leadingProductFamilyScore?.family || "No product direction selected"}
              </h2>
              <p className="mt-2 text-sm leading-6 wm-ui-copy">
                {selectedProducts[0]?.title || selectedProducts[0]?.family || "Choose equipment after confirming the room requirements."}
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
                  Resolve {projectReadinessGate.blockers.length} open question{projectReadinessGate.blockers.length === 1 ? "" : "s"}
                </button>
              ) : (
                <Link
                  to={projectReadinessGate.route}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-black wm-ui-button wm-ui-button-primary"
                >
                  Continue to response
                </Link>
              )}

              {showBlockerReview && activeBlocker ? (
                <div id="project-blocker-walkthrough" className="wm-project-blocker-walkthrough" role="region" aria-label="Response blocker walkthrough">
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
                        Save the answer to this project.
                      </p>
                    ) : (
                      <p className="wm-project-blocker-walkthrough__why">
                        Open the linked tool to resolve this check.
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
        </section>) : null}



        {activeSection === "products" ? <ProjectPanel
          projectId={project.id}
          anchorId="project-equipment"
          title="Equipment"
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

          {selectedProducts.length > 0 ? (
            <div className="mb-4 rounded-xl border p-4 wm-ui-card" aria-labelledby="project-products-title">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] wm-ui-kicker">Products currently in design</p>
                  <h3 id="project-products-title" className="mt-1 text-base font-black wm-ui-title">Review or remove line items</h3>
                </div>
                <span className="text-xs wm-ui-copy">{selectedProducts.length} item{selectedProducts.length === 1 ? "" : "s"}</span>
              </div>
              <div className="grid gap-2">
                {selectedProducts.map((product) => (
                  <div key={product.sku} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black wm-ui-copy">{product.sku}</p>
                      <p className="truncate text-xs wm-ui-copy">{product.title || product.family || "Product selection"}{product.quantity ? ` · Qty ${product.quantity}` : ""}</p>
                    </div>
                    <button type="button" className="wm-ui-button wm-ui-button-secondary shrink-0" onClick={() => removeProductLine(product.sku)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
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
            {discoveryResumeInterview ? (
              <Link to={discoveryResumeUrl()} className="rounded-full border px-3 py-1.5 text-xs font-semibold wm-ui-button wm-ui-button-secondary">
                Resume interview
              </Link>
            ) : (
              <Link to={routeCatalogByKey.discovery.path} className="rounded-full border px-3 py-1.5 text-xs font-semibold wm-ui-button wm-ui-button-secondary">
                Discovery
              </Link>
            )}
            <Link to={routeCatalogByKey.recommendations.path} className="rounded-full border px-3 py-1.5 text-xs font-semibold wm-ui-button wm-ui-button-secondary">
              Finder
            </Link>
            <Link to={routeCatalogByKey.compare.path} className="rounded-full border px-3 py-1.5 text-xs font-semibold wm-ui-button wm-ui-button-secondary">
              Compare
            </Link>
            <Link to={routeCatalogByKey.productPitch.path} className="rounded-full border px-3 py-1.5 text-xs font-semibold wm-ui-button wm-ui-button-secondary">
              Products
            </Link>
            <Link to={responsePath} className="rounded-full border px-3 py-1.5 text-xs font-semibold wm-ui-button wm-ui-button-primary">
              Response
            </Link>
          </div>
        </ProjectPanel> : null}

        {activeSection === "handoff" ? <ProjectPanel
          projectId={project.id}
          anchorId="project-ready-to-send"
          title="Ready to send?"
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
        </ProjectPanel> : null}

        {activeSection === "capture" ? <ProjectPanel
          projectId={project.id}
          anchorId="project-evidence"
          title="Project evidence trace"
          subtitle="Trace what Wingman has actually captured, where it came from, what it proves, and which workflow should be opened next."
        >
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
              No saved discovery, product, compare, ingest, or response evidence is attached to this project yet. Start with Discovery or Finder before treating this opportunity as ready for a customer response.
            </div>
          )}
        </ProjectPanel> : null}

        {activeSection === "history" ? <ProjectPanel
          projectId={project.id}
          anchorId="project-saved-work"
          title="Saved comparisons"
          subtitle="Past decisions are kept with this project. Reopen one to check it against current product data."
        >
          {(project.compareRuns ?? []).length ? (
            <div className="grid gap-3" aria-label="Saved comparison history">
              {(project.compareRuns ?? []).filter((run) => run.mode !== "saved-history").map((run, index) => (
                <article key={run.id || `comparison-${index}`} className="rounded-2xl border p-4 wm-ui-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] wm-ui-kicker">Snapshot v{run.version ?? 1} · {formatProjectTimestamp(run.createdAt)}</p>
                      <h3 className="mt-1 font-black wm-ui-copy">{projectText([run.competitorBrand, run.competitorSku || run.competitorName].filter(Boolean).join(" "), "Competitor comparison")}</h3>
                      <p className="mt-1 text-sm wm-ui-copy">WyreStorm direction: {run.wyrestormSku || "No suitable match recorded"}</p>
                    </div>
                    <Link to={compareDeepLink(run, project.id)} className="wm-ui-button wm-ui-button-secondary">Check current fit</Link>
                  </div>
                  <p className="mt-3 text-sm wm-ui-copy">{run.summary || "No summary was saved for this comparison."}</p>
                  {run.evidence?.length ? <details className="mt-3"><summary className="cursor-pointer font-semibold wm-ui-copy">Saved evidence ({run.evidence.length})</summary><ul className="mt-2 list-disc pl-5 text-sm wm-ui-copy">{run.evidence.map((item, evidenceIndex) => <li key={`${run.id}-evidence-${evidenceIndex}`}>{item}</li>)}</ul></details> : null}
                  {run.warnings?.length ? <details className="mt-3"><summary className="cursor-pointer font-semibold wm-ui-copy">Quote checks ({run.warnings.length})</summary><ul className="mt-2 list-disc pl-5 text-sm wm-ui-copy">{run.warnings.map((item, warningIndex) => <li key={`${run.id}-warning-${warningIndex}`}>{item}</li>)}</ul></details> : null}
                </article>
              ))}
              {(project.compareRuns ?? []).some((run) => run.mode === "saved-history") ? <ProjectComparisonHistory projectId={project.id} runs={project.compareRuns ?? []} compareLink={(run) => compareDeepLink(run, project.id)} onDelete={deleteSavedComparison} /> : null}
            </div>
          ) : <p className="text-sm wm-ui-copy">No comparisons saved to this project yet.</p>}
        </ProjectPanel> : null}

        {activeSection === "history" ? <ProjectPanel
          projectId={project.id}
          anchorId="project-response-versions"
          title="Response versions"
          subtitle="Review earlier customer response drafts and restore a version when needed."
        >
          <ProposalVersionHistory
            versions={project.proposalVersions ?? []}
            currentProposal={project.proposal ?? null}
          />
        </ProjectPanel> : null}

        {activeSection === "conversation" ? <ProjectPanel
          projectId={project.id}
          anchorId="project-discovery-conversation"
          title="Captured answers"
          subtitle="The questions asked, the governed answers, and the customer's own wording — audit the trail and jump into Discovery to correct any row before it reaches a response."
        >
          <DiscoveryConversationReview
            items={project?.discoveryBrief?.discoveryConversation ?? []}
          />
        </ProjectPanel> : null}

        {activeSection === "confirm" ? <ProjectPanel
          projectId={project.id}
          anchorId="project-requirements"
          title="Requirements"
          subtitle="Reopen the saved Discovery answers to review customer requirements."
        >
          {/* The list is read-only: it is the state the saved questions left
              behind, so the action that changes them sits above it rather than
              beside each row. */}
          <p className="wm-ui-copy">Review and update these requirements in the standard Discovery questions.</p>
          <Link to={discoveryResumeUrl(project.id)} className="wm-ui-button wm-ui-button-primary">Edit in Discovery</Link>
          <ProjectRequirementList requirements={requirements} projectId={project.id} />
        </ProjectPanel> : null}

        {activeSection === "confirm" && project ? <DisplayRunReview project={project} /> : null}
        {activeSection === "confirm" && project ? <DependencyScopeReview project={project} /> : null}
        {activeSection === "confirm" && project ? <WallTransportReview project={project} /> : null}
        {activeSection === "confirm" && project ? <WallSurveyPhotoReview project={project} /> : null}
        {activeSection === "confirm" && project ? <WallSurveySheetImports project={project} /> : null}

        {activeSection === "decide" ? <ProjectPanel
          projectId={project.id}
          anchorId="project-recommendation-evidence"
          title="Recommendation evidence"
          subtitle="What Wingman carries forward into Finder, Compare, and Responses."
        >
          <RecommendationEvidencePanel
            evidence={recommendationEvidence}
            productFamilyScores={productFamilyScores}
            selectedProducts={selectedProducts}
          />
        </ProjectPanel> : null}

        {activeSection === "handoff" ? (
          <div className="grid gap-4">
            <ProjectPanel
              projectId={project.id}
              anchorId="project-handoff"
              title="Response handoff"
              subtitle="Move from a validated project record to a customer response, visual, or CRM handoff."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Link to={responsePath} className="wm-ui-button wm-ui-button-primary">Open response</Link>
                <Link to={visualStudioLink} className="wm-ui-button wm-ui-button-secondary">Open Visual Studio</Link>
                <Link to={routeCatalogByKey.templates.path} className="wm-ui-button wm-ui-button-secondary">Save or open templates</Link>
                <Link to={routeCatalogByKey.projects.path} className="wm-ui-button wm-ui-button-secondary">Back to projects</Link>
              </div>
              <p className="mt-3 text-xs leading-5 wm-ui-copy">Use the controls below to record the outcome and share the same project record with your CRM.</p>
            </ProjectPanel>
            <DealOutcomeSection project={project} />
            <CrmSharePanel project={project} />
          </div>
        ) : null}
        {activeSection === "audit" ? (
          <ProjectPanel
            projectId={project.id}
            anchorId="project-activity"
            title="Audit Log"
            subtitle="Track who changed what and when across this project. Discovery edits, product changes, proposal modifications, and approvals are recorded automatically."
          >
            {/* The record's reading of what happened to this room's sends. The
                note is browser-wide storage rather than a project event, so it
                stands above the trail and says whose count it is — but this is
                the log a rep opens to ask what the system did, and it is where
                someone who never opens the CRM panel learns that sends went. */}
            <WebhookDropsNote />
            <SavedWallStatus project={project} projects={projects} showReview />
            <AuditLogPanel
              entries={project.auditTrail ?? []}
              entryAction={(entry) => <AuditEntryLinks project={project} entry={entry} />}
            />
          </ProjectPanel>
        ) : null}
      </div>
    </main>
  );
}

export default ProjectDetailPage;
