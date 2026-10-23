import { PagedItems } from "../components/PagedItems";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, Cloud, Copy, Filter, LayoutTemplate, RotateCcw, Search, Trash2, Users } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { FeedbackConsolidationPanel } from "../components/FeedbackConsolidationPanel";
import { SectionCard } from "../components/SectionCard";
import { StatusChip, type StatusChipVariant } from "../components/StatusChip";
import { useProjectStore, type StoredProjectSyncStatus } from "../data/projectStore";
import { projectsNeedingSurveyAttention, SURVEY_REVIEW_STALE_DAYS } from "../lib/wallSurveyReview";
import { useTeamMembers } from "../data/useTeamMembers";
import { useCustomRoomTemplates } from "../lib/customRoomTemplates";
import { ProjectGalleryCard } from "../components/ProjectGalleryCard";
import { TemplatePickerDialog } from "../components/TemplatePickerDialog";
import {
  PROJECTS_DARK_BUTTON_CLASS,
  PROJECTS_ICON_BUTTON_CLASS,
  PROJECTS_PILL_BUTTON_CLASS,
} from "../components/projectGalleryStyles";
import QuoteSafetyDashboardPage from "./QuoteSafetyDashboardPage";

function syncStatusVariant(state: StoredProjectSyncStatus["state"]): StatusChipVariant {
  if (state === "synced") return "success";
  if (state === "error" || state === "conflict") return "danger";
  return "neutral";
}

