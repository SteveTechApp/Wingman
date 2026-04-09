import React from "react";
import "./styles/wm-system.css";
import "./styles/wm-tokens.css";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import WingmanProviders from "./app/providers/WingmanProviders";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./styles/theme.css";
import "./styles/app.css";
import "./styles/wm-page-system.css";
import "./styles/wm-global-theme.css";

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
