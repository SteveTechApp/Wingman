import { installWingmanCopyDiscipline } from "./wingman2/utils/installWingmanCopyDiscipline";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRoot from "./wingman2/app/WingmanApp";
import "./wingman2/styles/wingman-page-uniformity.css";
import "./wingman2/styles/results-clear-until-action.css";
import "./wingman2/styles/discovery-clear-project-guard.css";
import "./wingman2/styles/discovery-answer-memory.css";
import "./wingman2/styles/discovery-calm.css";
import "./styles/wingman-discovery-builder-layout.css";
import "./wingman2/styles/entry.css";
import "./wingman2/styles/wm-sidebar-compact.css";
import "./wingman2/styles/wm-logo-scale.css";
import "./wingman2/styles/wm-sidebar-no-horizontal-scroll.css";
import { installWingmanVisualIdentity } from "./wingman2/utils/installWingmanVisualIdentity";
import { installWingmanSalesMode } from "./wingman2/utils/installWingmanSalesMode";
import "./wingman2/styles/wm-brand-reset.css";
import "./wingman2/styles/wm-route-redesign.css";
import "./wingman2/styles/wm-sales-mode-global.css";
import "./wingman2/styles/wm-command-ui.css";
import "./wingman2/components/discovery/SourceDeviceCollator.css";
import "./wingman2/styles/wm-av-workspace.css";

installWingmanCopyDiscipline();

installWingmanVisualIdentity();
installWingmanSalesMode();
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root was not found.");
}
createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoot />
    </BrowserRouter>
  </React.StrictMode>
);
