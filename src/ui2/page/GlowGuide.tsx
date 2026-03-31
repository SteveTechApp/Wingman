type GuideStep = {
  title: string;
  copy: string;
};

export default function GlowGuide({
  title,
  steps,
  activeIndex,
  note,
}: {
  title: string;
  steps: GuideStep[];
  activeIndex: number;
  note?: string;
}) {
  return (
    <aside className="wm-focus-guide">
      <div className="wm-focus-guide__title">{title}</div>

      {steps.map((step, index) => {
        const active = index === activeIndex;
        return (
          <div
            key={`${step.title}-${index}`}
            className={`wm-focus-guide__step${active ? " wm-focus-guide__step--active" : ""}`}
          >
            <div className="wm-focus-guide__badge">{index + 1}</div>
            <div>
              <div className="wm-focus-guide__name">{step.title}</div>
              <div className="wm-focus-guide__copy">{step.copy}</div>
            </div>
          </div>
        );
      })}

      {note ? <div className="wm-focus-guide__note">{note}</div> : null}
    </aside>
  );
}