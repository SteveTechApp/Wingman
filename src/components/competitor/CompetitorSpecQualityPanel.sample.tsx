import * as React from "react";
import CompetitorSpecQualityPanel from "./CompetitorSpecQualityPanel";
import { competitorDatasetGenerated } from "@/competitor/dataset.generated";

export default function CompetitorSpecQualityPanelSample() {
  const item = competitorDatasetGenerated[0];
  return (
    <div style={{ padding: 24 }}>
      <CompetitorSpecQualityPanel item={item} />
    </div>
  );
}