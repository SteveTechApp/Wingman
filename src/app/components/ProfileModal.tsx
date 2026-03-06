import * as React from "react";

export type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  if (!open) return null;

  return (
    <div className="wm-modal-backdrop" role="dialog" aria-modal="true">
      <div className="wm-modal wm-card" style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Profile</div>
          <button className="wm-pill wm-pill--btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ marginTop: 14, opacity: 0.9, fontSize: 13 }}>
          {/* TODO: move your existing profile controls here */}
          Profile settings go here.
        </div>
      </div>
    </div>
  );
}