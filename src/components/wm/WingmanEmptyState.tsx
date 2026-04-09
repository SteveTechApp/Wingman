import type { ReactNode } from "react";

type WingmanEmptyStateProps = {
  title: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function WingmanEmptyState({
  title,
  body,
  actions,
  className,
}: WingmanEmptyStateProps) {
  return (
    <div className={cx("wm-empty-state", className)}>
      <h3 className="wm-empty-state__title">{title}</h3>
      {body ? <p className="wm-empty-state__body">{body}</p> : null}
      {actions ? <div className="wm-flex">{actions}</div> : null}
    </div>
  );
}