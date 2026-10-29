import { useEffect } from "react";
import { Navigate, useLocation, useRoutes } from "react-router-dom";

import { VoiceAnswerCaptureOverlay } from "../components/VoiceAnswerCaptureOverlay";
import { OfflineBanner } from "../components/OfflineBanner";
import { RetiredStorageNote } from "../components/RetiredStorageNote";
import { UiModeProvider } from "../data/uiMode";
import { trackFeatureEvent } from "../lib/featureAnalytics";
import { routeByPath } from "./routeCatalog";

import { wingmanRoutes } from "./routes";

export default function WingmanApp() {
  const location = useLocation();

  // Track page views when the route changes.
  useEffect(() => {
    trackFeatureEvent("feature_open", routeByPath(location.pathname)?.key ?? "unknown", { path: location.pathname });
  }, [location.pathname]);

  const routes = useRoutes([
    ...wingmanRoutes,
    { path: "*", element: <Navigate to="/wingman/dashboard" replace /> },
  ]);

  return (
    <UiModeProvider>
      <OfflineBanner />
      {/* Above the routes, like the offline banner: the sweep's work is the
          browser's rather than a room's, so it belongs to no page in particular
          and every page can carry it. */}
      <RetiredStorageNote />
      {routes}
      <VoiceAnswerCaptureOverlay />
    </UiModeProvider>
  );
}
