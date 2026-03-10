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
    <label className="wm-form-field">
      <span className="wm-form-label">{label}</span>
      <input
        className="wm-form-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
    <label className="wm-form-field wm-form-field--full">
      <span className="wm-form-label">{label}</span>
      <textarea
        className="wm-form-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
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
    <div className="wm-page">
      <section className="wm-hero">
        <div className="wm-page-hero-row">
          <div>
            <div className="wm-kicker">Tool</div>
            <div className="wm-title-xl">Room Wizard</div>
            <div className="wm-body wm-room-wizard-page__intro">
              Capture the core room requirements first, then save them back into the active project.
            </div>
          </div>
        </div>
      </section>

      {!ctx ? (
        <section className="wm-section">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>No active project</h2>
              <p>Create or select a project first.</p>
            </div>
          </div>

          <div className="wm-actions-row">
            <button
              type="button"
              className="wm-btn wm-btn-primary"
              onClick={() => nav("/app/projects")}
            >
              Open Projects
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="wm-section">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Active project</h2>
                <p>{ctx.projectName}</p>
              </div>
            </div>
            <div className="wm-body-sm">
              {ctx.verticalMarket.name} / {ctx.roomType.name} / {ctx.tier.label}
            </div>
          </section>

          <section className="wm-section">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Room requirements</h2>
                <p>Capture the main design constraints before moving into detailed solution work.</p>
              </div>
            </div>

            <div className="wm-form-grid">
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
              <Area
                label="Engineering notes"
                value={notes}
                onChange={setNotes}
                placeholder="Add room constraints, signal priorities, cable considerations, user expectations, etc."
              />
            </div>

            <div className="wm-actions-row">
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                onClick={saveRoomRequirements}
              >
                Save room requirements
              </button>

              {saved ? <span className="wm-save-pill">Saved to active project</span> : null}
            </div>
          </section>

          <CollapsibleCard
            id="room_wizard_next_steps"
            title="Next step"
            subtitle="Move into proposal building after the room requirements are saved."
            defaultCollapsed
          >
            <div className="wm-actions-row">
              <button
                type="button"
                className="wm-btn"
                onClick={() => nav("/app/tools/proposal")}
              >
                Open Proposal Builder
              </button>
            </div>
          </CollapsibleCard>
        </>
      )}
    </div>
  );
}
