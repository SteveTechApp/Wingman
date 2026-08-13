import type { DiscoveryRouteInsight } from "./discoveryQuestions";

type DiscoveryRouteInsightPanelProps = {
  insight?: DiscoveryRouteInsight;
  currentStepId: string;
};

export function DiscoveryRouteInsightPanel({ insight, currentStepId }: DiscoveryRouteInsightPanelProps) {
  if (!insight || currentStepId === "opportunity") return null;

  return (
    <div className="wm-discovery-route-insight wm-discovery-why-card wm-ui-card" role="status">
      <strong>{insight.label}</strong>
      <p className="wm-ui-copy">{insight.summary}</p>
      <ul>
        {insight.decisions.map((decision) => <li key={decision}>{decision}</li>)}
      </ul>
    </div>
  );
}
