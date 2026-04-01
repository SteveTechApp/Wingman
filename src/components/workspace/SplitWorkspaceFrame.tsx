import type { ReactNode } from "react";

type SplitWorkspaceFrameProps = {
  title: string;
  subtitle?: string;
  leftTitle?: string;
  rightTitle?: string;
  left: ReactNode;
  right: ReactNode;
  top?: ReactNode;
  bottom?: ReactNode;
};

export default function SplitWorkspaceFrame({
  title,
  subtitle,
  leftTitle = "Inputs",
  rightTitle = "Output",
  left,
  right,
  top,
  bottom,
}: SplitWorkspaceFrameProps) {
  return (
    <div className="wm-split-page">
      <div className="wm-split-page__header">
        <div>
          <div className="wm-split-page__eyebrow">Workspace</div>
          <h1 className="wm-split-page__title">{title}</h1>
          {subtitle ? <p className="wm-split-page__subtitle">{subtitle}</p> : null}
        </div>
        {top ? <div className="wm-split-page__top">{top}</div> : null}
      </div>

      <div className="wm-split-workspace">
        <section className="wm-split-column wm-split-column--left">
          <div className="wm-split-column__header">
            <h2>{leftTitle}</h2>
          </div>
          <div className="wm-split-column__body">{left}</div>
        </section>

        <section className="wm-split-column wm-split-column--right">
          <div className="wm-split-column__header">
            <h2>{rightTitle}</h2>
          </div>
          <div className="wm-split-column__body">{right}</div>
        </section>
      </div>

      {bottom ? <div className="wm-split-page__bottom">{bottom}</div> : null}
    </div>
  );
}