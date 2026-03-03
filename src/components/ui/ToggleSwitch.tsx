import React from "react";

export default function ToggleSwitch({
  className = "",
  checked = false,
  onChange,
}: {
  className?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={className}
      onClick={() => onChange?.(!checked)}
    >
      {checked ? "On" : "Off"}
    </button>
  );
}
