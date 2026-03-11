import * as React from "react";

type Props = {
  value: "form" | "walkthrough";
  onChange: (value: "form" | "walkthrough") => void;
};

export default function DiscoveryModeSelector({ value, onChange }: Props) {
  return (
    <div className="wm-card">
      <div className="wm-card__body">
        <div style={{ display: "grid", gap: 8 }}>
          <div className="wm-eyebrow">Discovery mode</div>
          <h2 style={{ margin: 0 }}>How would you like to capture requirements?</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>
            Guided Walkthrough feels more like a conversation. Quick Form is better when requirements are already known.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
              marginTop: 8
            }}
          >
            <button
              type="button"
              onClick={() => onChange("walkthrough")}
              className="wm-btn"
              style={{
                padding: 16,
                textAlign: "left",
                border: value === "walkthrough" ? "2px solid var(--wm-accent, #26b3a8)" : undefined
              }}
            >
              <div style={{ fontWeight: 700 }}>Guided Walkthrough</div>
              <div style={{ opacity: 0.8, marginTop: 6 }}>
                Start with room type, then ask conversational, use-based questions.
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChange("form")}
              className="wm-btn"
              style={{
                padding: 16,
                textAlign: "left",
                border: value === "form" ? "2px solid var(--wm-accent, #26b3a8)" : undefined
              }}
            >
              <div style={{ fontWeight: 700 }}>Quick Form</div>
              <div style={{ opacity: 0.8, marginTop: 6 }}>
                Enter known requirements directly in a structured format.
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}