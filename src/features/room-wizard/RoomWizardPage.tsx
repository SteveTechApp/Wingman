import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

const MARKETS = ["Corporate", "Education", "Hospitality", "Retail"];
const ROOM_TYPES = ["Huddle Space", "Meeting Room", "Boardroom", "Training Room", "Classroom", "Auditorium"];
const TIERS = ["Bronze", "Silver", "Gold"];

export default function RoomWizardPage() {
  const [market, setMarket] = React.useState("Corporate");
  const [roomType, setRoomType] = React.useState("Meeting Room");
  const [tier, setTier] = React.useState("Silver");

  const templateSummary = `${market} / ${roomType} / ${tier}`;

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

      <PageSection
        title="Choose the Starting Point"
        subtitle="Select market, room type, and solution tier."
      >
        <div className="wm-grid-3">
          <div className="wm-field">
            <label>Market</label>
            <select className="wm-select" value={market} onChange={(e) => setMarket(e.target.value)}>
              {MARKETS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="wm-field">
            <label>Room Type</label>
            <select className="wm-select" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
              {ROOM_TYPES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="wm-field">
            <label>Tier</label>
            <select className="wm-select" value={tier} onChange={(e) => setTier(e.target.value)}>
              {TIERS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Recommended Design Direction"
        subtitle="Use the template choice to simplify the next design decision."
      >
        <div className="wm-grid-2">
          <div className="wm-callout">
            <h4>Suggested pathway</h4>
            <p>
              For {templateSummary}, start with the simplest valid architecture first, then scale only where
              room size, source count, transport distance, or control needs require it.
            </p>
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

      <PageSection
        title="Template Snapshot"
        subtitle="Summary of the current room wizard selection."
      >
        <div className="wm-summaryList">
          <div className="wm-summaryRow"><span>Market</span><span>{market}</span></div>
          <div className="wm-summaryRow"><span>Room Type</span><span>{roomType}</span></div>
          <div className="wm-summaryRow"><span>Tier</span><span>{tier}</span></div>
          <div className="wm-summaryRow"><span>Template</span><span>{templateSummary}</span></div>
        </div>
      </PageSection>
    </PageFrame>
  );
}