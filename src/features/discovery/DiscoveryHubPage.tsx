import * as React from "react";
import DiscoveryModeSelector from "./DiscoveryModeSelector";
import GuidedWalkthroughPage from "./GuidedWalkthroughPage";

export default function DiscoveryHubPage() {
  const [mode, setMode] = React.useState<"form" | "walkthrough">("walkthrough");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <DiscoveryModeSelector value={mode} onChange={setMode} />

      {mode === "walkthrough" ? (
        <GuidedWalkthroughPage />
      ) : (
        <div className="wm-card">
          <div className="wm-card__body" style={{ display: "grid", gap: 10 }}>
            <div className="wm-eyebrow">Quick form</div>
            <h2 style={{ margin: 0 }}>Structured form mode</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>
              Keep your existing structured discovery form here. Both paths should feed the same requirement model and recommendation engine.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}