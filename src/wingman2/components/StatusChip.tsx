import type { StatusVariant } from "../types";

type StatusChipProps = {
  label: string;
  variant: StatusVariant;
};

const classes: Record<StatusVariant, string> = {
  recommended: "wm-status wm-status-recommended",
  alternative: "wm-status wm-status-alternative",
  caution: "wm-status wm-status-caution",
};

export function StatusChip({ label, variant }: StatusChipProps) {
  return <span className={classes[variant]}>{label}</span>;
}
