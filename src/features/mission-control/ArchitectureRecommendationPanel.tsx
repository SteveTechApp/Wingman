import * as React from "react";
import { buildArchitectureRecommendation } from "@/workflow/architectureRecommendations";
import { getActiveWorkflowProject } from "@/workflow/workflowStore";

export default function ArchitectureRecommendationPanel() {
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 700);
    return () => window.clearInterval(id);
  }, []);

  const active = getActiveWorkflowProject();
  const recommendation = React.useMemo(() => buildArchitectureRecommendation(active), [active]);

  return (
    <section className="wm-mc-architecture wm-card">
      <div className="wm-mc-architecture-head">
        <div>
          <div className="wm-mc-kicker">Architecture guidance</div>
          <h2 className="wm-subtitle wm-mc-architecture-title">
            {recommendation.primary ? recommendation.primary : "No recommendation yet"}
          </h2>
          <p className="wm-muted wm-mc-architecture-copy">{recommendation.summary}</p>
        </div>

        <div className={`wm-mc-confidence is-${recommendation.confidence.toLowerCase()}`}>
          {recommendation.confidence}
        </div>
      </div>

      <div className="wm-mc-tech-strip">
        {recommendation.families.length > 0 ? (
          recommendation.families.map((family) => (
            <span key={family} className="wm-badge">
              {family}
            </span>
          ))
        ) : (
          <span className="wm-badge">Awaiting discovery data</span>
        )}
      </div>

      <div className="wm-mc-architecture-block">
        <div className="wm-kpi-label">Why this is recommended</div>
        <ul className="wm-mc-architecture-list">
          {recommendation.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>

      <div className="wm-mc-architecture-block">
        <div className="wm-kpi-label">Next design actions</div>
        <ul className="wm-mc-architecture-list">
          {recommendation.nextActions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
