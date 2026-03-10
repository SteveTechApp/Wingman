import * as React from "react";
import { useNavigate } from "react-router-dom";

export default function RoomTypeStep() {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
      <div className="font-medium">Room Type Step</div>
      <div className="mt-1 opacity-80">
        This guided-wizard step now routes to the active Discovery workflow where room type is captured in step 1.
      </div>
      <div className="mt-3">
        <button type="button" className="wm-btn" onClick={() => navigate("/app/tools/discovery")}>
          Open Discovery Wizard
        </button>
      </div>
    </div>
  );
}

