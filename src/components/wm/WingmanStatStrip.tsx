import type { ReactNode } from "react";

export type WingmanStatItem = {
  label: ReactNode;
  value: ReactNode;
  meta?: ReactNode;
};

type WingmanStatStripProps = {
  items: WingmanStatItem[];
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function WingmanStatStrip({ items, className }: WingmanStatStripProps) {
  return (
    <div className={cx("wm-stat-strip", className)}>
      {items.map((item, index) => (
        <div className="wm-stat" key={index}>
          <p className="wm-stat__label">{item.label}</p>
          <p className="wm-stat__value">{item.value}</p>
          {item.meta ? <p className="wm-stat__meta">{item.meta}</p> : null}
        </div>
      ))}
    </div>
  );
}