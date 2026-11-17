import { getDiscoveryEnvironment, getDiscoveryMarket } from "./discoveryMarketContext";

type Props = {
  marketId: string;
  environmentId: string;
  environmentDetail: string;
  application?: string;
  onEdit: () => void;
};

export function DiscoveryMarketContextSummary({ marketId, environmentId, environmentDetail, application = "", onEdit }: Props) {
  const market = getDiscoveryMarket(marketId);
  const environment = getDiscoveryEnvironment(marketId, environmentId);
  const environmentLabel = environmentId === "other" ? environmentDetail || "Another environment" : environment?.label ?? "Another environment";
  const hasEnvironment = Boolean(market && environmentId);

  return <div className="wm-discovery-context-summary">
    <div>
      {hasEnvironment ? (
        <>
          <span><strong>{market?.label ?? marketId}</strong> · {environmentLabel}</span>
          {environmentId !== "other" && <p>{environment?.cue}</p>}
        </>
      ) : (
        <>
          <span><strong>Room type</strong> · {application}</span>
          <p>Questions and suggested details are adjusted for this room type.</p>
        </>
      )}
    </div>
    <button type="button" onClick={onEdit}>{hasEnvironment ? "Change market or environment" : "Change room type"}</button>
  </div>;
}
