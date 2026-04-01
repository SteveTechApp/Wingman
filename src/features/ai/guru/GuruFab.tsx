import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import "./guru-fab.css";

export default function GuruFab() {
  const navigate = useNavigate();
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef({ x: 0, y: 0, ox: 0, oy: 0, moved: false });

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    drag.current = {
      x: e.clientX,
      y: e.clientY,
      ox: pos.x,
      oy: pos.y,
      moved: false,
    };

    const move = (m: MouseEvent) => {
      const nextX = drag.current.ox + (m.clientX - drag.current.x);
      const nextY = drag.current.oy + (m.clientY - drag.current.y);

      if (
        Math.abs(m.clientX - drag.current.x) > 4 ||
        Math.abs(m.clientY - drag.current.y) > 4
      ) {
        drag.current.moved = true;
      }

      setPos({ x: nextX, y: nextY });
    };

    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);

      if (!drag.current.moved) {
        navigate(WM_ROUTES.GURU);
      }
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      className="guru-fab"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      onMouseDown={onMouseDown}
      role="button"
      tabIndex={0}
    >
      <img src="/branding/wingman-bot.png" alt="Guru" />
      <span>Guru</span>
    </div>
  );
}
