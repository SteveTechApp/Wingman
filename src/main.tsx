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
