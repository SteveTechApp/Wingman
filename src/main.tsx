import "./styles/wingman-global.css";
import React from "react";
import ReactDOM from "react-dom/client";

document.documentElement.classList.add("wm-force-authority");
document.body.classList.add("wm-force-authority");
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import WingmanProviders from "./app/providers/WingmanProviders";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./styles/theme.css";
import "./styles/app.css";
import "./styles/wm-page-system.css";
import "./styles/wm-global-theme.css";

import "./styles/wm-tokens.css";
import "./styles/wm-system.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <WingmanProviders>
          <App />
        </WingmanProviders>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
