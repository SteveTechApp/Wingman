import { AlertTriangle, CheckCircle2, CircleDashed, Link2, ShieldCheck } from "lucide-react";
import type { StoredDesignProposalRevision } from "../data/projectStore";

export function DesignProposalReview({ revision }: { revision: StoredDesignProposalRevision }) {
  return (
    <section className="wm-design-review" aria-labelledby="design-review-title">
      <header className="wm-design-review__header">
        <div><span>Canonical design revision</span><h3 id="design-review-title">Requirement-to-design review</h3></div>
        <code>{revision.revisionId}</code>
      </header>
      <div className="wm-design-review__summary">
        <div><small>Customer requirement</small><p>{revision.customerRequirement}</p></div>
        <div><small>Wingman understood</small><p>{revision.interpretedRequirement}</p></div>
        <div><small>Recommended architecture</small><p>{revision.architecture}</p></div>
      </div>

      <div className="wm-design-review__section-head"><h4>Requirement trace</h4><span>{revision.requirements.length} captured</span></div>
      <div className="wm-design-review__requirements">
        {revision.requirements.map((item) => <article key={item.id} data-state={item.state}>
          <div><Link2 aria-hidden="true" /><strong>{item.customerStatement}</strong><span>{item.state}</span></div>
          <p><b>Interpretation:</b> {item.interpretation}</p><p><b>Design consequence:</b> {item.designConsequence}</p>
          <small>{item.source} · {item.confidence} confidence</small>
        </article>)}
      </div>

      <div className="wm-design-review__section-head"><h4>System completeness</h4><span>{revision.roleCoverage.filter((item) => item.required && item.covered).length}/{revision.roleCoverage.filter((item) => item.required).length} required roles covered</span></div>
      <div className="wm-design-review__roles">
        {revision.roleCoverage.map((item) => <div key={item.role} data-required={item.required} data-covered={item.covered}>
          {item.covered ? <CheckCircle2 aria-hidden="true" /> : <CircleDashed aria-hidden="true" />}<span><strong>{item.label}</strong><small>{item.required ? "Required" : "As required"}{item.evidence.length ? ` · ${item.evidence.join(", ")}` : ""}</small></span>
        </div>)}
      </div>

      <div className="wm-design-review__section-head"><h4>Products in this design</h4><span>{revision.productOverviews.length} selected</span></div>
      <div className="wm-design-review__products">
        {revision.productOverviews.map((item) => <article key={item.sku}><div><strong>{item.quantity} × {item.sku}</strong><span>{item.designRole}</span></div><h5>{item.name}</h5><p>{item.reason}</p>{item.proof.length ? <small><b>Proof:</b> {item.proof.join(" · ")}</small> : null}{item.validation.length ? <small><b>Validate:</b> {item.validation.join(" · ")}</small> : null}</article>)}
      </div>

      {(revision.blockers.length || revision.warnings.length) ? <div className="wm-design-review__issues">
        {revision.blockers.length ? <div data-tone="blocker"><AlertTriangle aria-hidden="true" /><span><strong>Design blockers</strong>{revision.blockers.map((item) => <p key={item}>{item}</p>)}</span></div> : null}
        {revision.warnings.length ? <div data-tone="warning"><ShieldCheck aria-hidden="true" /><span><strong>Confirm before issue</strong>{revision.warnings.map((item) => <p key={item}>{item}</p>)}</span></div> : null}
      </div> : null}
    </section>
  );
}
