import { checklistLayerStatusLabels, templateCompletionChecklist, type ChecklistLayerStatus } from "../lib/templateCompletionChecklist";

const statusOrder: ChecklistLayerStatus[] = ["unspecified", "by-others", "not-applicable", "covered"];
const summaryLine: Record<ChecklistLayerStatus, (name: string) => string> = {
  unspecified: (name) => `${name} guidance is missing from this design`,
  "by-others": (name) => `${name} completes the system through by-others scope`,
  "not-applicable": (name) => `${name} is recorded as not applicable`,
  covered: (name) => `${name} is part of the design`,
};

export function TemplateCompletionChecklist({ template }: { template: Parameters<typeof templateCompletionChecklist>[0] }) {
  const checklist = templateCompletionChecklist(template);
  const ordered = [...checklist.layers].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
  const openItems = checklist.counts.unspecified;

  return (
    <section className="wm-completion-checklist" data-wingman-completion-checklist="true" aria-label="Complete-room design checklist">
      <div className="wm-completion-checklist-heading">
        <div>
          <span className="wm-status is-assumed">Complete-room checklist</span>
          <h2>Does this design describe a whole room?</h2>
          <p>
            Signal transport is the template's core. A defensible design also answers the five layers around it —
            use this checklist to question anything left unspecified before the design is issued.
          </p>
        </div>
        <div className="wm-completion-checklist-counts" aria-label="Layer coverage summary">
          <strong>{openItems === 0 ? "All layers addressed" : `${openItems} layer${openItems === 1 ? "" : "s"} to decide`}</strong>
          <span>{checklist.counts.covered} covered · {checklist.counts.byOthers} by others · {checklist.counts.notApplicable} n/a · {openItems} unspecified</span>
        </div>
      </div>
      <ol>
        {ordered.map((layer) => (
          <li key={layer.id} className={`wm-completion-layer is-${layer.status}`}>
            <div className="wm-completion-layer-status">
              <span className={`wm-status ${layer.status === "covered" ? "is-confirmed" : layer.status === "by-others" ? "is-others" : layer.status === "not-applicable" ? "is-saved" : "is-validate"}`}>
                {checklistLayerStatusLabels[layer.status]}
              </span>
              <strong>{layer.name}</strong>
              <small>{summaryLine[layer.status](layer.name)}</small>
            </div>
            <p>{layer.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
