import * as React from "react";
import { ArrowRight } from "lucide-react";

export type WmIcon = React.ComponentType<{ size?: string | number; className?: string }>;
export type Tone = "default" | "primary" | "design" | "product" | "sales";

/* ---------------------------------------------------------------- */
/* Window width hook                                                */
/* ---------------------------------------------------------------- */

export function useWindowWidth(): number {
  const [width, setWidth] = React.useState<number>(() => {
    if (typeof window === "undefined") return 1440;
    return window.innerWidth;
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
}

/* ---------------------------------------------------------------- */
/* Theme helpers                                                    */
/* ---------------------------------------------------------------- */

function toneAccent(tone: Tone): string {
  switch (tone) {
    case "primary":
      return "rgba(76,224,211,0.24)";
    case "design":
      return "rgba(72,208,255,0.24)";
    case "product":
      return "rgba(119,156,255,0.24)";
    case "sales":
      return "rgba(70,220,190,0.24)";
    default:
      return "rgba(140,190,255,0.14)";
  }
}

function toneBackground(tone: Tone): string {
  switch (tone) {
    case "primary":
      return "linear-gradient(135deg, rgba(10,80,83,0.88), rgba(10,48,90,0.82))";
    default:
      return "linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))";
  }
}

/* ---------------------------------------------------------------- */
/* Page container                                                   */
/* ---------------------------------------------------------------- */

export function WmPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100%",
        width: "100%",
        display: "grid",
        gap: 16,
        padding: "6px 6px 12px",
      }}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Hero layout                                                      */
/* ---------------------------------------------------------------- */

export function WmHeroGrid({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  const width = useWindowWidth();
  const stack = width < 1180;

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: stack
          ? "minmax(0,1fr)"
          : "minmax(0,1.45fr) minmax(320px,0.7fr)",
        gap: 14,
        alignItems: "start",
      }}
    >
      {left}
      {right}
    </section>
  );
}

export function WmHeroCard({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(140,190,255,0.12)",
        borderRadius: 22,
        padding: compact ? 12 : 14,
        background:
          "linear-gradient(135deg, rgba(8,18,35,0.95), rgba(8,26,58,0.78))",
        boxShadow: "0 14px 28px rgba(0,0,0,0.20)",
      }}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Cards                                                            */
/* ---------------------------------------------------------------- */

export function WmCard({
  children,
  tone = "default",
  padding = 18,
}: {
  children: React.ReactNode;
  tone?: Tone;
  padding?: number;
}) {
  return (
    <div
      style={{
        border:
          tone === "primary"
            ? "1px solid rgba(76,224,211,0.20)"
            : "1px solid rgba(140,190,255,0.12)",
        borderRadius: 22,
        padding,
        background: toneBackground(tone),
        boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
      }}
    >
      {children}
    </div>
  );
}

export function WmInset({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(140,190,255,0.10)",
        borderRadius: 18,
        padding: compact ? 12 : 14,
        background: "rgba(255,255,255,0.03)",
        display: "grid",
        gap: compact ? 10 : 12,
      }}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Headers                                                          */
/* ---------------------------------------------------------------- */

export function WmSectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "end",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 14,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 19,
            fontWeight: 900,
            color: "#f5fbff",
          }}
        >
          {title}
        </div>

        {subtitle && (
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: "rgba(220,230,245,0.70)",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {action}
    </div>
  );
}

export function WmHeroHeader({
  title,
  subtitle,
  actions,
  compact = false,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "start",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
        marginBottom: compact ? 12 : 14,
      }}
    >
      <div>
        <div
          style={{
            fontSize: compact ? 22 : 26,
            fontWeight: 900,
            color: "#f6fbff",
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: compact ? 13 : 14,
            color: "rgba(220,230,245,0.74)",
          }}
        >
          {subtitle}
        </div>
      </div>

      {actions}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Pills                                                            */
/* ---------------------------------------------------------------- */

