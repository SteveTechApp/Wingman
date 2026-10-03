import type { DecisionConstraintIssue } from "../lib/decisionConstraints";

export function DecisionCompatibilityAlert(props: { issues: DecisionConstraintIssue[] }) {
  if (!props.issues.length) return null;

  const blocked = props.issues.some((issue) => issue.severity === "blocking");

  return (
    <section className="wm-decision-compatibility-alert" data-blocked={blocked || undefined} role="alert" aria-live="polite">
      <div>
        <p className="wm-ui-kicker">Technical compatibility check</p>
        <h3>{blocked ? "Resolve this mismatch before progressing" : "Confirm this design dependency"}</h3>
      </div>
      {props.issues.map((issue) => (
        <article key={issue.id} className={`is-${issue.severity}`}>
          <strong>{issue.title}</strong>
          <p>{issue.detail}</p>
          <span>{issue.resolution}</span>
        </article>
      ))}
    </section>
  );
}
