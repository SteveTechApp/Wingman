import React from "react";

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export default function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
  className = "",
}: ToggleSwitchProps) {
  return (
    <label className={"inline-flex items-center gap-2 select-none " + className}>
      <button
        type="button"
        aria-pressed={checked}
        aria-label={label || "Toggle"}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex h-14 w-11 items-center rounded-full transition",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          checked ? "bg-emerald-500" : "bg-white/15",
          "shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 transform rounded-full bg-white transition",
            checked ? "translate-x-5" : "translate-x-1",
            "shadow-sm",
          ].join(" ")}
        />
      </button>
      {label ? <span className="text-sm text-white/80">{label}</span> : null}
    </label>
  );
}