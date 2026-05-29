import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Image,
  Languages,
  MessageSquareText,
  PackageSearch,
  Sparkles,
} from "lucide-react";
import type { WingmanCoachState } from "../lib/wingmanCoach";

type WingmanCoachPanelProps = {
  coach: WingmanCoachState;
  compact?: boolean;
  showFunnel?: boolean;
  showVisuals?: boolean;
  actions?: ReactNode;
};

function requirementList(items: string[], emptyText: string, tone: "known" | "unknown" | "risk") {
  const Icon = tone === "known" ? CheckCircle2 : tone === "risk" ? AlertTriangle : HelpCircle;

  return (
    <div className={`wm-coach-fact-list wm-coach-fact-list-${tone}`}>
      {items.length ? (
        items.slice(0, 4).map((item) => (
          <span key={item}>
            <Icon className="h-3.5 w-3.5" />
            {item}
          </span>
        ))
      ) : (
        <span>
          <Icon className="h-3.5 w-3.5" />
          {emptyText}
        </span>
      )}
    </div>
  );
}

export function WingmanCoachPanel({
  coach,
  compact = false,
  showFunnel = true,
  showVisuals = true,
  actions,
}: WingmanCoachPanelProps) {
  return (
    <section className="wm-coach-panel" data-compact={compact ? "true" : "false"}>
      <div className="wm-coach-head">
        <div className="wm-coach-title-block">
          <span className="wm-coach-kicker">
            <Sparkles className="h-4 w-4" />
            Wingman Coach
          </span>
          <h2>{coach.title}</h2>
          <p>{coach.playback}</p>
        </div>

        <div className="wm-coach-confidence" aria-label={`Requirement confidence ${coach.requirement.confidence}%`}>
          <span>{coach.audienceLabel}</span>
          <strong>{coach.requirement.confidence}%</strong>
          <div>
            <i style={{ width: `${coach.requirement.confidence}%` }} />
          </div>
        </div>
      </div>

      <div className="wm-coach-question-row">
        <div>
          <span>
            <MessageSquareText className="h-4 w-4" />
            Ask next
          </span>
          <p>{coach.nextQuestion}</p>
        </div>
        <div>
          <span>
            <PackageSearch className="h-4 w-4" />
            Next action
          </span>
          <p>{coach.nextAction}</p>
        </div>
      </div>

      {showFunnel ? (
        <div className="wm-coach-funnel" aria-label="SKU narrowing funnel">
          {coach.skuFunnel.steps.map((step) => (
            <div key={step.label} className={`wm-coach-funnel-step wm-coach-funnel-step-${step.tone}`}>
              <span>{step.label}</span>
              <strong>{step.count}</strong>
              <p>{step.detail}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="wm-coach-grid">
        <div>
          <h3>Known</h3>
          {requirementList(coach.requirement.known, "No useful context captured yet.", "known")}
        </div>
        <div>
          <h3>Still open</h3>
          {requirementList(coach.requirement.unknown, "No major discovery gaps detected.", "unknown")}
        </div>
        <div>
          <h3>Validate</h3>
          {requirementList(coach.requirement.risks, "No high-risk assumptions detected.", "risk")}
        </div>
      </div>

      {showVisuals ? (
        <div className="wm-coach-visuals">
          <div className="wm-coach-subhead">
            <span>
              <Image className="h-4 w-4" />
              Proposal visuals
            </span>
            <small>Built to transfer into the customer proposal or a sell-on conversation.</small>
          </div>
          <div className="wm-coach-visual-grid">
            {coach.visualBlocks.slice(0, compact ? 2 : 4).map((block) => (
              <article key={block.id}>
                <strong>{block.title}</strong>
                <p>{block.summary}</p>
                <span>{block.exportLabel}</span>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <details className="wm-coach-localization">
        <summary>
          <Languages className="h-4 w-4" />
          Translation-safe language
        </summary>
        <ul>
          {coach.localizationNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </details>

      {actions ? <div className="wm-coach-actions">{actions}</div> : null}
    </section>
  );
}
