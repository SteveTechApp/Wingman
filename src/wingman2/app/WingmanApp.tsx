import { useEffect } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import { installCallCardsAudienceFraming } from "../utils/installCallCardsAudienceFraming";
import { installCallCardsVoiceCapture } from "../utils/installCallCardsVoiceCapture";
import { wingmanRoutes } from "./routes";

export default function WingmanApp() {
  useEffect(() => {
    installCallCardsAudienceFraming();
    installCallCardsVoiceCapture();
  }, []);

  return useRoutes([
    ...wingmanRoutes,
    { path: "*", element: <Navigate to="/wingman/dashboard" replace /> },
  ]);
}
