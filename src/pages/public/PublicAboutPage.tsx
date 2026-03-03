// src/pages/public/PublicAboutPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!m) return;
    const onChange = () => setReduced(!!m.matches);
    onChange();
    if (m.addEventListener) m.addEventListener("change", onChange);
    else m.addListener(onChange);
    return () => {
      if (m.removeEventListener) m.removeEventListener("change", onChange);
      else m.removeListener(onChange);
    };
  }, []);
  return reduced;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
        fontSize: 12,
        opacity: 0.9,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: "rgba(255,255,255,0.35)",
        }}
      />
      {children}
    </span>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontSize: 12, letterSpacing: "0.12em", opacity: 0.75 }}>{k}</div>
      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6 }}>{v}</div>
    </div>
  );
}

function FlowLine({ animate }: { animate: boolean }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(700px 300px at 20% 0%, rgba(255,255,255,0.07), rgba(255,255,255,0.02) 55%, rgba(0,0,0,0) 100%)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.30)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ fontWeight: 900 }}>How Wingman thinks</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Capture → Validate → Select → Output</div>
      </div>

      <div style={{ padding: 14 }}>
        <svg viewBox="0 0 920 140" width="100%" height="auto" role="img" aria-label="Wingman decision flow">
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.55)" />
            </marker>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id="grid2" width="26" height="26" patternUnits="userSpaceOnUse">
              <path d="M 26 0 L 0 0 0 26" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect x="0" y="0" width="920" height="140" fill="url(#grid2)" opacity="0.85" />

          <path
            d="M 52 70 L 868 70"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="4"
            fill="none"
            markerEnd="url(#arr)"
          />

          <path
            d="M 52 70 L 868 70"
            stroke="rgba(255,255,255,0.60)"
            strokeWidth="4"
            fill="none"
            filter="url(#glow)"
            strokeDasharray="12 14"
            style={animate ? ({ animation: "wmDash2 2.9s linear infinite" } as React.CSSProperties) : undefined}
          />

          {[
            { x: 90, t: "Capture", d: "Room inputs" },
            { x: 330, t: "Validate", d: "Constraints" },
            { x: 570, t: "Select", d: "Families" },
            { x: 810, t: "Output", d: "Tiered BOM" },
          ].map((n) => (
            <g key={n.t}>
              <circle cx={n.x} cy={70} r={18} fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.18)" />
              <text x={n.x} y={40} textAnchor="middle" fill="rgba(255,255,255,0.92)" fontSize="14" fontWeight="800">
                {n.t}
              </text>
              <text x={n.x} y={108} textAnchor="middle" fill="rgba(255,255,255,0.70)" fontSize="12">
                {n.d}
              </text>
            </g>
          ))}

          <style>{`
            @keyframes wmDash2 { 
              0% { stroke-dashoffset: 0; opacity: 0.25; } 
              10% { opacity: 0.85; }
              100% { stroke-dashoffset: -240; opacity: 0.25; } 
            }
          `}</style>
        </svg>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <Pill>Install-aware constraints</Pill>
          <Pill>EoL excluded by default</Pill>
          <Pill>Tiered BOM output</Pill>
        </div>
      </div>
    </div>
  );
}

