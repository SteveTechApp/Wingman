import * as React from "react";
import { useNavigate } from "react-router-dom";

export default function RoomWizard() {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
      <div className="font-medium">Room Wizard</div>
      <div className="mt-1 opacity-80">
        This legacy panel now routes to the active Room Wizard workflow.
      </div>
      <div className="mt-3">
        <button
          type="button"
          className="wm-btn"
          onClick={() => navigate("/app/tools/room-wizard")}
        >
          Open Room Wizard
        </button>
      </div>
    </div>
  );
}

