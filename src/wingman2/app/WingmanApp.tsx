import { useEffect } from "react";
import { Navigate, useLocation, useRoutes } from "react-router-dom";

import { VoiceAnswerCaptureOverlay } from "../components/VoiceAnswerCaptureOverlay";
import { OfflineBanner } from "../components/OfflineBanner";
import { trackFeatureEvent } from "../lib/featureAnalytics";

import { wingmanRoutes } from "./routes";

export default function WingmanApp() {
  const location = useLocation();

  // Track page views when the route changes.
  useEffect(() => {
    trackFeatureEvent("feature_open", "page", { path: location.pathname });
  }, [location.pathname]);

  const routes = useRoutes([
    ...wingmanRoutes,
    { path: "*", element: <Navigate to="/wingman/dashboard" replace /> },
  ]);

  return (
    <>
      <OfflineBanner />
      {routes}
      <VoiceAnswerCaptureOverlay />
    </>
  );
}
