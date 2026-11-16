/**
 * The template proposal's pre-issue walk.
 *
 * A template exports without opening the wizard, so the Proposal tab is the
 * whole of the review before the document leaves. That review has three kinds
 * of work — blockers that hold the document, assumptions the document labels,
 * and the final issue step — and the order matters: a rep should meet the
 * thing that stops the export first, then review its caveats. This
 * model says which stages exist, what each one still holds, where the tab opens
 * and what the command bar says, so the panel renders one reading of the same
 * facts instead of repeating the arithmetic in its markup.
 */

export type TemplatePreIssueStageKey = "blockers" | "assumptions" | "issue";

export type TemplatePreIssueInput = {
  /** The export validator's blockers, which hold the document. */
  blockers: number;
  /** Warnings the document prints as labelled assumptions. */
  warnings: number;
  /** Unverified points the template itself carries into the document. */
  validationItems: number;
};

export type TemplatePreIssueStage = {
  key: TemplatePreIssueStageKey;
  label: string;
  /** The line under the label: what this stage still holds. */
  status: string;
  /** True when the stage has something for the rep to clear or read. */
  open: boolean;
};

/** The assumptions the document will label: its warnings and the template's own. */
export function templatePreIssueAssumptions(input: TemplatePreIssueInput) {
  return input.warnings + input.validationItems;
}

function plural(count: number) {
  return count === 1 ? "" : "s";
}

/**
 * The three readings of the review, in the order a rep should take them.
 *
 * The issue stage is last and says nothing of its own beyond whether the
 * document can leave: the actions themselves stay in the command bar, so a rep
 * never has to reach the end of a scroll to issue.
 */
export function templatePreIssueStages(input: TemplatePreIssueInput): TemplatePreIssueStage[] {
  const assumptions = templatePreIssueAssumptions(input);
  return [
    {
      key: "blockers",
      label: "Blockers",
      status: input.blockers ? `${input.blockers} to clear` : "None",
      open: input.blockers > 0,
    },
    {
      key: "assumptions",
      label: "Assumptions",
      status: assumptions ? `${assumptions} labelled` : "None",
      open: assumptions > 0,
    },
    {
      key: "issue",
      label: "Issue",
      status: input.blockers ? "Blocked" : "Ready to issue",
      open: false,
    },
  ];
}

/**
 * Where the tab opens: the first stage with work in it, so the rep starts at the
 * thing that needs them rather than at a cover page.
 */
export function templatePreIssueInitialStage(input: TemplatePreIssueInput): TemplatePreIssueStageKey {
  if (input.blockers > 0) return "blockers";
  if (templatePreIssueAssumptions(input) > 0) return "assumptions";
  return "issue";
}

/**
 * A stored stage, kept only while it still names one of the walk's stages.
 * Checked against the walk itself rather than a second list of names, so a
 * stage added to the review cannot leave a remembered value behind it.
 */
export function templatePreIssueStageFrom(
  value: unknown,
  stages: readonly TemplatePreIssueStage[],
): TemplatePreIssueStageKey | null {
  return stages.find((stage) => stage.key === value)?.key ?? null;
}

/**
 * Where the tab reopens: the stage the rep left it on, so a return continues the
 * reading instead of walking them back to the top.
 *
 * The remembered stage outranks the first-with-work rule even when that stage
 * has since cleared: the rep chose the reading they wanted, and a stage that is
 * now empty says so in its own line. A value that names no stage — an older
 * build, a hand-edited entry — is ignored rather than half-applied.
 */
export function templatePreIssueResumeStage(
  input: TemplatePreIssueInput,
  stored: unknown,
): TemplatePreIssueStageKey {
  return templatePreIssueStageFrom(stored, templatePreIssueStages(input)) ?? templatePreIssueInitialStage(input);
}

/**
 * The command bar's one line: what the document would say right now.
 *
 * Only technical or scope blockers are phrased as a stop.
 */
export function templatePreIssueSummary(input: TemplatePreIssueInput) {
  if (input.blockers) {
    return `${input.blockers} blocker${plural(input.blockers)} must clear before this can issue.`;
  }
  const assumptions = templatePreIssueAssumptions(input);
  const parts: string[] = [];
  if (assumptions) parts.push(`${assumptions} assumption${plural(assumptions)} labelled`);
  return parts.length ? `Issues with ${parts.join(" and ")}.` : "Every check is clear — ready to issue.";
}
