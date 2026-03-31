import * as React from "react";
import { buildTopology } from "@/services/topologyEngine";
import { calculateNetworkCapacity } from "@/services/networkCapacityEngine";

type Props = {
  sources: number;
  displays: number;
  resolution?: string;
};

export default function SystemArchitecturePreview(props: Props) {
  const topology = buildTopology(props);

  const capacity = calculateNetworkCapacity({
    sources: props.sources,
    displays: props.displays,
    resolution: props.resolution,
  });

  return (
    <div className="wm-architecture-preview">
      <aside className="wm-arch-info">
        <div className="wm-arch-kicker">System Architecture</div>
        <h3 className="wm-arch-title">Preview</h3>

        <div className="wm-arch-stat"><strong>Transport:</strong> {topology.transport}</div>
        <div className="wm-arch-stat"><strong>Encoders:</strong> {topology.encoders}</div>
        <div className="wm-arch-stat"><strong>Decoders:</strong> {topology.decoders}</div>
        <div className="wm-arch-stat"><strong>Switch:</strong> {topology.switchRecommendation}</div>
        <div className="wm-arch-stat"><strong>Bandwidth:</strong> {topology.bandwidthEstimate}</div>

        <div className="wm-arch-products">
          <strong>Recommended WyreStorm</strong>
          <div>{topology.wyrestormProducts.join(", ")}</div>
        </div>

        <div className="wm-arch-products">
          <strong>Capacity</strong>
          <div>Total Traffic: {capacity.totalStreamMbps} Mbps</div>
          <div>Per Stream: {capacity.perStreamMbps} Mbps</div>
          <div>Uplink: {capacity.uplinkRecommendation}</div>
        </div>
      </aside>

      <section className="wm-arch-canvas-inner">
        <div className="wm-arch-grid"></div>

        <div className="wm-node wm-node-source" style={{ top: 100, left: 48 }}>
          Sources ({props.sources})
        </div>

        <div className="wm-node wm-node-core" style={{ top: 240, left: "42%" }}>
          Network Switch
        </div>

        <div className="wm-node wm-node-display" style={{ top: 100, right: 48 }}>
          Displays ({props.displays})
        </div>

        <svg className="wm-arch-lines" viewBox="0 0 1200 700" preserveAspectRatio="none" aria-hidden="true">
          <path d="M170 135 L420 135 L420 275 L520 275" />
          <path d="M670 275 L780 275 L780 135 L1030 135" />
        </svg>
      </section>
    </div>
  );
}