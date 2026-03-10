import * as React from "react";
import { useNavigate } from "react-router-dom";

type FeatureCardProps = {
  title: string;
  desc: string;
  tag: string;
};

function FeatureCard({ title, desc, tag }: FeatureCardProps) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))",
        borderRadius: 16,
        padding: "18px 18px 16px",
        minHeight: 138,
        boxShadow: "0 14px 40px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#8ae7ff",
          background: "rgba(31,164,255,0.12)",
          border: "1px solid rgba(96,210,255,0.18)",
          marginBottom: 12,
        }}
      >
        {tag}
      </div>

      <div
        style={{
          color: "#f4f8ff",
          fontSize: 20,
          lineHeight: 1.15,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "rgba(226,236,255,0.78)",
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        {desc}
      </div>
    </div>
  );
}

export default function PublicLandingPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(circle at 50% 0%, rgba(33,87,162,0.28), transparent 34%), linear-gradient(180deg, #021326 0%, #03111f 34%, #020c17 100%)",
        color: "#eef4ff",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.22,
          backgroundImage:
            "linear-gradient(rgba(78,132,201,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(78,132,201,0.11) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.75), rgba(0,0,0,0.15))",
          WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.75), rgba(0,0,0,0.15))",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1180,
          margin: "0 auto",
          padding: "52px 24px 72px",
        }}
      >
        <section
          style={{
            maxWidth: 920,
            margin: "0 auto 30px",
            borderRadius: 28,
            padding: "34px 32px 28px",
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(10,24,49,0.90), rgba(7,18,36,0.88))",
            boxShadow: "0 28px 80px rgba(0,0,0,0.28)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              margin: "0 auto 14px",
              width: "fit-content",
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "#91e9ff",
              background: "rgba(44,170,255,0.11)",
              border: "1px solid rgba(114,220,255,0.18)",
            }}
          >
            WyreStorm Sales Assistant
          </div>

          <div
            style={{
              fontSize: "clamp(48px, 7vw, 92px)",
              lineHeight: 0.9,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              marginBottom: 2,
              background: "linear-gradient(90deg, #51f0ff 0%, #72d6ff 35%, #8b89ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            WyreStorm
          </div>

          <div
            style={{
              fontSize: "clamp(30px, 4vw, 54px)",
              lineHeight: 1,
              fontWeight: 850,
              letterSpacing: "-0.04em",
              marginBottom: 14,
              color: "#ffffff",
            }}
          >
            Wingman
          </div>

          <h1
            style={{
              margin: "0 0 12px",
              fontSize: "clamp(28px, 4vw, 54px)",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              fontWeight: 800,
              color: "#f5f8ff",
            }}
          >
            AV sales. Simplified.
          </h1>

          <p
            style={{
              maxWidth: 760,
              margin: "0 auto 22px",
              fontSize: "clamp(15px, 1.6vw, 18px)",
              lineHeight: 1.65,
              color: "rgba(226,236,255,0.82)",
            }}
          >
            Design systems, select the right WyreStorm products, compare solutions,
            and generate proposal-ready outputs with greater speed and consistency.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <button
              onClick={() => navigate("/app")}
              style={{
                minWidth: 220,
                height: 50,
                padding: "0 22px",
                borderRadius: 12,
                border: "1px solid rgba(122,231,255,0.22)",
                background: "linear-gradient(90deg, #37dfff 0%, #5cbcff 45%, #7d8cff 100%)",
                color: "#031425",
                fontSize: 16,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 14px 36px rgba(64,162,255,0.28)",
              }}
            >
              Enter Workspace
            </button>

            <button
              onClick={() => navigate("/app/tools")}
              style={{
                minWidth: 180,
                height: 50,
                padding: "0 22px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "#f4f8ff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                backdropFilter: "blur(8px)",
              }}
            >
              Explore Tools
            </button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {["Apollo", "NetworkHD", "HDBaseT", "Video Wall", "USB", "Control"].map((item) => (
              <span
                key={item}
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  fontSize: 13,
                  color: "rgba(230,239,255,0.86)",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <section
          style={{
            maxWidth: 1120,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "end",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  color: "#8fe6ff",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                What Wingman helps you do
              </div>
              <div
                style={{
                  color: "#f4f8ff",
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                Core workflow tools for AV sales and design
              </div>
            </div>

            <div
              style={{
                color: "rgba(226,236,255,0.72)",
                fontSize: 14,
                maxWidth: 420,
                lineHeight: 1.55,
              }}
            >
              Built to guide less technical sales users while still supporting
              structured design, BOM thinking, and proposal consistency.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <FeatureCard
              tag="Discovery"
              title="Capture Requirements"
              desc="Structure customer needs, room conditions, distances, source/display counts, and key AV constraints before product selection begins."
            />
            <FeatureCard
              tag="Design"
              title="Build System Logic"
              desc="Guide users towards suitable WyreStorm architectures for HDBaseT, AVoIP, video wall, USB extension, and control-led applications."
            />
            <FeatureCard
              tag="Proposal"
              title="Generate Outputs"
              desc="Support proposal-ready thinking with clearer solution framing, BOM structure, and consistent project documentation."
            />
            <FeatureCard
              tag="Compare"
              title="Position WyreStorm"
              desc="Help sales teams compare product approaches, understand feature fit, and present stronger recommendations with confidence."
            />
          </div>
        </section>
      </div>
    </div>
  );
}