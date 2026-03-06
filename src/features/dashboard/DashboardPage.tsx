import * as React from "react";
import { wingmanActions } from "@/state/useWingman";
import { useWingman } from "@/state";
import { useNavigate } from "react-router-dom";

type Stage = "Discovery" | "Design" | "Specify" | "Quote";

type MissionProject = {
  id: string;
  name: string;
  customer: string;
  site: string;
  status: "Draft" | "In progress" | "Submitted" | "Won" | "Lost";
  updatedAtIso: string;
  displays: number | null;
  sources: number | null;
  rooms: number | null;
  longestRunM: number | null;
  stage: Stage;
  stageDone: Record<Stage, boolean>;
};

function safeJson<T>(s: string | null): T | null {
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtIsoShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â";
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

/**
 * Mission Control dashboard
 * - deliberately does NOT depend on contexts (prevents runtime provider errors)
 * - reads minimal project hints from localStorage if present
 */
export default function DashboardPage() {
  const nav = useNavigate();

  // Optional storage: you can populate these later from your new Wingman State Layer.
  // For now it never crashes if missing.
    const wm = useWingman();

  const project = React.useMemo(() => {
    // If no active project, still render a stable "empty" view.
    const p = wm.projectData;
    return {
      id: p?.projectId || "",
      name: p?.projectName || "No active project",
      customer: p?.clientName || "Ã¢â‚¬â€",
      site: p?.siteName || "Ã¢â‚¬â€",
      status: p?.status || "Draft",
      updatedAtIso: p?.lastSaved || new Date().toISOString(),
      displays: (p?.displays ?? 0) === 0 ? null : p?.displays ?? null,
      sources: (p?.sources ?? 0) === 0 ? null : p?.sources ?? null,
      rooms: (p?.rooms ?? 0) === 0 ? null : p?.rooms ?? null,
      longestRunM: (p?.longestRunM ?? 0) === 0 ? null : p?.longestRunM ?? null,
      stage: p?.stage || "Discovery",
      stageDone: p?.stageDone || { Discovery:false, Design:false, Specify:false, Quote:false },
    };
  }, [wm.projectData]);const progressCount = React.useMemo(() => {
    const done = Object.values(project.stageDone).filter(Boolean).length;
    return clamp(done, 0, 4);
  }, [project.stageDone]);

  const nextStage: Stage = React.useMemo(() => {
    const order: Stage[] = ["Discovery", "Design", "Specify", "Quote"];
    const idx = order.findIndex((s) => !project.stageDone[s]);
    return idx === -1 ? "Quote" : order[idx];
  }, [project.stageDone]);

  const routeForStage = React.useCallback((s: Stage) => {
    // Keep compatible with your current routes:
    // AppRoutes exposes /app/tools only, so we navigate there and let ToolHub route internally later.
    // You can upgrade this mapping once you wire proper /app/tools/* routes.
    const map: Record<Stage, { label: string; to: string }> = {
      Discovery: { label: "Open Tool Hub", to: "/app/tools" },
      Design: { label: "Open Tool Hub", to: "/app/tools" },
      Specify: { label: "Open Tool Hub", to: "/app/tools" },
      Quote: { label: "Export snapshot", to: "/app/export" },
    };
    return map[s];
  }, []);

  const StageRow = (p: { title: Stage; desc: string }) => {
    const done = project.stageDone[p.title];
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: done ? "rgba(52,211,153,0.95)" : "rgba(255,255,255,0.22)",
            boxShadow: done ? "0 0 0 3px rgba(52,211,153,0.12)" : "none",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
            {p.title}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>{p.desc}</div>
        </div>
        <div style={{ fontSize: 12, color: done ? "rgba(52,211,153,0.95)" : "rgba(255,255,255,0.55)" }}>
          {done ? "Complete" : "Not started"}
        </div>
      </div>
    );
  };

  const Chip = (p: { k: string; v: string }) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        color: "rgba(255,255,255,0.78)",
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.55)" }}>{p.k}</span>
      <strong style={{ color: "rgba(255,255,255,0.90)", fontWeight: 700 }}>{p.v}</strong>
    </span>
  );

  const Card = (p: { title: string; right?: React.ReactNode; children: React.ReactNode }) => (
    <section
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.20)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.92)" }}>{p.title}</div>
        {p.right}
      </div>
      <div style={{ padding: 12 }}>{p.children}</div>
    </section>
  );

  const PrimaryBtn = (p: { label: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={p.onClick}
      style={{
        padding: "9px 12px",
        borderRadius: 12,
        border: "1px solid rgba(16,185,129,0.35)",
        background: "rgba(16,185,129,0.18)",
        color: "rgba(255,255,255,0.92)",
        fontWeight: 800,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {p.label}
    </button>
  );

  const GhostBtn = (p: { label: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={p.onClick}
      style={{
        padding: "9px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
        color: "rgba(255,255,255,0.85)",
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {p.label}
    </button>
  );

  const MetricRow = (p: { label: string; value: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <div style={{ flex: 1, color: "rgba(255,255,255,0.62)", fontSize: 12 }}>{p.label}</div>
      <div style={{ color: "rgba(255,255,255,0.88)", fontSize: 12, fontWeight: 700 }}>{p.value}</div>
    </div>
  );

  const density = {
    gap: 12, // tighter spacing for higher information density
  };

  return (
    <div style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -0.4, color: "rgba(255,255,255,0.95)" }}>
            Mission Control
          </div>
          <div style={{ marginTop: 4, color: "rgba(255,255,255,0.60)", fontSize: 13 }}>
            Start ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Design ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Specify ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Quote. Keep the opportunity moving.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <GhostBtn label="Projects" onClick={() => { wingmanActions.startNewProject(); nav("/app/projects"); }} />
          <GhostBtn label="Tool Hub" onClick={() => nav("/app/tools")} />
          <GhostBtn label="Export snapshot" onClick={() => nav("/app/export")} />
          <PrimaryBtn label="Start New Project" onClick={() => { wingmanActions.startNewProject(); nav("/app/projects"); }} />
        </div>
      </div>

      {/* Status strip */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <Chip k="Project" v={project.name} />
        <Chip k="Status" v={project.status} />
        <Chip k="Customer" v={project.customer} />
        <Chip k="Site" v={project.site} />
        <Chip k="Stage" v={nextStage} />
        <Chip k="Updated" v={fmtIsoShort(project.updatedAtIso)} />
        <Chip k="Displays" v={project.displays === null ? "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" : String(project.displays)} />
        <Chip k="Sources" v={project.sources === null ? "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" : String(project.sources)} />
        <Chip k="Rooms" v={project.rooms === null ? "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" : String(project.rooms)} />
        <Chip k="Longest run" v={project.longestRunM === null ? "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" : `${project.longestRunM}m`} />
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.55fr 1fr",
          gap: density.gap,
        }}
      >
        {/* Left column */}
        <div style={{ display: "grid", gap: density.gap }}>
          <Card
            title="Active project"
            right={
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: "rgba(245,158,11,0.12)",
                  border: "1px solid rgba(245,158,11,0.20)",
                  color: "rgba(255,255,255,0.88)",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Progress {progressCount}/4
              </span>
            }
          >
            <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 12 }}>
              {/* Project metrics (tight) */}
              <div>
                <MetricRow label="Displays" value={project.displays ?? "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â"} />
                <MetricRow label="Sources" value={project.sources ?? "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â"} />
                <MetricRow label="Rooms" value={project.rooms ?? "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â"} />
                <MetricRow label="Longest run" value={project.longestRunM === null ? "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" : `${project.longestRunM}m`} />

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <GhostBtn label="Open Discovery" onClick={() => nav("/app/tools")} />
                  <GhostBtn label="Open Design" onClick={() => nav("/app/tools")} />
                  <GhostBtn label="Open Catalog" onClick={() => nav("/app/tools")} />
                  <PrimaryBtn
                    label={`Next: ${nextStage === "Discovery" ? "Capture discovery" : nextStage === "Design" ? "Map signal path" : nextStage === "Specify" ? "Select products" : "Export snapshot"}`}
                    onClick={() => nav(routeForStage(nextStage).to)}
                  />
                </div>
              </div>

              {/* Workflow engine */}
              <div style={{ display: "grid", gap: 10 }}>
                <StageRow title="Discovery" desc="Application, rooms, distances, constraints" />
                <StageRow title="Design" desc="Signal path, I/O, USB/audio/control needs" />
                <StageRow title="Specify" desc="BOM selection + alternates" />
                <StageRow title="Quote" desc="Proposal/export snapshot ready" />
              </div>
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: density.gap }}>
            <Card title="Opportunity summary">
              <MetricRow label="Application" value="ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" />
              <MetricRow label="Room type" value="ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" />
              <MetricRow label="Budget band" value="ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" />
              <MetricRow label="Urgency" value="ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" />
              <MetricRow label="Network" value="ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" />
              <MetricRow label="Control" value="ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" />

              <div style={{ marginTop: 10 }}>
                <PrimaryBtn label="Update in Tool Hub" onClick={() => nav("/app/tools")} />
              </div>
            </Card>

            <Card title="System snapshot">
              <MetricRow label="Video transport" value="ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" />
              <MetricRow label="USB requirement" value="ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" />
              <MetricRow label="Audio" value="ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" />
              <MetricRow label="Control" value="ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" />
              <MetricRow label="Switching" value="ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â" />

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <GhostBtn label="Open configurator" onClick={() => nav("/app/tools")} />
                <PrimaryBtn label="Export snapshot" onClick={() => nav("/app/export")} />
              </div>
            </Card>
          </div>

          <Card title="Quick launch (common AV tasks)">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              <GhostBtn label="Discovery Wizard" onClick={() => nav("/app/tools")} />
              <GhostBtn label="Room Wizard" onClick={() => nav("/app/tools")} />
              <GhostBtn label="Product Catalog" onClick={() => nav("/app/tools")} />
              <GhostBtn label="Proposal Builder" onClick={() => nav("/app/tools")} />
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: "grid", gap: density.gap }}>
          <Card
            title="Recent projects"
            right={<span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>None yet</span>}
          >
            <div style={{ color: "rgba(255,255,255,0.60)", fontSize: 12 }}>No projects yet.</div>

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <GhostBtn label="Open Projects" onClick={() => { wingmanActions.startNewProject(); nav("/app/projects"); }} />
              <PrimaryBtn label="Start New Project" onClick={() => { wingmanActions.startNewProject(); nav("/app/projects"); }} />
            </div>
          </Card>

          <Card title="Today">
            <div style={{ display: "grid", gap: 10 }}>
              <GhostBtn label="Capture discovery" onClick={() => nav("/app/tools")} />
              <GhostBtn label="Map signal path" onClick={() => nav("/app/tools")} />
              <GhostBtn label="Select products" onClick={() => nav("/app/tools")} />
              <GhostBtn label="Export snapshot" onClick={() => nav("/app/export")} />
            </div>
          </Card>

          <Card title="Suggested next moves">
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(16,185,129,0.22)",
                background: "rgba(16,185,129,0.10)",
              }}
            >
              <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: 700 }}>Recommended</div>
              <div style={{ marginTop: 2, color: "rgba(255,255,255,0.92)", fontSize: 18, fontWeight: 900 }}>
                {nextStage === "Discovery"
                  ? "Capture discovery"
                  : nextStage === "Design"
                    ? "Map signal path"
                    : nextStage === "Specify"
                      ? "Select products"
                      : "Export snapshot"}
              </div>

              <div style={{ marginTop: 10 }}>
                <PrimaryBtn label="Go now" onClick={() => nav(routeForStage(nextStage).to)} />
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <GhostBtn label="Tool Hub" onClick={() => nav("/app/tools")} />
              <GhostBtn label="Projects" onClick={() => { wingmanActions.startNewProject(); nav("/app/projects"); }} />
              <GhostBtn label="Export" onClick={() => nav("/app/export")} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}