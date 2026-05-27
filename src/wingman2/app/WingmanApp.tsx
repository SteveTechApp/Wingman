import { Navigate, useRoutes } from "react-router-dom";
import { wingmanRoutes } from "./routes";

import "../styles/wingman-compact-scale.css";
import "../styles/wingman-screen-fit.css";

export default function WingmanApp() {
  return useRoutes([
    ...wingmanRoutes,
    { path: "*", element: <Navigate to="/wingman/dashboard" replace /> },
  ]);
}
