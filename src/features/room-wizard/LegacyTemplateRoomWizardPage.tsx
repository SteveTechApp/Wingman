import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

const MARKETS = ["Corporate", "Education", "Hospitality", "Retail"];
const ROOM_TYPES = ["Huddle Space", "Meeting Room", "Boardroom", "Training Room", "Classroom", "Auditorium"];
const TIERS = ["Bronze", "Silver", "Gold"];
const FLOW_ACTIVE_RGB = "96,194,132";

export default function RoomWizardPage() {
  const [market, setMarket] = React.useState("Corporate");
  const [roomType, setRoomType] = React.useState("Meeting Room");
  const [tier, setTier] = React.useState("Silver");
  const [activeStep, setActiveStep] = React.useState<1 | 2 | 3>(1);
  const step1Ref = React.useRef<HTMLDivElement | null>(null);
  const step2Ref = React.useRef<HTMLDivElement | null>(null);
  const step3Ref = React.useRef<HTMLDivElement | null>(null);

  const templateSummary = `${market} / ${roomType} / ${tier}`;

  function workflowWrapStyle(step: 1 | 2 | 3): React.CSSProperties {
    const isActive = activeStep === step;
    return {
      borderRadius: 20,
      border: isActive
        ? `1px solid rgba(${FLOW_ACTIVE_RGB},0.32)`
        : "1px solid rgba(255,255,255,0.08)",
      background: isActive
        ? `linear-gradient(180deg, rgba(${FLOW_ACTIVE_RGB},0.10), rgba(${FLOW_ACTIVE_RGB},0.03))`
        : "linear-gradient(180deg, rgba(9,16,28,0.94), rgba(6,11,20,0.92))",
      boxShadow: isActive
        ? `0 0 0 1px rgba(${FLOW_ACTIVE_RGB},0.12), 0 16px 38px rgba(${FLOW_ACTIVE_RGB},0.08)`
        : "0 18px 48px rgba(0,0,0,0.22)",
      opacity: isActive ? 1 : 0.66,
      transition: "border-color 180ms ease, background 180ms ease, box-shadow 180ms ease, opacity 180ms ease",
    };
  }

  React.useEffect(() => {
    if (activeStep === 1 || typeof window === "undefined") return;

    const target = activeStep === 2 ? step2Ref.current : step3Ref.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const topPadding = 92;
    const bottomPadding = 20;
    const fullyVisible = rect.top >= topPadding && rect.bottom <= window.innerHeight - bottomPadding;
    if (fullyVisible) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeStep]);

  return (
    <PageFrame
      title="Room Wizard"
      subtitle="Start from a structured room and market template before refining the design."
      actions={
        <div className="wm-toolbar">
          <button className="wm-btn-secondary" type="button">View Templates</button>
          <button className="wm-btn-primary" type="button">Apply Template</button>
        </div>
      }
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Template-Led Design</span>
            <h3>Reduce design time</h3>
            <p>
              Use room and market templates as a guided starting point so less technical users can move
              toward a valid architecture faster.
            </p>
          </div>

          <div className="wm-heroCard">
            <span className="wm-kicker">Current Selection</span>
            <h3>{templateSummary}</h3>
            <p>
              Template selection should narrow the likely product family and recommended system approach.
            </p>
          </div>
        </div>
      </PageSection>

      <div ref={step1Ref} style={workflowWrapStyle(1)} onClick={() => setActiveStep(1)}>
        <PageSection
          title={`Step 1 �f�?s· Choose the Starting Point${activeStep === 1 ? " �f�?s· Current position" : ""}`}
          subtitle="Select market, room type, and solution tier."
        >
          <div className="wm-grid-3">
            <div className="wm-field">
              <label>Market</label>
              <select
                className="wm-select"
                value={market}
                onChange={(e) => {
                  setMarket(e.target.value);
                  setActiveStep(2);
                }}
              >
                {MARKETS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="wm-field">
              <label>Room Type</label>
              <select
                className="wm-select"
                value={roomType}
                onChange={(e) => {
                  setRoomType(e.target.value);
                  setActiveStep(2);
                }}
              >
                {ROOM_TYPES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="wm-field">
              <label>Tier</label>
              <select
                className="wm-select"
                value={tier}
                onChange={(e) => {
                  setTier(e.target.value);
                  setActiveStep(2);
                }}
              >
                {TIERS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>
        </PageSection>
      </div>

      <div ref={step2Ref} style={workflowWrapStyle(2)} onClick={() => setActiveStep(2)}>
        <PageSection
          title={`Step 2 �f�?s· Recommended Design Direction${activeStep === 2 ? " �f�?s· Current position" : ""}`}
          subtitle="Use the template choice to simplify the next design decision."
        >
          <div className="wm-grid-2">
            <div className="wm-callout">
              <h4>Suggested pathway</h4>
              <p>
                For {templateSummary}, start with the simplest valid architecture first, then scale only where
                room size, source count, transport distance, or control needs require it.
              </p>
              <button
                className="wm-btn"
                type="button"
                onClick={() => setActiveStep(3)}
                style={{ marginTop: 10 }}
              >
                Continue to snapshot
              </button>
            </div>

            <div className="wm-callout">
              <h4>Wingman guidance</h4>
              <p>
                Show the best-fit template first, then alternatives below it. This is more useful than making
                the user browse a long catalogue of equal choices.
              </p>
            </div>
          </div>
        </PageSection>
      </div>

      <div ref={step3Ref} style={workflowWrapStyle(3)} onClick={() => setActiveStep(3)}>
        <PageSection
          title={`Step 3 �f�?s· Template Snapshot${activeStep === 3 ? " �f�?s· Current position" : ""}`}
          subtitle="Summary of the current room wizard selection."
        >
          <div className="wm-summaryList">
            <div className="wm-summaryRow"><span>Market</span><span>{market}</span></div>
            <div className="wm-summaryRow"><span>Room Type</span><span>{roomType}</span></div>
            <div className="wm-summaryRow"><span>Tier</span><span>{tier}</span></div>
            <div className="wm-summaryRow"><span>Template</span><span>{templateSummary}</span></div>
          </div>
        </PageSection>
      </div>
    </PageFrame>
  );
}
