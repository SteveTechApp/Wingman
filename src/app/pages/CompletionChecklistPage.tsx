import * as React from "react";
import { useNavigate } from "react-router-dom";

type TemplateSeed = {
  source?: string;
  verticalMarket?: { id?: string; name?: string; summary?: string };
  roomType?: { id?: string; name?: string; summary?: string; useCases?: string[] };
  tier?: {
    id?: string;
    label?: string;
    summary?: string;
    positioning?: string;
    performance?: string;
    commercialNote?: string;
  };
  includedSystems?: string[];
  uplift?: string[];
  projectName?: string;
  createdAt?: string;
};

type ManualChecks = {
  projectDetails: boolean;
  roomRequirements: boolean;
  solutionSelected: boolean;
  proposalNotes: boolean;
  bomReady: boolean;
  risksLogged: boolean;
};

const STORAGE_KEY = "wm_completion_checklist_v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function CheckRow({
  label,
  help,
  checked,
  onToggle,
}: {
  label: string;
  help: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="wm-hover-lift"
      style={{
        width: "100%",
        textAlign: "left",
        display: "grid",
        gridTemplateColumns: "28px 1fr",
        gap: 12,
        alignItems: "start",
        padding: 14,
        borderRadius: 14,
        border: checked
          ? "1px solid rgba(94,234,212,0.28)"
          : "1px solid rgba(255,255,255,0.10)",
        background: checked
          ? "linear-gradient(180deg, rgba(94,234,212,0.12) 0%, rgba(94,234,212,0.05) 100%)"
          : "rgba(255,255,255,0.03)",
        color: "rgba(255,255,255,0.96)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          marginTop: 1,
          display: "grid",
          placeItems: "center",
          border: checked
            ? "1px solid rgba(94,234,212,0.45)"
            : "1px solid rgba(255,255,255,0.18)",
          background: checked ? "rgba(94,234,212,0.18)" : "rgba(255,255,255,0.02)",
          fontSize: 12,
          fontWeight: 900,
        }}
      >
        {checked ? "✓" : ""}
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{label}</div>
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            lineHeight: 1.45,
            color: "rgba(255,255,255,0.80)",
          }}
        >
          {help}
        </div>
      </div>
    </button>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
      <div style={{ fontWeight: 900, fontSize: 17 }}>{title}</div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  );
}

