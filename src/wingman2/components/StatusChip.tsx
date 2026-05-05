import type { StatusVariant } from "../types";

type StatusChipProps = {
  label: string;
  variant: StatusVariant;
};

const classes: Record<StatusVariant, string> = {
  recommended: "bg-emerald-100 text-emerald-700 border-emerald-200",
  alternative: "bg-amber-100 text-amber-700 border-amber-200",
  caution: "bg-rose-100 text-rose-700 border-rose-200",
};

export function StatusChip({ label, variant }: StatusChipProps) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes[variant]}`}>
      {label}
    </span>
  );
}
