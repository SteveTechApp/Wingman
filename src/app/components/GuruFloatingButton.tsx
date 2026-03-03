import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function GuruFloatingButton() {
  const nav = useNavigate();
  const loc = useLocation();

  // Hide on public routes and on the Guru page itself
  const isPublic =
    loc.pathname === "/" ||
    loc.pathname.startsWith("/login") ||
    loc.pathname.startsWith("/signup") ||
    loc.pathname.startsWith("/about");

  if (isPublic) return null;
  if (loc.pathname.startsWith("/app/guru")) return null;

  return (
    <button
      type="button"
      title="Open Guru"
      onClick={() => nav("/app/guru")}
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 9999,
        borderRadius: 999,
        padding: "12px 14px",
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(6px)",
        cursor: "pointer",
        boxShadow: "0 18px 44px rgba(0,0,0,0.35)",
      }}
    >
      Guru
    </button>
  );
}