import * as React from "react";
import { ShieldCheck } from "lucide-react";

import type {
  CommercialReadinessCheck,
  CommercialReadinessStatus,
} from "@/features/readiness/commercialReadiness";

type ProposalHandoffPanelProps = {
  status: CommercialReadinessStatus;
  score: number;
  checks: CommercialReadinessCheck[];
  nextStep: string;
};

function statusTone(status: CommercialReadinessStatus): "ready" | "review" | "attention" {
  if (status === "Commercial Ready") return "ready";
  if (status === "Engineering Review Required") return "attention";
  return "review";
}

export default function ProposalHandoffPanel(props: ProposalHandoffPanelProps) {
  const tone = statusTone(props.status);

  return (
    <section
      data-wm-proposal-handoff="1"
      className={`wm-section wm-section--tone-cyan wm-proposal-handoff wm-proposal-handoff--${tone}`}
    >
      <div className="wm-proposal-handoff__head">
        <div className="wm-proposal-handoff__copy">
          <div className="wm-proposal-handoff__kicker">
            <ShieldCheck size={15} />
            <span>Quote pack handoff</span>
          </div>
          <div className="wm-proposal-handoff__title">Commercial readiness gate</div>
          <div className="wm-proposal-handoff__subtitle">
            Use this as the final confidence check before sharing proposal outputs.
          </div>
        </div>

        <div className={`wm-proposal-handoff__badge wm-proposal-handoff__badge--${tone}`}>
          {props.status} ({props.score}%)
        </div>
      </div>

      <div className="wm-proposal-handoff__progress">
        <div
          className={`wm-proposal-handoff__progress-fill wm-proposal-handoff__progress-fill--${tone}`}
          style={{ width: `${props.score}%` }}
        />
      </div>

      <div className="wm-proposal-handoff__checks">
        {props.checks.map((item) => (
          <article
            key={item.id}
            className={`wm-proposal-handoff__check${item.complete ? " is-complete" : ""}`}
          >
            <div className="wm-proposal-handoff__check-state">
              {item.complete ? "Ready" : "Pending"}
            </div>
            <div className="wm-proposal-handoff__check-label">{item.label}</div>
            <div className="wm-proposal-handoff__check-detail">{item.detail}</div>
          </article>
        ))}
      </div>

      <div className="wm-proposal-handoff__next-step">
        Next step: {props.nextStep}
      </div>
    </section>
  );
}
