import React from "react";
import { useNavigate } from "react-router-dom";

function CtaButton({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={primary ? "wm-btn wm-btn-primary" : "wm-btn"}
      style={{
        height: 44,
        padding: "0 16px",
        fontSize: 14,
        fontWeight: 700,
        borderRadius: 12,
      }}
    >
      {label}
    </button>
  );
}

function StepCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        padding: 18,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(77,183,255,0.32)",
          background: "rgba(77,183,255,0.16)",
          color: "rgba(255,255,255,0.96)",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {number}
      </div>
      <div style={{ marginTop: 12, fontWeight: 900, fontSize: 15 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.55 }}>
        {text}
      </div>
    </div>
  );
}

function AudienceCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      className="wm-hover-lift"
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.04) 100%)",
        boxShadow: "0 14px 32px rgba(0,0,0,0.18)",
        padding: 18,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 15 }}>{title}</div>
      <div style={{ marginTop: 7, fontSize: 13, color: "rgba(255,255,255,0.84)", lineHeight: 1.55 }}>
        {text}
      </div>
    </div>
  );
}

function PreviewChip({ label }: { label: string }) {
  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
        fontSize: 11,
        color: "rgba(255,255,255,0.82)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function PreviewBlock({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: accent ? "1px solid rgba(77,183,255,0.24)" : "1px solid rgba(255,255,255,0.10)",
        background: accent ? "rgba(77,183,255,0.10)" : "rgba(255,255,255,0.035)",
        padding: 14,
      }}
    >
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.68)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {title}
      </div>
      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.94)", lineHeight: 1.35 }}>
        {value}
      </div>
    </div>
  );
}

export default function PublicLandingPage() {
  const nav = useNavigate();

  const pills = [
    "Sales-first workflow",
    "Competitor comparison",
    "Room design guidance",
    "Quote-ready handoff",
  ];

  return (
    <div
      className="wm-page wm-animate-in"
      style={{
        width: "100%",
        maxWidth: 1380,
        margin: "0 auto",
        padding: "30px 22px 40px",
        display: "grid",
        gap: 24,
      }}
    >
      <section
        className="wm-card"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: 28,
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.14)",
          background:
            "radial-gradient(circle at top right, rgba(77,183,255,0.18) 0%, rgba(77,183,255,0.03) 24%, rgba(255,255,255,0.04) 24%, rgba(255,255,255,0.03) 100%)",
          boxShadow: "0 22px 48px rgba(0,0,0,0.24)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -80,
            right: -60,
            width: 260,
            height: 260,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(77,183,255,0.22) 0%, rgba(77,183,255,0.05) 45%, rgba(77,183,255,0) 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 22,
            alignItems: "stretch",
          }}
        >
          <div style={{ minWidth: 0, display: "grid", alignContent: "start" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <img
                src="/heroLogo.png"
                alt="WyreStorm Wingman"
                style={{
                  display: "block",
                  maxHeight: 68,
                  width: "auto",
                  height: "auto",
                  filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.18))",
                }}
              />
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 11px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.045)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.86)",
                }}
              >
                WyreStorm Wingman
              </div>
            </div>

            <h1
              style={{
                margin: "18px 0 0",
                fontSize: 40,
                lineHeight: 1.04,
                letterSpacing: "-0.03em",
                fontWeight: 900,
                maxWidth: 760,
              }}
            >
              Turn AV opportunities into the right WyreStorm path, faster.
            </h1>

            <div
              style={{
                marginTop: 16,
                maxWidth: 760,
                fontSize: 16,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.88)",
              }}
            >
              Wingman helps sales and pre-sales teams move from customer requirement to design direction, product family, and the right next-step workflow without getting lost in engineering detail.
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <CtaButton label="Open Dashboard" primary onClick={() => nav("/app/dashboard")} />
              <CtaButton label="Explore Catalog" onClick={() => nav("/app/tools/catalog")} />
              <CtaButton label="About Wingman" onClick={() => nav("/about")} />
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {pills.map((item) => (
                <span
                  key={item}
                  style={{
                    padding: "7px 11px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.82)",
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div
            className="wm-hover-lift"
            style={{
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.045) 100%)",
              boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
              padding: 18,
              display: "grid",
              gap: 14,
              alignContent: "start",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>See the workflow</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.80)", lineHeight: 1.45 }}>
                  Wingman guides the user into the right tool, instead of forcing them to guess where to start.
                </div>
              </div>
              <button
                type="button"
                className="wm-btn"
                style={{ height: 34, padding: "0 12px" }}
                onClick={() => nav("/app/dashboard")}
              >
                Open App
              </button>
            </div>

            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(5,10,18,0.50)",
                padding: 16,
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <PreviewChip label="Brief-led" />
                <PreviewChip label="Competitor-led" />
                <PreviewChip label="Template-led" />
                <PreviewChip label="Guided assistance" />
              </div>

              <PreviewBlock
                title="Customer need"
                value="Small meeting room, 2 displays, simple switching, quote required this week."
              />

              <PreviewBlock
                title="Recommended next step"
                value="Start with Templates, then move into Proposal Builder for the commercial handoff."
                accent
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <PreviewBlock title="Primary path" value="Templates → Proposal" />
                <PreviewBlock title="Alternative" value="Guru → Room Wizard" />
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="wm-btn wm-btn-primary"
                  style={{ height: 34, padding: "0 12px" }}
                  onClick={() => nav("/app/templates")}
                >
                  Open Templates
                </button>
                <button
                  type="button"
                  className="wm-btn"
                  style={{ height: 34, padding: "0 12px" }}
                  onClick={() => nav("/app/tools/guru")}
                >
                  Open Guru
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="wm-card"
        style={{
          padding: 22,
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.04) 100%)",
          display: "grid",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>How Wingman works</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.5 }}>
            A clearer explanation of what the product actually does.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          <StepCard
            number="1"
            title="Capture the requirement"
            text="Start from the brief, a room type, or a competitor reference to frame the opportunity correctly."
          />
          <StepCard
            number="2"
            title="Choose the right workflow"
            text="Use Templates, Catalog, Room Wizard, or Guru to narrow the design direction quickly."
          />
          <StepCard
            number="3"
            title="Move into delivery"
            text="Hand off into Proposal Builder and the wider app with more confidence and less back-and-forth."
          />
        </div>
      </section>

      <section
        className="wm-card"
        style={{
          padding: 22,
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.035)",
          display: "grid",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Built for real commercial workflows</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.5 }}>
              Wingman is designed to help the whole team move faster with more consistency.
            </div>
          </div>

          <button
            type="button"
            className="wm-btn"
            style={{ height: 36, padding: "0 14px" }}
            onClick={() => nav("/app/dashboard")}
          >
            Launch Wingman
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 14,
          }}
        >
          <AudienceCard
            title="For sales"
            text="Find the right starting point faster, qualify opportunities better, and avoid getting stuck in technical detail too early."
          />
          <AudienceCard
            title="For pre-sales"
            text="Reduce repetitive first-step guidance by steering users into stronger self-service paths and clearer design workflows."
          />
          <AudienceCard
            title="For WyreStorm"
            text="Improve internal consistency, accelerate solution discovery, and make product selection easier to scale."
          />
        </div>
      </section>
    </div>
  );
}