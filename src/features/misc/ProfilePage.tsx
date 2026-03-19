import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import ProfileModal from "@/app/components/ProfileModal";

export default function ProfilePage() {
  const nav = useNavigate();
  const [open, setOpen] = React.useState(true);

  return (
    <div className="wm-page wm-profile-page" style={{ padding: 24 }}>
      <div className="wm-card" style={{ maxWidth: 920, margin: "0 auto", padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>User Profile</div>
            <div style={{ opacity: 0.75, fontSize: 13 }}>
              Set your preferences before opening the app.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link className="wm-pill wm-pill--btn" to="/">
              Back
            </Link>

            <button
              className="wm-pill wm-pill--btn wm-pill--primary"
              onClick={() => nav("/app/tools")}
              type="button"
            >
              Open Tools
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <ProfileModal open={open} onClose={() => setOpen(false)} />
        </div>

        {!open && (
          <div style={{ marginTop: 12, opacity: 0.8, fontSize: 13 }}>
            Profile panel closed. Use the Open Tools button above.
          </div>
        )}
      </div>
    </div>
  );
}
