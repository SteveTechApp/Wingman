import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthed } from "@/auth/auth";

type Props = { children: React.ReactNode };

export default function RequireAuth({ children }: Props) {
  const location = useLocation();

  if (!isAuthed()) {
    const from = location.pathname + location.search + location.hash;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <>{children}</>;
}
