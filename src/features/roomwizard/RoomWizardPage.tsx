import * as React from "react";
import { useNavigate } from "react-router-dom";
import CollapsibleCard from "@/ui2/components/CollapsibleCard";
import {
  getActiveProjectContext,
  updateActiveProjectBrief,
  updateProjectStatus,
} from "@/features/projects/projectDraftStore";

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.62)",
        }}
      >
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          height: 42,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.94)",
          padding: "0 12px",
          outline: "none",
        }}
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.62)",
        }}
      >
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        style={{
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.94)",
          padding: 12,
          outline: "none",
          resize: "vertical",
        }}
      />
    </label>
  );
}


export default function RoomWizardPage() {
  const nav = useNavigate();
  const ctx = React.useMemo(() => getActiveProjectContext(), []);
  const [saved, setSaved] = React.useState(false);

  const [displayCount, setDisplayCount] = React.useState("");
  const [transport, setTransport] = React.useState("");
  const [usbNeeds, setUsbNeeds] = React.useState("");
  const [controlLevel, setControlLevel] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!ctx) return;
    setDisplayCount(ctx.brief.roomRequirements.displayCount);
    setTransport(ctx.brief.roomRequirements.transport);
    setUsbNeeds(ctx.brief.roomRequirements.usbNeeds);
    setControlLevel(ctx.brief.roomRequirements.controlLevel);
    setNotes(ctx.brief.roomRequirements.notes);
  }, [ctx]);

  function saveRoomRequirements() {
    if (!ctx) return;

    updateActiveProjectBrief({
      roomRequirements: {
        displayCount,
        transport,
        usbNeeds,
        controlLevel,
        notes,
      },
    });

    updateProjectStatus(ctx.projectId, "In Progress");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div
      className="wm-page wm-animate-in wm-room wm-ui"
      style={{ width: "100%", maxWidth: "none", margin: 0, minWidth: 0 }}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">TOOL</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>
            Room Wizard
          </h1>
          <div
            style={{
              maxWidth: 760,
              fontSize: 14,
              color: "rgba(255,255,255,0.86)",
              lineHeight: 1.45,
            }}
          >
            Capture the core room requirements first, then save them back into the active project.
          </div>
        </div>

        {!ctx ? (
          <section className="wm-card wm-ui__card" style={{ padding: 18, borderRadius: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>No active project</div>
            <div
              style={{
                marginTop: 8,
                fontSize: 14,
                color: "rgba(255,255,255,0.82)",
                lineHeight: 1.45,
              }}
            >
              Create or select a project first.
            </div>
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                className="wm-btn wm-btn-primary wm-ui__btn"
                style={{ height: 40, padding: "0 16px" }}
                onClick={() => nav("/app/projects")}
              >
                Open Projects
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="wm-card wm-ui__card" style={{ padding: 18, borderRadius: 18 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.62)",
                }}
              >
                Active project
              </div>
              <div style={{ marginTop: 8, fontWeight: 900, fontSize: 22 }}>
                {ctx.projectName}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.84)",
                  lineHeight: 1.45,
                }}
              >
                {ctx.verticalMarket.name} / {ctx.roomType.name} / {ctx.tier.label}
              </div>
            </section>

            <section className="wm-card wm-ui__card" style={{ padding: 18, borderRadius: 18 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Room requirements</div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.80)",
                  lineHeight: 1.45,
                }}
              >
                Capture the main design constraints before moving into detailed solution work.
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 14,
                }}
              >
                <Field
                  label="Display count"
                  value={displayCount}
                  onChange={setDisplayCount}
                  placeholder="e.g. 1 main display + 1 confidence"
                />
                <Field
                  label="Transport family"
                  value={transport}
                  onChange={setTransport}
                  placeholder="e.g. HDBaseT, AVoIP, matrix, direct HDMI"
                />
                <Field
                  label="USB needs"
                  value={usbNeeds}
                  onChange={setUsbNeeds}
                  placeholder="e.g. BYOD camera/audio, host switching"
                />
                <Field
                  label="Control level"
                  value={controlLevel}
                  onChange={setControlLevel}
                  placeholder="e.g. front-panel, API, touch panel"
                />
              </div>

              <div style={{ marginTop: 14 }}>
                <Area
                  label="Engineering notes"
                  value={notes}
                  onChange={setNotes}
                  placeholder="Add room constraints, signal priorities, cable considerations, user expectations, etc."
                />
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  className="wm-btn wm-btn-primary wm-ui__btn"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={saveRoomRequirements}
                >
                  Save room requirements
                </button>

                {saved ? (
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(134,239,172,0.95)",
                      fontWeight: 700,
                    }}
                  >
                    Saved to active project
                  </span>
                ) : null}
              </div>
            </section>

            <CollapsibleCard
              id="room_wizard_next_steps"
              title="Next step"
              subtitle="Move into proposal building after the room requirements are saved."
              defaultCollapsed
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="wm-btn wm-ui__btn"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={() => nav("/app/tools/proposal")}
                >
                  Open Proposal Builder
                </button>
              </div>
            </CollapsibleCard>
          </>
        )}
      </div>
    </div>
  );
}