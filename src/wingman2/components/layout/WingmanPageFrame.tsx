import type { ReactNode } from "react";

type WingmanPageFrameMode = "standard" | "wide" | "compact";

type WingmanPageFrameProps = {
  children: ReactNode;
  rightRail?: ReactNode;
  className?: string;
  mode?: WingmanPageFrameMode;
};

export function WingmanPageFrame({
  children,
  rightRail,
  className = "",
  mode = "standard"
}: WingmanPageFrameProps) {
  const classes = [
    "wm-page-frame",
    `wm-page-frame--${mode}`,
    rightRail ? "wm-page-frame--with-rail" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes}>
      <div className="wm-page-frame__main">
        {children}</div>
      {rightRail ? <aside className="wm-page-frame__rail">{rightRail}</aside> : null}
    </section>
  );
}