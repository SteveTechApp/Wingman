import "./styles/app.css";
import "@/styles/wm-visual-calm-pass.css";
import "@/styles/wm-shell-normalize.css";
import "@/styles/utilities.css";
import "@/styles/components.css";
import "@/styles/layout.css";
import "@/styles/base.css";
import "@/styles/tokens.css";
import "@/styles/typography.css";
import "@/styles/wingman-global.css";
// LEGACY CSS DISABLED: import "./styles/wm-feature-hotfix.css";
import "@/styles/wingman-global.css";
// LEGACY CSS DISABLED: import "./styles/wm-layout-pass.css";
import "@/styles/wingman-global.css";
// LEGACY CSS DISABLED: import "@/styles/wm-global-compact-pass.css";
import "@/styles/wingman-global.css";
// LEGACY CSS DISABLED: import "@/styles/wm-compact-ui.css";
import "@/styles/wingman-global.css";
// LEGACY CSS DISABLED: import "@/styles/wm-typography-overrides.css";
import * as React from "react";
import "@/styles/wingman-global.css";
// LEGACY CSS DISABLED: import "./styles/index.css";
import "@/styles/wingman-global.css";

import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import WingmanProviders from "@/app/providers/WingmanProviders";
import "@/styles/wingman-global.css";

import { AuthProvider } from "@/context";
import "@/styles/wingman-global.css";
import "@/styles/wingman-slim.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter><WingmanProviders><App /></WingmanProviders></BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
