import { useNavigate } from "react-router-dom";
import "./guru-button.css";

export default function GuruButton() {
  const navigate = useNavigate();

  return (
    <button
      className="wm-guru-button"
      onClick={() => navigate("/app/tools/guru")}
      aria-label="Open Guru Assistant"
    >
      <img
        src="/guru-logo.png"
        alt=""
        className="wm-guru-button__icon"
      />
    </button>
  );
}
