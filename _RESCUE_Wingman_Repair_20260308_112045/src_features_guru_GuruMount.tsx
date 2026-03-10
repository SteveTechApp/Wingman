import * as React from "react";

export default function GuruMount() {

  const [open,setOpen] = React.useState(false);

  return (
    <>
      <button
        className="wm-guru-btn"
        onClick={() => setOpen(v => !v)}
        aria-label="Open Guru"
      >
        GURU
      </button>

      {open && (
        <div className="wm-guru-panel">

          <div className="wm-guru-header">
            <div className="wm-guru-title">Wingman Guru</div>
            <button
              className="wm-guru-close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="wm-guru-body">

            <div className="wm-panel">
              <h4>Guru Assistant</h4>
              <p>
                Ask Guru for product selection guidance, architecture advice,
                proposal support, or competitor comparison.
              </p>
            </div>

            <div className="wm-field">
              <label>Ask Guru</label>
              <textarea
                className="wm-textarea"
                placeholder="Example: What WyreStorm products should I use for a 3 display meeting room?"
              />
            </div>

            <button className="wm-btn-primary" style={{marginTop:12}}>
              Ask
            </button>

          </div>

        </div>
      )}
    </>
  );
}