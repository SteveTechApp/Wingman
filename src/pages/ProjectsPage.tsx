import * as React from "react";
import { useNavigate } from "react-router-dom";

import { readTemplateSeed } from "@/app/schema/templateSeed";
import CollapsibleCard from "@/ui2/components/CollapsibleCard";

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px minmax(0,1fr)",
        gap: 10,
        alignItems: "start",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.60)",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.45,
          color: "rgba(255,255,255,0.92)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Tag({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
        fontSize: 12,
        color: "rgba(255,255,255,0.86)",
      }}
    >
      {children}
    </span>
  );
}

export default function ProjectsPage() {
  const nav = useNavigate();

  const seed = React.useMemo(() => readTemplateSeed(), []);
  const hasSeed = !!seed;

  return (
    <div
      className="wm-page wm-animate-in wm-page-projects"
      style={{ width: "100%", maxWidth: "none", margin: 0, minWidth: 0 }}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">WORKSPACE</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>
            Projects
          </h1>
          <div
            style={{
              maxWidth: 760,
              fontSize: 14,
              lineHeight: 1.45,
              color: "rgba(255,255,255,0.86)",
            }}
          >
            Open a working draft, or start a new one from a validated template.
          </div>
        </div>

        {!hasSeed ? (
          <section className="wm-card" style={{ padding: 18, borderRadius: 18 }}>
            <div
              style={{
                fontWeight: 900,
                fontSize: 18,
                color: "rgba(255,255,255,0.96)",
              }}
            >
              No active draft
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 14,
                lineHeight: 1.45,
                color: "rgba(255,255,255,0.82)",
                maxWidth: 760,
              }}
            >
              There is no validated template draft in the current session yet. Start from the Template Workbench to create one.
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                style={{ height: 40, padding: "0 16px" }}
                onClick={() => nav("/app/templates")}
              >
                Open Template Workbench
              </button>

              <button
                type="button"
                className="wm-btn"
                style={{ height: 40, padding: "0 16px" }}
                onClick={() => nav("/app/dashboard")}
              >
                Back to Dashboard
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="wm-card" style={{ padding: 18, borderRadius: 18 }}>
              <div
                style={{
                  display: "grid",
                  gap: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.62)",
                    }}
                  >
                    Current draft
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontWeight: 900,
                      fontSize: 22,
                      lineHeight: 1.25,
                      color: "rgba(255,255,255,0.96)",
                    }}
                  >
                    {seed.projectName}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.04)",
                      padding: 14,
                    }}
                  >
                    <SummaryRow label="Market" value={seed.verticalMarket.name} />
                  </div>

                  <div
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.04)",
                      padding: 14,
                    }}
                  >
                    <SummaryRow label="Room type" value={seed.roomType.name} />
                  </div>

                  <div
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.04)",
                      padding: 14,
                    }}
                  >
                    <SummaryRow label="Tier" value={seed.tier.label} />
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: "rgba(255,255,255,0.84)",
                    maxWidth: 900,
                  }}
                >
                  {seed.tier.summary}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="wm-btn wm-btn-primary"
                    style={{ height: 40, padding: "0 16px" }}
                    onClick={() => nav("/app/templates")}
                  >
                    Change template
                  </button>

                  <button
                    type="button"
                    className="wm-btn"
                    style={{ height: 40, padding: "0 16px" }}
                    onClick={() => {
                      try {
                        sessionStorage.removeItem("wm_template_seed");
                      } catch {}
                      window.location.reload();
                    }}
                  >
                    Clear draft
                  </button>
                </div>
              </div>
            </section>

            <CollapsibleCard
              id="projects_more_detail"
              title="More detail"
              subtitle="Additional design and commercial context for this draft."
              defaultCollapsed
            >
              <div style={{ display: "grid", gap: 14 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.03)",
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.62)",
                      }}
                    >
                      Typical use cases
                    </div>

                    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {seed.roomType.useCases.map((item) => (
                        <Tag key={item}>{item}</Tag>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.03)",
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.62)",
                      }}
                    >
                      Positioning
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.45, color: "rgba(255,255,255,0.88)" }}>
                        {seed.tier.positioning}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.45, color: "rgba(255,255,255,0.88)" }}>
                        {seed.tier.performance}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.45, color: "rgba(255,255,255,0.88)" }}>
                        {seed.tier.commercialNote}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.03)",
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.62)",
                      }}
                    >
                      Included system behaviors
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      {seed.includedSystems.map((item) => (
                        <div
                          key={item}
                          style={{
                            fontSize: 13,
                            lineHeight: 1.45,
                            color: "rgba(255,255,255,0.88)",
                          }}
                        >
                          • {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.03)",
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.62)",
                      }}
                    >
                      Tier uplift
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      {seed.uplift.map((item) => (
                        <div
                          key={item}
                          style={{
                            fontSize: 13,
                            lineHeight: 1.45,
                            color: "rgba(255,255,255,0.88)",
                          }}
                        >
                          • {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleCard>
          </>
        )}
      </div>
    </div>
  );
}