import { installWingmanLocalSessionFallback } from "./wingman2/utils/installWingmanLocalSessionFallback";
import "@xyflow/react/dist/style.css";
import "./wingman2/styles/wingman-style-stack.css";
import "./wingman2/styles/wingman-reference-theme.css";
import "./wingman2/styles/wingman-workflow-theme.css";
import "./wingman2/styles/wingman-polish-navigation.css";
import "./wingman2/styles/wingman-reference-global.css";
import "./wingman2/styles/wingman-videowall.css";
import "./wingman2/styles/wingman-product-tools-visual-weight.css";
import { installCompareManufacturerAssist } from "./wingman2/lib/compareManufacturerAssist";
import "./wingman2/lib/guruDetachedPanel";
import "./wingman2/lib/microphoneSafety";
import "./wingman2/app/wingmanDisplayScaleGuard";

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { installCsrfFetch } from "./wingman2/api/csrf";
import { installTemplateCardExpansionController } from "./wingman2/lib/templatesCardExpansion";
import { installRuntimeTelemetry } from "./wingman2/lib/runtimeTelemetry";
import "./wingman2/lib/productToolsVisualWeight";

// Attach the X-CSRF-Token header to mutating API calls. No-op until the server
// guard is enabled (WINGMAN_CSRF_ENFORCE=true).
installCsrfFetch();

// Report uncaught errors and rejected promises to /api/wingman/telemetry.
// Best-effort and silent on failure; no-op for a signed-out user.
installRuntimeTelemetry();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

installCompareManufacturerAssist();
installTemplateCardExpansionController();

installWingmanLocalSessionFallback();

createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
