import "./guru-fab.css";
import * as React from "react";
import { createPortal } from "react-dom";
import wingmanBot from "../../../assets/branding/wingman-bot.png";

type GuruFabProps = {
  open: boolean;
  minimized: boolean;
  onToggle: () => void;
};

export default function GuruFab({ open, minimized, onToggle }: GuruFabProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <button
      type="button"
      className={"wm-guru-fab" + (open && !minimized ? " is-open" : "")}
      aria-label="Open Guru helper"
      title="Guru helper"
      onClick={onToggle}
    >
      <img src={wingmanBot} alt="" className="wm-guru-fab__icon" draggable={false} />
    </button>,
    document.body
  );
}