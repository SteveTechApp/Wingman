import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";
import {
  loadProjectState,
  updateProjectState,
} from "@/core/workflow/projectState";

export default function VideoWallDesignerPage() {
  const [state, setState] = React.useState(() => loadProjectState());

  function update<K extends string>(key: K, value: string) {
    const next = updateProjectState({
      stage: "Design",
      videoWall: {
        ...(state.videoWall ?? {}),
        [key]: value,
      },
    });
    setState(next);
  }

  function addBomItems() {
    const wallType = state.videoWall?.wallType || "LCD";
    const layout = state.videoWall?.layout || "2x2";

    const next = updateProjectState({
      stage: "Design",
      bom: [
        ...(state.bom ?? []),
        {
          sku: "WALL-DESIGN",
          desc: wallType + " wall concept " + layout,
          qty: 1,
          role: "Design placeholder",
        },
      ],
    });

    setState(next);
  }

  return (
    <PageFrame
      title="VideoWall Designer"
      subtitle="Plan LCD and LED wall concepts, array layouts, processor thinking, and supporting signal flow."
      actions={
        <button type="button" className="wm-btn-primary" onClick={addBomItems}>
          Add Design Placeholder
        </button>
      }
    >
      <div className="wm-dashboard">
        <PageSection
          title="Wall Design Inputs"
          subtitle="Capture the core design assumptions and carry them into the project state."
          compact
        >
          <div className="wm-formGrid">
            <div className="wm-field">
              <label>Wall Type</label>
              <select
                className="wm-select"
                value={state.videoWall?.wallType ?? "LCD"}
                onChange={(e) => update("wallType", e.target.value)}
              >
                <option value="LCD">LCD</option>
                <option value="LED">LED</option>
              </select>
            </div>

            <div className="wm-field">
              <label>Layout</label>
              <select
                className="wm-select"
                value={state.videoWall?.layout ?? "2x2"}
                onChange={(e) => update("layout", e.target.value)}
              >
                <option value="2x2">2x2</option>
                <option value="3x3">3x3</option>
                <option value="4x4">4x4</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div className="wm-field">
              <label>Processor / Controller</label>
              <input
                className="wm-input"
                value={state.videoWall?.processor ?? ""}
                onChange={(e) => update("processor", e.target.value)}
                placeholder="Novastar / processor requirement"
              />
            </div>

            <div className="wm-field">
              <label>Sources</label>
              <input
                className="wm-input"
                value={state.videoWall?.sources ?? ""}
                onChange={(e) => update("sources", e.target.value)}
                placeholder="Source count or source types"
              />
            </div>

            <div className="wm-field wm-field--full">
              <label>Wall Notes</label>
              <textarea
                className="wm-textarea"
                value={state.videoWall?.notes ?? ""}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Viewing distance, mounting, pixel pitch, bezel considerations, scaling notes..."
              />
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Current Saved Design State"
          subtitle="This is the information currently carried into the active project."
          compact
        >
          <div className="wm-summaryCard">
            <p><strong>Project:</strong> {state.name}</p>
            <p><strong>Stage:</strong> {state.stage}</p>
            <p><strong>Wall Type:</strong> {state.videoWall?.wallType ?? "-"}</p>
            <p><strong>Layout:</strong> {state.videoWall?.layout ?? "-"}</p>
            <p><strong>Processor:</strong> {state.videoWall?.processor || "-"}</p>
            <p><strong>Sources:</strong> {state.videoWall?.sources || "-"}</p>
            <p><strong>BOM Items:</strong> {state.bom?.length ?? 0}</p>
          </div>
        </PageSection>
      </div>
    </PageFrame>
  );
}