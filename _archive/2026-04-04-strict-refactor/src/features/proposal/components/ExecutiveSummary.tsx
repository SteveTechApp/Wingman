import React from "react";
import type { ProposalViewModel } from "../proposalModel";

type Props = {
  model: ProposalViewModel;
};

export default function ExecutiveSummary({ model }: Props) {
  return (
    <section className="wm-proposal-summary">
      <div className="wm-proposal-summary__hero">
        <div className="wm-proposal-summary__headline">
          <div className="wm-proposal-summary__eyebrow">Proposal summary</div>
          <div className="wm-proposal-summary__title">{model.projectName}</div>
          <div className="wm-proposal-summary__meta">
            <span className="wm-proposal-summary__badge">
            {model.systemType}
            </span>
          {model.customerName ? (
              <span className="wm-proposal-summary__customer">
              Customer: {model.customerName}
              </span>
          ) : null}
          </div>
        </div>

        <div className="wm-proposal-summary__copy">
        {model.summaryText}
        </div>
      </div>

      <div className="wm-proposal-summary__metrics">
        {model.metrics.map((metric) => (
          <div key={metric.label} className="wm-proposal-summary__metric">
            <div className="wm-proposal-summary__metric-label">{metric.label}</div>
            <div className="wm-proposal-summary__metric-value">{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="wm-proposal-summary__benefits">
        <div className="wm-proposal-summary__benefits-title">Key benefits</div>
        <div className="wm-proposal-summary__benefit-list">
          {model.keyBenefits.map((benefit) => (
            <div key={benefit} className="wm-proposal-summary__benefit">
              <span className="wm-proposal-summary__benefit-mark">+</span>
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

