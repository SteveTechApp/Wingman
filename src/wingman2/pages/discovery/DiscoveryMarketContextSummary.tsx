import { getDiscoveryEnvironment, getDiscoveryMarket } from "./discoveryMarketContext";

type Props = {
  marketId: string;
  environmentId: string;
  environmentDetail: string;
  onEdit: () => void;
};

export function DiscoveryMarketContextSummary({ marketId, environmentId, environmentDetail, onEdit }: Props) {
  const market = getDiscoveryMarket(marketId);
  const environment = getDiscoveryEnvironment(marketId, environmentId);
  const environmentLabel = environmentId === "other" ? environmentDetail || "Another environment" : environment?.label ?? "Another environment";

  return <div className="wm-discovery-context-summary">
    <div>
      <span><strong>{market?.label ?? marketId}</strong> · {environmentLabel}</span>
      {environmentId !== "other" && <p>{environment?.cue}</p>}
    </div>
    <button type="button" onClick={onEdit}>Change market or environment</button>
  </div>;
}
