import * as React from "react";

export default function GuruMount() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        className="wm-guru-btn"
        aria-label="Open Guru"
        title="Open Guru"
        onClick={() => setOpen((v) => !v)}
      >
        GURU
      </button>

      {open ? (
        <div className="wm-guru-panel" role="dialog" aria-label="Wingman Guru">
          <div className="wm-guru-header">
            <div>
              <div className="wm-guru-title">Wingman Guru</div>
              <div className="wm-guru-subtitle">Sales and design assistant</div>
            </div>

            <button
              type="button"
              className="wm-guru-close"
              aria-label="Close Guru"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="wm-guru-body">
            <div className="wm-panel">
              <h4>Guru Assistant</h4>
              <p>
                Use Guru for discovery guidance, product selection help, competitor positioning,
                and proposal support.
              </p>
            </div>

            <div className="wm-field">
              <label>Ask Guru</label>
              <textarea
                className="wm-textarea"
                placeholder="Example: Recommend WyreStorm products for a 3 display Teams room with USB cameras and 20m transport."
              />
            </div>

            <div className="wm-toolbar">
              <button type="button" className="wm-btn-primary">Ask Guru</button>
              <button type="button" className="wm-btn-secondary" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}