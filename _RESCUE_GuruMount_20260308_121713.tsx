import * as React from "react";

export default function GuruMount() {

  const [open,setOpen] = React.useState(false);

  return (
    <>
      <button
        className="wm-guru-btn"
        onClick={() => setOpen(v => !v)}
      >
        GURU
      </button>

      {open && (

        <div className="wm-guru-panel">

          <div className="wm-guru-header">

            <div>
              <div className="wm-guru-title">
                Wingman Guru
              </div>

              <div className="wm-guru-subtitle">
                AV design assistant
              </div>
            </div>

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
                Ask Guru about product selection,
                system architecture,
                or proposal guidance.
              </p>

            </div>

            <div className="wm-field">

              <label>Ask Guru</label>

              <textarea
                className="wm-textarea"
                placeholder="Example: Recommend products for a 3 display meeting room"
              />

            </div>

            <button className="wm-btn-primary">
              Ask Guru
            </button>

          </div>

        </div>

      )}

    </>
  )
}