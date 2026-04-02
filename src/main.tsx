import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import "./styles/wm-enterprise-pass.css";
import "./styles/app.css";
import "./styles/wm-split-workspace.css";
import "./styles/wm-reference-shell.css";
import "./styles/wm-architecture-canvas.css";
import "./styles/wm-topbar-compact.css";
import "./styles/wm-mission-control-compact.css";
import "./styles/wm-mission-control-feature-flash.css";
import "./styles/wm-mission-control-sections.css";
import "./styles/wm-light-refresh.css";
import "./styles/wm-fundamental-redesign.css";
import "./styles/wm-toolhub-fix.css";
import WingmanProviders from "./app/providers/WingmanProviders";
import "./styles/wm-shell-flowpro.css";
import "./styles/wm-contrast-fix.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WingmanProviders>
        <App />
      </WingmanProviders>
    </BrowserRouter>
  </React.StrictMode>
);
