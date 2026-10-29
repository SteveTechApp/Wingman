import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Copy, LayoutTemplate, Trash2 } from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";
import { setActiveProjectId, type StoredProject } from "../data/projectStore";
import { changedLaneLabels, projectLaneLabel } from "../data/projectSyncConflict";
import { projectPresentation } from "../lib/projectPresentation";
import { templatesSavedFromProject } from "../lib/templateLineage";
import { OpenTemplateLink } from "./OpenTemplateLink";
import { SavedWallStatus } from "./SavedWallStatus";
import { StatusChip, type StatusChipVariant } from "./StatusChip";
import { SurveyReconfirmAction } from "./SurveyReconfirmAction";
import { SurveyReviewChip } from "./SurveyReviewChip";
import {
  PROJECTS_DARK_BUTTON_XS_CLASS,
  PROJECTS_ICON_BUTTON_CLASS,
  PROJECTS_PILL_BUTTON_CLASS,
} from "./projectGalleryStyles";

/**
 * One project in the gallery: its illustration, the flags that need a rep, the
 * owner, the stage, and the actions that open, resume, copy or delete it.
 *
 * The card owns its own delete confirmation, so a second click on one card
 * cannot arm another, and a blur cancels only the card that was armed. The
 * owner's name and initials arrive resolved because `useTeamMembers` fetches
 * once for the page — a card that called it would fetch per row.
 */

function projectStatusLabel(status: StoredProject["status"]) {
  if (status === "recommended") return "On track";
  if (status === "alternative") return "In progress";
  return "Needs review";
}

/**
 * The most recent comparison's stored confidence tier (e.g. "Plausible —
 * confirm"), surfaced as a per-row badge so a rep sees the verdict without
 * opening the project. Compare runs are stored newest-first, so [0] is latest.
 */
function latestCompareConfidence(project: StoredProject): string | null {
  const confidence = project.compareRuns?.[0]?.confidence;
  return confidence && confidence.trim() ? confidence : null;
}

function compareConfidenceVariant(confidence: string): StatusChipVariant {
  const label = confidence.toLowerCase();
  if (label.includes("strong")) return "success";
  if (label.includes("no equivalent")) return "danger";
  // "Plausible — confirm" and "Evidence pending" both need review before quoting.
  return "warning";
}

