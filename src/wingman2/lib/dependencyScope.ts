import type { StoredProject } from "../data/projectStore";
import type { GovernedDependency } from "./dependencyGovernance";
import type { TemplateBomRow } from "./roomTemplates";

/** The prefix a governed dependency carries while no catalogue part answers it. */
export const DEPENDENCY_PROMPT_PREFIX = "TBC-";

/** The project record's dependency panel, and the panel id a link lands on. */
export const DEPENDENCY_SCOPE_ANCHOR = "project-dependencies";

/**
 * One open question a response carries instead of a quote line.
 *
 * Both surfaces that answer one — the completion wizard's export gate and the
 * project record — read this shape, so the row a rep clicks says the same thing
 * and hands the same SKU to the same write.
 */
export type DependencyPrompt = {
  /** The placeholder SKU the response carries while the question is open. */
  sku: string;
  /** What the dependency is for, as the quotation's own row names it. */
  label: string;
  /** The question the customer document prints, when the save recorded one. */
  question?: string;
};

const promptKey = (sku: string) => sku.trim().toUpperCase();

/** Whether a dependency line is still a prompt rather than a named part. */
export function isDependencyPromptSku(sku: string): boolean {
  return promptKey(sku).startsWith(DEPENDENCY_PROMPT_PREFIX);
}

/**
 * The prompts a room still carries as BOM placeholders: every governed
 * dependency the rep has not yet recorded as a documented dependency.
 *
 * The package keeps an unquoted dependency in `governedDependencies` — that is
 * where the customer document prints the question — so the gate's own list of
 * what still holds the quotation comes from here rather than from the rows.
 */
export function pendingDependencyPrompts(
  dependencies: readonly GovernedDependency[],
  unquotedSkus: readonly string[] | undefined,
): DependencyPrompt[] {
  const unquoted = new Set((unquotedSkus ?? []).map(promptKey));
  return dependencies
    .filter((dependency) => isDependencyPromptSku(dependency.sku) && !unquoted.has(promptKey(dependency.sku)))
    .map((dependency) => ({
      sku: promptKey(dependency.sku),
      label: dependency.label,
      question: dependency.validationQuestion,
    }));
}

/**
 * The prompts a saved room still carries, read off its own response.
 *
 * The record does not rebuild the package to answer this: the response saved
 * with `governedDependencies` is the document's own dependency list, and the
 * BOM beside it names the placeholder row. A save that predates the list still
 * carries the row, so the row names the prompt and the rep can still answer it;
 * a project with no saved response has nothing to offer and renders no panel.
 *
 * Already-recorded prompts drop out here, which is what lets the record show
 * the decision it took rather than the one that was offered.
 */
export function projectDependencyPrompts(project: StoredProject): DependencyPrompt[] {
  const unquoted = new Set((project.unquotedDependencySkus ?? []).map(promptKey));
  const prompts = new Map<string, DependencyPrompt>();
  for (const dependency of project.proposal?.governedDependencies ?? []) {
    if (!isDependencyPromptSku(dependency.sku)) continue;
    prompts.set(promptKey(dependency.sku), {
      sku: promptKey(dependency.sku),
      label: dependency.label,
      question: dependency.validationQuestion,
    });
  }
  for (const row of project.proposal?.bomRows ?? []) {
    if (!isDependencyPromptSku(row.sku)) continue;
    const key = promptKey(row.sku);
    if (prompts.has(key)) continue;
    prompts.set(key, { sku: key, label: row.description || key });
  }
  return [...prompts.values()].filter((prompt) => !unquoted.has(prompt.sku));
}

/**
 * The prompts one schedule still carries, read off the rows a document prints.
 *
 * A room template has no saved response to hold a dependency list, so the
 * template page asks its own schedule: a row whose SKU is still a `TBC-`
 * placeholder is a question with no catalogue part behind it. An excluded row
 * is not quoted, so it is not a prompt either.
 *
 * A template built from a project inherits that project's BOM verbatim, so this
 * is the path a placeholder takes to a template's export gate — which is why
 * the page can clear it rather than only naming it.
 */
export function templateDependencyPrompts(
  rows: readonly Pick<TemplateBomRow, "sku" | "description" | "status" | "qty">[],
): DependencyPrompt[] {
  const prompts = new Map<string, DependencyPrompt>();
  for (const row of rows) {
    if (!isDependencyPromptSku(row.sku)) continue;
    if (row.status === "excluded" || !((row.qty ?? 1) > 0)) continue;
    const key = promptKey(row.sku);
    prompts.set(key, { sku: key, label: row.description?.trim() || key });
  }
  return [...prompts.values()];
}

/**
 * The template schedule with one prompt recorded as a dependency to confirm.
 *
 * A template carries no dependency record of its own, so the decision is kept
 * where its document prints it: the row leaves the schedule — the placeholder
 * is not a line anybody can price — and the dependency's name joins the
 * template's unresolved items, which the proposal prints as an unverified
 * assumption. The question therefore survives the click instead of being
 * deleted from the customer's reading.
 *
 * Null when the rows carry no prompt with that SKU: a named part is not an open
 * question, and taking it out would drop equipment from the room.
 */
export function templateDependencyRecord(
  rows: readonly TemplateBomRow[],
  validationItems: readonly string[],
  sku: string,
): { rows: TemplateBomRow[]; validationItems: string[] } | null {
  const target = promptKey(sku);
  if (!isDependencyPromptSku(target)) return null;
  const row = rows.find((candidate) => promptKey(candidate.sku) === target);
  if (!row) return null;
  const dependency = (row.description || target).trim();
  const recorded = validationItems.some((item) => item.trim() === dependency);
  return {
    rows: rows.map((candidate) =>
      candidate.id === row.id ? { ...candidate, status: "excluded", qty: 0 } : candidate,
    ),
    validationItems: recorded ? [...validationItems] : [...validationItems, dependency],
  };
}

/**
 * The project with one dependency prompt recorded as a documented dependency.
 *
 * A prompt has no catalogue part behind it — “confirm the switch, port budget
 * and VLAN” cannot be priced — so the block it raises can only be cleared by a
 * rep deciding what the quotation says about it. This records that decision: the
 * question stays in the document’s dependency list, and the BOM stops carrying
 * a placeholder nobody can quote.
 *
 * It deliberately does not say who supplies the dependency. Half of these
 * prompts are WyreStorm-side choices (which receiver, how many endpoints), so
 * writing “supplied by others” over them would put a claim in a customer
 * document that the rep may not be able to make. Naming the responsible party is
 * still the rep’s job; this only takes the unpriced line out.
 *
 * Null when the SKU is not a prompt: an exact dependency names a real part the
 * design needs, and leaving that unquoted would drop equipment from the room.
 */
export function dependencyUnquotedProject(
  project: StoredProject,
  sku: string,
  now: string = new Date().toISOString(),
): StoredProject | null {
  const target = sku.trim().toUpperCase();
  if (!isDependencyPromptSku(target)) return null;
  const recorded = (project.unquotedDependencySkus ?? []).map(promptKey);
  return {
    ...project,
    updated: "Just now",
    updatedAt: now,
    unquotedDependencySkus: recorded.includes(target) ? recorded : [...recorded, target],
  };
}
