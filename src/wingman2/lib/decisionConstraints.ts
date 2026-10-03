export type DecisionConstraintSeverity = "warning" | "blocking";

export type DecisionConstraintIssue = {
  id: string;
  severity: DecisionConstraintSeverity;
  fields: string[];
  title: string;
  detail: string;
  resolution: string;
};

export type DecisionConstraint<TState> = {
  id: string;
  severity: DecisionConstraintSeverity;
  fields: string[];
  when: (state: TState) => boolean;
  title: string;
  detail: string;
  resolution: string;
};

/**
 * Evaluates cross-answer technical constraints without mutating any answer.
 * Guided workflows should run this after every decision and block quote-safe
 * output while any blocking issue remains.
 */
export function evaluateDecisionConstraints<TState>(
  state: TState,
  constraints: DecisionConstraint<TState>[],
): DecisionConstraintIssue[] {
  return constraints
    .filter((constraint) => constraint.when(state))
    .map(({ when: _when, ...issue }) => issue);
}

export function hasBlockingDecisionIssue(issues: DecisionConstraintIssue[]): boolean {
  return issues.some((issue) => issue.severity === "blocking");
}
