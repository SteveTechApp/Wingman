import { useMemo } from "react";
import { ArrowRight, ClipboardList, FileUp, LayoutTemplate, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { routeCatalog } from "../app/routeCatalog";

type QuickAction = {
  key: string;
  title: string;
  summary: string;
  icon: typeof ClipboardList;
  path: string;
};

type StatCard = {
  label: string;
  value: string;
  helper: string;
};

function getRoutePath(key: string, fallback: string) {
  return routeCatalog.find((route) => route.key === key)?.path ?? fallback;
}

export function DashboardPage() {
  const navigate = useNavigate();

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        key: "discovery",
        title: "Start Discovery",
        summary: "Guide the conversation from room, workflow, sources, and outputs.",
        icon: ClipboardList,
        path: getRoutePath("discovery", "/wingman/discovery"),
      },
      {
        key: "compare",
        title: "Compare Competitor SKU",
        summary: "Replace competitor products with the right WyreStorm direction.",
        icon: Scale,
        path: getRoutePath("compare", "/wingman/compare"),
      },
      {
        key: "templates",
        title: "Browse Room Templates",
        summary: "Start from a known room archetype and refine from there.",
        icon: LayoutTemplate,
        path: getRoutePath("templates", "/wingman/templates"),
      },
      {
        key: "ingest",
        title: "Upload Customer Files",
        summary: "Bring in customer documents and move them into a usable brief.",
        icon: FileUp,
        path: getRoutePath("ingest", "/wingman/ingest"),
      },
    ],
    []
  );

  const stats = useMemo<StatCard[]>(
    () => [
      {
        label: "Primary focus",
        value: "Sales motion",
        helper: "Keep the dashboard focused on where to start, not what to buy.",
      },
      {
        label: "Recommended use",
        value: "Quick routing",
        helper: "Use this page to hand the rep into the right workflow quickly.",
      },
      {
        label: "Best behaviour",
        value: "Keep it simple",
        helper: "No recommendation panel and no proposal CTA needed here.",
      },
    ],
    []
  );

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        style={{
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(circle at top right, rgba(246,163,64,0.10), transparent 24rem), linear-gradient(180deg, rgba(3,17,29,0.98) 0%, rgba(2,12,22,0.98) 100%)",
          boxShadow: "0 18px 48px rgba(0,0,0,0.24)",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#8fa3ba",
            }}
          >
            Dashboard
          </div>

          <h1
            style={{
              margin: 0,
              maxWidth: 900,
              fontSize: "clamp(2rem, 4.2vw, 4.25rem)",
              lineHeight: 0.98,
              letterSpacing: "-0.04em",
              fontWeight: 900,
              color: "#f2f7fc",
            }}
          >
            Start from the sales motion, not the product list.
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: 980,
              fontSize: 15,
              lineHeight: 1.5,
              color: "rgba(226,236,246,0.86)",
            }}
          >
            This workspace is the fast-control center for distributor reps who need to qualify demand,
            position WyreStorm clearly, and move toward the right recommendation path without hesitation.
          </p>
        </div>

        <div
          style={{
            padding: "14px 16px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.05)",
            maxWidth: 980,
          }}
        >
          <div
            style={{
              marginBottom: 8,
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#f6a340",
            }}
          >
            Next move
          </div>
          <div style={{ color: "#e5eef8", fontSize: 15, lineHeight: 1.45 }}>
            Choose the workflow that matches the conversation: Discovery, Competitor Compare, Room Templates,
            or Upload Customer Files.
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate(getRoutePath("projects", "/wingman/projects"))}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 999,
              border: 0,
              background: "linear-gradient(135deg, #f6b34d 0%, #f0a336 100%)",
              color: "#1e160a",
              fontWeight: 800,
              fontSize: 15,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            Open projects
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={() => navigate(getRoutePath("support", "/wingman/support"))}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              color: "#edf4fb",
              fontWeight: 800,
              fontSize: 15,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            Open support
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: 16,
          padding: 20,
          borderRadius: 28,
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(148,163,184,0.26)",
          boxShadow: "0 18px 44px rgba(15,23,42,0.12)",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#c96b12",
            }}
          >
            Wingman workspace
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              lineHeight: 1.1,
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            Quick-start actions
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.45,
              color: "#64748b",
            }}
          >
            Start from problem type rather than product taxonomy.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.key}
                type="button"
                onClick={() => navigate(action.path)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: 14,
                  padding: 18,
                  borderRadius: 18,
                  border: "1px solid rgba(148,163,184,0.22)",
                  background: "#f8fafc",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "grid", gap: 6 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      lineHeight: 1.2,
                      color: "#111827",
                    }}
                  >
                    {action.title}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.4,
                      color: "#64748b",
                    }}
                  >
                    {action.summary}
                  </div>
                </div>

                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(15,23,42,0.05)",
                    color: "#64748b",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </div>
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {stats.map((item) => (
            <div
              key={item.label}
              style={{
                padding: 18,
                borderRadius: 18,
                border: "1px solid rgba(148,163,184,0.20)",
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  marginBottom: 10,
                  fontSize: 14,
                  color: "#64748b",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  marginBottom: 8,
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#111827",
                  lineHeight: 1.1,
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.4,
                  color: "#64748b",
                }}
              >
                {item.helper}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
