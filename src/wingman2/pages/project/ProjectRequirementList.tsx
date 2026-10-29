import { useState } from "react";
import { Link } from "react-router-dom";
import { StatusChip, type StatusChipVariant } from "../../components/StatusChip";
import type { StoredRequirementRecord, StoredRequirementStatus } from "../../features/projects";
import { discoveryQuestionUrl } from "../../lib/discoveryResume";
import { requirementQuestionId, requirementReadiness } from "../../lib/projectRequirements";

/**
 * The saved requirement rows, read the way the record holds them.
 *
 * Read-only on purpose: Discovery owns the answers, so this panel shows what the
 * saved questions produced and names the rows a response cannot rely on yet,
 * then points at the questions that can change them. Editing here would write
 * requirement rows the questions do not know about, and the two would disagree
 * the next time Discovery saved.
 *
 * The filter is the one control, and it changes nothing — a room with a dozen
 * settled answers buries the two rows that still need a rep, so the shortfall
 * gets its own reading. It sits above the list rather than in it, so a row stays
 * a row of the table whatever the panel is showing.
 *
 * An unconfirmed row carries one action: a link to the Discovery question that
 * records that answer (`requirementQuestionId`), because a rep opening the
 * interview to fix one row should land on the question rather than the top of
 * the walk. A settled row carries none, and neither does a row no question owns.
 */

const STATUS: Record<
  StoredRequirementStatus,
  { label: string; variant: StatusChipVariant; title: string }
> = {
  confirmed: {
    label: "Confirmed",
    variant: "success",
    title: "The saved answer is recorded and can be quoted.",
  },
  review: {
    label: "Needs review",
    variant: "warning",
    title: "The saved answer needs checking before it is quoted.",
  },
  unknown: {
    label: "Not confirmed",
    variant: "danger",
    title: "No answer is recorded, so a response cannot rely on this.",
  },
};

/** The count line above the rows: what still needs a rep, in one reading. */
export function requirementSummary(
  readiness: ReturnType<typeof requirementReadiness>,
): string {
  const plural = (count: number, one: string, many: string) =>
    `${count} ${count === 1 ? one : many}`;
  const parts = [
    plural(readiness.confirmed, "confirmed", "confirmed"),
    readiness.review ? plural(readiness.review, "needs review", "need review") : "",
    readiness.unknown ? plural(readiness.unknown, "not confirmed", "not confirmed") : "",
  ].filter(Boolean);

  return `${readiness.total} requirement${readiness.total === 1 ? "" : "s"}: ${parts.join(" · ")}.`;
}

/** The rows a response cannot rely on yet: needs review, or no answer recorded. */
function needsAttention(requirement: StoredRequirementRecord) {
  return requirement.status !== "confirmed";
}

export function ProjectRequirementList({
  requirements,
  projectId,
}: {
  requirements: StoredRequirementRecord[];
  /** The room the rows belong to, so a row link opens that room's answers. */
  projectId?: string;
}) {
  // Which reading the panel is on, not which rows are saved.
  const [shortfallOnly, setShortfallOnly] = useState(false);

  if (!requirements.length) {
    return (
      <p className="wm-ui-copy" data-testid="project-requirement-empty">
        No requirements have been captured for this room yet. Reopen Discovery to answer the questions
        the design needs.
      </p>
    );
  }

  const readiness = requirementReadiness(requirements);
  const shortfall = readiness.review + readiness.unknown;
  // Both halves of the reading have to differ for the filter to earn its place:
  // a room whose every answer needs attention shows the same rows either way,
  // and a room whose answers are all settled has no shortfall to read. It also
  // keeps a filtered reading from being empty — `filtering` implies a shortfall,
  // so it always has a row — and a shortfall left open when its last outstanding
  // answer is settled elsewhere falls back to the whole list rather than an
  // empty one with no control left to leave it by.
  const canFilter = shortfall > 0 && shortfall < readiness.total;
  const filtering = shortfallOnly && canFilter;
  const visible = filtering ? requirements.filter(needsAttention) : requirements;

  return (
    <>
      {/* A filter that can only ever show the same rows is noise, so a room whose
          answers are all settled keeps the plain list — and so does a room that
          has no settled answer to hide. */}
      {canFilter ? (
        <div
          className="wm-project-requirement-filter"
          role="group"
          aria-label="Filter saved requirements"
          data-testid="project-requirement-filter"
        >
          <button
            type="button"
            aria-pressed={!filtering}
            onClick={() => setShortfallOnly(false)}
            data-testid="project-requirement-filter-all"
          >
            All {readiness.total}
          </button>
          <button
            type="button"
            aria-pressed={filtering}
            onClick={() => setShortfallOnly(true)}
            data-testid="project-requirement-filter-attention"
          >
            Needs attention {shortfall}
          </button>
        </div>
      ) : null}

      <div data-testid="project-requirement-list">
        <p className="wm-ui-copy" data-testid="project-requirement-summary">
          {requirementSummary(readiness)}
        </p>
        {/* The count above is the whole list's, so the filtered reading says how
            much of it is on screen rather than leaving two numbers to disagree. */}
        {filtering ? (
          <p className="wm-ui-copy" data-testid="project-requirement-filter-note">
            Showing the {shortfall === 1 ? "1 that still needs" : `${shortfall} that still need`} an
            answer or a check.
          </p>
        ) : null}
        <ul
          className="wm-project-requirement-list"
          aria-label={filtering ? "Saved requirements needing attention" : "Saved requirements"}
        >
          {visible.map((requirement) => {
            const status = STATUS[requirement.status];
            // Nothing to reopen for a row a response can already rely on.
            const question = requirement.status === "confirmed" ? "" : requirementQuestionId(requirement.id);
            return (
              <li
                key={requirement.id}
                className="wm-project-requirement-row"
                data-requirement-status={requirement.status}
              >
                <div className="wm-project-requirement-row__copy">
                  <span className="wm-project-requirement-row__label">{requirement.label}</span>
                  <span className="wm-project-requirement-row__value">
                    {requirement.value.trim() || "Not recorded"}
                  </span>
                  {/* Named for the row it edits: the panel's own action reads
                      `Edit in Discovery` too, and two links reading the same
                      thing are interchangeable without this. */}
                  {question ? (
                    <Link
                      to={discoveryQuestionUrl(question, projectId)}
                      className="wm-project-requirement-row__question"
                      aria-label={`Edit ${requirement.label} in Discovery`}
                      data-testid={`project-requirement-question-${requirement.id}`}
                    >
                      Edit in Discovery
                    </Link>
                  ) : null}
                </div>
                {/* The chip's title carries why the row matters, so a rep reading a
                    red row knows what depends on the answer without opening
                    Discovery to ask the same question again. */}
                <StatusChip
                  label={status.label}
                  variant={status.variant}
                  title={requirement.whyItMatters.trim() || status.title}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
