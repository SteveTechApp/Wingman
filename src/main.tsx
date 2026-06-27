import { installCompareManufacturerAssist } from "./wingman2/lib/compareManufacturerAssist";
import "./wingman2/lib/guruDetachedPanel";
import "./wingman2/lib/microphoneSafety";
import "./wingman2/app/wingmanProductCallCardsCleanUi";
import "./wingman2/app/wingmanDisplayScaleGuard";

const wingmanWindow = window as Window & { __wingmanNewProjectHandlerInstalled?: boolean };

if (!wingmanWindow.__wingmanNewProjectHandlerInstalled) {
  wingmanWindow.__wingmanNewProjectHandlerInstalled = true;

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const action = target.closest("button, a");

      if (!(action instanceof HTMLElement)) {
        return;
      }

      const text = (action.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

      if (!text.includes("new project")) {
        return;
      }

      event.preventDefault();
      window.location.href = "/wingman/templates";
    },
    true,
  );
}

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { installCsrfFetch } from "./wingman2/api/csrf";
import ProductCallCardsStickyLayoutEnhancer from "./wingman2/components/workflow/ProductCallCardsStickyLayoutEnhancer";
import ProductStoryLanguageEnhancer from "./wingman2/components/workflow/ProductStoryLanguageEnhancer";
import WorkflowAlphaNumericFilter from "./wingman2/components/workflow/WorkflowAlphaNumericFilter";
import "./wingman2/styles/wingman-style-stack.css";

// Attach the X-CSRF-Token header to mutating API calls. No-op until the server
// guard is enabled (WINGMAN_CSRF_ENFORCE=true).
installCsrfFetch();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}
installCompareManufacturerAssist();

createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
        <ProductCallCardsStickyLayoutEnhancer />
        <ProductStoryLanguageEnhancer />
        <WorkflowAlphaNumericFilter />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
