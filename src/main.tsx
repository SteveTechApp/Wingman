import "./wingman2/styles/wingman-page-uniformity.css";
import "./wingman2/styles/results-clear-until-action.css";
import "./wingman2/app/resultsClearUntilAction";
import "./wingman2/styles/discovery-clear-project-guard.css";
import "./wingman2/app/discoveryClearProjectGuard";
import "./wingman2/styles/discovery-answer-memory.css";
import "./wingman2/app/discoveryAnswerMemory";
import "./wingman2/styles/discovery-calm.css";
import "./wingman2/app/discoveryCalmMode";
import "./styles/wingman-discovery-builder-layout.css";
import "./wingman2/styles/entry.css";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./wingman2/styles/wm-sidebar-compact.css";
import "./wingman2/styles/wm-logo-scale.css";
import "./wingman2/styles/wm-sidebar-no-horizontal-scroll.css";
import { installWingmanRouteBodyClass } from "./wingman2/utils/wingmanRouteBodyClass";
import "./wingman2/styles/wm-discovery-viewport-fit.css";
import "./wingman2/styles/wm-discovery-object-density.css";
import "./wingman2/styles/wm-discovery-remove-image-noise.css";

installWingmanRouteBodyClass();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
