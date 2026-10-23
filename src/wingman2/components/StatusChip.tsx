import type { ReactNode } from "react";
import type { StatusVariant } from "../types";

type StatusChipProps = {
  label: ReactNode;
  variant?: StatusChipVariant;
  title?: string;
  className?: string;
  icon?: ReactNode;
};

export type StatusChipVariant =
  | StatusVariant
  | "neutral"
  | "default"
  | "ready"
  | "on-track"
  | "in-progress"
  | "progress"
  | "warning"
  | "danger"
  | "success"
  | "review";

const variantClasses: Record<StatusChipVariant, string> = {
  recommended: "wm-status-on-track",
  alternative: "wm-status-progress",
  caution: "wm-status-warning",
  neutral: "wm-status-neutral",
  default: "wm-status-neutral",
  ready: "wm-status-ready",
  "on-track": "wm-status-on-track",
  "in-progress": "wm-status-progress",
  progress: "wm-status-progress",
  warning: "wm-status-warning",
  danger: "wm-status-danger",
  success: "wm-status-success",
  review: "wm-status-review",
};

/**
 * The chip's classes, so a chip-shaped link answers to the same styling as the
 * status chips beside it instead of keeping a second copy of the tokens.
 */
export function statusChipClassName(variant: StatusChipVariant = "neutral", className = "") {
  return ["wm-status-chip", "wm-status", variantClasses[variant], className].filter(Boolean).join(" ");
}

export function StatusChip({ label, variant = "neutral", title, className = "", icon }: StatusChipProps) {
  return (
    <span className={statusChipClassName(variant, className)} title={title}>
      {icon}
      <span className="wm-status-chip-label">{label}</span>
    </span>
  );
}
