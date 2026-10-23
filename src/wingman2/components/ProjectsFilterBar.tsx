import { AlertTriangle, Filter, Search, Users } from "lucide-react";
import type { TeamMember } from "../api/wingmanApi";
import type { StoredProject } from "../data/projectStore";
import { SURVEY_REVIEW_STALE_DAYS } from "../lib/wallSurveyReview";

/** Which slice of the gallery the tabs ask for. */
export type ProjectsTeamFilter = "mine" | "team" | "all";

type ProjectsFilterBarProps = {
  projects: StoredProject[];
  teamFilter: ProjectsTeamFilter;
  memberFilter: string | null;
  searchQuery: string;
  surveyAttentionOnly: boolean;
  /** The rows the survey switch keeps, counted in the view the tabs and search chose. */
  surveyAttentionCount: number;
  members: TeamMember[];
  currentUserId: string | null;
  onTeamFilterChange: (value: ProjectsTeamFilter) => void;
  onMemberFilterChange: (value: string | null) => void;
  onSearchChange: (value: string) => void;
  onSurveyAttentionToggle: () => void;
};

/**
 * The gallery's filter bar, sitting above the store toolbar: whose projects to
 * show, a search over them, the survey switch, and — inside the team view — the
 * member chips that narrow it to one colleague.
 *
 * The tabs print counts for the store, because a tab promises what pressing it
 * shows; the survey switch prints the count for the view the tabs and search
 * already chose, because that is the view it narrows. Both numbers come from
 * the caller, so the bar never disagrees with the list under it.
 */
export function ProjectsFilterBar({
  projects,
  teamFilter,
  memberFilter,
  searchQuery,
  surveyAttentionOnly,
  surveyAttentionCount,
  members,
  currentUserId,
  onTeamFilterChange,
  onMemberFilterChange,
  onSearchChange,
  onSurveyAttentionToggle,
}: ProjectsFilterBarProps) {
  return (
    <div className="wm-projects-team-filter">
      <div className="wm-projects-filter-tabs" role="tablist" aria-label="Project filter">
        <button
          type="button"
          role="tab"
          aria-selected={teamFilter === "mine"}
          className={`wm-projects-filter-tab ${teamFilter === "mine" ? "is-active" : ""}`}
          onClick={() => onTeamFilterChange("mine")}
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
          onClick={() => onTeamFilterChange("team")}
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
          onClick={() => onTeamFilterChange("all")}
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
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search projects"
        />
      </div>
      <button
        type="button"
        className={`wm-projects-filter-tab self-start ${surveyAttentionOnly ? "is-active" : ""}`}
        aria-pressed={surveyAttentionOnly}
        onClick={onSurveyAttentionToggle}
        title={`Keeps the surveys a rep still has to work: rows a photo review cleared, and readings older than ${SURVEY_REVIEW_STALE_DAYS} days that need re-confirming.`}
      >
        <AlertTriangle size={14} aria-hidden="true" />
        Survey needs attention
        <span className="wm-projects-filter-count">{surveyAttentionCount}</span>
      </button>
      {teamFilter === "team" && members.length > 1 && (
        <div className="wm-projects-member-filter">
          <span className="wm-projects-member-filter-label">Filter by member:</span>
          <div className="wm-projects-member-chips">
            <button
              type="button"
              className={`wm-projects-member-chip ${memberFilter === null ? "is-active" : ""}`}
              onClick={() => onMemberFilterChange(null)}
            >
              All
            </button>
            {members.filter((m) => m.id !== currentUserId).map((member) => (
              <button
                key={member.id}
                type="button"
                className={`wm-projects-member-chip ${memberFilter === member.id ? "is-active" : ""}`}
                onClick={() => onMemberFilterChange(memberFilter === member.id ? null : member.id)}
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
  );
}
