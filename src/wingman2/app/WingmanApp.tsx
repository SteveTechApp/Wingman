import { Navigate, useRoutes } from "react-router-dom";

import "../styles/wingman-compact-scale.css";
import "../styles/wingman-screen-fit.css";

import { wingmanRoutes } from "./routes";

export default function WingmanApp() {
  return useRoutes([
    ...wingmanRoutes,
    { path: "*", element: <Navigate to="/wingman/dashboard" replace /> },
  ]);
}
