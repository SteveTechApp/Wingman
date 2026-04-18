import * as React from "react";
import { useWingmanUxPipeline } from "./useWingmanUxPipeline";
import type { WingmanShellInput } from "./types";
import "./wingman-ux.css";

type WingmanUxShellProps = {
  projectState: WingmanShellInput | null;
};

export function WingmanUxShell({ projectState }: WingmanUxShellProps) {
  const data = useWingmanUxPipeline(projectState);

  if (!data) {
    return (
      <div className="wm-shell">
        <div className="wm-main">
          <div className="wm-card">
            <h2>Loading Wingmanâ€¦</h2>
            <p>Preparing recommendation, topology, signal path, and proposal draft.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wm-shell">
      <div className="wm-main">
        <section className="wm-card">
          <div className="wm-kicker">Recommendation</div>
          <h2>{data.recommendation.primaryFamily ?? "No primary family returned"}</h2>
          <p>{data.recommendation.whyThisAnswer?.join(" ") ?? "No recommendation reasoning returned."}</p>
        </section>

        <section className="wm-card">
          <div className="wm-kicker">Topology</div>
          <h3>{data.topology.architecture ?? "No architecture returned"}</h3>
          <p>{data.topology.bandwidthEstimate ?? "No bandwidth estimate returned."}</p>
        </section>

        <section className="wm-card">
          <div className="wm-kicker">Suggested BOM</div>
          {data.room?.suggestedBom?.length ? (
            <div className="wm-bom">
              {data.room.suggestedBom.map((item, i) => (
                <div className="wm-bom__row" key={`${item.name}-${i}`}>
                  <span className="wm-bom__name">{item.name}</span>
                  <span className="wm-bom__qty">x {item.qty}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No BOM returned yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
