import React from "react";

type TraceLike = {
  label?: string;
  title?: string;
  name?: string;
  message?: string;
  detail?: string;
  description?: string;
  active?: boolean;
  current?: boolean;
  isActive?: boolean;
  state?: string;
  status?: string;
  phase?: string;
  stepStatus?: string;
};

type CompetitorLookupStatusPanelProps = {
  trace?: TraceLike[];
  traces?: TraceLike[];
  items?: TraceLike[];
  running?: boolean;
  title?: string;
  subtitle?: string;
  insight?: string;
  emptyText?: string;
  modeLabel?: string;
  [key: string]: unknown;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isTraceActive(item: TraceLike): boolean {
  if (typeof item.active === "boolean") return item.active;
  if (typeof item.current === "boolean") return item.current;
  if (typeof item.isActive === "boolean") return item.isActive;

  const marker = String(
    item.state ??
    item.status ??
    item.phase ??
    item.stepStatus ??
    ""
  ).toLowerCase();

  return (
    marker === "active" ||
    marker === "running" ||
    marker === "current" ||
    marker === "in-progress"
  );
}

function getTraceTitle(item: TraceLike, index: number): string {
  return (
    asText(item.label) ||
    asText(item.title) ||
    asText(item.name) ||
    "Step " + String(index + 1)
  );
}

function getTraceDetail(item: TraceLike): string {
  return (
    asText(item.message) ||
    asText(item.detail) ||
    asText(item.description)
  );
}

export default function CompetitorLookupStatusPanel(props: CompetitorLookupStatusPanelProps) {
  const {
    traces,
    trace,
    items,
    running = false,
    title = "Lookup status",
    subtitle = "View lookup progress and matching signals.",
    insight = "",
    emptyText = "No lookup activity yet.",
    modeLabel = "",
  } = props;

  const rows = React.useMemo(() => {
    const source = Array.isArray(trace) && trace.length > 0
      ? trace
      : Array.isArray(traces) && traces.length > 0
      ? traces
      : Array.isArray(items)
      ? items
      : [];

    return source.filter(Boolean);
  }, [trace, traces, items]);

  return (
    <div
      style={{
        display: "grid",
        gap: 14,
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: running ? "#5ce1e6" : "rgba(255,255,255,0.58)",
            }}
          >
            {running ? "Running" : modeLabel || "Idle"}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)", lineHeight: 1.5 }}>
          {subtitle}
        </div>
      </div>

      {insight ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(245,158,11,0.18)",
            background: "rgba(245,158,11,0.08)",
            color: "#fde68a",
            fontSize: 12,
            lineHeight: 1.45,
            fontWeight: 700,
          }}
        >
          {insight}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px dashed rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.48)",
            fontSize: 13,
          }}
        >
          {emptyText}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((item, index) => {
            const active = isTraceActive(item);
            const lineTitle = getTraceTitle(item, index);
            const lineDetail = getTraceDetail(item);

            return (
              <div
                key={lineTitle + "-" + String(index)}
                style={{
                  display: "grid",
                  gap: 4,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: active
                    ? "1px solid rgba(92,225,230,0.24)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: active
                    ? "rgba(92,225,230,0.12)"
                    : "transparent",
                  color: active ? "#5ce1e6" : "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>
                    {lineTitle}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.72 }}>
                    {active ? "Active" : ""}
                  </div>
                </div>

                {lineDetail ? (
                  <div style={{ fontSize: 12, color: active ? "#dffcff" : "rgba(255,255,255,0.68)" }}>
                    {lineDetail}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
