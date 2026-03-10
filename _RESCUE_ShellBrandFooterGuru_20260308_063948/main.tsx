import "@/styles/utilities.css";
import "@/styles/components.css";
import "@/styles/layout.css";
import "@/styles/base.css";
import "@/styles/tokens.css";
import "@/styles/typography.css";
// LEGACY CSS DISABLED: import "./styles/wm-feature-hotfix.css";
// LEGACY CSS DISABLED: import "./styles/wm-layout-pass.css";
// LEGACY CSS DISABLED: import "@/styles/wm-global-compact-pass.css";
// LEGACY CSS DISABLED: import "@/styles/wm-compact-ui.css";
import "@/styles/wm-layout-compression-pass.css";
import "@/styles/wm-guru-fix.css";
// LEGACY CSS DISABLED: import "@/styles/wm-typography-overrides.css";
import * as React from "react";
// LEGACY CSS DISABLED: import "./styles/index.css";

import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import WingmanProviders from "@/app/providers/WingmanProviders";

import { AuthProvider } from "@/context";

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
