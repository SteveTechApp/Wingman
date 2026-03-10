import * as React from "react";
import {
  getActiveWorkflowProject,
} from "@/workflow/workflowStore";

function scoreProject(active: ReturnType<typeof getActiveWorkflowProject>): number {
  if (!active) return 0;

  let score = 0;
  if (active.sources && active.sources > 0) score += 20;
  if (active.displays && active.displays > 0) score += 20;
  if (active.distanceM && active.distanceM > 0) score += 15;
  if (active.usb) score += 10;
  if (active.control) score += 10;
  if (active.audio) score += 10;

  switch (active.stage) {
    case "architecture":
      score += 5;
      break;
    case "products":
      score += 10;
      break;
    case "proposal":
    case "closed":
      score += 15;
      break;
  }

  return Math.min(score, 100);
}

export default function ProposalReadinessPanel() {
  const [, setTick] = React.useState(0);
  const active = getActiveWorkflowProject();
  const score = scoreProject(active);

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 700);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="wm-mc-readiness wm-card">
      <div className="wm-mc-readiness-head">
        <div className="wm-mc-kicker">Proposal readiness</div>
        <div className="wm-mc-readiness-score">{score}%</div>
      </div>

      <div className="wm-mc-readiness-bar">
        <div className="wm-mc-readiness-fill" style={{ width: `${score}%` }} />
      </div>

      <p className="wm-muted wm-mc-readiness-copy">
        {active
          ? "This score reflects project completeness and stage progress toward commercial output."
          : "Select an active project to assess proposal readiness."}
      </p>
    </section>
  );
}

