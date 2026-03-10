import * as React from "react";
import { buildSolutionRecommendation } from "@/workflow/solutionRecommendations";
import { getActiveWorkflowProject } from "@/workflow/workflowStore";

export default function SolutionRecommendationPanel() {
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 700);
    return () => window.clearInterval(id);
  }, []);

  const active = getActiveWorkflowProject();
  const solution = buildSolutionRecommendation(active);

  return (
    <section className="wm-mc-solution wm-card">
      <div className="wm-mc-solution-head">
        <div>
          <div className="wm-mc-kicker">Solution path</div>
          <h2 className="wm-subtitle wm-mc-solution-title">{solution.platform}</h2>
          <p className="wm-muted wm-mc-solution-copy">{solution.summary}</p>
        </div>

        <div className={`wm-mc-confidence is-${solution.confidence.toLowerCase()}`}>
          {solution.confidence}
        </div>
      </div>

      <div className="wm-mc-solution-topology">
        <div className="wm-kpi-label">Topology</div>
        <div className="wm-mc-summary-value">{solution.topology}</div>
      </div>

      <div className="wm-mc-tech-strip">
        {solution.families.length > 0 ? (
          solution.families.map((family) => (
            <span key={family} className="wm-badge">
              {family}
            </span>
          ))
        ) : (
          <span className="wm-badge">Awaiting architecture data</span>
        )}
      </div>

      <div className="wm-mc-solution-block">
        <div className="wm-kpi-label">Recommended building blocks</div>
        <ul className="wm-mc-architecture-list">
          {solution.buildingBlocks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="wm-mc-solution-block">
        <div className="wm-kpi-label">Starter BOM structure</div>
        <div className="wm-mc-bom-list">
          {solution.starterBom.map((item) => (
            <div key={item.category} className="wm-mc-bom-row">
              <div className="wm-mc-bom-main">
                <div className="wm-mc-bom-category">{item.category}</div>
                <div className="wm-mc-bom-recommendation">{item.recommendation}</div>
              </div>
              <div className="wm-mc-bom-side">
                <div className="wm-mc-bom-qty">{item.quantityHint}</div>
                <div className="wm-mc-bom-note">{item.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wm-mc-solution-block">
        <div className="wm-kpi-label">Commercial notes</div>
        <ul className="wm-mc-architecture-list">
          {solution.commercialNotes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