function ProjectsListPage() {
  const navigate = useNavigate();
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
  const customTemplates = useCustomRoomTemplates();
  const migratedWalls = projects.filter(project => project.videowall?.ownershipMigratedAt).length;
  const { members, currentUserId, getMemberName, getMemberInitials } = useTeamMembers();

  const [teamFilter, setTeamFilter] = useState<"mine" | "team" | "all">("mine");
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // A switch over the view the tabs and search already chose, not a fourth tab:
  // the queue is the surveys a rep still has to work.
  const [surveyAttentionOnly, setSurveyAttentionOnly] = useState(false);

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (teamFilter === "mine" && currentUserId) {
      result = result.filter((p) => p.ownerId === currentUserId || p.ownerId === undefined);
    } else if (teamFilter === "team" && currentUserId) {
      result = result.filter((p) => p.ownerId !== currentUserId);
    }
    if (memberFilter) {
      result = result.filter((p) => p.ownerId === memberFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.owner.toLowerCase().includes(q),
      );
    }
    return result;
  }, [projects, teamFilter, memberFilter, searchQuery, currentUserId]);

  // The count is the number the current view can show, so the chip never
  // promises cards a tab or the search would hide.
  const surveyAttentionProjects = useMemo(() => projectsNeedingSurveyAttention(filteredProjects), [filteredProjects]);
  const visibleProjects = surveyAttentionOnly ? surveyAttentionProjects : filteredProjects;


  const [confirmDeleteDraftId, setConfirmDeleteDraftId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

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
    <div data-wingman-page="projects" className="wm-projects-page wm-polish-shell wm-project-gallery-page">
      <div className="wm-projects-page-toolbar" aria-label="Project actions">
        <div className="wm-sales-page-intro"><h1>Projects</h1></div>
        <div className="wm-projects-compact-actions">
          <Link to={routeCatalogByKey.discovery.path} className="wm-ui-button wm-ui-button-forward">
            Start discovery
          </Link>
          <Link to={routeCatalogByKey.responsePack.path} className="wm-ui-button wm-ui-button-secondary">
            Open response
          </Link>
          <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => setTemplatePickerOpen(true)}>
            <LayoutTemplate className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            From template
          </button>
        </div>
      </div>

      {templatePickerOpen && (
        <TemplatePickerDialog
          templates={customTemplates}
          onClose={() => setTemplatePickerOpen(false)}
          onOpenProject={(projectId) => {
            setTemplatePickerOpen(false);
            navigate(`${routeCatalogByKey.projects.path}/${projectId}`);
          }}
        />
      )}

      <div className="wm-projects-sections">
        <SectionCard
          title={teamFilter === "team" ? "Team projects" : teamFilter === "all" ? "All projects" : "My projects"}
          subtitle="Your spaces, plans and next steps."
          showHelp={false}
        >
          {/* Team filter tabs */}
          <div className="wm-projects-team-filter">
            <div className="wm-projects-filter-tabs" role="tablist" aria-label="Project filter">
              <button
                type="button"
                role="tab"
                aria-selected={teamFilter === "mine"}
                className={`wm-projects-filter-tab ${teamFilter === "mine" ? "is-active" : ""}`}
                onClick={() => { setTeamFilter("mine"); setMemberFilter(null); }}
              >
                <Filter size={14} aria-hidden="true" />
                My projects
                {currentUserId && (
                  <span className="wm-projects-filter-count">
                    {projects.filter((p) => p.ownerId === currentUserId || p.ownerId === undefined).length}
                  </span>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={teamFilter === "team"}
                className={`wm-projects-filter-tab ${teamFilter === "team" ? "is-active" : ""}`}
                onClick={() => { setTeamFilter("team"); setMemberFilter(null); }}
              >
                <Users size={14} aria-hidden="true" />
                Team
                <span className="wm-projects-filter-count">
                  {currentUserId ? projects.filter((p) => p.ownerId !== currentUserId).length : 0}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={teamFilter === "all"}
                className={`wm-projects-filter-tab ${teamFilter === "all" ? "is-active" : ""}`}
                onClick={() => { setTeamFilter("all"); setMemberFilter(null); }}
              >
                All
                <span className="wm-projects-filter-count">{projects.length}</span>
              </button>
            </div>
            <div className="wm-projects-search-wrap">
              <Search size={14} className="wm-projects-search-icon" aria-hidden="true" />
              <input
                type="text"
                className="wm-projects-search"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search projects"
              />
            </div>
            <button
              type="button"
              className={`wm-projects-filter-tab self-start ${surveyAttentionOnly ? "is-active" : ""}`}
              aria-pressed={surveyAttentionOnly}
              onClick={() => setSurveyAttentionOnly((current) => !current)}
              title={`Keeps the surveys a rep still has to work: rows a photo review cleared, and readings older than ${SURVEY_REVIEW_STALE_DAYS} days that need re-confirming.`}
            >
              <AlertTriangle size={14} aria-hidden="true" />
              Survey needs attention
              <span className="wm-projects-filter-count">{surveyAttentionProjects.length}</span>
            </button>
            {teamFilter === "team" && members.length > 1 && (
              <div className="wm-projects-member-filter">
                <span className="wm-projects-member-filter-label">Filter by member:</span>
                <div className="wm-projects-member-chips">
                  <button
                    type="button"
                    className={`wm-projects-member-chip ${memberFilter === null ? "is-active" : ""}`}
                    onClick={() => setMemberFilter(null)}
                  >
                    All
                  </button>
                  {members.filter((m) => m.id !== currentUserId).map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className={`wm-projects-member-chip ${memberFilter === member.id ? "is-active" : ""}`}
                      onClick={() => setMemberFilter(memberFilter === member.id ? null : member.id)}
                    >
                      <span className="wm-projects-member-avatar" aria-hidden="true">
                        {member.name.split(" ").map((p) => p.charAt(0)).join("").toUpperCase().slice(0, 2)}
                      </span>
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="wm-projects-store-toolbar">
              <StatusChip
                className="max-w-xl"
                variant={syncStatusVariant(syncStatus.state)}
                label={syncStatus.state === "local" ? "Saved in this browser" : syncStatus.message}
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

          <PagedItems items={visibleProjects} resetKey={`${searchQuery}:${teamFilter}:${memberFilter}:${surveyAttentionOnly}`}>{(pageItems) => (<div className="wm-project-gallery">
                {visibleProjects.length ? (
                  pageItems.map((project) => (
                    <ProjectGalleryCard
                      key={project.id}
                      project={project}
                      projects={projects}
                      activeProjectId={activeProjectId}
                      currentUserId={currentUserId}
                      ownerName={project.ownerId ? getMemberName(project.ownerId) : project.owner}
                      ownerInitials={getMemberInitials(project.ownerId)}
                      migratedWalls={migratedWalls}
                      onCopy={copyProject}
                      onDelete={deleteProject}
                    />
                  ))
                ) : surveyAttentionOnly ? (
                  <article className="wm-project-gallery-empty">
                    <div>
                      No projects in this view need survey attention. A survey lands here when a photo review clears a row, or when the last reading is old enough to re-confirm.
                      <button type="button" className="wm-project-row-link underline" onClick={() => setSurveyAttentionOnly(false)}>
                        Show all projects
                      </button>
                    </div>
                  </article>
                ) : (
                  <article className="wm-project-gallery-empty">
                    <div>
                      {teamFilter === "mine"
                        ? "No projects found for you. Create a new project or switch to Team view."
                        : teamFilter === "team"
                          ? "No team projects found. Team members need to create projects in a shared workspace."
                          : "No active projects are currently listed. Use Reset sample store to restore the starter examples."}
                    </div>
                  </article>
                )}
          </div>)}</PagedItems>
        </SectionCard>

        <SectionCard
          title="Proposal-ready drafts"
          subtitle="Continue shaping your customer documents."
          showHelp={false}
        >
          {proposalDrafts.length ? (
            <div className="wm-project-draft-grid">
              {proposalDrafts.map((draft) => (
                <div key={draft.id} className="wm-project-draft-tile wm-ui-card">
                  <div className="wm-draft-paper-icon" aria-hidden="true"><span /><span /><span /></div>
                  <div className="wm-project-draft-main">
                    <p className="wm-project-draft-customer wm-ui-copy">{draft.customer}</p>
                    <h3 className="wm-project-draft-title wm-ui-title">{draft.name}</h3>
                    <p className="wm-project-draft-state wm-ui-copy">{draft.state}</p>
                  </div>

                  <div className="wm-project-draft-actions">
                    <Link
                      to={routeCatalogByKey.responsePack.path}
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

        <FeedbackConsolidationPanel />
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const [searchParams] = useSearchParams();
  return searchParams.get("view") === "quote-safety" ? <QuoteSafetyDashboardPage /> : <ProjectsListPage />;
}

export default ProjectsPage;
