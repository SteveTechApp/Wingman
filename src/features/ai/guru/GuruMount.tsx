import * as React from "react";
export default function GuruMount() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onToggle = () => setOpen((v) => !v);
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);

    window.addEventListener("wingman:guru:toggle", onToggle as any);
    window.addEventListener("wingman:guru:open", onOpen as any);
    window.addEventListener("wingman:guru:close", onClose as any);

    return () => {
      window.removeEventListener("wingman:guru:toggle", onToggle as any);
      window.removeEventListener("wingman:guru:open", onOpen as any);
      window.removeEventListener("wingman:guru:close", onClose as any);
    };
  }, []);

  return (
    <>
      <div className="wm-guru-fab">
        <button type="button" onClick={() => setOpen((v) => !v)} title={open ? "Close Guru" : "Open Guru"}>
          Guru
        </button>
      </div>

      {open ? (
        <div className="wm-guru-panel" role="dialog" aria-label="Wingman Guru">
          <header>
            <div style={{ fontWeight: 650 }}>Guru</div>
            <button className="wm-guru-close" type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </header>

          <div className="wm-guru-body">
            <div style={{ opacity: 0.85, marginBottom: 10 }}>
              Guru is mounted. Next steps:
              <ul style={{ margin: "8px 0 0 18px" }}>
                <li>Tool-aware help panels</li>
                <li>Competitor compare workflows</li>
                <li>Design/risk review checklists</li>
                <li>“Add to proposal” recommendations</li>
              </ul>
            </div>

            <button type="button" className="wm-btn" onClick={() => window.dispatchEvent(new Event("wingman:guru:toggle"))}>
              Toggle (event)
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
