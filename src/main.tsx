/* Wingman Design System — layered cascade (tokens → reset → layout → components).
   The @xyflow stylesheet is owned by the lazy visual-canvas chunk
   (VisualStudioCanvas is its only consumer), so it must not be imported here:
   an eager import would pull the whole @xyflow graph into the initial preload set. */
import "./wingman2/styles/wingman-layer-tokens.css";
import "./wingman2/styles/wingman-layer-reset.css";
import "./wingman2/styles/wingman-layer-layout.css";
import "./wingman2/styles/wingman-layer-components.css";

/* Route/page-specific overrides — loads after the design system.
   The shared remainder loads first, then the page-owned stylesheets: a rule is
   in a page file only when that page's route plumbing scopes all of it, and the
   ones that would flip a tie with a later shared rule stay in the remainder. */
import "./wingman2/styles/wingman-route-overrides.css";
import "./wingman2/styles/wingman-route-call-coach.css";
import "./wingman2/styles/wingman-route-compare.css";
import "./wingman2/styles/wingman-route-dashboard.css";
import "./wingman2/styles/wingman-route-discovery.css";
import "./wingman2/styles/wingman-route-glossary.css";
import "./wingman2/styles/wingman-route-projects.css";
import "./wingman2/styles/wingman-route-sales-helper.css";
import "./wingman2/styles/wingman-route-settings.css";
import "./wingman2/styles/wingman-route-templates.css";

/* Companion theme files — load after the core layers */
import "./wingman2/styles/wingman-reference-theme.css";
import "./wingman2/styles/wingman-workflow-theme.css";
import "./wingman2/styles/wingman-polish-navigation.css";
import "./wingman2/styles/wingman-reference-global.css";
import "./wingman2/styles/wingman-ui-consistency.css";
import "./wingman2/styles/wingman-sales-workspace.css";
import "./wingman2/styles/wingman-voice-capture.css";
import "./wingman2/components/diagramPresentation.css";
import "./wingman2/components/projectScopeSchedule.css";
import "./wingman2/components/technicalSchematic.css";
import "./wingman2/pages/project/project-workspace.css";
import "./wingman2/pages/templateLibraryLayout.css";
import "./wingman2/lib/microphoneSafety";
import "./wingman2/app/wingmanDisplayScaleGuard";

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { installCsrfFetch } from "./wingman2/api/csrf";
import { restoreDevelopmentWorkspace } from "./wingman2/utils/devWorkspaceSession";
import { installRuntimeTelemetry } from "./wingman2/lib/runtimeTelemetry";
import { installFeatureAnalytics } from "./wingman2/lib/featureAnalytics";
import { sweepWebhookHistory } from "./wingman2/lib/crmWebhook";
import { sweepRetiredStorage, takeRetiredStorageReclaim } from "./wingman2/lib/retiredStorage";
// Attach the X-CSRF-Token header to mutating API calls. No-op until the server
// guard is enabled (WINGMAN_CSRF_ENFORCE=true).
installCsrfFetch();

// Report uncaught errors and rejected promises to /api/wingman/telemetry.
// Best-effort and silent on failure; no-op for a signed-out user.
installRuntimeTelemetry();

// Track feature usage patterns for product intelligence improvements.
// Best-effort and silent on failure; no customer data is collected.
installFeatureAnalytics();

// Both boot sweeps report what they gave back into one report, and the take comes
// first: this load lifts what a previous load's sweeps left, and only then do this
// load's own write theirs, so what a rep is shown is the space that came back last
// time rather than the space this load is still taking back. One report is what
// lets one strip name everything boot gave back, instead of only the largest
// single source.
takeRetiredStorageReclaim();

// The CRM send history is cleaned once per load, before any screen asks for it:
// delivered snapshot bodies and rows over its ceilings are storage the projects
// need. A browser already clean is read and not written, so this costs one read
// and nothing else until the next send makes it dirty again.
sweepWebhookHistory();

// A store this build no longer reads is still bytes in the browser. The wall
// builder used to duplicate every saved summary into
// `wingman:video-wall-last-summary`; nothing reads that copy now and the builder
// will never open it again, so a load that finds it takes the space back. A clean
// browser is read and not written.
sweepRetiredStorage();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}


// Register service worker for offline caching of product data.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker registration is best-effort.
    });
  });
}

// A development browser that chose the local workspace gets its session back
// before the first project hydrate, so dev sync starts from the API rather than
// falling back to local mode for the visit. In a production build this returns
// immediately without touching the network.
async function start(root: HTMLElement) {
  await restoreDevelopmentWorkspace();
  createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

void start(rootElement);
