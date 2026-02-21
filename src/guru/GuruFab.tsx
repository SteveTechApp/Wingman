import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function GuruFab() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/ask") || pathname.startsWith("/app/tools/ask")) return null;

  return (
    <Link className="wm-fab" to="/ask" aria-label="Ask Guru helper">
      Ask Guru
    </Link>
  );
}
