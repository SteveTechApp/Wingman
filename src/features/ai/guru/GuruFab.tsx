import { useMemo, useState } from "react";
import "@/styles/wm-guru-fab.css";
import GuruLogo from "@/components/branding/GuruLogo";

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
      <span className="wm-guru-fab__halo" aria-hidden="true" />
      <span className="wm-guru-fab__avatar">
        <GuruLogo className="wm-guru-fab__image" alt="" />
      </span>
    </button>
  );
}
