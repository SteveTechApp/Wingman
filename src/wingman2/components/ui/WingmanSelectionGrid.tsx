import type { HTMLAttributes, ReactNode } from "react";

type WingmanSelectionGridProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5;
  compact?: boolean;
};

export function WingmanSelectionGrid({
  children,
  columns = 3,
  compact = false,
  className,
  ...gridProps
}: WingmanSelectionGridProps) {
  return (
    <div
      {...gridProps}
      className={["wm-selection-grid", compact ? "wm-selection-grid--compact" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      data-columns={columns}
      data-compact={compact ? "true" : undefined}
    >
      {children}
    </div>
  );
}

export default WingmanSelectionGrid;
