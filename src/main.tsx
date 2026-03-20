import "./styles/app.css";
import "@/styles/wm-visual-calm-pass.css";
import "@/styles/wm-shell-normalize.css";
import "@/styles/utilities.css";
import "@/styles/components.css";
import "@/styles/layout.css";
import "@/styles/base.css";
import "@/styles/typography.css";
import "@/styles/wingman-global.css";
import "@/design/system/tokens.css";
import "@/design/system/layout.css";
import "@/design/system/components.css";
import "@/styles/wm-export.css";
import "@/styles/wm-consistency-pass.css";
import "@/styles/wm-enterprise-pass.css";

import * as React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import WingmanProviders from "@/app/providers/WingmanProviders";
import ErrorBoundary from "@/components/ErrorBoundary";
import { installRuntimeErrorReporting } from "@/app/runtime/errorReporting";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root not found");
}

installRuntimeErrorReporting();

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <WingmanProviders>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </WingmanProviders>
    </BrowserRouter>
  </React.StrictMode>
);
