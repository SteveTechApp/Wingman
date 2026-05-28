import { Navigate, useRoutes } from "react-router-dom";

import { VoiceAnswerCaptureOverlay } from "../components/VoiceAnswerCaptureOverlay";

import { wingmanRoutes } from "./routes";

export default function WingmanApp() {
  const routes = useRoutes([
    ...wingmanRoutes,
    { path: "*", element: <Navigate to="/wingman/dashboard" replace /> },
  ]);

  return (
    <>
      {routes}
      <VoiceAnswerCaptureOverlay />
    </>
  );
}
