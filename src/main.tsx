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
ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
