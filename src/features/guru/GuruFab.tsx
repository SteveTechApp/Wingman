import React from "react";

type Props = {
  onClick: () => void;
  isOpen?: boolean;
};

export default function GuruFab({ onClick, isOpen = false }: Props) {
  return (
    <button
      type="button"
      className={isOpen ? "wm-guru-fab is-open" : "wm-guru-fab"}
      onClick={onClick}
      title="Open Guru assistant"
      aria-label="Open Guru assistant"
    >
      <span className="wm-guru-fab__icon">✦</span>
      <span className="wm-guru-fab__label">Guru</span>
    </button>
  );
}