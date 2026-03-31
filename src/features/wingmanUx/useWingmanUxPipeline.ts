import * as React from "react";
import { runWingmanUxPipeline } from "./orchestrator";
import type { WingmanShellInput } from "./types";

export function useWingmanUxPipeline(projectState: WingmanShellInput) {
  const [data, setData] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function run() {
      setError(null);

      try {
        const result = await runWingmanUxPipeline(projectState);
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Pipeline failed");
        }
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [
    projectState.projectName,
    projectState.customer,
    projectState.roomType,
    projectState.application,
    projectState.sourceCount,
    projectState.displayCount,
    projectState.distanceM,
    projectState.resolution,
    projectState.notes,
    projectState.avGuide?.usb,
    projectState.avGuide?.audio,
    projectState.avGuide?.control,
    projectState.videoWall?.wallType,
  ]);

  if (error) {
    return {
      recommendation: {
        primaryFamily: "Error",
        confidenceScore: 0,
        candidateFamilies: [],
        whyThisAnswer: [error],
        whatsMissing: [],
      },
      topology: {
        transport: "Unknown",
        encoders: 0,
        decoders: 0,
        bandwidthEstimate: "Unknown",
        switchRecommendation: "Unknown",
        architecture: "Pipeline error",
        wyrestormProducts: [],
      },
      signalPath: { links: [] },
      room: { suggestedBom: [], nextTool: "" },
      proposal: { title: "Pipeline error", sections: [] },
    };
  }

  return data;
}