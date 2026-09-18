import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { WingmanRouteKey } from "../app/routeCatalog";
import { featureJourneyActions, type FeatureJourneyContext } from "../features/navigation";

export function FeatureJourneyStrip({ routeKey, context = {} }: { routeKey: WingmanRouteKey; context?: FeatureJourneyContext }) {
  const actions = featureJourneyActions(routeKey, context);
  if (!actions.length) return null;

  return <aside className="wm-feature-journey" aria-label="Useful next tools">
    <div className="wm-feature-journey__heading"><Sparkles aria-hidden="true" /><div><strong>Useful next tools</strong><span>Continue without losing the current context.</span></div></div>
    <div className="wm-feature-journey__actions">
      {actions.map((action) => <Link key={`${action.routeKey}-${action.label}`} to={action.to} className="wm-feature-journey__action"><span><strong>{action.label}</strong><small>{action.reason}</small></span><ArrowRight aria-hidden="true" /></Link>)}
    </div>
  </aside>;
}
