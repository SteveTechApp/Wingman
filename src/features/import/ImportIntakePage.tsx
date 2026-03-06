import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  PageHeader,
  pageWrapStyle,
  stackStyle,
  cardStyle,
  sectionTitleStyle,
  sectionTextStyle,
  inputStyle,
  textareaStyle,
  Field,
} from "@/ui2/page/PageChrome";

export default function ImportIntakePage() {
  const nav = useNavigate();
  const [projectName, setProjectName] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [site, setSite] = React.useState("");
  const [notes, setNotes] = React.useState("");

  return (
    <div className="wm-page wm-animate-in" style={pageWrapStyle()}>
      <div style={stackStyle(14)}>
        <PageHeader
          eyebrow="TOOL"
          title="Import Intake"
          description="Capture a basic opportunity record or prepare imported survey information before moving into discovery and design."
          actions={
            <>
              <button className="wm-btn" type="button" onClick={() => nav("/app/tools")}>
                Tool Hub
              </button>
              <button className="wm-btn wm-btn-primary" type="button" onClick={() => nav("/app/tools/discovery")}>
                Open Discovery
              </button>
            </>
          }
        />

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Opportunity intake</div>
          <div style={sectionTextStyle()}>
            Use this page as a clean starting point for a new requirement set.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            }}
          >
            <Field label="Project name">
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} style={inputStyle()} />
            </Field>

            <Field label="Customer">
              <input value={customer} onChange={(e) => setCustomer(e.target.value)} style={inputStyle()} />
            </Field>

            <Field label="Site">
              <input value={site} onChange={(e) => setSite(e.target.value)} style={inputStyle()} />
            </Field>

            <div />

            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={textareaStyle(5)} />
              </Field>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="wm-btn wm-btn-primary" type="button" onClick={() => nav("/app/tools/discovery")}>
              Continue to Discovery
            </button>
            <button className="wm-btn" type="button" onClick={() => nav("/app/projects")}>
              Open Projects
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}