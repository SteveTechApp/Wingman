import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import "./features/wingmanUx/wingman-ux.css";
import "./styles/wm-enterprise-pass.css";
import "./styles/app.css";
import "./styles/wm-reference-shell.css";
import "./styles/wm-architecture-canvas.css";
import "./styles/wm-layout-v2.css";
import "./styles/wm-topbar-compact.css";
import "./styles/wm-mission-control-compact.css";
import "./styles/wm-mission-control-feature-flash.css";
import "./styles/wm-mission-control-sections.css";
import "./styles/wm-polish-pass-v1.css";
import "./styles/wm-layout-overrides.css";

import WingmanProviders from "./app/providers/WingmanProviders";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WingmanProviders>
        <App />
      </WingmanProviders>
    </BrowserRouter>
  </React.StrictMode>
);