import * as React from "react";

export default function ProductFinderModal({
  open,
  onClose,
  onAddProducts,
}: {
  open: boolean;
  onClose?: () => void;
  onAddProducts?: (skus: string[]) => void;
}) {
  if (!open) return null;
  return (
    <div className="wm-card wm-card-pad">
      <div className="wm-section-title">Product Finder</div>
      <div className="wm-p" style={{ marginTop: 8 }}>Use search to add products manually.</div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="wm-btn" onClick={() => onAddProducts?.([])}>Add Selected</button>
        <button className="wm-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
