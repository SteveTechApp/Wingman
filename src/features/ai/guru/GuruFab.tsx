import { useMemo, useState } from "react";
import guruIcon from "@/assets/branding/guru.png";

type GuruFabProps = {
  open?: boolean;
  minimized?: boolean;
  onToggle?: () => void;
  className?: string;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function GuruFab({
  open,
  minimized = false,
  onToggle,
  className,
}: GuruFabProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;

  const label = useMemo(() => {
    if (isOpen && minimized) return "Restore Guru";
    if (isOpen) return "Close Guru";
    return "Open Guru";
  }, [isOpen, minimized]);

  function handleClick() {
    if (onToggle) {
      onToggle();
      return;
    }

    setInternalOpen((current) => !current);
  }

  return (
    <button
      type="button"
      className={joinClasses(
        "wm-guru-fab",
        isOpen && "is-open",
        minimized && "is-minimized",
        className
      )}
      aria-label={label}
      aria-pressed={isOpen}
      title={label}
      onClick={handleClick}
    >
      <span className="wm-guru-fab__inner">
        <img
          src={guruIcon}
          alt=""
          className="wm-guru-fab__icon"
          draggable={false}
        />
      </span>
    </button>
  );
}