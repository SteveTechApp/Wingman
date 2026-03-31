import { MessageSquareText, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import guruAvatar from "@/assets/branding/wingman-logo-compact.png";
import "./guru-fab.css";

const hints = [
  "What should I recommend for this room?",
  "Compare this against a competitor product.",
  "Help me choose Matrix vs AVoIP.",
  "Summarise the next best sales step.",
];

export default function GuruFab() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const hidden = useMemo(() => location.pathname.startsWith("/app/tools/guru"), [location.pathname]);

  if (hidden) return null;

  return (
    <div className={`wm-guru-fab${open ? " is-open" : ""}`}>
      {open ? (
        <div className="wm-guru-fab__panel">
          <div className="wm-guru-fab__panel-head">
            <div className="wm-guru-fab__identity">
              <img src={guruAvatar} alt="Guru" className="wm-guru-fab__avatar" />
              <div>
                <strong>Guru Assistant</strong>
                <span>Sales and system guidance</span>
              </div>
            </div>

            <button
              type="button"
              className="wm-guru-fab__close"
              onClick={() => setOpen(false)}
              aria-label="Close Guru"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="wm-guru-fab__body">
            <p>Open Guru for product fit, discovery support, and quick technical direction.</p>

            <div className="wm-guru-fab__hints">
              {hints.map((hint) => (
                <button
                  key={hint}
                  type="button"
                  className="wm-guru-fab__hint"
                  onClick={() => navigate("/app/tools/guru")}
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>

          <div className="wm-guru-fab__footer">
            <button
              type="button"
              className="wm-guru-fab__open"
              onClick={() => navigate("/app/tools/guru")}
            >
              <Sparkles size={16} strokeWidth={2} />
              Open Guru
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="wm-guru-fab__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Guru assistant"
      >
        <img src={guruAvatar} alt="" className="wm-guru-fab__trigger-avatar" />
        <span>Guru</span>
        <MessageSquareText size={16} strokeWidth={2} />
      </button>
    </div>
  );
}