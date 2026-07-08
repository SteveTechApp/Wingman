import "./wingman2/styles/wingman-style-stack.css";
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
import { installTemplateCardExpansionController } from './wingman2/lib/templatesCardExpansion';
// Attach the X-CSRF-Token header to mutating API calls. No-op until the server
// guard is enabled (WINGMAN_CSRF_ENFORCE=true).
installCsrfFetch();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}
installCompareManufacturerAssist();
installTemplateCardExpansionController();


createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
