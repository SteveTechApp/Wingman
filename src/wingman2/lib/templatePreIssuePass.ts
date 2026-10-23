import {
  templatePreIssueStageFrom,
  type TemplatePreIssueStage,
  type TemplatePreIssueStageKey,
} from "./templatePreIssue";

/**
 * Where the rep left the template's pre-issue walk.
 *
 * The Proposal tab unmounts when the rep visits Room design or Drawings, and the
 * page opens it at the first stage that has work, which makes every return start
 * at the top of a reading the rep had already finished. So the stage is kept in
 * the browser, beside the template's pricing draft rather than inside the
 * template: it is where one person was reading, not what the template says.
 *
 * One key per template. Two templates can hold different work, and inheriting
 * another template's stage would open a rep on a reading they never chose.
 */

export const TEMPLATE_PRE_ISSUE_STAGE_KEY_PREFIX = "wingman:template-proposal:stage:v1";

export function templatePreIssueStageStorageKey(templateId: string) {
  return `${TEMPLATE_PRE_ISSUE_STAGE_KEY_PREFIX}:${templateId}`;
}

/**
 * The stage this template was last left on, unread: the caller checks it against
 * the walk, because only that knows which stages exist today.
 */
export function readTemplatePreIssueStage(templateId: string): string | null {
  try {
    return window.localStorage.getItem(templatePreIssueStageStorageKey(templateId));
  } catch {
    // Storage can be unavailable in a private window; opening the walk at its
    // first stage is a fine answer, and not worth failing the page over.
    return null;
  }
}

export function rememberTemplatePreIssueStage(templateId: string, stage: TemplatePreIssueStageKey): void {
  try {
    window.localStorage.setItem(templatePreIssueStageStorageKey(templateId), stage);
  } catch {
    // A click that changed the stage still changed it on screen; only the
    // memory of it is lost.
  }
}

/**
 * The stage also rides in the address (`?stage=assumptions`), so a rep can send
 * a colleague the reading they are looking at. The browser memory above is one
 * machine's; the address is the one that travels.
 */
export const TEMPLATE_PRE_ISSUE_STAGE_PARAM = "stage";

/**
 * The stage an address asks for, checked against the walk that will render it:
 * a hand-edited or older link naming no stage is ignored, not half-applied.
 */
export function templatePreIssueStageFromSearch(
  search: URLSearchParams | string,
  stages: readonly TemplatePreIssueStage[],
): TemplatePreIssueStageKey | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return templatePreIssueStageFrom(params.get(TEMPLATE_PRE_ISSUE_STAGE_PARAM), stages);
}

/** The address with this stage on it; every other parameter is kept. */
export function templatePreIssueStageSearch(
  search: URLSearchParams | string,
  stage: TemplatePreIssueStageKey,
): URLSearchParams {
  const next = new URLSearchParams(search);
  next.set(TEMPLATE_PRE_ISSUE_STAGE_PARAM, stage);
  return next;
}