export default function PublicAboutPage() {
  const nav = useNavigate();
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div
      style={{
        minHeight: "100vh",
        margin: 0,
        color: "var(--wm-fg, #eaf2ff)",
        background:
          "radial-gradient(1200px 620px at 18% 10%, rgba(255,255,255,0.06), rgba(0,0,0,0) 58%), radial-gradient(900px 520px at 80% 20%, rgba(255,255,255,0.04), rgba(0,0,0,0) 52%), linear-gradient(180deg, rgba(10,12,18,1), rgba(6,7,10,1))",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.30,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
          maskImage: "radial-gradient(900px 520px at 30% 16%, rgba(0,0,0,1), rgba(0,0,0,0) 64%)",
          WebkitMaskImage: "radial-gradient(900px 520px at 30% 16%, rgba(0,0,0,1), rgba(0,0,0,0) 64%)",
        }}
      />

      <div style={{ width: "min(1120px, 100%)", margin: "0 auto", padding: "34px 18px 50px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/heroLogo.png" alt="WyreStorm Wingman" style={{ width: 150, height: "auto", opacity: 0.92 }} />
            <div>
              <div style={{ fontWeight: 900, letterSpacing: "0.04em" }}>Wingman</div>
              <div style={{ fontSize: 12, opacity: 0.72 }}>About · Decision system · Tiered outputs</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => nav("/")}
              style={{
                borderRadius: 999,
                padding: "9px 14px",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--wm-fg, #eaf2ff)",
                cursor: "pointer",
              }}
            >
              Back to Home
            </button>
            <button
              type="button"
              onClick={() => nav("/app")}
              style={{
                borderRadius: 999,
                padding: "9px 14px",
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.10)",
                color: "var(--wm-fg, #eaf2ff)",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Open Wingman
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16, alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.14em", opacity: 0.75, marginBottom: 12 }}>
              WYRESTORM CAPABILITY LOGIC · INSTALL-AWARE VALIDATION · QUOTE-READY STRUCTURE
            </div>

            <h1 style={{ fontSize: "clamp(32px, 4.2vw, 58px)", lineHeight: 1.03, margin: "0 0 14px", fontWeight: 760 }}>
              Not a calculator.
              <br />
              A blueprint for correct decisions.
            </h1>

            <p style={{ margin: "0 0 16px", fontSize: "clamp(14px, 1.35vw, 18px)", lineHeight: 1.6, opacity: 0.82 }}>
              Wingman takes real room requirements and produces a proposal-ready starting point. It enforces constraints early,
              avoids end-of-life SKUs by default, and keeps recommendations inside real capability boundaries.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 14 }}>
              <Stat k="Default market" v="UK-first" />
              <Stat k="Output style" v="Tiered BOM" />
              <Stat k="Design bias" v="Install-realistic" />
            </div>
          </div>

          <FlowLine animate={!reducedMotion} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
          <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 16 }}>
            <div style={{ fontWeight: 950, fontSize: 18, marginBottom: 10 }}>What it outputs</div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { t: "Tiered BOM (Bronze / Silver / Gold)", d: "A complete baseline you can quote, not a vague suggestion." },
                { t: "Commercial proposal structure", d: "Cost-controlled → recommended → future-proof narrative." },
                { t: "Flags and assumptions", d: "Distances, bandwidth limits, and topology risks highlighted early." },
              ].map((x) => (
                <div key={x.t} style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.14)" }}>
                  <div style={{ fontWeight: 900 }}>{x.t}</div>
                  <div style={{ fontSize: 12, opacity: 0.74, marginTop: 4, lineHeight: 1.5 }}>{x.d}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 16 }}>
            <div style={{ fontWeight: 950, fontSize: 18, marginBottom: 10 }}>What it blocks / flags early</div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { t: "Invalid topology", d: "Wrong roles, missing endpoints, broken assumptions." },
                { t: "Underspec’d performance", d: "Bandwidth/resolution mismatches flagged before quote." },
                { t: "Shipping problems", d: "EoL avoided unless explicitly enabled." },
              ].map((x) => (
                <div key={x.t} style={{ padding: 12, borderRadius: 14, border: "1px dashed rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.14)" }}>
                  <div style={{ fontWeight: 900 }}>{x.t}</div>
                  <div style={{ fontSize: 12, opacity: 0.74, marginTop: 4, lineHeight: 1.5 }}>{x.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
            padding: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 720 }}>
            <div style={{ fontSize: 20, fontWeight: 950, lineHeight: 1.15 }}>
              Start with Templates. Refine with Room Wizard. Export with Proposal Builder.
            </div>
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6, lineHeight: 1.5 }}>
              Generate a tiered starting BOM quickly, then refine as the project becomes defined.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => nav("/app/templates")}
              style={{
                borderRadius: 999,
                padding: "10px 16px",
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.12)",
                color: "var(--wm-fg, #eaf2ff)",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              View Templates (app)
            </button>

            <button
              type="button"
              onClick={() => nav("/app")}
              style={{
                borderRadius: 999,
                padding: "10px 16px",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                color: "var(--wm-fg, #eaf2ff)",
                cursor: "pointer",
              }}
            >
              Open Wingman
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16, fontSize: 12, opacity: 0.62 }}>
          Wingman is designed for long-lived sales enablement, UK-first defaults, and WyreStorm product logic.
        </div>
      </div>
    </div>
  );
}