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
      return "rgba(107,97,255,0.18)";
    case "design":
      return "rgba(106,144,255,0.18)";
    case "product":
      return "rgba(132,141,255,0.18)";
    case "sales":
      return "rgba(105,214,196,0.18)";
    default:
      return "rgba(255,255,255,0.08)";
  }
}

function toneBackground(tone: Tone): string {
  switch (tone) {
    case "primary":
      return "radial-gradient(circle at top left, rgba(106,118,255,0.14), transparent 28%), linear-gradient(180deg, rgba(28,28,36,0.92), rgba(17,17,24,0.98))";
    default:
      return "linear-gradient(180deg, rgba(24,24,31,0.76), rgba(15,15,20,0.9))";
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
        gap: 14,
        padding: "2px 2px 6px",
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
  const stack = width < 1100;

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: stack
          ? "minmax(0,1fr)"
          : "minmax(0,1.35fr) minmax(300px,0.78fr)",
        gap: 16,
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
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        padding: compact ? 12 : 14,
        background:
          "radial-gradient(circle at top left, rgba(109, 182, 255, 0.08), transparent 28%), linear-gradient(180deg, rgba(23,23,29,0.84), rgba(14,14,19,0.96))",
        boxShadow: "0 16px 30px rgba(0,0,0,0.14)",
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
  padding = 16,
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
            ? "1px solid rgba(132,141,255,0.18)"
            : "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20,
        padding,
        background: toneBackground(tone),
        boxShadow: "0 12px 24px rgba(0,0,0,0.11)",
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
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: compact ? 10 : 12,
        background: "rgba(255,255,255,0.022)",
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
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 8,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 620,
            color: "#f5f2fa",
          }}
        >
          {title}
        </div>

        {subtitle && (
          <div
            style={{
              marginTop: 4,
              fontSize: 12.5,
              color: "rgba(229,225,237,0.68)",
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
        gap: 12,
        flexWrap: "wrap",
        marginBottom: compact ? 10 : 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: compact ? 19 : 21,
            fontWeight: 620,
            color: "#f5f2fa",
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 5,
            fontSize: compact ? 12.5 : 13.5,
            color: "rgba(229,225,237,0.68)",
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
        display: "inline-block",
        color: "rgba(232,239,248,0.68)",
        fontSize: compact ? 10 : 11,
        fontWeight: 520,
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
        gap: 7,
        minHeight: compact ? 30 : 34,
        padding: compact ? "0 11px" : "0 13px",
        borderRadius: 999,
        border: primary
          ? "1px solid rgba(132,141,255,0.2)"
          : "1px solid rgba(255,255,255,0.08)",
        background: primary
          ? "linear-gradient(135deg, rgba(107,97,255,0.92), rgba(88,120,255,0.88))"
          : "rgba(255,255,255,0.03)",
        color: "#f5f2fa",
        fontSize: compact ? 11 : 12,
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: primary ? "0 10px 20px rgba(82, 91, 210, 0.16)" : "inset 0 1px 0 rgba(255,255,255,0.03)",
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
  return (<WmCard padding={12}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(198,191,214,0.62)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: 640,
          color: "#f5f2fa",
          marginBottom: 6,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 12.5,
          color: "rgba(229,225,237,0.68)",
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
  minHeight = 76,
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
        padding: compact ? 12 : 13,
        background: toneBackground(tone),
        cursor: "pointer",
        boxShadow: "0 8px 18px rgba(0,0,0,0.12)",
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
                width: compact ? 34 : 38,
                height: compact ? 34 : 38,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${accent}`,
              }}
            >
              <Icon size={compact ? 15 : 17} />
            </div>
          )}

          {tag && <WmMetaPill compact={compact}>{tag}</WmMetaPill>}
        </div>
      )}

      <div
        style={{
          fontSize: compact ? 13.5 : 15,
          fontWeight: 780,
          color: "#f5fbff",
          marginBottom: 5,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: compact ? 11 : 12,
          color: "rgba(221,230,242,0.72)",
          lineHeight: 1.45,
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
        fontWeight: 700,
        fontSize: 12,
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
        padding: 16,
        background: "rgba(255,255,255,0.025)",
        display: "grid",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 780,
          color: "#f5fbff",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 13,
          color: "rgba(221,230,242,0.72)",
          lineHeight: 1.5,
        }}
      >
        {body}
      </div>

      {action}
    </div>
  );
}
