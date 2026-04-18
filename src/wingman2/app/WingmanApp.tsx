import { Navigate, useRoutes } from "react-router-dom";
import { wingmanRoutes } from "./routes";

export default function WingmanApp() {
  return useRoutes([
    ...wingmanRoutes,
    { path: "*", element: <Navigate to="/wingman/dashboard" replace /> },
  ]);
}
