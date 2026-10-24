import { PagedItems } from "../components/PagedItems";
import { useMemo, useState } from "react";
import { LayoutTemplate } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { FeedbackConsolidationPanel } from "../components/FeedbackConsolidationPanel";
import { SectionCard } from "../components/SectionCard";
import { ProjectStoreToolbar } from "../components/ProjectStoreToolbar";
import { ProjectsFilterBar, type ProjectsTeamFilter } from "../components/ProjectsFilterBar";
import { useProjectStore } from "../data/projectStore";
import { projectsNeedingSurveyAttention } from "../lib/wallSurveyReview";
import { useTeamMembers } from "../data/useTeamMembers";
import { useCustomRoomTemplates } from "../lib/customRoomTemplates";
import { ProjectGalleryCard } from "../components/ProjectGalleryCard";
import { ProposalDraftPanel } from "../components/ProposalDraftPanel";
import { TemplatePickerDialog } from "../components/TemplatePickerDialog";
import QuoteSafetyDashboardPage from "./QuoteSafetyDashboardPage";

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

  const [teamFilter, setTeamFilter] = useState<ProjectsTeamFilter>("mine");
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

  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // A member chip only exists inside the team view, so choosing another view
  // has to clear it: the next view is not that member's projects.
  function chooseTeamFilter(value: ProjectsTeamFilter) {
    setTeamFilter(value);
    setMemberFilter(null);
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
          <ProjectsFilterBar
            projects={projects}
            teamFilter={teamFilter}
            memberFilter={memberFilter}
            searchQuery={searchQuery}
            surveyAttentionOnly={surveyAttentionOnly}
            surveyAttentionCount={surveyAttentionProjects.length}
            members={members}
            currentUserId={currentUserId}
            onTeamFilterChange={chooseTeamFilter}
            onMemberFilterChange={setMemberFilter}
            onSearchChange={setSearchQuery}
            onSurveyAttentionToggle={() => setSurveyAttentionOnly((current) => !current)}
          />
          <ProjectStoreToolbar
            syncStatus={syncStatus}
            projectCount={realProjectCount}
            draftCount={realDraftCount}
            onReset={resetStore}
          />

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

        <ProposalDraftPanel
          drafts={proposalDrafts}
          onCopy={copyProposalDraft}
          onDelete={deleteProposalDraft}
        />

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