export function WmMetaPill({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 22,
        padding: compact ? "0 8px" : "0 10px",
        borderRadius: 999,
        border: "1px solid rgba(150,190,255,0.14)",
        background: "rgba(255,255,255,0.045)",
        color: "rgba(232,239,248,0.92)",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- */
/* Buttons                                                          */
/* ---------------------------------------------------------------- */

export function WmButton({
  label,
  onClick,
  Icon,
  primary = false,
  full = false,
  compact = false,
}: {
  label: string;
  onClick: () => void;
  Icon?: WmIcon;
  primary?: boolean;
  full?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        width: full ? "100%" : undefined,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: compact ? 38 : 42,
        padding: compact ? "0 12px" : "0 14px",
        borderRadius: 12,
        border: primary
          ? "1px solid rgba(76,224,211,0.34)"
          : "1px solid rgba(150,190,255,0.14)",
        background: primary
          ? "linear-gradient(135deg, rgba(10,121,117,0.95), rgba(16,78,136,0.92))"
          : "rgba(255,255,255,0.05)",
        color: "#eef6ff",
        fontSize: compact ? 12 : 13,
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {Icon && <Icon size={compact ? 14 : 15} />}
      <span>{label}</span>
    </button>
  );
}

/* ---------------------------------------------------------------- */
/* Stat cards                                                       */
/* ---------------------------------------------------------------- */

export function WmStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <WmCard padding={16}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "rgba(190,205,225,0.60)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: "#f5fbff",
          marginBottom: 8,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 13,
          color: "rgba(221,230,242,0.74)",
        }}
      >
        {hint}
      </div>
    </WmCard>
  );
}

/* ---------------------------------------------------------------- */
/* Tool tiles                                                       */
/* ---------------------------------------------------------------- */

export function WmTile({
  title,
  desc,
  tone = "default",
  Icon,
  tag,
  onOpen,
  minHeight = 92,
  compact = false,
}: {
  title: string;
  desc: string;
  tone?: Tone;
  Icon?: WmIcon;
  tag?: string;
  onOpen: () => void;
  minHeight?: number;
  compact?: boolean;
}) {
  const accent = toneAccent(tone);

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        width: "100%",
        textAlign: "left",
        border: "1px solid rgba(140,190,255,0.12)",
        borderRadius: 18,
        padding: compact ? 14 : 16,
        background: toneBackground(tone),
        cursor: "pointer",
        boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
        minHeight,
      }}
    >
      {(Icon || tag) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: compact ? 8 : 10,
          }}
        >
          {Icon && (
            <div
              style={{
                width: compact ? 36 : 40,
                height: compact ? 36 : 40,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${accent}`,
              }}
            >
              <Icon size={compact ? 16 : 18} />
            </div>
          )}

          {tag && <WmMetaPill compact={compact}>{tag}</WmMetaPill>}
        </div>
      )}

      <div
        style={{
          fontSize: compact ? 15 : 17,
          fontWeight: 900,
          color: "#f5fbff",
          marginBottom: 6,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: compact ? 12 : 13,
          color: "rgba(221,230,242,0.76)",
        }}
      >
        {desc}
      </div>
    </button>
  );
}

/* ---------------------------------------------------------------- */
/* Text link button                                                 */
/* ---------------------------------------------------------------- */

export function WmTextLinkButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: "none",
        background: "transparent",
        color: "#7ce8df",
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      <span>{label}</span>
      <ArrowRight size={14} />
    </button>
  );
}

/* ---------------------------------------------------------------- */
/* Empty state                                                      */
/* ---------------------------------------------------------------- */

export function WmEmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px dashed rgba(140,190,255,0.20)",
        borderRadius: 18,
        padding: 24,
        background: "rgba(255,255,255,0.025)",
        display: "grid",
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: "#f5fbff",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 14,
          color: "rgba(221,230,242,0.76)",
        }}
      >
        {body}
      </div>

      {action}
    </div>
  );
}
