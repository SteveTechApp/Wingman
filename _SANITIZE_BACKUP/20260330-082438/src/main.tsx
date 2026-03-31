import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import "./features/wingmanUx/wingman-ux.css";
import "./styles/wm-enterprise-pass.css";
import "./styles/app.css";
import "./styles/wm-reference-shell.css";

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
