import "./styles/wm-viewport-fit.css";
import { installViewportFitMode } from "./utils/installViewportFitMode";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import WingmanProviders from "./app/providers/WingmanProviders";
import { ThemeProvider } from "./theme/ThemeProvider";

import "./styles/wm-tokens.css";
import "./styles/app.css";
import "./styles/wm-page-system.css";
import "./styles/wm-page-frame.css";
import "./styles/wm-workspace-pages.css";
import "./styles/wm-global-theme.css";

import "./styles/wm-feature-tint-pass.css";
import installWingmanFeatureTone from "./utils/installWingmanFeatureTone";
import "./styles/wm-desktop-width-unlock.css";

import "./styles/wm-topbar-authority-one.css";
import "./styles/wm-topbar-brand-solo.css";
import installTopbarBrandSolo from "./utils/installTopbarBrandSolo";

installViewportFitMode();
installWingmanFeatureTone();
installTopbarBrandSolo();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ThemeProvider>
      <WingmanProviders>
        <App />
      </WingmanProviders>
    </ThemeProvider>
  </BrowserRouter>,
);