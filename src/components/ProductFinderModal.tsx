
import React, { useState } from "react";

type Props = {
  open?: boolean;
  onClose?: () => void;
  onAddProducts?: (skus: string[]) => void;
};

/**
 * Temporary stub to keep typecheck green.
 * Replace with the real Product Finder implementation later.
 */
export default function ProductFinderModal({ open, onClose, onAddProducts }: Props) {
  const [value, setValue] = useState("");

  if (!open) return null;

  const add = () => {
    const skus = value
      .split(/[\s,;]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (skus.length) onAddProducts?.(skus);
    onClose?.();
  };

  return (
    <div className="wm-card">
      <div className="wm-page-title">Product Finder</div>
      <div className="wm-muted">Stub modal (paste SKUs to add).</div>

      <div style={{ marginTop: "var(--wm-gap)" }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter SKUs separated by commas"
          className="w-full"
        />
      </div>

      <div style={{ marginTop: "var(--wm-gap)", display: "flex", gap: "var(--wm-gap)" }}>
        <button className="wm-tile" onClick={onClose}>Cancel</button>
        <button className="wm-tile" onClick={add}>Add</button>
      </div>
    </div>
  );
}

