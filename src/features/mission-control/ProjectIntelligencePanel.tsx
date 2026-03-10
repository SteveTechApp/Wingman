import * as React from "react";
import { buildProjectIntelligence } from "@/workflow/projectIntelligence";

export default function ProjectIntelligencePanel() {
  const [, setTick] = React.useState(0)

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 800)
    return () => window.clearInterval(id)
  }, [])

  const intelligence = buildProjectIntelligence()

  return (
    <section className="wm-mc-intelligence wm-card">
      <div className="wm-mc-intelligence-head">
        <div>
          <div className="wm-mc-kicker">Project intelligence</div>
          <h2 className="wm-subtitle wm-mc-intelligence-title">{intelligence.activeProjectName}</h2>
          <p className="wm-muted wm-mc-intelligence-copy">{intelligence.nextBestAction}</p>
        </div>
        <div className="wm-mc-stage-pill">{intelligence.stage}</div>
      </div>

      <div className="wm-mc-intelligence-grid">
        <div className="wm-kpi-card">
          <div className="wm-kpi-label">Discovery completeness</div>
          <div className="wm-kpi-value">{intelligence.discoveryScore}%</div>
        </div>
        <div className="wm-kpi-card">
          <div className="wm-kpi-label">Proposal readiness</div>
          <div className="wm-kpi-value">{intelligence.proposalScore}%</div>
        </div>
        <div className="wm-kpi-card">
          <div className="wm-kpi-label">Architecture path</div>
          <div className="wm-mc-summary-value">{intelligence.architecturePrimary}</div>
        </div>
        <div className="wm-kpi-card">
          <div className="wm-kpi-label">Solution path</div>
          <div className="wm-mc-summary-value">{intelligence.solutionPlatform}</div>
        </div>
      </div>

      <div className="wm-mc-intelligence-columns">
        <div className="wm-mc-intelligence-block">
          <div className="wm-kpi-label">Strengths</div>
          <ul className="wm-mc-architecture-list">
            {intelligence.strengths.length > 0 ? (
              intelligence.strengths.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>No strengths recorded yet.</li>
            )}
          </ul>
        </div>

        <div className="wm-mc-intelligence-block">
          <div className="wm-kpi-label">Gaps to resolve</div>
          <ul className="wm-mc-architecture-list">
            {intelligence.gaps.length > 0 ? (
              intelligence.gaps.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>No material gaps currently flagged.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  )
}


