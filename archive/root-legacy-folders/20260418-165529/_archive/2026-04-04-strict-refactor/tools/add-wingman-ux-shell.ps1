$Root = Get-Location
$Out = Join-Path $Root "src/features/wingmanUx"

New-Item -ItemType Directory -Force -Path $Out | Out-Null

# ---------- types.ts ----------
@"
export type WingmanShellInput = {
  projectName?: string;
  customer?: string;
  roomType?: string;
  application?: string;
  sourceCount?: number;
  displayCount?: number;
  distanceM?: number;
  resolution?: string;
  notes?: string;
  avGuide?: {
    usb?: string;
    audio?: string;
    control?: string;
  };
  videoWall?: {
    wallType?: string;
  };
};
"@ | Set-Content "$Out/types.ts"

# ---------- orchestrator.ts ----------
@"
import { buildAvRecommendationFromProjectState } from "@/engine";
import { buildTopology } from "@/topologyEngine";
import { buildSignalPath } from "@/signalPathEngine";
import { designRoom } from "@/roomDesignerService";
import { generateProposal } from "@/proposalService";

export async function runWingmanUxPipeline(state: any) {
  const recommendation = buildAvRecommendationFromProjectState(state);

  const topology = buildTopology({
    sources: state.sourceCount,
    displays: state.displayCount,
    resolution: state.resolution,
  });

  const signalPath = buildSignalPath({
    sources: state.sourceCount,
    displays: state.displayCount,
    transport: topology.transport,
  });

  const room = await designRoom({
    projectName: state.projectName,
    discovery: recommendation.context,
  });

  const proposal = await generateProposal({
    customer: state.customer,
    roomName: state.roomType,
    summary: recommendation?.summaries?.proposal,
  });

  return { recommendation, topology, signalPath, room, proposal };
}
"@ | Set-Content "$Out/orchestrator.ts"

# ---------- hook ----------
@"
import * as React from "react";
import { runWingmanUxPipeline } from "./orchestrator";

export function useWingmanUxPipeline(projectState: any) {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    if (!projectState) return;
    runWingmanUxPipeline(projectState).then(setData);
  }, [projectState]);

  return data;
}
"@ | Set-Content "$Out/useWingmanUxPipeline.ts"

# ---------- UI ----------
@"
import * as React from "react";
import { useWingmanUxPipeline } from "./useWingmanUxPipeline";
import "./wingman-ux.css";

export function WingmanUxShell({ projectState }: any) {
  const data = useWingmanUxPipeline(projectState);

  if (!data) return <div>Loading Wingman…</div>;

  return (
    <div className="wm-shell">
      <div className="wm-main">
        <h2>{data.recommendation.primaryFamily}</h2>
        <p>{data.recommendation.whyThisAnswer?.join(" ")}</p>

        <h3>{data.topology.architecture}</h3>
        <p>{data.topology.bandwidthEstimate}</p>

        <h4>BOM</h4>
        {data.room?.suggestedBom?.map((item: any, i: number) => (
          <div key={i}>{item.name} x {item.qty}</div>
        ))}
      </div>
    </div>
  );
}
"@ | Set-Content "$Out/WingmanUxShell.tsx"

# ---------- CSS ----------
@"
.wm-shell {
  background: #07111f;
  color: white;
  padding: 20px;
  font-family: sans-serif;
}
"@ | Set-Content "$Out/wingman-ux.css"

Write-Host "✅ Wingman UX shell created at $Out"