import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

const APP_TYPES = [
  "Meeting Room",
  "Boardroom",
  "Classroom",
  "Training Space",
  "Auditorium",
  "Reception / Signage",
  "Retail",
  "Hospitality",
];

const PRODUCT_FAMILIES = [
  "Apollo",
  "HDBaseT",
  "AVoIP",
  "Matrix",
  "USB Extension",
  "Video Wall",
];

export default function DiscoveryPage() {
  const [customer, setCustomer] = React.useState("");
  const [site, setSite] = React.useState("");
  const [roomName, setRoomName] = React.useState("");
  const [applicationType, setApplicationType] = React.useState("Meeting Room");
  const [displayCount, setDisplayCount] = React.useState("1");
  const [sourceCount, setSourceCount] = React.useState("1");
  const [distance, setDistance] = React.useState("");
  const [budget, setBudget] = React.useState("Mid");
  const [notes, setNotes] = React.useState("");
  const [families, setFamilies] = React.useState<string[]>(["Apollo"]);

  function toggleFamily(family: string) {
    setFamilies((current) =>
      current.includes(family)
        ? current.filter((item) => item !== family)
        : [...current, family]
    );
  }

  return (
    <PageFrame
      title="Discovery"
      subtitle="Capture customer, room, and system requirements before recommending architecture or products."
      actions={
        <div className="wm-toolbar">
          <button className="wm-btn-secondary" type="button">Save Draft</button>
          <button className="wm-btn-primary" type="button">Continue to Design</button>
        </div>
      }
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Discovery Summary</span>
            <h3>Capture the important details first</h3>
            <p>
              Keep the conversation focused on customer outcome, room constraints, source and display count,
              cable distance, control expectations, and budget band.
            </p>
          </div>

          <div className="wm-heroCard">
            <span className="wm-kicker">Recommended Next Step</span>
            <h3>Build a complete discovery record</h3>
            <p>
              Once the essentials are captured, Wingman can guide product family selection and room design.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Project Basics"
        subtitle="Record the customer, site, room, and application type."
      >
        <div className="wm-grid-2">
          <div className="wm-field">
            <label>Customer</label>
            <input className="wm-input" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" />
          </div>

          <div className="wm-field">
            <label>Site</label>
            <input className="wm-input" value={site} onChange={(e) => setSite(e.target.value)} placeholder="Site or building" />
          </div>

          <div className="wm-field">
            <label>Room Name</label>
            <input className="wm-input" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Room or area" />
          </div>

          <div className="wm-field">
            <label>Application Type</label>
            <select className="wm-select" value={applicationType} onChange={(e) => setApplicationType(e.target.value)}>
              {APP_TYPES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="System Scope"
        subtitle="Capture the scale of the opportunity and likely transport approach."
      >
        <div className="wm-grid-3">
          <div className="wm-field">
            <label>Display Count</label>
            <input className="wm-input" value={displayCount} onChange={(e) => setDisplayCount(e.target.value)} placeholder="Number of displays" />
          </div>

          <div className="wm-field">
            <label>Source Count</label>
            <input className="wm-input" value={sourceCount} onChange={(e) => setSourceCount(e.target.value)} placeholder="Number of sources" />
          </div>

          <div className="wm-field">
            <label>Longest Cable Distance (m)</label>
            <input className="wm-input" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="e.g. 20" />
          </div>
        </div>

        <div style={{ marginTop: 16 }} className="wm-field">
          <label>Suggested Product Families</label>
          <div className="wm-chipRow">
            {PRODUCT_FAMILIES.map((family) => {
              const active = families.includes(family);
              return (
                <button
                  key={family}
                  type="button"
                  className={"wm-chip" + (active ? " is-active" : "")}
                  onClick={() => toggleFamily(family)}
                >
                  {family}
                </button>
              );
            })}
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Commercial Notes"
        subtitle="Capture budget and any extra details before progressing."
      >
        <div className="wm-grid-2">
          <div className="wm-field">
            <label>Budget Band</label>
            <select className="wm-select" value={budget} onChange={(e) => setBudget(e.target.value)}>
              <option value="Entry">Entry</option>
              <option value="Mid">Mid</option>
              <option value="Premium">Premium</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>

          <div className="wm-callout">
            <h4>Wingman guidance</h4>
            <p>
              Keep discovery commercial as well as technical. Budget and urgency often narrow the architecture
              faster than technical detail alone.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 16 }} className="wm-field">
          <label>Notes</label>
          <textarea
            className="wm-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Capture requirements, concerns, site notes, or commercial comments"
          />
        </div>
      </PageSection>

      <PageSection
        title="Discovery Snapshot"
        subtitle="Simple summary for quick review before moving on."
      >
        <div className="wm-summaryList">
          <div className="wm-summaryRow"><span>Customer</span><span>{customer || "Not captured"}</span></div>
          <div className="wm-summaryRow"><span>Site</span><span>{site || "Not captured"}</span></div>
          <div className="wm-summaryRow"><span>Room</span><span>{roomName || "Not captured"}</span></div>
          <div className="wm-summaryRow"><span>Application</span><span>{applicationType}</span></div>
          <div className="wm-summaryRow"><span>Displays</span><span>{displayCount || "0"}</span></div>
          <div className="wm-summaryRow"><span>Sources</span><span>{sourceCount || "0"}</span></div>
          <div className="wm-summaryRow"><span>Distance</span><span>{distance ? distance + " m" : "Not captured"}</span></div>
          <div className="wm-summaryRow"><span>Budget</span><span>{budget}</span></div>
          <div className="wm-summaryRow"><span>Families</span><span>{families.length ? families.join(", ") : "None selected"}</span></div>
        </div>
      </PageSection>
    </PageFrame>
  );
}