import { routeCatalogByKey } from "../app/routeCatalog";
import type { StoredDiscoveryBrief } from "../data/projectStore";

/**
 * Discovery resume position — the lightweight view of "where did the rep
 * leave the guided interview" shown on the dashboard recent-projects card and
 * the project detail card, so a rep can jump straight back into the interview
 * from anywhere.
 *
 * Deliberately does NOT import the discovery question set (`discoveryQuestions`
 * lives in the lazy Discovery chunk — ~64 KB — and must not enter the eager
 * core). Everything here derives from the saved brief alone: the conversation
 * trail (rows are in question order), the captured percent, and the stored
 * next-best-question. The Discovery page recomputes the exact index on load,
 * so this is a display summary, not a second source of truth.
 */

export type DiscoveryResumeInfo = {
  /** Rows in the trail that carry a governed answer. */
  answeredCount: number;
  /** Captured percent from the brief, 0-100, when recorded. */
  percent: number | null;
  /** Stored next-best-question label (the human "what to ask next"). */
  nextQuestion: string;
  /** Any answer captured at all (distinguishes "never started" from "partial"). */
  hasContent: boolean;
  /** True when the brief looks fully captured. */
  complete: boolean;
};

/** Query string that opens Discovery with the saved brief and auto-starts the guided interview. */
export const DISCOVERY_RESUME_INTERVIEW_QUERY = "resume=project&interview=1";

export function discoveryResumeUrl(projectId?: string): string {
  return `${routeCatalogByKey.discovery.path}?${DISCOVERY_RESUME_INTERVIEW_QUERY}${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ""}`;
}

/** The query parameter that opens Discovery on one question (`?edit=<question id>`). */
export const DISCOVERY_QUESTION_EDIT_PARAM = "edit";

/**
 * Opens Discovery on a single question — the row-level counterpart of the
 * interview resume above, for a surface that knows which answer a rep means
 * rather than only which room.
 *
 * The project id is what makes the answers on screen the ones the link came
 * from: with no id Discovery reads this browser's own discovery snapshot, and a
 * rep following a link from one room's record would land on the right question
 * of whichever room this browser touched last.
 */
export function discoveryQuestionUrl(questionId: string, projectId?: string): string {
  const question = encodeURIComponent(questionId);
  const owner = projectId ? `&projectId=${encodeURIComponent(projectId)}` : "";
  return `${routeCatalogByKey.discovery.path}?${DISCOVERY_QUESTION_EDIT_PARAM}=${question}${owner}`;
}

export function discoveryResumeInfo(
  brief: Pick<
    StoredDiscoveryBrief,
    "discoveryConversation" | "capturedPercent" | "missingInformation" | "nextBestQuestion"
  > | null | undefined,
): DiscoveryResumeInfo | null {
  if (!brief) return null;

  const conversation = brief.discoveryConversation ?? [];
  const answered = conversation.filter((item) => (item.answer ?? "").trim().length > 0);
  const answeredCount = answered.length;

  const rawPercent = brief.capturedPercent;
  const percent =
    typeof rawPercent === "number" && Number.isFinite(rawPercent)
      ? Math.min(100, Math.max(0, Math.round(rawPercent)))
      : null;

  if (answeredCount === 0 && percent === null) return null;

  return {
    answeredCount,
    percent,
    nextQuestion: (brief.nextBestQuestion ?? "").trim(),
    hasContent: answeredCount > 0,
    complete: percent !== null ? percent >= 100 : (brief.missingInformation?.length ?? 0) === 0,
  };
}
