import { Bot, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import "./guru-fab.css";

export default function GuruFab() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="guru-fab"
      onClick={() => navigate(WM_ROUTES.GURU)}
      aria-label="Open Guru workspace"
    >
      <span className="guru-fab__icon">
        <Bot size={18} strokeWidth={1.9} />
      </span>

      <span className="guru-fab__copy">
        <strong>Guru</strong>
        <small>Open side-by-side Q&amp;A</small>
      </span>

      <span className="guru-fab__spark">
        <Sparkles size={14} strokeWidth={1.9} />
      </span>
    </button>
  );
}