export default function CompletionChecklistPage() {
  const nav = useNavigate();

  const templateSeed = React.useMemo(
    () => readJson<TemplateSeed>("wm_template_seed", {}),
    [],
  );

  const [checks, setChecks] = React.useState<ManualChecks>(() =>
    readJson<ManualChecks>(STORAGE_KEY, {
      projectDetails: false,
      roomRequirements: false,
      solutionSelected: false,
      proposalNotes: false,
      bomReady: false,
      risksLogged: false,
    }),
  );

  React.useEffect(() => {
    writeJson(STORAGE_KEY, checks);
  }, [checks]);

  const autoSignals = React.useMemo(() => {
    const hasProjectName = !!templateSeed.projectName?.trim();
    const hasVertical = !!templateSeed.verticalMarket?.name?.trim();
    const hasRoom = !!templateSeed.roomType?.name?.trim();
    const hasTier = !!templateSeed.tier?.label?.trim();
    const hasSystems = !!templateSeed.includedSystems?.length;
    const hasCommercial = !!templateSeed.tier?.commercialNote?.trim();

    return {
      hasProjectName,
      hasVertical,
      hasRoom,
      hasTier,
      hasSystems,
      hasCommercial,
    };
  }, [templateSeed]);

  const effective = {
    projectDetails: checks.projectDetails || autoSignals.hasProjectName,
    roomRequirements: checks.roomRequirements || (autoSignals.hasVertical && autoSignals.hasRoom),
    solutionSelected: checks.solutionSelected || (autoSignals.hasTier && autoSignals.hasSystems),
    proposalNotes: checks.proposalNotes || autoSignals.hasCommercial,
    bomReady: checks.bomReady,
    risksLogged: checks.risksLogged,
  };

  const checklist = [
    {
      key: "projectDetails" as const,
      label: "Project details confirmed",
      help: "Project name and base context are defined before hand-off.",
      checked: effective.projectDetails,
    },
    {
      key: "roomRequirements" as const,
      label: "Application and room requirements captured",
      help: "The customer vertical and typical room type have been selected.",
      checked: effective.roomRequirements,
    },
    {
      key: "solutionSelected" as const,
      label: "Solution direction selected",
      help: "A capability tier and system direction have been chosen.",
      checked: effective.solutionSelected,
    },
    {
      key: "proposalNotes" as const,
      label: "Proposal positioning notes ready",
      help: "Commercial or customer-facing proposal notes are prepared.",
      checked: effective.proposalNotes,
    },
    {
      key: "bomReady" as const,
      label: "BOM / export readiness checked",
      help: "You have reviewed the product set and are satisfied it is ready for quote/export.",
      checked: effective.bomReady,
    },
    {
      key: "risksLogged" as const,
      label: "Risks, assumptions, and exclusions noted",
      help: "Any caveats, dependencies, or open points have been captured.",
      checked: effective.risksLogged,
    },
  ];

  const completedCount = checklist.filter((x) => x.checked).length;
  const totalCount = checklist.length;
  const percent = Math.round((completedCount / totalCount) * 100);
  const isReady = completedCount === totalCount;

  function toggleCheck(key: keyof ManualChecks) {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function markReady() {
    writeJson("wm_completion_result", {
      status: "ready",
      completedAt: new Date().toISOString(),
      completionPercent: percent,
      checklist: effective,
      templateSeed,
    });
    nav("/app/projects");
  }

  const projectTitle =
    templateSeed.projectName ||
    [
      templateSeed.verticalMarket?.name,
      templateSeed.roomType?.name,
      templateSeed.tier?.label,
    ]
      .filter(Boolean)
      .join(" / ") ||
    "Current Draft Project";

  return (
    <div
      className="wm-page wm-animate-in"
      style={{ width: "100%", maxWidth: "none", margin: 0, minWidth: 0 }}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">WORKFLOW VALIDATION</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>
            Completion Checklist
          </h1>
          <div
            style={{
              maxWidth: 980,
              fontSize: 14,
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.5,
            }}
          >
            Use this page as the final review gate before proposal issue, export, or internal hand-off.
            Any item not yet complete should send you back to the relevant tool page.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
            gap: 14,
            alignItems: "start",
          }}
        >
          <InfoCard title="Readiness status">
            <div
              style={{
                borderRadius: 16,
                border: isReady
                  ? "1px solid rgba(94,234,212,0.28)"
                  : "1px solid rgba(255,255,255,0.10)",
                background: isReady
                  ? "linear-gradient(180deg, rgba(94,234,212,0.12) 0%, rgba(94,234,212,0.05) 100%)"
                  : "rgba(255,255,255,0.03)",
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.68)",
                }}
              >
                Current project
              </div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900 }}>
                {projectTitle}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${percent}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: isReady
                        ? "rgba(94,234,212,0.90)"
                        : "rgba(125,211,252,0.90)",
                    }}
                  />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{percent}%</div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.82)",
                }}
              >
                {completedCount} of {totalCount} checks complete
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="wm-btn wm-btn-primary"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={markReady}
                  disabled={!isReady}
                  title={isReady ? "Mark this project ready" : "Complete all checks first"}
                >
                  Mark project ready
                </button>

                <button
                  type="button"
                  className="wm-btn"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={() => nav("/app/projects")}
                >
                  Back to Projects
                </button>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Detected project context">
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800 }}>Vertical market</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                  {templateSeed.verticalMarket?.name || "Not yet detected"}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800 }}>Room type</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                  {templateSeed.roomType?.name || "Not yet detected"}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800 }}>Capability tier</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                  {templateSeed.tier?.label || "Not yet detected"}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800 }}>Included system behaviours</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                  {templateSeed.includedSystems?.length
                    ? `${templateSeed.includedSystems.length} detected`
                    : "Not yet detected"}
                </div>
              </div>
            </div>
          </InfoCard>
        </div>

        <InfoCard title="Checklist">
          <div style={{ display: "grid", gap: 10 }}>
            {checklist.map((item) => (
              <CheckRow
                key={item.key}
                label={item.label}
                help={item.help}
                checked={item.checked}
                onToggle={() => toggleCheck(item.key)}
              />
            ))}
          </div>
        </InfoCard>

        <InfoCard title="Recommended workflow actions">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="wm-btn"
              style={{ height: 40, padding: "0 16px" }}
              onClick={() => nav("/app/templates")}
            >
              Open Templates
            </button>

            <button
              type="button"
              className="wm-btn"
              style={{ height: 40, padding: "0 16px" }}
              onClick={() => nav("/app/tools/room")}
            >
              Open Room Wizard
            </button>

            <button
              type="button"
              className="wm-btn"
              style={{ height: 40, padding: "0 16px" }}
              onClick={() => nav("/app/tools/proposal")}
            >
              Open Proposal Builder
            </button>

            <button
              type="button"
              className="wm-btn"
              style={{ height: 40, padding: "0 16px" }}
              onClick={() => nav("/app/tools/catalog")}
            >
              Open Catalog
            </button>
          </div>
        </InfoCard>
      </div>
    </div>
  );
}