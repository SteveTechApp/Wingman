import * as React from "react";
import { Link } from "react-router-dom";
import RecentTextInput from "@/components/RecentTextInput";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";
import LiveProjectStrip from "@/app/widgets/LiveProjectStrip";
import {
  RECENT_TEXT_HISTORY_KEYS,
  RECENT_TEXT_HISTORY_SCOPES,
} from "@/features/inputs/recentTextEntries";
import { getAvGuideSeed, saveAvGuideSeed } from "./avGuideSeed";
import { buildAvGuideIntelligence } from "./avGuideIntelligence";

export default function DiscoveryPage() {
  const [state, setState] = React.useState(() => getAvGuideSeed());

  const intelligence = React.useMemo(() => buildAvGuideIntelligence(state), [state]);

  function updateField(name: string, value: string) {
    const current = {
      customer: state.customer ?? "",
      roomType: state.roomType ?? "",
      application: state.application ?? "",
      displayCount: state.displayCount ?? 0,
      sourceCount: state.sourceCount ?? 0,
      distanceM: state.distanceM ?? 0,
      budgetBand: state.budgetBand ?? "",
      control: state.avGuide?.control ?? "",
      usb: state.avGuide?.usb ?? "",
      audio: state.avGuide?.audio ?? "",
      notes: state.notes ?? "",
    } as Record<string, string | number>;

    current[name] = value;

    const next = saveAvGuideSeed({
      customer: String(current.customer ?? ""),
      roomType: String(current.roomType ?? ""),
      application: String(current.application ?? ""),
      displayCount: Number(current.displayCount || 0),
      sourceCount: Number(current.sourceCount || 0),
      distanceM: Number(current.distanceM || 0),
      budgetBand: String(current.budgetBand ?? ""),
      control: String(current.control ?? ""),
      usb: String(current.usb ?? ""),
      audio: String(current.audio ?? ""),
      notes: String(current.notes ?? ""),
    });

    setState(next);
  }

  return (
    <PageFrame
      title="AV Guide"
      subtitle="Capture room, customer, and system requirements before recommending architecture or products."
      actions={
        <Link to={intelligence.recommendedNextToolPath}>
          <button className="wm-btn-primary">Open {intelligence.recommendedNextTool}</button>
        </Link>
      }
    >
      <div className="wm-dashboard">
        <LiveProjectStrip />

        <PageSection
          title="AV Guide Intelligence"
          subtitle="Guided recommendations based on the current captured inputs."
          compact
        >
          <div className="wm-aiGrid">
            <div className="wm-aiCard">
              <div className="wm-aiCard__label">Completeness</div>
              <div className="wm-aiCard__value">{intelligence.completenessScore}%</div>
              <div className="wm-aiCard__meta">
                {intelligence.missingItems.length === 0
                  ? "Core fields are complete."
                  : "Still missing: " + intelligence.missingItems.join(", ")}
              </div>
            </div>

            <div className="wm-aiCard wm-aiCard--wide">
              <div className="wm-aiCard__label">Recommended Next Tool</div>
              <div className="wm-aiCard__value">{intelligence.recommendedNextTool}</div>
              <div className="wm-aiCard__meta">{intelligence.summary}</div>
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Likely WyreStorm Families"
          subtitle="These are suggested starting families, not final product selections."
          compact
        >
          <div className="wm-listCard">
            {intelligence.recommendations.map((item, idx) => (
              <div key={item.title} className="wm-listCard__row">
                <span className="wm-listCard__index">{idx + 1}</span>
                <span>
                  <strong>{item.title}</strong>
                  <br />
                  {item.reason}
                </span>
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection
          title="AV Guide Inputs"
          subtitle="These inputs are saved directly into the active project state."
          compact
        >
          <div className="wm-formGrid">
            <div className="wm-field">
              <label>Customer</label>
              <RecentTextInput
                className="wm-input"
                historyKey={RECENT_TEXT_HISTORY_KEYS.customer}
                historyScope={RECENT_TEXT_HISTORY_SCOPES.discoveryPage}
                value={state.customer ?? ""}
                onChange={(e) => updateField("customer", e.target.value)}
              />
            </div>

            <div className="wm-field">
              <label>Room Type</label>
              <RecentTextInput
                className="wm-input"
                historyKey={RECENT_TEXT_HISTORY_KEYS.roomType}
                historyScope={RECENT_TEXT_HISTORY_SCOPES.discoveryPage}
                value={state.roomType ?? ""}
                onChange={(e) => updateField("roomType", e.target.value)}
              />
            </div>

            <div className="wm-field">
              <label>Application</label>
              <RecentTextInput
                className="wm-input"
                historyKey={RECENT_TEXT_HISTORY_KEYS.application}
                historyScope={RECENT_TEXT_HISTORY_SCOPES.discoveryPage}
                value={state.application ?? ""}
                onChange={(e) => updateField("application", e.target.value)}
              />
            </div>

            <div className="wm-field">
              <label>Display Count</label>
              <input
                className="wm-input"
                type="number"
                value={state.displayCount ?? 0}
                onChange={(e) => updateField("displayCount", e.target.value)}
              />
            </div>

            <div className="wm-field">
              <label>Source Count</label>
              <input
                className="wm-input"
                type="number"
                value={state.sourceCount ?? 0}
                onChange={(e) => updateField("sourceCount", e.target.value)}
              />
            </div>

            <div className="wm-field">
              <label>Distance (m)</label>
              <input
                className="wm-input"
                type="number"
                value={state.distanceM ?? 0}
                onChange={(e) => updateField("distanceM", e.target.value)}
              />
            </div>

            <div className="wm-field">
              <label>Budget Band</label>
              <input
                className="wm-input"
                value={state.budgetBand ?? ""}
                onChange={(e) => updateField("budgetBand", e.target.value)}
              />
            </div>

            <div className="wm-field">
              <label>Control</label>
              <input
                className="wm-input"
                value={state.avGuide?.control ?? ""}
                onChange={(e) => updateField("control", e.target.value)}
              />
            </div>

            <div className="wm-field">
              <label>USB</label>
              <input
                className="wm-input"
                value={state.avGuide?.usb ?? ""}
                onChange={(e) => updateField("usb", e.target.value)}
              />
            </div>

            <div className="wm-field">
              <label>Audio</label>
              <input
                className="wm-input"
                value={state.avGuide?.audio ?? ""}
                onChange={(e) => updateField("audio", e.target.value)}
              />
            </div>

            <div className="wm-field wm-field--full">
              <label>Notes</label>
              <textarea
                className="wm-textarea"
                value={state.notes ?? ""}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
          </div>
        </PageSection>
      </div>
    </PageFrame>
  );
}
