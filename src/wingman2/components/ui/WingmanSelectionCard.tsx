import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Check, Sparkles, TriangleAlert, type LucideIcon } from "lucide-react";

export type WingmanSelectionAccent = "cyan" | "blue" | "teal" | "amber" | "purple" | "green" | "red";
export type WingmanSelectionIndicator = "recommended" | "advanced" | "warning";
export type WingmanSelectionIcon = LucideIcon;

type WingmanSelectionCardProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  icon?: WingmanSelectionIcon;
  accent?: WingmanSelectionAccent;
  selected?: boolean;
  compact?: boolean;
  metaBadges?: ReactNode[];
  indicator?: WingmanSelectionIndicator;
};

const indicatorLabels: Record<WingmanSelectionIndicator, string> = {
  recommended: "Recommended",
  advanced: "Advanced",
  warning: "Check",
};

function IndicatorIcon({ indicator }: { indicator: WingmanSelectionIndicator }) {
  if (indicator === "warning") {
    return <TriangleAlert aria-hidden="true" className="wm-selection-card__indicator-icon" />;
  }

  return <Sparkles aria-hidden="true" className="wm-selection-card__indicator-icon" />;
}

export function WingmanSelectionCard({
  title,
  description,
  eyebrow,
  icon: Icon,
  accent = "cyan",
  selected = false,
  compact = false,
  disabled = false,
  metaBadges,
  indicator,
  className,
  type = "button",
  ...buttonProps
}: WingmanSelectionCardProps) {
  const classes = [
    "wm-selection-card",
    compact ? "wm-selection-card--compact" : "",
    selected ? "is-selected" : "",
    disabled ? "is-disabled" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={disabled}
      aria-pressed={buttonProps["aria-pressed"] ?? selected}
      className={classes}
      data-accent={accent}
      data-compact={compact ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
    >
      <span className="wm-selection-card__visual" aria-hidden="true">
        {Icon ? <Icon className="wm-selection-card__icon" /> : <span className="wm-selection-card__glyph" />}
      </span>

      <span className="wm-selection-card__body">
        <span className="wm-selection-card__topline">
          {eyebrow ? <span className="wm-selection-card__eyebrow">{eyebrow}</span> : null}
          {indicator ? (
            <span className="wm-selection-card__indicator" data-indicator={indicator}>
              <IndicatorIcon indicator={indicator} />
              {indicatorLabels[indicator]}
            </span>
          ) : null}
        </span>

        <span className="wm-selection-card__title">{title}</span>
        {description ? <span className="wm-selection-card__description">{description}</span> : null}

        {metaBadges?.length ? (
          <span className="wm-selection-card__badges">
            {metaBadges.map((badge, index) => (
              <span className="wm-selection-card__badge" key={index}>
                {badge}
              </span>
            ))}
          </span>
        ) : null}
      </span>

      {selected ? (
        <span className="wm-selection-card__check" aria-hidden="true">
          <Check className="wm-selection-card__check-icon" />
        </span>
      ) : null}
    </button>
  );
}

export default WingmanSelectionCard;
