import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { getGuruContext } from "@/features/guru/guruContext";

export default function FloatingGuru() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const context = useMemo(() => getGuruContext(location.pathname), [location.pathname]);

  return (
    <div className={`wm-guru-fab${isOpen ? " is-open" : ""}`}>
      <div className="wm-guru-fab__panel">
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="wm-guru-fab__toggle"
        >
          <div className="wm-guru-fab__header">
            <div className="wm-guru-fab__eyebrow">Wingman Guru</div>
            <div className="wm-guru-fab__title">{context.heading}</div>
          </div>

          <div className="wm-guru-fab__toggle-pill">{isOpen ? "-" : "+"}</div>
        </button>

        {isOpen ? (
          <div className="wm-guru-fab__body">
            <div className="wm-guru-fab__summary">{context.body}</div>

            <div className="wm-guru-fab__suggestions">
              {context.suggestions.map((item) => (
                <div key={item.title} className="wm-guru-fab__suggestion">
                  <div className="wm-guru-fab__suggestion-title">{item.title}</div>
                  <div className="wm-guru-fab__suggestion-copy">{item.copy}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="wm-guru-fab__closed-copy">Open for guidance</div>
        )}
      </div>
    </div>
  );
}
