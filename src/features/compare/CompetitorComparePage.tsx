import * as React from "react";
import CompetitorMatchFinderPanel from "@/components/competitor/CompetitorMatchFinderPanel";
import CompetitorLookupStatusPanel from "@/components/competitor/CompetitorLookupStatusPanel";
import { verifyCompetitorLive } from "@/competitor/CompetitorLiveLookupService";
import { lookupCompetitorLocally, type LocalCompetitorLookupMatch } from "@/competitor/localCompetitorLookup";
import type { CompetitorLookupTrace } from "@/competitor/types";

const DEFAULT_BRAND = "Extron";
const DEFAULT_SKU = "DTP3 IN2004 DI/DO";

export default function CompetitorComparePage() {
  const [brand, setBrand] = React.useState(DEFAULT_BRAND);
  const [sku, setSku] = React.useState(DEFAULT_SKU);
  const [trace, setTrace] = React.useState<CompetitorLookupTrace[]>([]);
  const [running, setRunning] = React.useState(false);
  const [modeLabel, setModeLabel] = React.useState("Ready");
  const [localMatches, setLocalMatches] = React.useState<LocalCompetitorLookupMatch[]>([]);

  const hasLocalMatch = localMatches.length > 0;

  const runLookup = React.useCallback(async (mode: "local" | "web") => {
    const nextBrand = brand.trim();
    const nextSku = sku.trim();
    if (!nextBrand || !nextSku) return;

    if (mode === "local") {
      setRunning(true);
      setModeLabel("Checking local");
      setTrace([
        {
          stage: "dataset",
          message: "Searching local competitor catalogue",
          sourceLabel: "Wingman dataset",
          usedLiveData: false,
          updatedAt: new Date().toISOString(),
        },
      ]);

      try {
        const matches = lookupCompetitorLocally(nextBrand, nextSku);
        setLocalMatches(matches);

        if (matches.length > 0) {
          setTrace([
            {
              stage: "dataset",
              message: `Found ${matches.length} local catalogue match${matches.length === 1 ? "" : "es"}`,
              sourceLabel: "Wingman dataset",
              usedLiveData: false,
              updatedAt: new Date().toISOString(),
              confidence: Math.min(100, matches[0].score),
            },
          ]);
          setModeLabel("Local match found");
        } else {
          setTrace([
            {
              stage: "dataset",
              message: "No local SKU match found. Web search can be used next.",
              sourceLabel: "Wingman dataset",
              usedLiveData: false,
              updatedAt: new Date().toISOString(),
            },
          ]);
          setModeLabel("No local match");
        }
      } finally {
        setRunning(false);
      }

      return;
    }

    setRunning(true);
    setModeLabel("Checking web");
    setTrace([
      {
        stage: "dataset",
        message: "Preparing live competitor verification",
        sourceLabel: "Wingman UI",
        usedLiveData: false,
        updatedAt: new Date().toISOString(),
      },
    ]);

    try {
      const result = await verifyCompetitorLive(nextBrand, nextSku);
      setTrace(result.trace);
      setModeLabel(result.record ? "Live verified" : "Dataset only");
    } catch (error) {
      setTrace([
        {
          stage: "error",
          message: error instanceof Error ? error.message : "Lookup failed",
          sourceLabel: "Wingman UI",
          usedLiveData: false,
          updatedAt: new Date().toISOString(),
        },
      ]);
      setModeLabel("Error");
    } finally {
      setRunning(false);
    }
  }, [brand, sku]);

  React.useEffect(() => {
    setLocalMatches([]);
    setModeLabel("Ready");
    setTrace([]);
  }, [brand, sku]);

  return (
    <div className="wm-page">
      <div className="wm-page-header">
        <div>
          <div className="wm-page-title">Competitor Comparison</div>
          <div className="wm-page-sub">
            Map competitor SKUs to WyreStorm equivalents and show visible verification activity.
          </div>
        </div>
      </div>

      <div
        className="wm-page-body"
        style={{
          display: "grid",
          gap: 18,
          gridTemplateColumns: "minmax(0, 1.45fr) minmax(360px, 0.95fr)",
          alignItems: "start",
        }}
      >
        <div className="wm-card">
          <CompetitorMatchFinderPanel
            brand={brand}
            sku={sku}
            running={running}
            hasLocalMatch={hasLocalMatch}
            localMatches={localMatches}
            onBrandChange={setBrand}
            onSkuChange={setSku}
            onRun={(mode) => void runLookup(mode)}
          />
        </div>

        <CompetitorLookupStatusPanel
          trace={trace}
          modeLabel={modeLabel}
          localMatches={localMatches}
          brand={brand}
          sku={sku}
        />
      </div>
    </div>
  );
}
