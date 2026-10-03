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

export function discoveryResumeUrl(): string {
  return `${routeCatalogByKey.discovery.path}?${DISCOVERY_RESUME_INTERVIEW_QUERY}`;
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
