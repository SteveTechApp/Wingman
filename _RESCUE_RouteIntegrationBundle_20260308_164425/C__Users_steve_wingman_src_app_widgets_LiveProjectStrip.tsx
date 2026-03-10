import * as React from "react";
import { loadProjectState } from "@/core/workflow/projectState";

export default function LiveProjectStrip() {
  const [state, setState] = React.useState(() => loadProjectState());

  React.useEffect(() => {
    const onFocus = () => setState(loadProjectState());
    const onStorage = () => setState(loadProjectState());

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);

    const timer = window.setInterval(() => {
      setState(loadProjectState());
    }, 1200);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="wm-liveStrip">
      <div className="wm-liveStrip__item">
        <span className="wm-liveStrip__label">Project</span>
        <strong>{state.name || "New Wingman Project"}</strong>
      </div>

      <div className="wm-liveStrip__item">
        <span className="wm-liveStrip__label">Stage</span>
        <strong>{state.stage || "Discovery"}</strong>
      </div>

      <div className="wm-liveStrip__item">
        <span className="wm-liveStrip__label">Customer</span>
        <strong>{state.customer || "-"}</strong>
      </div>

      <div className="wm-liveStrip__item">
        <span className="wm-liveStrip__label">Displays</span>
        <strong>{state.displayCount ?? 0}</strong>
      </div>

      <div className="wm-liveStrip__item">
        <span className="wm-liveStrip__label">Sources</span>
        <strong>{state.sourceCount ?? 0}</strong>
      </div>

      <div className="wm-liveStrip__item">
        <span className="wm-liveStrip__label">BOM</span>
        <strong>{state.bom?.length ?? 0} items</strong>
      </div>
    </div>
  );
}