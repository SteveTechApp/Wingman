import * as React from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  projects?: unknown[];
};

export default function AnalyticsDashboard(props: Props) {
  const navigate = useNavigate();
  const projectCount = Array.isArray(props.projects) ? props.projects.length : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
      <div className="font-medium">Analytics Dashboard</div>
      <div className="mt-1 opacity-80">
        Legacy analytics panel replaced by dashboard, runtime diagnostics, and project readiness views.
      </div>
      <div className="mt-2 opacity-80">
        Current project records detected: {projectCount}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="wm-btn" onClick={() => navigate("/app/dashboard")}>
          Open Dashboard
        </button>
        <button type="button" className="wm-btn" onClick={() => navigate("/app/tools/runtime-diagnostics")}>
          Open Diagnostics
        </button>
      </div>
    </div>
  );
}

