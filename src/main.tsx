import TopBarUtilityActions from "./wingman2/components/TopBarUtilityActions";
import "./wingman2/styles/wingman-style-stack.css";

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <>
      <>
      <App />
    </>
      <TopBarUtilityActions />
    </>
    </BrowserRouter>
  </React.StrictMode>,
);
