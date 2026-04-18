import { ReactNode } from "react";
import GlowGuide from "@/ui2/page/GlowGuide";

type Props = {
  title: string;
  subtitle: string;
  steps: { title: string; copy: string }[];
  children: ReactNode;
};

export default function WingmanToolFrame({
  title,
  subtitle,
  steps,
  children,
}: Props) {
  return (
    <div className="wm-fit-page">

      {/* HERO */}
      <section className="wm-surface-card wm-fit-page__hero">
        <div style={{ display: "grid", gap: 8 }}>
          <div className="wm-page-kicker">Tool</div>
          <div className="wm-page-title">{title}</div>
          <div className="wm-page-copy">{subtitle}</div>
        </div>

        <GlowGuide
          title="How to use this"
          activeIndex={0}
          steps={steps}
        />
      </section>

      {/* BODY */}
      <section className="wm-fit-page__body wm-grid-2">
        {children}
      </section>

    </div>
  );
}
