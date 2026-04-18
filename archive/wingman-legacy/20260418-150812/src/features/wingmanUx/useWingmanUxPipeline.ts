import * as React from "react";
import { runWingmanUxPipeline } from "./orchestrator";
import type { WingmanShellInput, WingmanUxPipelineResult } from "./types";

export function useWingmanUxPipeline(projectState: WingmanShellInput | null) {
  const [data, setData] = React.useState<WingmanUxPipelineResult | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!projectState) {
        setData(null);
        return;
      }

      try {
        const result = await runWingmanUxPipeline(projectState);
        if (!cancelled) {
          setData(result);
        }
      } catch {
        if (!cancelled) {
          setData(null);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [projectState]);

  return data;
}