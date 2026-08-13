import type { DiscoveryRouteInsight } from "./discoveryQuestions";

type DiscoveryRouteInsightPanelProps = {
  insight?: DiscoveryRouteInsight;
  currentStepId: string;
};

export function DiscoveryRouteInsightPanel({ insight, currentStepId }: DiscoveryRouteInsightPanelProps) {
  if (!insight || currentStepId === "opportunity") return null;

  return (
    <div className="wm-discovery-route-insight wm-discovery-why-card wm-ui-card" role="status">
      <div className="wm-discovery-route-insight-copy">
        <strong>{insight.label}</strong>
        <p className="wm-ui-copy">{insight.summary}</p>
      </div>
      <div className="wm-discovery-route-decisions" aria-label="Discovery route priorities">
        {insight.decisions.map((decision) => <span key={decision}>{decision}</span>)}
      </div>
    </div>
  );
}