export function ProjectGalleryCard({
  project,
  projects,
  activeProjectId,
  currentUserId,
  ownerName,
  ownerInitials,
  migratedWalls,
  templates,
  onCopy,
  onDelete,
}: {
  project: StoredProject;
  /** The whole gallery, for the saved-wall status that needs its siblings. */
  projects: StoredProject[];
  /**
   * The stored room templates, read once by the page. A card asks which of them
   * name this room rather than subscribing to the store itself.
   */
  templates: readonly { id: string; name: string; sourceProjectId?: string }[];
  activeProjectId: string | null;
  currentUserId?: string | null;
  ownerName: string;
  ownerInitials: string;
  migratedWalls: number;
  onCopy: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const presentation = projectPresentation(project.name);
  const compareConfidence = latestCompareConfidence(project);
  // The designs this room was saved as, printed one per link in the action row
  // below. They are the card's answer to "has this room become a starting
  // point", so the card carries no chip counting them: the links are the count,
  // and the flag column is the widest thing a phone has to fit. The page read
  // the store once, so asking here costs a filter and no subscription.
  const savedTemplates = templatesSavedFromProject(project.id, templates);

  return (
    <article className="wm-project-visual-card" aria-label={project.name}>
      <div className="wm-project-card-image">{presentation.image ? <img src={presentation.image} alt={`${presentation.label} application illustration`} loading="lazy" /> : <LayoutTemplate aria-hidden="true" />}<span>{presentation.label}</span></div>
      <div className="wm-project-card-name" data-label="Project">
        <div className="flex flex-col items-start gap-1">
          <h3>{project.name}</h3>
          <SurveyReviewChip project={project} className="wm-projects-survey-review" />
          <SurveyReconfirmAction
            project={project}
            className={`${PROJECTS_PILL_BUTTON_CLASS} inline-flex items-center gap-1`}
          />
          <SavedWallStatus project={project} projects={projects} />
          {project.videowall?.ownershipMigratedAt ? <small>Ownership restored during load ({migratedWalls} saved walls migrated)</small> : null}
          {project.syncConflict?.fields?.length ? (
            <StatusChip
              variant="warning"
              label={`Team changed: ${changedLaneLabels(project.syncConflict.fields)}`}
              /* Which lanes changed is the whole point of the banner, so it wraps
                 onto a second line instead of truncating: the chip's shared rule
                 is one ellipsized line, and on a phone the lanes were what the
                 card cut, leaving the full sentence in a title a touch screen
                 never shows. The same read is what the store toolbar's chip
                 prints, and the wrap rule both share is in the projects
                 stylesheet. */
              className="wm-projects-sync-conflict max-w-full text-xs leading-4"
              title={`A team member changed ${project.syncConflict.fields.map(projectLaneLabel).join(", ")} since your last sync (${new Date(project.syncConflict.detectedAt).toLocaleString()}). Reload the project to review their latest changes.`}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
            />
          ) : null}
        </div>
      </div>
      <div className="wm-project-card-owner" data-label="Owner">
        <div className="wm-projects-owner-cell">
          <span className="wm-projects-owner-avatar" aria-hidden="true">
            {ownerInitials}
          </span>
          <span>{ownerName}</span>
          {project.ownerId && project.ownerId !== currentUserId && (
            <span className="wm-projects-team-badge">Team</span>
          )}
        </div>
      </div>
      <div className="wm-project-card-stage" data-label="Stage">
        <div className="flex flex-col items-start gap-1">
          <span>{project.stage}</span>
          {compareConfidence ? (
            <StatusChip
              label={compareConfidence}
              variant={compareConfidenceVariant(compareConfidence)}
              className="wm-projects-compare-tier text-[10px] leading-4"
              title="Last comparison's verdict tier"
            />
          ) : null}
        </div>
      </div>
      <div className="wm-project-card-status" data-label="Status">
        <StatusChip
          label={projectStatusLabel(project.status)}
          variant={project.status}
        />
      </div>
      <div className="wm-project-card-updated" data-label="Updated">{project.updated}</div>
      <div className="wm-project-card-actions" data-label="Actions">
        <div className="wm-project-row-actions">
          <span className="wm-project-row-links">
            <Link
              to={`${routeCatalogByKey.projects.path}/${project.id}`}
              onClick={() => setActiveProjectId(project.id)}
              className={`wm-project-row-link ${PROJECTS_PILL_BUTTON_CLASS}`}
            >
              Detail
            </Link>

            {/* WINGMAN_DISCOVERY_PROJECT_RESUME_QUERY */}
            <Link
              to={
                project.resumeTo === routeCatalogByKey.discovery.path
                  ? `${project.resumeTo}?resume=project`
                  : project.resumeTo
              }
              onClick={() => setActiveProjectId(project.id)}
              className={`wm-project-row-link ${PROJECTS_DARK_BUTTON_XS_CLASS}`}
            >
              {activeProjectId === project.id ? "Resume active" : "Resume workflow"}
            </Link>
          </span>

          {/* The designs and the pair are one unit, so the pair can never be split
              across two lines: a row that has room for a design entry and not for
              Copy or Delete beside it moves the whole design line down, and the
              pair still closes the card's right edge. The greedy row this replaces
              left Delete alone at the left of a second line at 1150px, where the
              gallery drops to two columns and the card's row is 461px — wide
              enough for Detail, Resume and the entry, 39px short of the pair. */}
          <span className="wm-project-row-designs">
            {savedTemplates.map((template) => (
            // The label is bounded rather than the pill: a card in a narrow gallery
            // column has less room than a design name, and the row must keep Copy
            // and Delete on the card. The wording and the destination come from
            // `OpenTemplateLink`.
              <OpenTemplateLink
                key={template.id}
                template={template}
                className={`wm-project-row-link wm-project-template-link ${PROJECTS_DARK_BUTTON_XS_CLASS}`}
                labelClassName="wm-project-template-link-label"
                title={template.name}
              />
            ))}

            <span className="wm-project-row-icon-pair">
              <button className={["wm-ui-button wm-ui-button-secondary", `${PROJECTS_ICON_BUTTON_CLASS} hover:border-cyan-300 hover:bg-[#0d2133] hover:text-[#9ffcf4]`].filter(Boolean).join(" ")}
                type="button"
                onClick={() => onCopy(project.id)}

                title={`Copy ${project.name}`}
                aria-label={`Copy ${project.name}`}
              >
                <Copy className="h-4 w-4" />
              </button>

              <button className={["wm-ui-button wm-ui-button-secondary", `${PROJECTS_ICON_BUTTON_CLASS} hover:border-[#ff8a8a] hover:bg-[#2a1020] hover:text-[#ff8a8a]`].filter(Boolean).join(" ")}
                type="button"
                onClick={() => (confirmingDelete ? onDelete(project.id) : setConfirmingDelete(true))}
                onBlur={() => setConfirmingDelete(false)}
                title={confirmingDelete ? `Click again to permanently delete ${project.name}` : `Delete ${project.name}`}
                aria-label={confirmingDelete ? `Confirm delete ${project.name}` : `Delete ${project.name}`}
              >
                {confirmingDelete ? <AlertTriangle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}
