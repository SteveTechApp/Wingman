import "../styles/entry.css";
import { Navigate, useRoutes } from "react-router-dom";
import { wingmanRoutes } from "./wingmanRoutes";

export default function WingmanStandalone() {
  return useRoutes([
    ...wingmanRoutes,
    { path: "*", element: <Navigate to="/wingman/dashboard" replace /> },
  ]);
}
