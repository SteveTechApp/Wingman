import type { ReactNode } from "react";

type WingmanActionBarProps = {
  children: ReactNode;
  align?: "start" | "end" | "between";
  className?: string;
};

export function WingmanActionBar({
  children,
  align = "end",
  className = ""
}: WingmanActionBarProps) {
  const classes = ["wm-action-bar", `wm-action-bar--${align}`, className].filter(Boolean).join(" ");

  return <div className={classes}>{children}</div>;
}